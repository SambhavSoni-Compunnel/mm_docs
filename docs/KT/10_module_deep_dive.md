# 10. Module Deep Dive

## 10.1 Campaign Management Module

### Responsibility
CRUD operations on email campaigns. Campaigns are the top-level organizational unit — they define the purpose and context of email outreach, and they map to one or more audience groups.

### Architecture
```
api/manage_campaign/
  get_all_camp_list.py   → helpers/db_operations.py (paginated query)
  post_camp_data.py      → helpers/db_operations.py (get/update/delete)
  post_create_camp.py    → helpers/db_operations.py + audience group mapping + tag mapping
  post_delete_campaign.py
  post_update_campaign_audience_group_mapping.py
```

### Key Workflows

**Creating a Campaign:**
1. POST `/api/create_camp` with name, description, from_name
2. Inserts into `MM_schema.campaign`
3. For each `audience_group_id`: inserts into `campaign_audience_group_map`
4. For each tag: inserts into `tracking.campaign_tags`
5. All operations in single transaction

**Campaign Scoping:**
- superadmin sees all campaigns
- admin sees campaigns in their `department_id`
- user sees only campaigns `created_by` their `user_id`

### Internal Dependencies
- `helpers/db_operations.py` — all campaign DB queries
- `helpers/authenticate.py` — auth decorators
- `helpers/response.py` — response builders

### Failure Points
- Campaign creation succeeds but audience mapping fails: no rollback across operations (partial state possible if cursor commits between steps)
- No cascading delete: deleting a campaign may leave orphaned `campaign_audience_group_map` rows

---

## 10.2 Audience Management Module

### Responsibility
Manage contact groups that can be imported from CSV, Salesforce, or HubSpot and assigned to campaigns.

### Architecture
```
api/manage_audience/
  post_native_audience_data.py  → helpers/csv_file_upload.py
  post_integration_audience_data.py → helpers/csv_file_upload.py (from CRM data)
  post_aud_contact_data.py      → DB query on audience_group_contacts
  post_status_audience.py       → Status update
  post_delete_audience.py       → Delete audience group + contacts
  get_all_audience_list.py      → Paginated list with campaign mappings
  get_export_audience.py        → CSV export
```

### CSV Upload Pipeline

```mermaid
sequenceDiagram
    participant C as Client
    participant API as POST /api/csvupload
    participant H as csv_file_upload.py
    participant DB as PostgreSQL

    C->>API: multipart/form-data (CSV file + metadata)
    API->>H: save_to_postgresql(name, desc, file, ...)
    H->>DB: INSERT INTO audience_group (name, description, ...) RETURNING id
    DB-->>H: aud_id
    H->>H: Parse CSV with pandas
    H->>DB: SELECT column_name FROM information_schema.columns WHERE table='audience_group_contacts'
    DB-->>H: valid_columns list
    H->>H: Intersect CSV headers with DB columns
    H->>DB: execute_values(INSERT INTO audience_group_contacts ..., batch_data)
    H->>DB: INSERT INTO audience_tag (aud_id, tag_name) [if tags provided]
    H->>DB: INSERT INTO campaign_audience_group_map (campaign_id, aud_id) [if campaign_ids provided]
    DB-->>H: success
    H-->>API: {success: true, total_rows: N}
    API-->>C: 200 success_response
```

**Dynamic Column Mapping:** The CSV upload introspects the actual DB schema via `information_schema.columns` to determine which CSV columns map to DB columns. This is flexible but means new columns must be added to the DB before they appear in imports.

### Deduplication
Available via `POST /api/normalise_audiences`:
- Email normalization: lowercase + strip whitespace
- First occurrence wins (by list order)
- Returns both distinct and duplicate datasets for frontend display

### Failure Points
- No email format validation during CSV upload (validation happens at send time via ZeroBounce)
- Large CSV uploads may hold a DB connection for a long time during `execute_values`
- No progress reporting for large uploads

---

## 10.3 Run Campaign / Email Generation Module

### Responsibility
The core email workflow: fetch contacts, generate AI emails, validate recipients, send, track, and schedule follow-ups.

