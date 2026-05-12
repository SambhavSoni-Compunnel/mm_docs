# 9. API Documentation

## 9.1 API Overview

| Category | Endpoint Count | Auth Required |
|----------|---------------|--------------|
| Authentication | 7 | Partial (login/register: no; others: yes) |
| Campaign Management | 5 | Yes (campaign module) |
| Audience Management | 6 | Yes (audience module) |
| Run Campaign | 13 | Yes (run_campaign module) |
| Tracking & Analytics | 7 | Yes (analytics/dashboard) |
| Users & Roles | 12 | Yes (users_and_roles module) |
| CRM Integration | 5 | Yes |
| Email Templates | 3 | Yes |
| Automation Admin | 10 | Yes |
| System | 2 | No |
| **Total** | **~70** | — |

All authenticated endpoints require:
- `Authorization: Bearer <jwt_access_token>` header

---

## 9.2 Authentication APIs

### `POST /api/register`
| Field | Value |
|-------|-------|
| Auth | None |
| Purpose | Register a new user account |
| Body | `{"email", "password", "firstname", "lastname"}` |
| Returns | JWT access token |
| Side Effects | Inserts into `MM_schema.users`; bcrypt hashes password |
| Notes | V1 registration; no role/department assignment at this step |

### `POST /api/login`
| Field | Value |
|-------|-------|
| Auth | None |
| Purpose | V1 login (legacy) |
| Body | `{"email", "password"}` |
| Returns | JWT token (no refresh token) |
| Notes | Uses plain/legacy password comparison; consider migrating to V2 |

### `POST /api/v2/login`
| Field | Value |
|-------|-------|
| Auth | None |
| Rate Limit | 10 per minute per IP |
| Purpose | V2 industry-standard login |
| Body | `{"email", "password"}` |
| Returns | `{"access_token", "refresh_token", "user": {...}}` |
| Side Effects | Updates `last_login`; auto-upgrades legacy password hashes to bcrypt |
| Security | HTTPS enforced in production; generic error messages |

### `POST /api/v2/refresh-token`
| Field | Value |
|-------|-------|
| Auth | None (refresh token in body) |
| Purpose | Exchange refresh token for new access token |
| Body | `{"refresh_token": "<token>"}` |
| Returns | `{"access_token": "<new_token>"}` |
| Notes | Refresh token NOT rotated; 7-day validity |

### `POST /api/logout`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Log out (client-side token discard) |
| Notes | No server-side token revocation; logout is client-side only |

### `POST /api/forgot_password`
| Field | Value |
|-------|-------|
| Auth | None |
| Purpose | Initiate password reset flow |
| Body | `{"email": "user@co.com"}` |
| Side Effects | Sends password reset email with time-limited JWT link |

### `POST /api/reset_password`
| Field | Value |
|-------|-------|
| Auth | None (reset token in body) |
| Purpose | Complete password reset |
| Body | `{"token": "<reset_token>", "password": "new_pass"}` |
| Side Effects | Updates `password_hash` in DB |

### `POST /api/auth/change-password`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Change password while logged in |
| Body | `{"old_password": "...", "new_password": "..."}` |
| Side Effects | Updates `password_hash`; verifies old password first |

---

## 9.3 Campaign Management APIs

### `GET /api/all_camp_list`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("campaign", "r")` |
| Purpose | List all campaigns (scoped by user role) |
| Query Params | `search`, `cursor` (page), `offset` (page size) |
| Returns | Paginated campaign list |
| Scope | superadmin: all; admin: department; user: own campaigns |

### `POST /api/camp_data`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("campaign", "r,u,d")` |
| Purpose | Get, update, or delete a specific campaign |
| Body | `{"action": "get"/"update"/"delete", "campaign_id": N, ...}` |

### `POST /api/create_camp`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("campaign", "c")` |
| Purpose | Create a new campaign |
| Body | `{"name", "description", "from_name", "audience_group_ids": [...], "tags": [...]}` |
| Side Effects | Inserts campaign; maps to audience groups; maps campaign tags |

