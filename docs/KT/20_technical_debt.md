# 20. Technical Debt

This document catalogs known technical debt items in the Market Minder AI backend codebase. Each item includes a description, risk level, and recommended resolution.

---

## TD-01: BackgroundEmailProcessor.active_tasks — Memory Leak & Race Condition

**File:** `helpers/async_email_helper.py`  
**Severity:** HIGH  

**Problem:**
- `active_tasks` is a plain Python `dict` accessed from multiple threads without any lock
- Completed tasks are never removed from `active_tasks` — grows indefinitely per process lifetime
- If a background thread crashes silently, the task status never updates

**Risk:**
- Memory leak over time in long-running containers
- Potential dict corruption under high concurrency (dict operations are not atomic)
- Lost task state on container restart (no persistence)

**Recommended Fix:**
- Replace `active_tasks` with a thread-safe `threading.RLock`-protected dict or `concurrent.futures.Future` map
- Or replace entirely with Redis-based task state (enables cross-instance visibility)
- Add a cleanup sweep that removes tasks older than N hours

---

## TD-02: Flask-Limiter Using In-Memory Storage

**File:** `helpers/limiter.py`  
**Severity:** MEDIUM  

**Problem:**
```python
limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
```
Rate limits are stored in-memory per process. If multiple instances run behind a load balancer, each instance has its own counter.

**Risk:**
- Rate limit bypass: a client can exceed the intended limit by hitting different instances
- No effective DDoS protection in multi-instance deployments

**Recommended Fix:**
- Replace `memory://` with Redis: `storage_uri="redis://redis-host:6379"`
- Deploy Redis as a shared cache sidecar

---

## TD-03: Salesforce Credentials Logged to stdout

**File:** `helpers/azure_table_helper_for_sf.py`  
**Severity:** HIGH (Security)  

**Problem:**
```python
print(payload)  # payload contains SF username + password
```

**Risk:**
- Salesforce credentials appear in container logs
- Logs may be shipped to a central logging system (e.g., Azure Monitor) visible to more people than intended
- OWASP A09: Security Logging and Monitoring Failures

**Recommended Fix:**
- Remove the `print(payload)` statement immediately
- If debugging is needed, log only non-sensitive fields

---

## TD-04: Hardcoded Report Recipient Email

**File:** `helpers/generate_report_helper.py`  
**Severity:** MEDIUM  

**Problem:**
The PDF report recipient email address is hardcoded in the source file.

**Risk:**
- Changing the recipient requires a code change + deployment
- Cannot be changed per environment (dev vs. prod)
- Wrong recipient if codebase is reused

**Recommended Fix:**
- Store recipient in Azure Key Vault as `reportRecipientEmail`
- Load via `param` config class

---

## TD-05: `use_mailchimp` Feature Flag is Code-Level

**File:** `configuration/generic_config.py`  
**Severity:** LOW-MEDIUM  

**Problem:**
```python
class param:
    use_mailchimp = False  # Class-level attribute
```
This flag controls which email provider is used but cannot be changed at runtime without redeploying.

**Risk:**
- Cannot quickly switch email providers during an incident
- No environment-specific override without code change

**Recommended Fix:**
- Add a `useMailchimp` secret to Azure Key Vault
- Load as a lazy property: `@property def use_mailchimp(self): return fetch_secret_from_azure("useMailchimp") == "true"`

---

## TD-06: Eager Loading of `azureConnectionString`

**File:** `configuration/generic_config.py`  
**Severity:** MEDIUM  

**Problem:**
```python
class param:
    connection_string = fetch_secret_from_azure("azureConnectionString")  # EAGER
    # vs. all other secrets which are lazy @property
```
This triggers a Key Vault API call at **module import time**, not on first use.

**Risk:**
- Any module that imports `generic_config` triggers a KV call
- Fails fast but noisily — test environments that don't need Azure Storage will fail to import
- Slows cold starts

**Recommended Fix:**
- Convert to lazy `@property` pattern matching all other secrets

---

## TD-07: Redundant JWT Decoding (3× per Request)

**File:** `helpers/authenticate.py`  
**Severity:** LOW-MEDIUM  

**Problem:**
When all three decorators are stacked on one endpoint:
```python
@token_required        # Decodes JWT
@permission_required   # Decodes JWT again
@extract_user_id       # Decodes JWT again
```
The JWT is decoded three separate times per request.

**Risk:**
- Minor performance overhead (cryptographic operation × 3)
- Code duplication increases maintenance surface

**Recommended Fix:**
- Decode JWT once in `@token_required`, store result in `flask.g` (request context)
- Subsequent decorators read from `flask.g.token_payload`

---

## TD-08: Two Competing `extract_user_id` Decorators

**Files:** `helpers/authenticate.py` and `helpers/user_specfic_helper.py`  
**Severity:** LOW  

**Problem:**
Two decorators with the same purpose (`extract_user_id`) exist in different modules:
- `helpers/authenticate.py`: includes `department_id` in the injected values
- `helpers/user_specfic_helper.py`: simpler version, no `department_id`

