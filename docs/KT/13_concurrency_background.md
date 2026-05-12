# 13. Concurrency & Background Processing

## 13.1 Concurrency Architecture Overview

Market Minder uses three concurrency mechanisms:

| Mechanism | Component | Purpose | Thread-Safe? |
|-----------|-----------|---------|-------------|
| `ThreadedConnectionPool` | psycopg2 | DB connection sharing across threads | Yes |
| `BackgroundEmailProcessor` | threading.Thread (daemon) | Non-blocking email sends | Partial |
| `BackgroundScheduler` | APScheduler | Follow-up email scheduling | Yes |
| `RateLimiter` (token bucket) | threading.Lock | Proxycurl API rate control | Yes |

---

## 13.2 Database Connection Pool

```python
# helpers/db_connection_manager.py
connection_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=150,
    **DB_CONFIG
)
```

### Thread Safety
`ThreadedConnectionPool` uses internal locking — multiple threads can safely call `getconn()` / `putconn()` concurrently.

### Pool Exhaustion Risk
With `maxconn=150`, if 150 threads each hold a connection simultaneously, the 151st thread will raise a `PoolError`. This can happen if:
- Many background email tasks run concurrently
- APScheduler fires many jobs simultaneously
- The API is handling many concurrent requests

### Connection Lifecycle
```python
@contextmanager
def get_db_connection():
    conn = connection_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        connection_pool.putconn(conn)  # Always returns to pool
```

### Stale Connection Detection
```python
if conn.closed != 0:
    connection_pool.putconn(conn, close=True)  # Discard stale
    conn = connection_pool.getconn()            # Get fresh one
```
TCP keepalives are configured (`keepalives_idle=30s`) to detect dead connections at the OS level.

---

## 13.3 Background Email Processing

### `BackgroundEmailProcessor` Class

```python
# helpers/async_email_helper.py
class BackgroundEmailProcessor:
    def __init__(self):
        self.active_tasks = {}  # task_id → {status, thread, result, error}
    
    def queue_email_task(self, task_id, task_func, *args, **kwargs):
        thread = threading.Thread(
            target=self._execute_task,
            args=(task_id, task_func, args, kwargs),
            daemon=True       # Dies when main process exits
        )
        self.active_tasks[task_id] = {'status': 'queued', 'thread': thread}
        thread.start()
        return task_id
```

### Status Lifecycle
```
queued → processing → completed
                   ↘ failed
```

### Thread Safety Concerns

**`active_tasks` dict is NOT protected by a lock.** Concurrent writes from multiple background threads (updating their own status) and reads from the status polling endpoint create potential race conditions:

```python
# In _execute_task (background thread):
self.active_tasks[task_id]['status'] = 'processing'   # WRITE
self.active_tasks[task_id]['status'] = 'completed'    # WRITE
self.active_tasks[task_id]['result'] = result         # WRITE

# In get_task_status (HTTP request thread):
task = self.active_tasks.get(task_id)                 # READ
```

In CPython, due to the GIL, dict operations are generally atomic for simple assignments, but compound operations are not. The current implementation is likely safe in practice for CPython but is not guaranteed-safe by the language spec.

### Memory Leak Risk

`active_tasks` grows unbounded. Completed tasks are never removed. In a long-running server with frequent email sends, this dict will grow indefinitely. There is no cleanup mechanism.

### Multi-Worker Risk

If Waitress is configured with multiple worker threads (which it supports), each worker has its own `BackgroundEmailProcessor` instance. A task started on worker A is not visible from worker B when polling `/api/background-email-status/<task_id>`. This is only safe in single-worker mode.

---

## 13.4 APScheduler (Follow-up Emails)

### Scheduler Configuration

```python
# helpers/scheduler_config.py
scheduler = BackgroundScheduler(
    jobstores={'default': SQLAlchemyJobStore(url=dburl, ...)},
    timezone=IST  # Asia/Kolkata
)
```

### Why Persistent Job Store?

APScheduler jobs are stored in `scheduler.apscheduler_jobs` (PostgreSQL). This means:
- Jobs survive application restarts
- If the app crashes mid-schedule, jobs are not lost
- The scheduler re-executes any missed jobs on startup

### Follow-up Job Logic