### `POST /api/delete_campaign`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("campaign", "d")` |
| Purpose | Delete a campaign |
| Body | `{"campaign_id": N}` |

### `POST /api/update_campaign_audience_group_mapping`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("campaign", "u")` |
| Purpose | Update which audience groups are mapped to a campaign |
| Body | `{"campaign_id": N, "audience_group_ids": [...]}` |

---

## 9.4 Audience Management APIs

### `GET /api/all_aud_list`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("audience", "r")` |
| Purpose | List all audience groups (scoped by role) |
| Query Params | Pagination, search |

### `POST /api/csvupload`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("audience", "c")` |
| Purpose | Upload CSV file to create an audience group |
| Content-Type | `multipart/form-data` |
| Body | CSV file + metadata (`name`, `description`, `tag_name`, `source`) |
| Side Effects | Creates `audience_group` record; batch-inserts contacts into `audience_group_contacts`; maps to campaign if provided |
| Performance | Uses `psycopg2.extras.execute_values` for bulk insert |

### `POST /api/audience_contact_data`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Get contacts in an audience group |
| Body | `{"audience_group_id": N}` |

### `POST /api/status_audience`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("audience", "u")` |
| Purpose | Activate/deactivate an audience group |
| Body | `{"audience_group_id": N, "status": "active"/"inactive"}` |

### `POST /api/delete_audience`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("audience", "d")` |
| Purpose | Delete an audience group |

### `GET /api/export_audience`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Export audience group contacts as CSV |
| Query Params | `audience_group_id` |
| Returns | CSV file download |

---

## 9.5 Run Campaign APIs

### `POST /api/fetch_contacts_by_groups`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("run_campaign", "rc")` |
| Purpose | Fetch contacts across one or more audience groups for a campaign run |
| Body | `{"audience_group_ids": [...], "campaign_id": N}` |
| Returns | Contact list with LinkedIn profile data if available |

### `POST /api/generate_generic_email`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("run_campaign", "rc")` |
| Purpose | AI-generate a generic (non-personalized) email |
| Body | `{"word_limit", "company_type", "domain_type", "format_type", "manual_addition", "camp_id", "url"}` |
| Side Effects | Calls Gemini/OpenAI API |
| Returns | `{"subject": "...", "email_body": "..."}` |

### `POST /api/generate_followup_email`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("run_campaign", "rc")` |
| Purpose | AI-generate a follow-up email personalized from engagement event data |
| Body | `{"contact_id", "event_data", "camp_id", ...}` |
| Side Effects | Calls Gemini/OpenAI API |

### `POST /api/send_emails`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("run_campaign", "rc")` |
| Purpose | Send emails to contacts (primary send endpoint) |
| Content-Type | `multipart/form-data` (with attachments) or `application/json` |
| Body | `payload: [{emails, subject, text, contact_ids, recipient_names, campaign_id, ...}]` |
| Side Effects | ZeroBounce validation → Background thread → MCMP/Mailchimp send → DB records |
| Returns | Immediately (task_id for status polling if background) |
| Notes | `is_followup` flag triggers follow-up-specific path; `schedule_follow_up` schedules via APScheduler |

### `GET /api/background-email-status/<task_id>`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Poll status of a background email send task |
| Returns | `{"status": "queued"/"processing"/"completed"/"failed", "result": {...}}` |

### `POST /api/normalise_audiences`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Deduplicate a list of audience records by email |
| Body | `{"audiences": [{...}, ...]}` |
| Returns | `{total_received, distinct_count, duplicate_count, distinct_data, duplicate_data}` |

### `POST /api/draft_operations`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Save or update an email draft |
| Content-Type | `multipart/form-data` (with optional file attachments) |
| Side Effects | Stores draft in `MM_schema.email_draft`; attachments in Azure Blob `draft-attachments` container |

