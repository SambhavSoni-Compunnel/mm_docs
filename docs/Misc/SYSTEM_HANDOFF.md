# System Architecture & Integration Handoff

## Overview
This system integrates email campaign management with LinkedIn enrichment, validation, and scheduling. Data flows through MCMP (email service), ZeroBounce (validation), Proxycurl (LinkedIn enrichment), Gemini AI (content generation), and Azure Storage (assets).

---

## 1. Email Sending Pipeline (MCMP Integration)

### What It Does
Sends bulk emails through the MCMP service with recipient validation, tracking, and attachment support.

### Data Flow
```
Campaign data → Filter valid emails (ZeroBounce) → MCMP POST /api/Communicator/Publish 
→ Returns tracking IDs → Webhook listener captures delivery events
```

### Key Details

**Outbound Request**
- **Endpoint:** `POST /api/Communicator/Publish`
- **Auth:** Headers `x-api-key` + `x-secret-key` (env-specific)
- **Payload:** Multipart form data
  - `channel` — email channel identifier
  - `content` — email body
  - `subject` — email subject
  - `sendTo` — recipient email addresses
  - `SenderDisplayName`, `Sender` — from address
  - `customArguments` — JSON with `camp_id`, `user_id`, `tags`, `sender`
  - `isAttachment`, file attachment(s) — base64 decoded → multipart bytes

**Response**
- Returns dict: `{ successful: [...], failed: [...], total: int }`

**Inbound Webhook**
- **Endpoint:** `POST /api/mcmp/webhook`
- **Auth:** Bearer token validated via HMAC
- **Payload:** Array of events, each with type + metadata
- **Supported Events:** `processed`, `delivered`, `bounce`, `deferred`, `dropped`, `open`, `click`, `spam`, `unsubscribe`
- **Storage:** Each event → `tracking.mcmp_events` table (fields: `camp_id`, `user_id`, `tags`, event type)

### Where to Look
- Outbound: `messageharbour` helper, `send_bulk_emails_via_messageharbour()` function
- Inbound: Webhook route, event parser, `tracking.mcmp_events` insert logic

---

## 2. Email Validation (ZeroBounce)

### What It Does
Validates email addresses before sending; caches results to avoid redundant API calls.

### Data Flow
```
Recipient list → Check cache (MM_schema.email_validation_cache) 
→ Fetch uncached/expired via ZeroBounce API 
→ Update cache → Categorize (valid/invalid) 
→ Return filtered list to MCMP
```

### Key Details

**Batching & Rate Limiting**
- Splits emails into batches of 90 (API limit is 100, 90 used safely)
- Between batches: 200ms sleep
- On HTTP 429: Exponential backoff (2s → 4s → 8s), up to 3 retries

**Cache Logic**
- Table: `MM_schema.email_validation_cache`
- Upsert on every validation run with `last_checked = now()`
- Before calling ZeroBounce, check cache first

**Categorization Rules**
- **Allowed:** `valid`, `catch-all` statuses
- **Rejected:** `invalid`, `spamtrap`, `abuse`, `do_not_mail`, `unknown`
- Returns: `{ valid: [...], invalid: [...] }`

### Where to Look
- Cache check & update: `update_validation_cache()`
- ZeroBounce batch call: `zb.validate_batch()`, wrapped in retry logic
- Merge & categorize: `clean_zb_response()`, status mapping

---

## 3. Scheduled Emails

### What It Does
Sends emails at a future time; persists jobs across server restarts.

### Data Flow
```
Campaign with send_at time 
→ insert_scheduled_mail() stores in DB 
→ APScheduler registers job 
→ At trigger time: fetch from DB → send_bulk_emails_via_messageharbour()
```

### Key Details

**Setup**
- Scheduler: APScheduler `BackgroundScheduler`
- Job Store: `scheduler.apscheduler_jobs` table (PostgreSQL)
- Timezone: IST

**Flow**
1. Email payload → `insert_scheduled_mail()` (DB insert)
2. Register job in scheduler: `scheduled_mail_<mail_id>`
3. At scheduled time → `execute_scheduled_email_job(mail_id)` fires
4. Fetch payload from DB → call MCMP send

**Recovery on Restart**
- Cronjob: `poll_and_schedule_pending_mails()` runs every 1 minute
- Picks up any pending emails from DB (not yet sent, not past due)
- Re-registers them in the scheduler

### Where to Look
- Insert & job registration: `insert_scheduled_mail()`
- Job execution: `execute_scheduled_email_job()`
- Recovery: `poll_and_schedule_pending_mails()` (runs on app startup + periodic loop)

---

## 4. Follow-up Emails

