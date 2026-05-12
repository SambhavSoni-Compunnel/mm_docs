# 14. Error Handling & Logging

## 14.1 Logging Configuration

The project uses Python's standard `logging` module. Each module creates its own logger:

```python
import logging
logger = logging.getLogger(__name__)
```

**No centralized logging configuration found** in the codebase. `logging.basicConfig(level=logging.INFO)` is called in `db_connection_manager.py` at module level, which effectively configures the root logger. This means log level and format are set inconsistently (by whichever module imports first).

### Log Levels in Use

| Level | Usage |
|-------|-------|
| `DEBUG` | Detailed trace info (email prep, payload structure) |
| `INFO` | Normal operation milestones (auth checks, pool status, task start/complete) |
| `WARNING` | Non-fatal anomalies (permission denied, stale connection, no events found) |
| `ERROR` | Caught exceptions (token validation failure, DB errors, API failures) |

### Representative Log Patterns

```python
# Auth
logger.info(f"Permission check for user: {user_email}, module: {module}")
logger.warning(f"User {user_email} denied access to {module}")
logger.error(f"Token validation error: {e}")

# DB Pool
logger.info(f"Pool Status after getconn: used={used}, available={avail}, total={total}")
logger.warning("Stale/closed connection detected. Reconnecting...")
logger.error(f"OperationalError when getting DB connection: {oe}")

# Email
logger.info(f"Background email task {task_id} completed: {successful}/{total} sent")
logger.error(f"Error in background email task {task_id}: {str(e)}", exc_info=True)

# Enrichment
logger.error(f"Failed to fetch poc_linkedin URLs: {e}")
```

---

## 14.2 Exception Handling Patterns

### Pattern 1: API Layer Try/Except
Every API Resource method wraps handler calls:
```python
def post(self):
    try:
        data = parse_request_data()
        result = some_helper_function(data)
        return success_response("OK", result)
    except (ValueError, KeyError) as e:
        logger.error(f"Validation error: {str(e)}")
        return {"error": str(e)}, 400
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {"error": f"Unexpected error: {str(e)}"}, 500
```

### Pattern 2: Helper Return Tuple Pattern
Many helpers return `(success_bool, data_or_error)`:
```python
def insert_campaign_audience_group_map_with_cursor(campaign_ids, audience_group_id):
    try:
        # ... DB operations
        return True, None
    except Exception as e:
        logger.error(f"[function_name] Error: {e}")
        return False, str(e)
```

The caller checks the boolean before using the result.

### Pattern 3: DB Context Manager Rollback
```python
@contextmanager
def get_db_connection():
    conn = connection_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()  # Automatic rollback on any exception
        raise            # Re-raises for caller to handle
    finally:
        connection_pool.putconn(conn)
```

### Pattern 4: Typed DB Exceptions
`operational_analytics_helper.py` wraps psycopg2 errors into custom exceptions:
```python
class DatabaseConnectionError(Exception): ...
class DatabaseQueryError(Exception): ...

try:
    # ... query
except psycopg2.OperationalError as e:
    raise DatabaseConnectionError(...)
except psycopg2.ProgrammingError as e:
    raise DatabaseQueryError(...)
```

### Pattern 5: Graceful Degradation
For non-critical operations (e.g., cache lookup):
```python
def fetch_cached_validations(emails):
    try:
        # ... DB query
        return cache_map
    except Exception as e:
        logger.error(f"Error fetching cached validations: {str(e)}")
        return {}  # Return empty dict — triggers full API validation
```

---

## 14.3 Error Response Format

All error responses are standardized via `helpers/response.py`:

```json
// 400 Bad Request
{
  "statuscode": 400,
  "message": "Missing required fields",
  "data": [],
  "total_records": 0,
  "error": ["Email and password are required"]
}

// 401 Unauthorized
{
  "statuscode": 401,
  "message": "Token is missing",
  "data": [],
  "total_records": 0,
  "error": ["Token is missing"]
}

// 403 Forbidden
{
  "statuscode": 403,
  "message": "Access denied. Required permission(s): rc for run_campaign module.",
  "data": [],
  "total_records": 0,
  "error": ["Access denied..."]
}

// 500 Internal Server Error
{
  "statuscode": 500,
  "message": "internal server error",
  "data": [],
  "total_records": 0,
  "error": ["Unexpected error: ..."]
}
```

