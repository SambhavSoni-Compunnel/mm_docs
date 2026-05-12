# 1. Executive Overview

## 1.1 What Is Market Minder?

Market Minder is an **AI-powered B2B outbound email marketing platform** built for enterprise go-to-market teams. It enables marketing/sales operations to:

- Import and manage **audience contact lists** (CSV native, Salesforce, HubSpot)
- Create and manage **email marketing campaigns**
- **AI-generate personalized emails** using contact LinkedIn profile data, company descriptions, and campaign context
- Send **bulk emails** via MessageHarbour (MCMP) or Mailchimp Transactional
- Track email **delivery, open, and click events** via webhook ingestion
- Schedule and automatically send **follow-up emails** based on engagement signals
- Generate **PDF/HTML analytics reports**
- Manage **users, roles, departments** with RBAC access control
- Enrich audience contacts with **LinkedIn profile data**

---

## 1.2 High-Level System Purpose

Market Minder solves three core problems for B2B sales teams:

1. **Contact Import Friction**: Audiences can be uploaded via CSV or pulled directly from Salesforce/HubSpot CRMs via OAuth2
2. **Email Personalization at Scale**: LLM-generated emails (Gemini/OpenAI/Mistral) are personalized using LinkedIn profile data fetched via Proxycurl
3. **Follow-up Automation**: Engagement events (delivered, open, click) drive automated follow-up logic via a persistent APScheduler

---

## 1.3 Core Business Workflows

### Workflow 1: Campaign Execution
```
Create Campaign → Assign Audience Group → Fetch Contacts → 
Generate AI Emails → Validate Emails (ZeroBounce) → Send via MCMP/Mailchimp → 
Receive Webhook Events → Trigger Follow-up Scheduler
```

### Workflow 2: Audience Onboarding
```
Upload CSV  ─┐
             ├→ Save to PostgreSQL (audience_group_contacts) → 
Pull from SF ─┤    Normalize/Deduplicate → Map to Campaign
Pull from HS ─┘
```

### Workflow 3: Email Tracking & Reporting
```
MCMP/Mailchimp Webhook → Parse Events → Insert to tracking.mcmp_events →
Dashboard Queries (filter by sender/tag/period) → Generate PDF Report (Playwright)
```

### Workflow 4: Follow-up Automation
```
APScheduler (IST) → Fetch scheduled follow-up rows → 
Check highest priority event per contact (click > open > delivered) →
Send follow-up email if threshold not met → Log send result
```

### Workflow 5: LinkedIn Enrichment
```
Weekly Batch Script → Fetch distinct poc_linkedin URLs →
Proxycurl API (rate-limited: 18 calls/min) → Store raw + filtered profiles →
Profile images stored in Azure Blob → Used during email generation
```

---

## 1.4 Main Modules

| Module | Location | Responsibility |
|--------|----------|---------------|
| **Campaign Management** | `api/manage_campaign/` | CRUD campaigns, audience mappings |
| **Audience Management** | `api/manage_audience/` | Import, status, export contacts |
| **Run Campaign** | `api/run_campaign/` | Generate emails, send, draft, follow-up |
| **Tracking** | `api/tracking/` | Webhook ingest, event analytics, report generation |
| **Sign-In / Auth** | `api/signin_page/` | Registration, login (v1/v2), password flows |
| **Users & Roles** | `api/users_and_roles/` | RBAC: users, roles, departments |
| **Integration** | `api/integration/` | Salesforce + HubSpot OAuth2 flows |
| **Email Templates** | `api/email_template/` | Reusable email template CRUD |
| **Automation Admin** | `api/*.py` (root level) | Alert switches, review mail, unsubscribe management |
| **Enrichment Pipeline** | `enrichlayer_pipeline/` | Weekly LinkedIn scrape + PostgreSQL insertion |

---

## 1.5 Overall Architecture Summary

Market Minder follows a **layered monolithic architecture** deployed as a single Dockerized service:

```
┌──────────────────────────────────────────────────────────────┐
│                      Client (SPA / API Consumer)             │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼───────────────────────────────────────┐
│              Waitress WSGI / Flask Application               │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Flask-CORS │  │Flask-Limiter │  │  Swagger UI (dev)  │  │
│  └─────────────┘  └──────────────┘  └────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │               Flask-RESTful Resource Layer           │    │
│  │    (api/routes.py → ~60 Resources)                   │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │               Auth Decorator Chain                   │    │
│  │    @token_required → @permission_required            │    │
│  │    → @extract_user_id                                │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │               Helper / Service Layer                 │    │
│  │    (helpers/*.py — business logic + DB access)       │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐    │
│  │  PostgreSQL  │  │ Azure Storage  │  │External APIs   │    │
│  │  (psycopg2)  │  │ Tables/Blobs/ │  │MCMP/Mailchimp/ │    │
│  │  Pool 5-150  │  │ Queues/KV     │  │ZeroBounce/     │    │
│  └──────────────┘  └───────────────┘  │Proxycurl/      │    │
│                                       │Google Gemini   │    │
│  ┌──────────────────────────────┐     └────────────────┘    │
│  │  APScheduler Background      │                            │
│  │  (IST timezone, PostgreSQL   │                            │
│  │   job store in scheduler     │                            │
│  │   schema)                    │                            │
│  └──────────────────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

**Key Architectural Characteristics:**
- Single-process Flask app (no microservices)
- All secrets fetched from Azure Key Vault (no hardcoded secrets)
- CORS restricted to explicit origins (production vs. dev detected by BASE-URL secret)
- Swagger UI disabled in production
- Background threads are daemon threads (no graceful shutdown logic)
- PostgreSQL connection pool: 5 min / 150 max connections, TCP keepalives configured
- Email sending is toggled by `param.use_mailchimp` class attribute (currently `False` = MCMP)
