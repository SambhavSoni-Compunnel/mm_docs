# 3. Repository Structure

## 3.1 Top-Level Layout

```
market-minder-ai-product/
├── main.py                          # Application factory (entry point)
├── requirements.txt                 # Python dependencies
├── Dockerfile                       # Production container definition
├── agents.md                        # Copilot coding conventions
├── README.md                        # Project readme
├── testcontainer                    # (inferred: test container config)
│
├── api/                             # HTTP layer — Flask-RESTful Resources
│   ├── routes.py                    # Central route registration
│   ├── manage_campaign/             # Campaign CRUD APIs
│   ├── manage_audience/             # Audience group APIs
│   ├── run_campaign/                # Email generation + sending APIs
│   ├── tracking/                    # Webhook + analytics APIs
│   ├── signin_page/                 # Auth APIs (register, login, password)
│   ├── users_and_roles/             # RBAC management APIs
│   ├── integration/                 # CRM OAuth APIs
│   ├── email_template/              # Email template CRUD
│   └── *.py                         # Automation admin + misc APIs
│
├── helpers/                         # Business logic and utility layer
│   ├── authenticate.py              # JWT decorators + RBAC enforcement
│   ├── db_connection_manager.py     # PostgreSQL connection pool
│   ├── db_operations.py             # Complex DB query functions
│   ├── response.py                  # Standardized HTTP response builders
│   ├── limiter.py                   # Rate limiter singleton
│   ├── scheduler_config.py          # APScheduler setup + follow-up logic
│   ├── send_mail.py                 # Mailchimp email send logic
│   ├── mcmp_send_mail_helper.py     # MessageHarbour email send logic
│   ├── async_email_helper.py        # Background thread email processor
│   ├── email_processing_helper.py   # Request parsing for /send_emails
│   ├── generate_generic_email_helper.py  # AI email prompt builder
│   ├── generated_mail_helper.py     # AI email generation orchestration
│   ├── followup_email_generate_helpers.py # Follow-up generation
│   ├── save_followup_emails_helper.py # Save follow-up to DB
│   ├── schedule_followup_helper.py  # Scheduled follow-up DB ops
│   ├── email_draft_helper.py        # Draft save/load + Azure Blob
│   ├── email_template_helper.py     # Email template CRUD
│   ├── email_validation_cache.py    # ZeroBounce result cache (PostgreSQL)
│   ├── zerobounce_helper.py         # ZeroBounce API calls
│   ├── email_utils.py               # Email utility functions
│   ├── generate_report_helper.py    # Report generation (Playwright PDF)
│   ├── dashboard_helper.py          # Event count/trends queries
│   ├── operational_analytics_helper.py # Analytics widget data
│   ├── normalise_audiences_helper.py    # Deduplication of audience lists
│   ├── csv_file_upload.py           # CSV parsing + batch DB insert
│   ├── integration_helper.py        # CRM integration dispatcher
│   ├── integration_db_helper.py     # CRM token storage
│   ├── salesforce_helper.py         # Salesforce API calls
│   ├── salesforce_integration_helper.py # Salesforce OAuth
│   ├── hubspot_integration_helper.py    # HubSpot OAuth + data fetch
│   ├── Hubspot_helpers.py           # HubSpot data helpers
│   ├── linkedIn_helpers.py          # LinkedIn profile fetch + enrichment
│   ├── linkedIn_azure_storage.py    # LinkedIn data Azure Blob
│   ├── image_utils.py               # Profile image processing
│   ├── user_and_role_helper.py      # User/role/dept DB operations
│   ├── user_onboarding_helper.py    # Onboarding email send
│   ├── user_specfic_helper.py       # User-scoped extract_user_id decorator
│   ├── registration_login_helper.py # Registration DB ops + JWT
│   ├── signinv2_helper.py           # V2 auth: bcrypt + refresh tokens
│   ├── bcrypt_config.py             # Centralized bcrypt parameters
│   ├── forgot_password_helper.py    # Password reset flow
│   ├── reset_password_helper.py     # Password update DB ops
│   ├── register_helper.py           # User registration helpers
│   ├── automation_helper.py         # Automation queue + alert logic
│   ├── automation_alertswitch_helper.py # Alert switch Azure Table ops
│   ├── mailchimp_webhook_helper.py  # Mailchimp event DB insert
│   ├── mailchimp_webhook_processing.py  # Webhook payload parsing
│   ├── mcmp_webhook_helper.py       # MCMP webhook handler
│   ├── review_mail_helper.py        # Review sent mails display
│   ├── unsubscribed_helper.py       # Unsubscribe list management
│   ├── search_contacts_helper.py    # Contact search operations
│   ├── azure_table_functions.py     # Azure Table generic operations
│   ├── azure_table_helper_for_sf.py # Salesforce campaign Azure Table ops
│   ├── azure_queue_functions.py     # Azure Queue operations
│   ├── asset_service_helper.py      # Azure Blob SAS URL generation
│   ├── company_type_azure_table_helper.py  # Company type lookup table
│   ├── domain_type_azure_table_helper.py   # Domain type lookup table
│   ├── triggertable_helper.py       # Trigger table operations
│   ├── run_camp_misc_helper.py      # Miscellaneous run campaign helpers
│   ├── rate_limit_utils.py          # Token-bucket rate limiter + retry decorator
│   └── validations.py               # Input validation helpers
│
├── configuration/                   # Config classes + secret loading
│   ├── .env                         # Azure Key Vault service principal creds
│   ├── azure_config.py              # Azure table names + KV URI
│   ├── azure_secret_fetch.py        # Key Vault secret retrieval function
│   ├── azure_secret_store.py        # Key Vault secret write function
│   ├── generic_config.py            # Main param class (secrets + feature flags)
│   ├── sql_database_config.py       # PostgreSQL connection param class
│   ├── generate_mail_config.py      # LLM API param class
│   ├── integration_config.py        # OAuth config for Salesforce + HubSpot
│   ├── Hubspot_config.py            # HubSpot param class
│   ├── salesforce_config.py         # Salesforce param class
│   ├── linkedIn_config.py           # Proxycurl param class
│   └── company_domain_types_config.py # Static lookups
│
├── enrichlayer_pipeline/            # LinkedIn profile enrichment pipeline
│   ├── weekly_batch_script.py       # Main batch runner
│   ├── single_test_script.py        # Single profile test run
│   ├── db_insert.py                 # DB insertion helpers for enrichment
│   ├── enrichment_summary_notifier.py # Send enrichment summary email
│   ├── Dockerfile.enrich            # Separate image for batch pipeline
│   └── tests/                       # Pipeline tests
│
├── unit_test/                       # All tests
│   ├── test_api/                    # API endpoint tests (60+ files)
│   │   └── conftest.py              # Global mock setup for all API tests
│   ├── test_helpers/                # Helper unit tests (70+ files)
│   │   └── basetest.py              # Base test class
│   ├── test_config.py               # Config test
│   ├── test_change_password.py      # Password change test
│   ├── tokenhelp.py                 # Test token generation utility
│   └── test_data/                   # Test data files
│
├── docs/                            # Project documentation
│   ├── KT/                          # This KT documentation set
│   └── *.md                         # Existing docs
│
├── static/                          # Static files (swagger.json)
├── templates/                       # Jinja2 HTML templates
└── nltk_data/                       # NLTK corpora (bundled)
```