```python
def execute_scheduled_email_job(contact_id, campaign_run_id, ...):
    # 1. Fetch contact's email from audience_group_contacts
    email = _fetch_contact_email(contact_id)
    
    # 2. Check recent events (last 7 days) from tracking.mcmp_events
    all_events = _fetch_recent_events(email, seven_days_ago)
    
    # 3. Pick highest-priority event
    best_event = _pick_best_event(all_events)
    # Priority: click (3) > open (2) > delivered (1)
    
    # 4. Decision: send follow-up or not
    # (based on event priority and follow-up scheduling logic)
```

### Event Priority System

```python
EVENT_PRIORITY_MAP = {"delivered": 1, "open": 2, "click": 3}
```

Higher-engagement contacts (who clicked) get different follow-up treatment than low-engagement contacts (only delivered).

### IST Timezone

All scheduled times are in IST (`Asia/Kolkata`). When a user schedules a follow-up for a specific time, it's interpreted as IST. If the deployment moves to a different timezone, all scheduled jobs' perceived times would be wrong.

---

## 13.5 Proxycurl Rate Limiter

### Token Bucket Implementation

```python
# helpers/rate_limit_utils.py
class RateLimiter:
    def __init__(self, max_calls, period):
        self.max_calls = max_calls  # 18
        self.period = period         # 60 seconds
        self.lock = threading.Lock()
        self.tokens = max_calls
        self.updated_at = time.monotonic()

    def acquire(self):
        with self.lock:  # Thread-safe
            now = time.monotonic()
            elapsed = now - self.updated_at
            refill = int(elapsed * (self.max_calls / self.period))
            if refill > 0:
                self.tokens = min(self.max_calls, self.tokens + refill)
                self.updated_at = now
            if self.tokens > 0:
                self.tokens -= 1
                return True
            return False

    def wait(self):
        while not self.acquire():
            time.sleep(1)  # 1-second polling — acceptable for batch jobs
```

### Retry Decorator

```python
@rate_limited_retry(max_retries=5, backoff_factor=1.0, status_codes=(429, 500, 502, 503, 504))
def fetch_profile_data(url):
    ...
```

Retry behavior:
- `status_codes=(429, 500, 502, 503, 504)` — retry on rate limit and server errors
- `backoff_factor=1.0` → wait times: 1s, 2s, 4s, 8s, 16s
- After 5 retries: raises `RateLimitRetryException`

---

## 13.6 Scheduler Startup Synchronization

The scheduler is started inside `create_app()` via `start_followup_scheduler()`. This creates a background thread within the Waitress WSGI process.

**Important:** Waitress may spawn multiple threads to handle requests, but it's a single process. The scheduler runs as one background thread within that process. There is no risk of duplicate scheduler instances within a single process.

**Risk with multi-process deployment:** If multiple container instances run (e.g., horizontal scaling), each instance starts its own APScheduler. With a shared PostgreSQL job store, APScheduler is designed to handle this — it uses DB locking to prevent duplicate job execution. However, this should be verified if horizontal scaling is ever implemented.

---

## 13.7 Concurrency Issues Summary

| Issue | Severity | Component | Mitigation |
|-------|----------|-----------|-----------|
| `active_tasks` dict unbounded growth | Medium | BackgroundEmailProcessor | Add cleanup after TTL |
| `active_tasks` not thread-safe (writes) | Low (CPython GIL helps) | BackgroundEmailProcessor | Add threading.Lock |
| Background tasks not visible across workers | High if multi-worker | BackgroundEmailProcessor | Use Redis for task state |
| Pool exhaustion under high load | Medium | DB connection pool | Monitor via /pool_status |
| Daemon threads killed on process exit | Low (email sends mid-flight lost) | BackgroundEmailProcessor | Use graceful shutdown hook |
| Scheduler timezone hardcoded to IST | Medium | APScheduler | Make configurable |

---

## 13.8 Flask-Limiter Rate Limiting

```python
# helpers/limiter.py
limiter = Limiter(key_func=get_remote_address)
# Uses in-memory storage (single-instance only)

# Applied to LoginV2:
decorators = [limiter.limit("10 per minute")]
```

**Multi-instance issue:** Flask-Limiter uses in-memory storage by default. If multiple container instances run, rate limits are per-instance, not global. A single IP could make 10 × N requests per minute across N instances.

**Fix:** Set `storage_uri="redis://..."` in the Limiter constructor for distributed rate limiting.
