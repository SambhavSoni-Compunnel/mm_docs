# 2. Tech Stack

## 2.1 Language & Runtime

| Component | Detail |
|-----------|--------|
| Language | Python 3.12 |
| Runtime base image | `python:3.12-slim-bookworm` (Docker) |
| Package manager | pip |
| Virtual environment | `.venv/` |

---

## 2.2 Web Framework

| Component | Library | Version | Role |
|-----------|---------|---------|------|
| HTTP framework | Flask | 2.3.3 | Core application framework |
| REST resource layer | Flask-RESTful | 0.3.10 | Class-based API resources |
| CORS handling | Flask-Cors | 4.0.0 | Cross-origin request policy |
| Rate limiting | Flask-Limiter | 3.5.0 | Per-IP request throttling |
| API documentation | flask-swagger-ui | 4.11.1 | Swagger UI (dev only) |
| HTTP compression | Flask-Compress | 1.17 | Brotli/gzip response compression |
| Caching | Flask-Caching | 2.3.1 | In-process cache layer |
| WSGI server | Waitress | (installed at image build) | Production WSGI, single-process |
| Concurrent server | Gevent | 25.5.1 | Greenlet concurrency (available, not confirmed as primary) |

---

## 2.3 Database

| Component | Detail |
|-----------|--------|
| Primary DB | PostgreSQL (hosted, inferred Azure Database for PostgreSQL) |
| Python driver | psycopg2-binary 2.9.10 |
| Connection pooling | `psycopg2.pool.ThreadedConnectionPool` — min 5, max 150 connections |
| Query style | Raw SQL via psycopg2 (no ORM) |
| Schemas | `MM_schema` (main), `tracking` (events), `scheduler` (APScheduler), `MM_linkedin_schema` (enrichment) |
| Migrations | Not inferred — no migration framework detected (manual SQL assumed) |

---

## 2.4 Authentication & Authorization

| Component | Detail |
|-----------|--------|
| Token type | JWT (PyJWT 2.8.0), HS256 algorithm |
| Password hashing | bcrypt 4.3.0, 12 rounds |
| Access token TTL | 2 hours |
| Refresh token TTL | 7 days |
| Permission model | Role-Based Access Control (RBAC) embedded in JWT payload |
| Auth decorators | `@token_required`, `@permission_required(module, perms)`, `@extract_user_id` |

---

## 2.5 Cloud Services (Azure)

| Service | SDK | Purpose |
|---------|-----|---------|
| Azure Key Vault | `azure-keyvault-secrets 4.7.0` | All secrets management (no env var secrets) |
| Azure Blob Storage | `azure-storage-blob 12.18.2` | Draft attachments, LinkedIn profile images, reports |
| Azure Table Storage | `azure-data-tables 12.4.4` | User profiles, trigger tables, unsubscribe lists, domain/company type lookup |
| Azure Queue Storage | `azure-storage-queue 12.11.0` | Message queuing for automation follow-up tracking |
| Azure Identity | `azure-identity 1.17.1` | Managed Identity + Client Secret authentication to Key Vault |

---

## 2.6 Email Services

| Service | Library | Role | Toggle |
|---------|---------|------|--------|
| MessageHarbour (MCMP) | `requests` (REST API) | Primary bulk email sender | `param.use_mailchimp = False` (current default) |
| Mailchimp Transactional | `mailchimp-transactional 1.0.56` | Alternative email sender | `param.use_mailchimp = True` |
| Email validation | ZeroBounce (`zerobouncesdk`) | Validates emails before sending; results cached 30 days in PostgreSQL |

---

## 2.7 AI / LLM Services

| Service | SDK | Use |
|---------|-----|-----|
| Google Gemini | `google-genai 1.13.0` | Primary email generation model |
| OpenAI (Azure-hosted) | `openai 0.27.8` | Alternative email generation |
| Mistral AI | `mistralai 1.7.0` | Available, model selection inferred from config |
| OpenRouter | via REST | Multi-model routing option |

All LLM API keys retrieved from Azure Key Vault via `configuration/generate_mail_config.py`.

---

## 2.8 External API Integrations

| Integration | Protocol | Purpose |
|-------------|----------|---------|
| Salesforce | OAuth2 (password grant + auth code) | CRM contact import |
| HubSpot | OAuth2 PKCE (S256) | CRM contact import |
| Proxycurl | REST (rate-limited) | LinkedIn profile enrichment |
| ZeroBounce | SDK | Email address validation |
| MessageHarbour (MCMP) | REST | Bulk email sending + webhook events |
| Mailchimp Transactional | SDK | Alternative email sending |

---

## 2.9 Background Processing & Scheduling

| Component | Library | Purpose |
|-----------|---------|---------|
| Job scheduler | APScheduler 3.11.2 (BackgroundScheduler) | Follow-up email scheduling |
| Job store | SQLAlchemyJobStore → PostgreSQL `scheduler` schema | Persistent job storage |
| Async email processing | `threading.Thread` (daemon) | Non-blocking email sends |
| LinkedIn enrichment | Manual script (`enrichlayer_pipeline/weekly_batch_script.py`) | Run periodically externally |
| Rate limiting (Proxycurl) | Custom `RateLimiter` class (token bucket) | 18 calls/60 sec |

---

## 2.10 Reporting & Document Generation

| Component | Library | Purpose |
|-----------|---------|---------|
| Browser automation | Playwright 1.58.0 (Chromium) | Render HTML reports to PDF |
| HTML generation | Python string templates / Jinja2 | Report HTML construction |
| PDF | Playwright's page.pdf() | Final PDF export |
| ReportLab | reportlab 4.4.9 | Available (not confirmed primary PDF path) |
| Data processing | pandas 2.2.3, numpy 2.2.4 | CSV parsing, data analysis |

---

## 2.11 Testing Stack

| Component | Library | Version |
|-----------|---------|---------|
| Test runner | pytest | 8.3.5 |
| Coverage | pytest-cov | 6.1.1 |
| Mocking | unittest.mock (stdlib) | — |
| Test isolation | module-level mock patches in `conftest.py` | — |
| Test structure | Unit tests per helper + API endpoint tests | — |

---

## 2.12 Other Libraries

| Library | Purpose |
|---------|---------|
| python-dotenv | Load `.env` file during startup and KV auth |
| NLTK | NLP processing (inferred for email/text analysis) |
| BeautifulSoup4 | HTML parsing |
| requests + requests-toolbelt | HTTP client, multipart uploads |
| pydantic | Data validation (available) |
| PyJWT | JWT encode/decode |
| joblib | ML model persistence (`.joblib` files in test data) |
| redis | Available in requirements; rate limiting alternative to in-memory |
| SQLAlchemy | Used by APScheduler job store only (not general ORM) |
| pytz | Timezone handling (IST for scheduler) |
| lxml, cssselect2 | HTML/CSS processing |
| Pillow | Image processing for LinkedIn profile photos |