### What It Does
Sends templated follow-up emails based on recipient engagement (click → hot, open → warm, delivered → cold).

### Data Flow
```
Campaign send → Save templates + schedule rows 
→ At trigger time: Query last 7 days of engagement 
→ Match priority → Resolve template → Send
```

### Key Details

**Saved at Campaign Send Time**
- `followup_emails` table — templates per lead_type (hot/warm/cold) + campaign_run_id
- `scheduled_followups` table — one row per contact (scheduled_time, status=pending, owner_email)

**At Trigger Time**
1. Query `tracking.mcmp_events` (last 7 days) for the contact
2. Pick highest priority event:
   - Click → hot
   - Open → warm
   - Delivered → cold
   - (default: cold)
3. Resolve template: Try hot → warm → cold until found
4. Send via MCMP with `skip_validation=True` (already validated)
5. Update `scheduled_followups.status` → `sent` or `skipped`

**Recovery on Restart**
- Cronjob: `poll_and_schedule_pending_followups()` runs every 1 minute
- Re-registers any pending rows not yet scheduled (e.g., after restart)

### Where to Look
- Template save & job registration: Campaign send logic
- Trigger execution: `process_scheduled_followup(scheduled_id, campaign_run_id, contact_id)`
- Recovery: `poll_and_schedule_pending_followups()`

---

## 5. Email Content Generation (Gemini AI)

### What It Does
Generates personalized or generic email subject + body using Gemini Flash.

### Data Flow
```
Two paths:
1. Personalized: LinkedIn profile (Proxycurl) → Prompt → Gemini → Subject + Body
2. Generic: Campaign description → Prompt → Gemini → Subject + Body
```

### Key Details

**Shared Function**
- `generate_follow_up_emails(prompt, ...)` — both paths converge here
- Model: `gemini-flash-lite-latest`
- Config: `temperature=0.2`, `top_p=1.0`, `max_output_tokens=1024`
- Wrapped in: `@retry_with_timeout(max_retries=3, timeout=30s)`

**Personalized Flow (Path 1)**
- Fetch LinkedIn data via Proxycurl
- Build prompt: profile info + company/domain type + tone/format
- Call Gemini → parse response (first line = subject, rest = body)
- Location: `generated_mail_helper.py` → `get_email_content()`

**Generic Flow (Path 2)**
- No LinkedIn data
- Build prompt: campaign description + company/domain type + tone
- Call Gemini → same parsing
- Location: `generate_generic_email_helper.py` → `generate_generic_email()`

**Response Parsing**
```
response.text
  split on first newline
  → Subject (line 1)
  → Body (remaining)
```

### Where to Look
- Shared: `generate_follow_up_emails()` with retry & timeout decorators
- Personalized: `generated_mail_helper.get_email_content()`
- Generic: `generate_generic_email_helper.generate_generic_email()`
- Gemini client init: `genai.Client(api_key)`

---

## 6. LinkedIn Enrichment Pipeline (Enrichlayer)

### What It Does
Fetches LinkedIn profiles via Proxycurl, downloads photos to Azure, and stores structured data.

### Data Flow
```
Trigger (manual/external) 
→ Pull LinkedIn URLs from contacts 
→ For each: Proxycurl call → Photo to Azure 
→ UPSERT to 4 tables → Send summary email
```

### Key Details

**Step 1: Collect Targets**
- Table: `MM_schema.audience_group_contacts`
- Column: `poc_linkedin` (LinkedIn profile URL)
- Pull all distinct URLs with values

**Step 2: Per-Profile Enrichment**
- Call Proxycurl API → get full profile JSON
- If photo URL exists:
  - Download image
  - Upload to Azure Blob Storage as `{username}.jpg`
- UPSERT results (all safe to re-run):
  - `MM_linkedin_schema.raw_profiles` — full JSON response
  - `MM_linkedin_schema.filtered_profiles` — key fields (name, title, location, skills, summary)
  - `MM_linkedin_schema.filtered_experiences` — work history
  - `MM_linkedin_schema.filtered_activities` — LinkedIn activity log

**Step 3: Rate Control**
- 1.2s wait between profiles
- After every 100 profiles: 60s pause
- Proxycurl 429 or 5xx: Retry up to 5 times with exponential backoff
- Hard cap: 18 API calls per 60 seconds (token bucket, thread-safe)

**Step 4: Notification**
- After full run: Send HTML summary email via MCMP
- Content: Total processed / success / failure counts + list of failed URLs

**Cache Benefit at Email Generation**
- Before calling Proxycurl live, check `MM_linkedin_schema.filtered_profiles` first
- Only fetch if profile not already cached

