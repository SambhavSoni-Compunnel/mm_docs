# 18. Operational Runbook

## 18.1 Health & Status Checks

### Quick Health Check
```bash
curl https://marketminderai.compunnel.com/
# Expected: {"status": "API is running"}
```

### DB Connection Pool Status
```bash
curl https://marketminderai.compunnel.com/pool_status
# Returns: {used, available, total connections}
# Alert if: used approaching 150 (POOL_MAXCONN)
```

### Container Logs (Docker)
```bash
docker logs <container_id> --tail 100 --follow
```

---

## 18.2 Common Operational Issues

### Issue 1: Application Not Starting

**Symptoms:** Container exits immediately; health check returns nothing  
**Diagnosis Flow:**
```
1. Check container logs for startup errors
2. Look for "Connecting to Azure Key Vault to fetch secrets..."
3. If KV error: verify AZURE_TENANT_ID/CLIENT_ID/SECRET in configuration/.env
4. If DB error: check "Failed to create connection pool" message
5. If import error: check Python dependencies are installed
```

**Recovery:**
- Fix credentials → rebuild/restart container
- If DB temporarily unreachable: retry will happen automatically (5 attempts × 3s)

---

### Issue 2: All API Calls Return 401

**Symptoms:** Every authenticated request returns `{"statuscode": 401, "message": "Token has expired"}`  
**Cause:** JWT access tokens expire after 2 hours  
**Recovery:**
- Client must call `POST /api/v2/refresh-token` with refresh token
- If refresh token also expired (after 7 days): user must re-login

**Operational Action:** No server-side action needed. This is expected behavior.

---

### Issue 3: DB Connection Pool Exhausted

**Symptoms:** API requests hang; logs show `PoolError: connection pool exhausted`  
**Diagnosis:**
```bash
# Check pool status
curl /pool_status
# If used=150, pool is exhausted

# Check for connection leaks in logs
grep "Pool Status after getconn" logs | tail -50
# If used keeps growing without decreasing, connections are leaking
```

**Recovery Options:**
1. Restart container (releases all connections) — service interruption
2. Wait for active requests to complete and return connections
3. Kill long-running queries in PostgreSQL:
```sql
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds';

SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE duration > interval '5 minutes';
```

**Prevention:** Monitor pool usage trend; investigate connection leaks in helpers that might not properly return connections.

---

### Issue 4: Emails Not Being Sent

**Symptoms:** `POST /api/send_emails` succeeds but recipients receive nothing  
**Diagnosis Flow:**
```
1. Check background task status:
   GET /api/background-email-status/<task_id>
   
2. If status=failed: check container logs for MCMP error
   
3. If status=completed but no emails:
   a. Check MCMP API credentials (MCMP-API-KEY, MCMP-API-URL in Key Vault)
   b. Check if emails failed ZeroBounce validation
   c. Check unsubscribe list (emails may be in unSubscribedData Azure Table)
   
4. If status never changes from queued:
   Background thread may have crashed silently — check logs
```

**Recovery:**
- Fix MCMP credentials in Key Vault → restart not required (lazy-loaded on next request)
- For urgent sends: use `skip_validation=true` to bypass ZeroBounce if that's the bottleneck

---

### Issue 5: Scheduled Follow-up Emails Not Firing

**Symptoms:** Scheduled follow-up times pass without email sends  
**Diagnosis:**
```bash
# Check APScheduler jobs in DB
psql -c "SELECT id, next_run_time FROM scheduler.apscheduler_jobs ORDER BY next_run_time;"

# Check if scheduler is running (in logs)
grep "scheduler" logs | grep -i "start"
```

**Recovery:**
1. If scheduler didn't start: `start_followup_scheduler()` may have failed — restart app
2. If jobs exist but didn't fire: check if next_run_time is correct (IST timezone)
3. If jobs are stuck in past: they should fire on next scheduler check cycle
4. Delete and recreate stuck jobs via SQL (last resort):
```sql
DELETE FROM scheduler.apscheduler_jobs WHERE id = '<stuck_job_id>';
```

---

### Issue 6: Report Generation Fails

**Symptoms:** `POST /api/generate_report` returns 500  
**Diagnosis:**
```bash
# Check logs for Playwright errors
grep -i "playwright\|chromium\|browser" logs

# Check container memory
docker stats <container_id>
```

**Common Causes:**
- Chromium not installed: `playwright install chromium`
- Out of memory: Chromium needs ~500MB; check container memory limits
- Concurrent report generations: no queuing; second request may fail