### `GET /api/draft_list`
| Field | Value |
|-------|-------|
| Auth | `@token_required @extract_user_id` |
| Purpose | Get list of email drafts for user |
| Returns | Draft list with attachment SAS URLs |

### `GET /api/run_camp_data`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Get data needed for campaign run view (campaigns, audiences) |

### `GET /api/domain_list`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Get available sender domains for email sending |

### `GET /api/industry_list`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Get industry type list for email template customization |

### `GET /api/email_quota`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Check remaining email sending quota for the month |

### `POST /api/get_profile`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Fetch LinkedIn profile data for a contact |
| Body | `{"linkedin_url": "..."}` |
| Side Effects | Fetches from DB or calls Proxycurl API if not cached |

---

## 9.6 Tracking & Analytics APIs

### `POST /api/mcmp/webhook`
| Field | Value |
|-------|-------|
| Auth | Webhook token validation (not JWT) |
| Purpose | Receive email events from MessageHarbour/Mailchimp |
| Body | JSON array of event objects OR form-encoded `mandrill_events` |
| Side Effects | Parses events → Inserts into `tracking.mcmp_events` |
| Supported Events | `delivered`, `open`, `click`, `bounce`, `spam`, `unsubscribe` |

### `GET /tracking/event_count`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("dashboard", "r")` |
| Purpose | Get email event counts for dashboard |
| Query Params | `period` (daily/weekly/monthly/yearly), `time_range`, `sender`, `tags`, `camp_id` |

### `GET /tracking/event_trends`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("dashboard", "r")` |
| Purpose | Get event count trends over time for chart display |
| Query Params | Same as event_count |

### `GET /tracking/all_sender_list`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Get list of all unique senders from events |

### `GET /tracking/all_tags_list`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Get all unique tags across events |

### `GET /tracking/all_camp_tags_list`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Get all campaign tag mappings |

### `GET /api/operational_analytics`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("analytics", "r")` |
| Purpose | Comprehensive analytics data for all dashboard widgets |
| Query Params | `start_date`, `end_date`, `campaign_id`, `campaign_name`, `sender`, `tag`, `period` |
| Returns | All widget data in single response (device analytics, geography, email performance, etc.) |

### `POST /api/generate_report`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("report", "c")` |
| Purpose | Generate PDF/HTML analytics report and email it |
| Body | `{"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}` |
| Side Effects | Playwright renders HTML → PDF → emails to `_REPORT_RECIPIENT` |
| Response | Success message with recipient email; report is NOT returned inline |

---

## 9.7 Users & Roles APIs

### `GET /api/users`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "r")` |
| Purpose | List users (paginated, filterable) |
| Query Params | `search`, `cursor`, `offset`, `role_id`, `status`, `department_id` |

### `POST /api/users_data`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "r,u,d")` |
| Purpose | Get, update, or delete a specific user |

### `POST /api/delete_user`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "d")` |
| Purpose | Delete a user |

### `GET /api/roles`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "r")` |
| Purpose | List all roles with their permissions |

### `POST /api/roles_data`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "c,u,d")` |
| Purpose | Create, update, or delete a role |

### `POST /api/onboard_create_password`
| Field | Value |
|-------|-------|
| Auth | Onboarding token (not standard JWT) |
| Purpose | User sets password on first login after being invited |
| Body | `{"token": "...", "password": "..."}` |

### `POST /api/bulk_users_upload`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "c")` |
| Purpose | Bulk upload users via CSV |
| Side Effects | Creates users; sends onboarding emails |

### `GET /api/departments`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "r")` |
| Purpose | List all departments |

### `POST /api/departments_data`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "c,u,d")` |
| Purpose | Create, update, or delete a department |

### `POST /api/resend_password_create_mail`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "c")` |
| Purpose | Resend onboarding email to a user |

### `POST /api/user_status`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "u")` |
| Purpose | Activate or deactivate a user |