### Where to Look
- Main trigger: Enrichlayer pipeline entry point
- Per-profile call: Proxycurl wrapper with rate limiting & retry
- Photo upload: Azure Blob Storage logic
- UPSERT logic: 4-table write flow
- Summary email: Post-run notification handler

---

## 7. Access Control (RBAC)

### What It Does
Manages user roles, permissions, and data visibility via JWT claims and decorator stack.

### Data Flow
```
User login → Encode role + permissions + department + user_id in JWT 
→ On protected endpoint: Validate token → Check permissions → Scope data
```

### Key Details

**Permissions Model**
- Table: `MM_schema.roles`
- Structure: Permissions dict — `{ "campaign": "c,r,u", "users_and_roles": "r", ... }`
- Initials: `c` = create, `r` = read, `u` = update, `d` = delete

**At Login**
- Embed into JWT payload:
  - User's role
  - Permissions dict
  - `department_id`
  - `user_id`
- No DB lookup on every request (JWT is self-contained)

**On Protected Endpoint (Decorator Stack)**
1. `@token_required` — Verify JWT signature is valid
2. `@permission_required("module", "r,c")` — Decode token, check if user has required initials (OR logic by default)
3. `@extract_user_id` — Scope data based on role:
   - `superadmin`: `user_id = None` → sees everything
   - `admin`: `user_id = None` + `department_id` injected → sees all data in their department
   - `regular user`: `user_id` injected → sees only their own data

### Department Implementation

**Structure**
- Each user has exactly one `department_id`
- Department is a grouping of users

**Department-Level Operations**
- Toggle status (activate/deactivate) for entire department at once:
  - If any user in dept is active → deactivate all active users
  - If all inactive → activate only users with a password set

**User Lifecycle**
1. Created with `status = inactive` (no password)
2. Password-creation email sent → user sets password
3. Only after password set can be activated (individually or via dept toggle)

**Data Retention**
- Soft-delete: `is_deleted = true` (not hard deleted)

### Where to Look
- Permission check: `@permission_required()` decorator
- Data scoping: `@extract_user_id()` decorator, role-based logic
- Department toggle: Department toggle endpoint logic
- User activation: Password validation + activation flow

---

## Quick Reference: Tables & Where Data Lives

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `tracking.mcmp_events` | Email delivery events | camp_id, user_id, tags, event_type, timestamp |
| `MM_schema.email_validation_cache` | ZeroBounce results cache | email, status, last_checked |
| `scheduler.apscheduler_jobs` | Scheduled email jobs | job_id, scheduled_time, mail_id |
| `followup_emails` | Follow-up templates per campaign | campaign_run_id, lead_type (hot/warm/cold), template |
| `scheduled_followups` | Follow-up job instances | scheduled_id, contact_id, scheduled_time, status |
| `MM_linkedin_schema.raw_profiles` | Raw Proxycurl JSON | linkedin_url, full_response |
| `MM_linkedin_schema.filtered_profiles` | Cleaned LinkedIn data | name, title, location, skills, summary |
| `MM_linkedin_schema.filtered_experiences` | Work history | profile_id, company, title, dates |
| `MM_linkedin_schema.filtered_activities` | Activity log | profile_id, activity, timestamp |
| `MM_schema.users` | User accounts | user_id, role_id, department_id, status, is_deleted |
| `MM_schema.roles` | Role definitions | role_id, permissions (JSON dict) |
| `MM_schema.departments` | Department groupings | department_id, name |

---

## Common Debugging Paths

**Email not sending?**
- Check `email_validation_cache` for recipient status
- Check MCMP logs for 429 (rate limit) or auth key mismatch
- Verify `customArguments` has correct camp_id, user_id

**Scheduled email missed?**
- Check `scheduler.apscheduler_jobs` for the job entry
- Run `poll_and_schedule_pending_mails()` manually
- Check timezone (IST) — confirm against DB timestamps

**LinkedIn enrichment slow?**
- Check Proxycurl rate limiting (1.2s per profile, 60s per 100)
- Verify token bucket implementation is thread-safe
- Check Azure upload status

**Permission denied on endpoint?**
- Decode JWT payload: check `permissions[module]` has required initial
- Verify decorator order: `@token_required` before `@permission_required`
- Check `department_id` scope if admin user

---

## Environment Variables Needed
- `MCMP_API_KEY` (x-api-key)
- `MCMP_SECRET_KEY` (x-secret-key)
- `MCMP_WEBHOOK_TOKEN` (Bearer token)
- `ZEROBOUNCE_API_KEY`
- `PROXYCURL_API_KEY`
- `GEMINI_API_KEY`
- `AZURE_BLOB_CONNECTION_STRING`
- `DATABASE_URL` (for APScheduler + app data)
- `JWT_SECRET_KEY`