**Recovery:**
- Increase container memory limits
- Add concurrency limit to report endpoint (one at a time)

---

### Issue 7: ZeroBounce API Errors

**Symptoms:** Email sends fail with ZeroBounce validation errors  
**Diagnosis:**
```bash
grep "ZeroBounce\|zerobounce" logs
```

**Common Causes:**
- API key invalid/expired
- ZeroBounce account out of credits
- ZeroBounce API downtime

**Recovery:**
1. Immediate: Add `skip_validation=true` to send request body (use cautiously)
2. Fix: Update `ZeroBounceApiKey` in Azure Key Vault
3. Check ZeroBounce dashboard for account status and credits

---

### Issue 8: Azure Key Vault Latency / Throttling

**Symptoms:** Slow API startup; intermittent 500 errors  
**Cause:** Key Vault throttles at 1000 GET operations per 10 seconds per vault  
**Mitigation Already In Place:** Lazy-loading with class-level caching (each secret fetched only once per process lifetime)  
**Recovery:**
- If throttled: wait and retry; the lazy-loading means after first successful fetch, no more KV calls
- If persistent: check for code paths that create new `param()` instances repeatedly

---

## 18.3 Deployment Checklist

### Before Deploying to Production
- [ ] All tests pass: `pytest unit_test/`
- [ ] No new secrets needed (or added to Key Vault)
- [ ] `param.use_mailchimp` flag is set correctly
- [ ] `configuration/.env` NOT included in image (it's in `.gitignore`)
- [ ] Docker build succeeds: `docker build -t market-minder:new .`
- [ ] Health check passes on new image
- [ ] Database schema changes applied (if any)

### After Deploying to Production
- [ ] Health check: `curl /` returns `{"status": "API is running"}`
- [ ] Pool status: `curl /pool_status` shows connections
- [ ] Test login with a known user account
- [ ] Test one end-to-end email send
- [ ] Check logs for startup errors

---

## 18.4 Rollback Strategy

Since there is no blue-green deployment setup described, rollback is done by redeploying the previous Docker image:

```bash
# Tag the known-good image before deploying
docker tag market-minder:current market-minder:stable

# If rollback needed:
docker stop <current_container>
docker run -d --name market-minder market-minder:stable
```

Database schema rollbacks are not automated — plan schema changes to be backward-compatible.

---

## 18.5 Log Inspection Guide

### Finding Specific Request Errors
```bash
# Find 500 errors
docker logs <container_id> 2>&1 | grep -i "error\|exception\|traceback"

# Find auth failures
docker logs <container_id> 2>&1 | grep "Token validation\|Permission check\|Access denied"

# Find DB issues
docker logs <container_id> 2>&1 | grep "OperationalError\|connection pool\|Pool Status"

# Find email sending activity
docker logs <container_id> 2>&1 | grep "background email\|MCMP\|MessageHarbour"
```

### Log Volume Warning
The application logs pool status (`Pool Status after getconn`) on **every DB connection**. In high-traffic scenarios, this will generate very high log volume. Consider adding a log level check or removing this in production.

---

## 18.6 DB Maintenance

### Check Large Tables
```sql
-- Check event table size
SELECT pg_size_pretty(pg_total_relation_size('tracking.mcmp_events')) AS events_size;

-- Count events
SELECT COUNT(*), MIN(timestamp), MAX(timestamp) FROM tracking.mcmp_events;

-- Check audience contacts
SELECT COUNT(*) FROM "MM_schema".audience_group_contacts;
```

### Archiving Old Events
No automatic archival is implemented. As `tracking.mcmp_events` grows, query performance for analytics will degrade. Implement periodic archival to a separate table for events older than 1 year.

### Vacuum / Analyze
PostgreSQL autovacuum should handle routine maintenance. If performance degrades after large imports:
```sql
VACUUM ANALYZE "MM_schema".audience_group_contacts;
VACUUM ANALYZE tracking.mcmp_events;
```

---

## 18.7 Key Contacts & Information

| Item | Value |
|------|-------|
| Production URL | `https://marketminderai.compunnel.com` |
| Dev URL | `https://marketminderai-dev.compunnel.com` |
| Azure Key Vault | `mmai-keyvault.vault.azure.net` |
| Key Vault Resource Group | (check Azure Portal) |
| PostgreSQL host | Fetched from KV secret `sqlHost` |
| Report email recipient | Hardcoded in `generate_report_helper.py → _REPORT_RECIPIENT` |