### Architecture
```
api/run_campaign/
  fetch_contacts_by_groups.py  → contact fetch with LinkedIn profile join
  post_generic_email_generate.py → AI generic email generation
  post_followup_email_generate.py → AI follow-up email generation
  post_send_mail.py            → Email dispatch (MCMP or Mailchimp)
  get_background_email_status.py → Task status polling
  post_draft.py                → Draft save/load
  post_normalise_audiences.py  → Deduplication
  get_draft_list.py            → Draft listing
  get_email_quota.py           → Quota check
  get_domain_list.py           → Sender domain list
  get_industry_list.py         → Industry options
  get_run_camp_data.py         → Campaign run view data
  post_get_profile.py          → LinkedIn profile fetch
```

### AI Email Generation Pipeline

```mermaid
sequenceDiagram
    participant C as Client
    participant API as POST /api/generate_generic_email
    participant H as generate_generic_email_helper.py
    participant DB as PostgreSQL
    participant AI as Google Gemini / OpenAI

    C->>API: {word_limit, company_type, domain_type, format_type, manual_addition, camp_id}
    API->>H: get_camp_details(camp_id)
    H->>DB: SELECT description, from_name FROM campaign WHERE id = %s
    DB-->>H: camp_desc, signature
    H->>H: build_generic_email_prompt(word_limit, ..., camp_desc)
    H->>AI: Generate email with structured prompt
    Note over H,AI: Prompt specifies exact format:\nSubject: <line>\nHi {{recipient_name}}\n<ul><li>...</li></ul>
    AI-->>H: Generated email text
    H->>H: parse_subject_and_body(generated_text)
    H-->>API: {subject, email_body}
    API-->>C: {subject, email_body}
```

### Email Send Pipeline

```mermaid
sequenceDiagram
    participant C as Client
    participant API as POST /api/send_emails
    participant EPH as email_processing_helper.py
    participant ZB as zerobounce_helper.py
    participant Cache as email_validation_cache (PostgreSQL)
    participant BEP as BackgroundEmailProcessor (thread)
    participant MCMP as MessageHarbour API

    C->>API: {emails:[...], subject, text, contact_ids, recipient_names, campaign_id}
    API->>EPH: process_email_request_mcmp(data)
    EPH->>EPH: parse_request_data() [multipart or JSON]
    EPH->>ZB: validate_emails_with_cache(emails)
    ZB->>Cache: fetch_cached_validations(emails)
    Cache-->>ZB: cached_results (up to 30 days old)
    ZB->>ZB: split_emails_by_cache() → (cached_valid, needs_api_call)
    ZB->>ZB: ZeroBounce.validate_batch_emails(needs_api_call)
    ZB->>Cache: update_validation_cache(new_results)
    ZB-->>EPH: filtered_valid_emails
    EPH->>BEP: queue_email_task(task_id, send_bulk_emails_via_messageharbour, ...)
    BEP->>BEP: threading.Thread(daemon=True).start()
    EPH-->>C: {task_id: "...", status: "queued"}
    
    Note over BEP,MCMP: Background execution
    BEP->>MCMP: POST to MCMP_API_URL with {To, From, Subject, Body, Attachments}
    MCMP-->>BEP: delivery response
    BEP->>BEP: Update active_tasks[task_id] status
```

### Follow-up Email Scheduling

When `schedule_follow_up: true` is passed in the send request:

```python
# email_processing_helper.py
scheduler.add_job(
    func=execute_scheduled_email_job,
    trigger='date',
    run_date=scheduled_time,  # User-specified IST datetime
    args=[contact_id, campaign_run_id, ...],
    id=unique_job_id,
    replace_existing=True
)
```

Jobs are persisted in `scheduler.apscheduler_jobs` and survive app restarts.

### Failure Points
- `BackgroundEmailProcessor.active_tasks` is a plain dict; in a multi-worker deployment, tasks on different workers won't be visible to status polling on another worker
- Email validation skipped if `skip_validation=true` in request — must be used carefully
- No retry for failed MCMP sends in the background processor
- Daemon threads are killed without cleanup if process exits unexpectedly

---

## 10.4 Tracking & Analytics Module

### Responsibility
Ingest email engagement events via webhooks, store them in PostgreSQL, and provide analytics query APIs for dashboards.

### Webhook Ingestion