---

## 3.2 Module Responsibility Map

### `api/` — HTTP Layer
- Pure HTTP concerns: parse request, call helper, return response
- Each file contains exactly one Flask-RESTful `Resource` class
- **No business logic should exist here** — all delegated to `helpers/`
- Auth is applied via decorators on each `get()`/`post()` method

### `helpers/` — Business Logic Layer
- All DB access, external API calls, data transformations live here
- No Flask `request` access except in `email_processing_helper.py`
- Helper functions are importable and testable independently
- Organized by domain concern, not by HTTP verb

### `configuration/` — Config & Secrets Layer
- All config classes follow a **lazy-loading singleton pattern**
- Secrets are fetched from Azure Key Vault **on first access only**
- The `.env` file in this folder holds the Key Vault service principal credentials (not application secrets)
- `generic_config.param` is the central config object used across all modules

### `enrichlayer_pipeline/` — Standalone Enrichment Service
- Designed to run as a separate scheduled job (separate Dockerfile)
- Shares DB access via `helpers/db_connection_manager.py`
- Does NOT serve HTTP requests
- Entry point: `weekly_batch_script.py`

### `unit_test/` — Test Suite
- Mirror structure of `api/` and `helpers/`
- `conftest.py` patches DB pool and auth decorators globally for API tests
- Tests use `unittest.mock.patch` extensively
- No integration tests against live DB (fully mocked)

---

## 3.3 Dependency Flow

```
main.py
  └─ api/routes.py
       └─ api/**/*.py  (Resource classes)
            └─ helpers/**/*.py  (business logic)
                 ├─ helpers/db_connection_manager.py
                 │    └─ configuration/sql_database_config.py
                 │         └─ configuration/azure_secret_fetch.py
                 ├─ configuration/generic_config.py
                 │    └─ configuration/azure_secret_fetch.py
                 └─ External APIs (MCMP, ZeroBounce, Proxycurl, SF, HS)
```

---

## 3.4 Circular Dependency Notes

- `helpers/db_connection_manager.py` initializes the connection pool **at import time**, which means importing any helper that uses it will trigger a DB connection attempt.
- In tests, `init_connection_pool` is patched before any imports to prevent this.
- `configuration/generic_config.py` calls `fetch_secret_from_azure("azureConnectionString")` **at class definition time** (not wrapped in a property), creating an eager secret fetch for the connection string.