### `POST /api/department_status`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("users_and_roles", "u")` |
| Purpose | Activate or deactivate a department |

---

## 9.8 Integration APIs

### `GET /api/integration/sign_in_url`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Generate OAuth2 authorization URL for CRM integration |
| Query Params | `connector_id` (1=Salesforce, 2=HubSpot) |
| Returns | `{"signin_url", "code_verifier", "state"}` |

### `POST /api/integration/token_generator`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Exchange OAuth2 auth code for access/refresh tokens |
| Body | `{"connector_id", "auth_code", "code_verifier", "integration_name"}` |
| Side Effects | Stores refresh token in DB |

### `GET /api/integration/account_contact_data`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Fetch accounts/contacts from integrated CRM |
| Query Params | `connector_id`, `account_ids`, `filters` |

### `GET /api/integration/get_update_integration_data`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Get current integration configuration for user |

### `GET /api/integration/integration_filter_data`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Get filter options for CRM data |

---

## 9.9 Email Template APIs

### `POST /api/email_template/create`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("run_campaign", "rc")` |
| Purpose | Create a reusable email template |
| Body | `{"name", "subject", "body", "campaign_id"}` |

### `POST /api/email_template/get_all`
| Field | Value |
|-------|-------|
| Auth | `@token_required` |
| Purpose | Get all email templates for user/campaign |

### `POST /api/email_template/delete`
| Field | Value |
|-------|-------|
| Auth | `@token_required @permission_required("run_campaign", "rc")` |
| Purpose | Delete an email template |

---

## 9.10 Automation Admin APIs

### `POST /api/fetch_automation_alertswitch_for_contacts`
Get alert switch status for a list of contacts.

### `POST /api/update_alertswitch_status_of_contacts`
Update alert switch (on/off follow-up automation) for specific contacts.

### `POST /api/switch_for_all_contacts_alert_for_follow_up`
Bulk toggle alert switch for all contacts in a group.

### `POST /api/review_mail_fetch_display_contact_details`
Get contact details for review mail display.

### `POST /api/fetch_mails_of_a_contact`
Get email history for a specific contact.

### `POST /api/fetch_unsubscribed_display_contacts`
Get paginated list of unsubscribed contacts.

### `POST /api/update_unsubscribed_users`
Update unsubscribe status for contacts.

### `POST /api/search_review_mail_contacts`
Search contacts in review mail view.

### `POST /api/search_automation_admin_contacts`
Search contacts in automation admin view.

### `POST /api/search_unsubscribe_contacts`
Search unsubscribed contacts.

---

## 9.11 HubSpot APIs (root-level)

### `POST /api/hubspot_lists` — Get HubSpot lists
### `POST /api/all_contact` — Get all contacts from a HubSpot list
### `POST /api/contact_details` — Get HubSpot contact details

---

## 9.12 Salesforce / Azure Table APIs (root-level)

### `POST /api/update_sf_campaign_names_on_azure` — Sync SF campaign names to Azure Table
### `POST /api/retrieve_sf_campaign_names_from_azure` — Read SF campaign names from Azure Table
### `POST /api/fetch_contacts_from_sf` — Fetch contacts from Salesforce
### `POST /api/domain_type_azure_table_ops` — CRUD on domain type Azure Table
### `POST /api/company_type_azure_table_ops` — CRUD on company type Azure Table

---

## 9.13 System APIs

### `GET /` — Health check (no auth, returns `{"status": "API is running"}`)
### `GET /pool_status` — PostgreSQL connection pool status (no auth)

---

## 9.14 API Error Codes

| HTTP Code | Condition |
|-----------|----------|
| 200 | Success (also used in response.statuscode field) |
| 400 | Bad request / validation error |
| 401 | Missing, expired, or invalid JWT |
| 403 | Valid JWT but insufficient permissions |
| 500 | Unhandled exception in server |

Rate limit exceeded returns HTTP 429 (Flask-Limiter default).