```mermaid
sequenceDiagram
    participant MCMP as MessageHarbour / Mailchimp
    participant WH as POST /api/mcmp/webhook
    participant MP as mailchimp_webhook_processing.py
    participant DB as tracking.mcmp_events

    MCMP->>WH: POST webhook payload
    WH->>WH: Validate webhook token
    WH->>MP: extract_payload() [JSON or form-encoded mandrill_events]
    MP->>MP: For each event: extract_event_details()
    MP->>MP: process_event(event, supported_events, subaccount)
    MP->>MP: extract_metadata(event_type, event)
    MP->>DB: insert_mailchimp_event(event_type, email, raw_payload, ...)
    DB-->>MP: success
    WH-->>MCMP: 200 OK
```

Supported event types: `delivered`, `open`, `click`, `bounce`, `spam`, `unsubscribe`

### Dashboard Filtering

Events can be filtered by:
- `period` (daily/weekly/monthly/yearly) or custom `time_range` (start,end dates)
- `sender` email
- `tags` (JSONB query on `raw_payload`)
- `campaign_id`

Default time range: 1 month if no filter specified.

### Analytics Data Model

The `get_operational_analytics` endpoint returns all widget data in a single query. `operational_analytics_helper.py` provides:
- Device analytics
- Geographic distribution
- Email performance metrics (open rate, click rate, bounce rate)
- Timeline data

---

## 10.5 Reporting Module

### Responsibility
Generate periodic PDF reports of email activity and email them to a designated recipient.

### Report Generation Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as POST /api/generate_report
    participant GR as generate_report_helper.py
    participant DB as PostgreSQL
    participant PW as Playwright (Chromium)
    participant EM as Email Service
    participant AzB as Azure Blob

    C->>API: {start_date, end_date}
    API->>GR: generate_report(start_date, end_date)
    GR->>DB: fetch_users() → all registered users
    GR->>DB: fetch_events_with_users() → all events with user join
    GR->>GR: Filter events by date range
    GR->>GR: Aggregate metrics per user
    GR->>GR: Render HTML report (string template)
    GR->>AzB: generate_sas_url() for logo image
    GR->>PW: sync_playwright() → browser.new_page()
    GR->>PW: page.set_content(html)
    GR->>PW: page.pdf(path="/app/reports/report.pdf")
    PW-->>GR: PDF file written
    GR->>EM: Send email with PDF attachment to _REPORT_RECIPIENT
    EM-->>GR: send success
    GR-->>API: success
    API-->>C: "Report generated and sent to {_REPORT_RECIPIENT}"
```

**Report Recipient:** Hardcoded in `generate_report_helper.py` as `_REPORT_RECIPIENT`. This needs to be made configurable.

**Playwright Dependency:** Chromium browser must be installed in the Docker image (done in Dockerfile with `playwright install chromium`).

---

## 10.6 User & Roles Module

### Responsibility
Manage users, roles, and departments with full RBAC enforcement.

### Key Operations

**User Creation Flow:**
1. Admin creates user via `POST /api/users_data` (action=create)
2. User record created without password
3. `POST /api/resend_password_create_mail` sends onboarding email
4. User clicks link → `POST /api/onboard_create_password` → sets password

**Permission Assignment:**
- Permissions are stored in `MM_schema.roles.permissions` as JSONB
- When user logs in (V2), permissions are fetched from the role and embedded in JWT
- Permission initials are computed via `perms_initial_converter()`

**Department Scoping:**
- All users belong to a department
- Admins can see all data within their department
- Department status affects user access (inactive department → restricted access, inferred)

---

## 10.7 Integration Module

### Responsibility
OAuth2 integration with Salesforce and HubSpot to import contacts directly into audience groups.

### Architecture

```
api/integration/
  sign_in_url.py          → get_sign_in_url(connector_id)
  token_generator.py      → generate_tokens(connector_id, auth_code, ...)
  get_account_contact_data.py → fetch_integration_accounts(...)
  get_update_integration_data.py
  get_integration_data_for_filters.py

helpers/integration_helper.py  → CRM dispatcher (routes by connector_id)
helpers/salesforce_integration_helper.py → Salesforce OAuth + API
helpers/hubspot_integration_helper.py    → HubSpot OAuth + API
helpers/integration_db_helper.py         → Token storage in DB
```

### HubSpot PKCE Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Market Minder API
    participant HS as HubSpot OAuth

    FE->>API: GET /api/integration/sign_in_url?connector_id=2
    API->>API: Generate code_verifier (secrets.token_urlsafe(64))
    API->>API: Compute code_challenge = base64(sha256(code_verifier))
    API->>API: Generate state token
    API-->>FE: {signin_url, code_verifier, state}
    FE->>HS: Redirect to HS OAuth with code_challenge
    HS-->>FE: Redirect to callback URL with auth_code
    FE->>API: POST /api/integration/token_generator {connector_id, auth_code, code_verifier}
    API->>HS: POST token_url {grant_type, client_id, client_secret, auth_code, code_verifier}
    HS-->>API: {access_token, refresh_token}
    API->>DB: INSERT integration_data (user_id, connector_id, refresh_token, ...)
    API-->>FE: {status: "success"}
```