---

## 14.4 Common Failure Scenarios

### Scenario 1: Azure Key Vault Unreachable at Startup
**Symptom:** App fails to start; container crashes  
**Cause:** `fetch_secret_from_azure("azureConnectionString")` called at import time in `generic_config.py`  
**Logs:** `EnvironmentError: Missing one or more required Azure environment variables` OR Azure SDK connection error  
**Fix:** Ensure `configuration/.env` has correct service principal credentials, or verify Managed Identity is assigned  

### Scenario 2: PostgreSQL Unreachable at Startup
**Symptom:** App fails to start with `RuntimeError: Could not initialize database connection pool`  
**Logs:** `Failed to create connection pool (attempt N/5): ...`  
**Fix:** Check DB connectivity, credentials, and firewall rules; `POOL_RETRY_ATTEMPTS=5` with 3s delay gives 15s grace period  

### Scenario 3: JWT Token Expired
**Symptom:** All authenticated API calls return 401  
**Logs:** `Token validation error: Signature has expired`  
**Fix:** Client must refresh using `POST /api/v2/refresh-token` before expiry, or re-login  

### Scenario 4: DB Connection Pool Exhausted
**Symptom:** API requests hang or return `PoolError`  
**Logs:** `OperationalError when getting DB connection: connection pool exhausted`  
**Fix:** Check `/pool_status` endpoint; investigate connection leaks; increase `POOL_MAXCONN` if needed  

### Scenario 5: ZeroBounce API Rate Limit / Failure
**Symptom:** Email send fails with ZeroBounce error  
**Logs:** `ZeroBounce validation failed: ...`  
**Behavior:** Entire email batch aborted — no emails sent  
**Fix:** Use `skip_validation=true` as temporary bypass; check ZeroBounce account credits  

### Scenario 6: Background Email Task Fails Silently
**Symptom:** `/api/send_emails` returns task_id but emails never arrive  
**Logs:** `Error in background email task {task_id}: ...` in container logs  
**Fix:** Poll `/api/background-email-status/{task_id}`; check MCMP API credentials and endpoint  

### Scenario 7: Playwright Chromium Crash During Report Generation
**Symptom:** `POST /api/generate_report` returns 500  
**Logs:** Playwright error in stderr  
**Fix:** Check container memory (Chromium needs ~500MB+); ensure Playwright browsers installed (`playwright install chromium`)  

### Scenario 8: APScheduler Jobs Not Firing
**Symptom:** Scheduled follow-up emails not sending  
**Logs:** Check `scheduler.apscheduler_jobs` table for stuck jobs  
**Fix:** Verify scheduler started (`start_followup_scheduler()` called); check `next_run_time` in DB; restart app to re-initialize scheduler  

---

## 14.5 Logging Anti-Patterns to Avoid

The codebase contains some logging anti-patterns that should be fixed:

1. **`print()` statements throughout**: Many helpers use `print()` for debug output instead of `logger.debug()`. These cannot be silenced without code changes.
   ```python
   # Found in multiple files:
   print(f"[DEBUG] prepare_email_data - INPUT to_email: {to_email}")
   print("payload: ", payload)  # Logs Salesforce credentials
   ```

2. **Credential logging**: `salesforce_helper.py` prints the OAuth payload including `client_secret` and `password`. This is a **security risk** — these logs should be removed.

3. **No request ID correlation**: No request ID is propagated through log messages, making it hard to trace a single request through all log lines.

---

## 14.6 Observability Gaps

| Gap | Impact | Recommended Fix |
|-----|--------|----------------|
| No structured logging (JSON) | Hard to parse logs in production | Use `python-json-logger` |
| No request ID tracing | Can't correlate logs to requests | Add Flask request ID middleware |
| No APM integration | No distributed tracing | Add Azure Application Insights |
| No alerting on error rate | Silent failures | Add error rate alert (e.g., Application Insights alerts) |
| Background task status in-memory only | Can't inspect tasks post-restart | Use Redis or DB for task state |
| DB pool status only at `/pool_status` | No continuous monitoring | Export pool metrics to APM |
| `print()` mixed with `logging` | Noisy, uncontrollable output | Replace all `print()` with `logger` calls |