**Risk:**
- Developers may use the wrong one, missing `department_id` or creating inconsistent behavior
- Ongoing confusion during onboarding

**Recommended Fix:**
- Consolidate into a single `extract_user_id` in `helpers/authenticate.py`
- Deprecate and remove the one in `user_specfic_helper.py`

---

## TD-09: Mixed `print()` and `logger` Calls

**Files:** Multiple across codebase  
**Severity:** LOW  

**Problem:**
Some modules use `print()` for debug output alongside or instead of proper `logging` calls.

**Risk:**
- `print()` output cannot be filtered by log level
- `print()` output is not structured (no timestamp, module name, level)
- Makes log aggregation and alerting harder

**Recommended Fix:**
- Replace all `print()` with appropriate `logger.debug/info/warning/error()` calls
- Run: `grep -rn "print(" . --include="*.py"` to find all occurrences

---

## TD-10: No DB Migration Framework

**Severity:** MEDIUM  

**Problem:**
Schema changes are applied manually via psql/Azure Portal. There is no version-controlled migration history.

**Risk:**
- No rollback path for schema changes
- Unclear which schema version a given codebase version requires
- Coordination burden between devs when multiple schema changes are in flight

**Recommended Fix:**
- Adopt Alembic (works with raw SQL, no ORM required)
- Maintain a `migrations/` folder with numbered revision files

---

## TD-11: No Cascading Deletes in Campaign Relationships

**Severity:** LOW-MEDIUM  

**Problem:**
When a campaign is deleted, related records in junction tables (e.g., `campaign_audience_group_map`, `campaign_contacts_map`) may not be automatically cleaned up.

**Risk:**
- Orphaned records accumulate over time
- Queries joining across these tables may return stale results

**Recommended Fix:**
- Add `ON DELETE CASCADE` to foreign keys in campaign relationship tables
- Or implement explicit cleanup in the delete campaign helper

---

## TD-12: Background Task State Not Shared Across Workers

**Severity:** MEDIUM (Scalability)  

**Problem:**
`BackgroundEmailProcessor.active_tasks` is an in-memory dict. If multiple containers run, task status is only visible within the container that started the task.

**Risk:**
- `GET /api/background-email-status/<task_id>` returns "not found" if routed to a different instance
- Cannot scale horizontally without breaking task status visibility

**Recommended Fix:**
- Store task state in Redis with TTL
- Or store in PostgreSQL `scheduler` schema table

---

## TD-13: Auth Bypass in Test Suite

**File:** `unit_test/conftest.py`  
**Severity:** LOW (Test Quality)  

**Problem:**
```python
# Global patches that bypass ALL auth checks
@pytest.fixture(autouse=True)
def mock_token_required(...):
    ...
```
All auth decorators are patched out globally. Tests do not validate that endpoints actually enforce authentication.

**Risk:**
- A developer could accidentally remove `@token_required` from an endpoint and tests would still pass
- No coverage of auth failure scenarios by default

**Recommended Fix:**
- Keep auth bypass as opt-in, not opt-out (use `autouse=False` + explicit fixture use)
- Add a separate test class that verifies unauthenticated requests return 401

---

## TD-14: Playwright PDF in Main Web Process

**Severity:** MEDIUM  

**Problem:**
PDF report generation spawns a Chromium browser in the same process as the Flask API. Playwright/Chromium is CPU and memory intensive.

**Risk:**
- Long-running PDF generation blocks WSGI worker threads
- Memory spikes during PDF generation can affect API response times
- Concurrent report requests multiply the impact

**Recommended Fix:**
- Move PDF generation to a background task (similar to email sends)
- Or move to a separate microservice/Azure Function

---

## Summary Table

| ID | Issue | Severity | Effort to Fix |
|----|-------|----------|---------------|
| TD-01 | BackgroundEmailProcessor memory leak | HIGH | Medium |
| TD-02 | Flask-Limiter in-memory (no multi-instance) | MEDIUM | Low |
| TD-03 | SF credentials logged to stdout | HIGH | Trivial |
| TD-04 | Hardcoded report recipient | MEDIUM | Low |
| TD-05 | `use_mailchimp` code-level flag | LOW-MEDIUM | Low |
| TD-06 | Eager KV load for `azureConnectionString` | MEDIUM | Low |
| TD-07 | JWT decoded 3× per request | LOW-MEDIUM | Medium |
| TD-08 | Duplicate `extract_user_id` decorators | LOW | Low |
| TD-09 | Mixed `print()` + `logger` | LOW | Low |
| TD-10 | No DB migration framework | MEDIUM | High |
| TD-11 | No cascading deletes | LOW-MEDIUM | Medium |
| TD-12 | Task state not shared across workers | MEDIUM | High |
| TD-13 | Auth bypassed globally in tests | LOW | Low |
| TD-14 | Playwright in main web process | MEDIUM | High |