---

## 10.8 Email Template Module

### Responsibility
CRUD management of reusable email templates that users can select during campaign runs.

### Key Files
- `api/email_template/post_create_email_template.py`
- `api/email_template/post_get_all_email_templates.py`
- `api/email_template/post_delete_email_template.py`
- `helpers/email_template_helper.py` — DB operations

Templates are stored in the PostgreSQL DB (inferred table: `MM_schema.email_templates`).

---

## 10.9 Enrichment Pipeline Module

### Responsibility
Weekly batch job that enriches audience contacts with LinkedIn profile data via the Proxycurl API.

### Architecture
```
enrichlayer_pipeline/
  weekly_batch_script.py        → Main batch runner
  single_test_script.py         → Test single URL
  db_insert.py                  → Insert functions for all 4 enrichment tables
  enrichment_summary_notifier.py → Send summary email after batch
  Dockerfile.enrich              → Separate container image
```

### Enrichment Pipeline

```mermaid
sequenceDiagram
    participant Cron as External Cron / Scheduler
    participant WB as weekly_batch_script.py
    participant DB as PostgreSQL
    participant LH as linkedIn_helpers.py
    participant PC as Proxycurl API
    participant IU as image_utils.py
    participant AzB as Azure Blob

    Cron->>WB: run_weekly_enrichment_from_audience_contacts()
    WB->>DB: SELECT DISTINCT poc_linkedin FROM audience_group_contacts WHERE poc_linkedin IS NOT NULL
    DB-->>WB: linkedin_urls list

    loop For each URL (with 1.2s delay, 60s cooldown per 100 batch)
        WB->>LH: handle_profile_enrichment(url)
        LH->>PC: GET Proxycurl profile API (rate-limited: 18/min)
        PC-->>LH: profile_data
        LH->>IU: process_profile_image_with_retry(pic_url, blob_name)
        IU->>AzB: Upload image as {identifier}.jpg
        LH->>DB: insert_raw_profile(conn, identifier, full_data)
        LH->>DB: insert_filtered_profile(conn, extracted)
        LH->>DB: insert_filtered_experiences(conn, identifier, experiences)
        LH->>DB: insert_filtered_activities(conn, identifier, activities)
    end

    WB->>WB: Log summary (total, success, failed)
    WB->>EM: Send summary notification email
```

**Rate Limiting:** The `RateLimiter` (token bucket) limits Proxycurl API calls to 18/minute. Between batches of 100, there's a 60-second cooldown. Between individual profiles, there's a 1.2-second sleep. This is conservative and suitable for Proxycurl's rate limits.

**Separate Dockerfile:** The enrichment pipeline has its own `Dockerfile.enrich`, allowing it to run as a separate container/service independent of the main API.

---

## 10.10 Automation Admin Module

### Responsibility
Manage the automated follow-up system: alert switches control whether automated emails are sent to specific contacts, and the review mail module allows admins to inspect sent email history.

### Alert Switch System

The alert switch is stored in an **Azure Table** (`triggertable`) rather than PostgreSQL. The `AlertSwitch` column is a boolean per LinkedIn username:

```python
# automation_helper.py
def get_follow_up_alert_status(queue_name, threshold_days=16, max_no_of_follow_ups=2):
    # Reads AlertSwitch from Azure Table
    # If AlertSwitch = False → no follow-up (admin-blocked)
    # Checks Azure Queue for message age and count
    # If messages >= max_no_of_follow_ups + 1 → stop (limit reached)
    # If latest message < threshold_days old → no alert needed
```

**Azure Queue Usage:** Each contact has an associated Azure Queue. Messages in the queue represent sent follow-up emails. Queue message age determines if a follow-up is overdue.

### Unsubscribe Management

Unsubscribed contacts are stored in **Azure Table** (`unSubscribedData`). Before sending any email, the send pipeline checks this table to skip unsubscribed recipients.
