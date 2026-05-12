# 21. Appendix

## A. Glossary

| Term | Definition |
|------|-----------|
| **MCMP** | MessageHarbour / Marketing Cloud Messaging Platform — the primary transactional and marketing email delivery service used by Market Minder |
| **ZeroBounce** | Email validation SaaS API that verifies whether an email address is deliverable before sending |
| **Proxycurl** | LinkedIn profile data enrichment API — used to fetch professional data for audience contacts |
| **APScheduler** | Advanced Python Scheduler — in-process job scheduler used for follow-up email scheduling; backed by PostgreSQL |
| **SQLAlchemyJobStore** | APScheduler job persistence backend using SQLAlchemy to store jobs in PostgreSQL `scheduler.apscheduler_jobs` |
| **Gemini** | Google Gemini LLM API — primary AI model used for email content generation |
| **OpenRouter** | AI gateway that provides access to multiple LLM providers through a single API |
| **PKCE** | Proof Key for Code Exchange — OAuth 2.0 extension used in the LinkedIn OAuth integration |
| **JWT** | JSON Web Token — compact, URL-safe token format used for authentication; Market Minder uses HS256 signed tokens |
| **JTI** | JWT ID — unique identifier claim in a JWT, used for token revocation |
| **RBAC** | Role-Based Access Control — the authorization model; roles have module-level permissions (read, create, update, delete, run) |
| **Key Vault** | Azure Key Vault — cloud secret store where all application credentials are stored; accessed via `mmai-keyvault` |
| **Connection Pool** | PostgreSQL `ThreadedConnectionPool` — maintains 5–150 persistent DB connections reused across requests |
| **Waitress** | Python WSGI server used to serve the Flask app in production (replaces development Flask server) |
| **IST** | Indian Standard Time (UTC+5:30) — timezone used by APScheduler for all scheduled jobs |
| **Playwright** | Browser automation library used to render HTML to PDF for campaign reports |
| **Chromium** | Headless browser launched by Playwright for PDF generation |
| **SPA** | Single-Page Application — the frontend React app that consumes the Market Minder API |
| **Salesforce** | CRM platform; Market Minder fetches contact data from Salesforce campaigns for import into audiences |
| **HubSpot** | CRM platform; Market Minder fetches contacts from HubSpot lists for import into audiences |
| **V1 / V2 Auth** | Two login API versions — V1 (`/api/login`) is legacy, V2 (`/api/v2/login`) is the current recommended flow |

---

## B. Permission Initials Reference

| Initial | Permission | Meaning |
|---------|-----------|---------|
| `r` | Read | View/list resources |
| `c` | Create | Create new resources |
| `u` | Update | Modify existing resources |
| `d` | Delete | Remove resources |
| `rc` | Run Campaign | Execute/launch a campaign |

Permissions are stored as comma-separated strings in the JWT payload under `permissions.<module>`. Example: `"permissions": {"run_campaign": "r,rc", "manage_campaign": "r,c,u,d"}`.

---

## C. Standard API Response Format

All API responses follow this structure:

### Success
```json
{
  "statuscode": 200,
  "message": "Human-readable success message",
  "data": { ... }
}
```

### Created
```json
{
  "statuscode": 201,
  "message": "Resource created",
  "data": { ... }
}
```

### Bad Request
```json
{
  "statuscode": 400,
  "message": "Validation failed",
  "errors": ["field X is required", "field Y must be a number"]
}
```

### Unauthorized
```json
{
  "statuscode": 401,
  "message": "Token has expired"
}
```

### Forbidden
```json
{
  "statuscode": 403,
  "message": "Permission denied"
}
```

### Not Found
```json
{
  "statuscode": 404,
  "message": "Resource not found"
}
```

### Internal Server Error
```json
{
  "statuscode": 500,
  "message": "Error description"
}
```

---

## D. Azure Key Vault Secrets Reference

Complete table of all Key Vault secrets consumed by the application:

| Secret Name | Used In | Purpose |
|-------------|---------|---------|
| `JWT-Secret-Key` | `signinv2_helper.py` | JWT signing key |
| `BASE-URL` | `main.py` | Determines prod vs. dev environment |
| `sqlHost` | `sql_database_config.py` | PostgreSQL host |
| `sqlDatabase` | `sql_database_config.py` | PostgreSQL database name |
| `sqlUser` | `sql_database_config.py` | PostgreSQL username |
| `sqlPassword` | `sql_database_config.py` | PostgreSQL password |
| `sqlPort` | `sql_database_config.py` | PostgreSQL port |
| `azureConnectionString` | `generic_config.py` | Azure Storage account connection string |
| `MCMP-API-URL` | `generate_mail_config.py` | MessageHarbour API base URL |
| `MCMP-API-KEY` | `generate_mail_config.py` | MessageHarbour API key |
| `ZeroBounceApiKey` | `generic_config.py` | ZeroBounce email validation API key |
| `GeminiApiKey` | `generate_mail_config.py` | Google Gemini LLM API key |
| `OpenAIAzureKey` | `generate_mail_config.py` | OpenAI Azure API key |
| `OpenAIAzureEndpoint` | `generate_mail_config.py` | OpenAI Azure endpoint URL |
| `MistralApiKey` | `generate_mail_config.py` | Mistral LLM API key |
| `OpenRouterApiKey` | `generate_mail_config.py` | OpenRouter API key |
| `SalesforceClientId` | `salesforce_config.py` | Salesforce OAuth client ID |
| `SalesforceClientSecret` | `salesforce_config.py` | Salesforce OAuth client secret |
| `SalesforceUsername` | `salesforce_config.py` | Salesforce username |
| `SalesforcePassword` | `salesforce_config.py` | Salesforce password |
| `SalesforceSecurityToken` | `salesforce_config.py` | Salesforce security token |
| `HubspotApiKey` | `Hubspot_config.py` | HubSpot API private app token |
| `ProxycurlApiKey` | `linkedIn_config.py` | Proxycurl LinkedIn enrichment API key |
| `LinkedInClientId` | `linkedIn_config.py` | LinkedIn OAuth client ID |
| `LinkedInClientSecret` | `linkedIn_config.py` | LinkedIn OAuth client secret |
| `MailchimpApiKey` | `generic_config.py` | Mailchimp API key (legacy, not primary) |
| `MailchimpAudienceId` | `generic_config.py` | Mailchimp audience/list ID (legacy) |

---

## E. Azure Storage Reference

### Blob Storage Containers

| Container Name | Purpose |
|---------------|---------|
| `email-templates` | Stores HTML email template files |
| `campaign-assets` | Stores images and assets used in campaigns |
| `reports` | Stores generated PDF reports |

### Azure Table Storage Tables

| Table Name | Purpose |
|-----------|---------|
| `companyData` | Company type / domain type classification storage |
| `unSubscribedData` | Email addresses that have unsubscribed |
| `campaignSFNames` | Salesforce campaign name mappings |
| `automationAlertSwitch` | Per-contact automation alert toggle state |

---

## F. Module ↔ Permission Mapping

| Module Name (in JWT) | UI Section | Key Operations |
|---------------------|-----------|----------------|
| `run_campaign` | Run Campaign | Send emails, view send history |
| `manage_campaign` | Manage Campaign | Create/edit/delete campaigns and templates |
| `manage_audience` | Manage Audience | Create/edit audience groups and contacts |
| `tracking` | Reports & Analytics | View events, generate reports |
| `users_and_roles` | Users & Roles | Manage users, roles, permissions |
| `integration` | Integrations | Connect Salesforce, HubSpot, LinkedIn |

---

## G. Key Utility Functions Reference

| Function | File | Purpose |
|----------|------|---------|
| `get_db_connection()` | `helpers/db_connection_manager.py` | Context manager for PostgreSQL connections |
| `fetch_secret_from_azure(name)` | `configuration/azure_secret_fetch.py` | Fetch a secret from Key Vault |
| `store_secret_in_azure(name, value)` | `configuration/azure_secret_store.py` | Store a secret in Key Vault |
| `token_required` | `helpers/authenticate.py` | Decorator: validates JWT presence and validity |
| `permission_required(module, perms)` | `helpers/authenticate.py` | Decorator: checks RBAC permissions |
| `extract_user_id` | `helpers/authenticate.py` | Decorator: injects `user_id`, `department_id` |
| `success_response(msg, data)` | `helpers/response.py` | Returns standard 200 JSON response |
| `bad_request_response(msg, errors)` | `helpers/response.py` | Returns standard 400 JSON response |
| `internal_server_response(msg)` | `helpers/response.py` | Returns standard 500 JSON response |
| `upload_blob(container, name, data)` | `helpers/azure_blob_helper.py` | Upload file to Azure Blob Storage |
| `download_blob(container, name)` | `helpers/azure_blob_helper.py` | Download file from Azure Blob Storage |
| `insert_to_azure_table(table, entity)` | `helpers/azure_table_functions.py` | Insert entity to Azure Table Storage |

---

## H. HTTP Status Code Usage

| Code | When Used |
|------|-----------|
| 200 | Successful GET, POST, PUT |
| 201 | Successful resource creation |
| 400 | Validation errors, missing required fields |
| 401 | Missing token, expired token, invalid signature |
| 403 | Valid token but insufficient permissions |
| 404 | Resource not found |
| 429 | Rate limit exceeded (Flask-Limiter) |
| 500 | Unhandled exception, DB error |

---

## I. Local Development Quick Reference

```bash
# Install dependencies
pip install -r requirements.txt
playwright install chromium

# Set up credentials
cp configuration/.env.example configuration/.env
# Edit .env with Azure SP credentials

# Run application
flask --app main:create_app run --debug

# OR with Waitress (production-like)
waitress-serve --port=5000 --call main:create_app

# Run all tests
pytest unit_test/ -v

# Run specific test file
pytest unit_test/test_api/test_signin.py -v

# Check for print() statements (should use logger)
grep -rn "print(" . --include="*.py" | grep -v "test_" | grep -v ".pyc"
```

---

*End of KT Documentation. For the documentation index, see [README.md](README.md).*
