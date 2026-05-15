## Project Documentation: Market-Minder AI Backend

---

## Overview

Market-Minder AI powers a marketing automation platform for campaign and audience management, email enrichment, LinkedIn profile fetching, and integrations with external services (Proxycurl, Azure Blob Storage, Mailchimp, Salesforce, Hubspot). Built for modularity, performance, and scale.

**Technologies:**
- Python 3.12+
- Flask & Flask-RESTful
- PostgreSQL (psycopg2)
- Azure Storage (Blob, Queue, Table)
- Proxycurl (LinkedIn enrichment)
- Multithreading & background workers
- MailchimpTransactional (email delivery)
- Unit testing: pytest, unittest.mock, coverage.py

---

## Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Core Functionality](#core-functionality)
- [Database Layer](#database-layer)
- [Authentication & Security](#authentication--security)
- [Testing](#testing)
- [Development Standards](#development-standards)
- [Running the Project Locally](#running-the-project-locally)
- [Troubleshooting](#troubleshooting)
- [Developer Guide: Understanding & Extending the Codebase](#developer-guide-understanding--extending-the-codebase)

---

## Project Structure

```
api/                  # Flask resources & route definitions
helpers/              # Utility modules (DB, auth, Azure, email, validation, etc.)
enrichlayer_pipeline/ # Batch enrichment scripts & notification logic
configuration/        # Centralized config classes (Azure, Salesforce, LinkedIn, Mail, etc.)
unit_test/            # API and helper unit tests (pytest/unittest)
templates/, static/   # Web assets (if needed)
coverage_html/, coverage_report/, htmlcov/ # Test coverage reports
main.py               # Flask app entry point
requirements.txt      # Python dependencies
Dockerfile            # Containerization support
```

**Folder Explanations:**
- `api/`: RESTful resources for campaign, contact, automation, etc.
- `helpers/`: DB operations, authentication, Azure integrations, email, validation, etc.
- `enrichlayer_pipeline/`: LinkedIn enrichment, batch jobs, notification scripts
- `configuration/`: Config classes for secrets, endpoints, and service settings
- `unit_test/`: Organized tests for APIs and helpers
- `templates/`, `static/`: Optional web assets
- `coverage_html/`, `coverage_report/`, `htmlcov/`: Coverage reports

---

## Key Features
- Campaign creation, update, soft-delete
- Audience management
- LinkedIn enrichment via Proxycurl
- Azure Blob integration for profile logos
- Rate-limited, multithreaded enrichment pipelines
- Token-based authentication for protected endpoints
- Integration with Mailchimp, Salesforce, Hubspot

---

## Core Functionality

- **API Structure:**
  - Flask-RESTful resources in `api/`, registered via `api/routes.py`
  - Resource-based endpoints (e.g., `/api/create_camp`, `/api/audience_contact_data`)
  - Decorators like `@token_required` for authentication

- **Enrichment Jobs:**
  - Batch scripts in `enrichlayer_pipeline/` (e.g., `weekly_batch_script.py`)
  - Use of threads, queues, and retry logic for scalable enrichment
  - Example: LinkedIn profile fetching via Proxycurl, image processing via Azure Blob

- **Helpers/Utilities:**
  - Functions for DB, Azure, email, validation, etc. (see `helpers/`)
  - Example: `get_audience_group`, `process_profile_image_with_retry`, `send_html_email`

- **Response Format:**
  - Standardized via `helpers/response.py`:
    - `success_response(message, data)`
    - `bad_request_response(message, errors)`
    - `internal_server_response(errors)`
    - `unauthorised_response(message)`

---

## Database Layer

- **Schema:**
  - PostgreSQL tables for campaigns, audiences, contacts, etc.
  - Raw SQL via `psycopg2` (see `helpers/db_operations.py`)
  - Connection pooling via `helpers/db_connection_manager.py`

- **Query Logic:**
  - All DB queries and logic in `helpers/db_operations.py`
  - Soft deletion and audit fields supported

---

## Authentication & Security

- **Token-Based Auth:**
  - `@token_required` decorator in `helpers/authenticate.py`
  - Bearer tokens extracted from headers, validated via secret key
  - Secrets and tokens managed via config classes (see `configuration/`)

---

## Testing

- **Test Frameworks:**
  - `pytest` and `unittest` for unit and integration tests
  - Mocking external APIs and DB connections
  - Test organization: `unit_test/`, `enrichlayer_pipeline/tests/`

- **Coverage:**
  - Run coverage with:
    ```sh
    pytest --cov=api --cov=helpers --cov=enrichlayer_pipeline
    coverage html
    ```

---

## Development Standards

- **Naming:**
  - Modules/files: lowercase, underscore-separated
  - Classes: PascalCase
  - Functions/variables: snake_case

- **Logging:**
  - Use Python `logging` with clear formats
  - Log errors, warnings, and info for all major operations

- **Error Handling:**
  - Graceful exception handling, standardized error responses

- **Documentation:**
  - Use docstrings and comments for clarity

---

## Running the Project Locally

1. **Set up virtual environment:**
   ```sh
   python -m venv venv
   venv\Scripts\activate
   ```
2. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```
3. **Configure environment:**
   - Add secrets and endpoints to `.env` or config classes in `configuration/`
4. **Start Flask server:**
   ```sh
   python main.py
   ```
5. **(Optional) Run with Docker:**
   ```sh
   docker build -t market-minder-backend .
   docker run -p 5000:5000 market-minder-backend
   ```

---

## Troubleshooting

- **Common Errors:**
  - DB connection issues: check config and pool status
  - Token errors: verify secret key and token format
  - API failures: check logs and error responses

- **Logs:**
  - Find logs in configured log files or console output
  - Enable debug mode in Flask for verbose errors

---

## Developer Guide: Understanding & Extending the Codebase

- **Add a New API Endpoint:**
  1. Create a new class in `api/` inheriting from `Resource`
  2. Implement HTTP methods (`get`, `post`, etc.)
  3. Register in `api/routes.py` via `initialize_routes()`

- **Add a Helper/Utility:**
  1. Add function to appropriate module in `helpers/`
  2. Write unit tests in `unit_test/`

- **Extend Enrichment Logic:**
  1. Add/modify scripts in `enrichlayer_pipeline/`
  2. Use helpers like `fetch_profile_data`, `process_profile_image_with_retry`
  3. Update notification logic as needed

- **Onboarding Tips:**
  - Start by reading `DEVELOPER_DOC.md` and `PROJECT_DOCUMENTATION.md`
  - Review folder structure and key modules
  - Check for existing helpers/utilities before writing new code
  - Follow naming and architectural conventions
  - Write tests for all new features and bug fixes
  - Use configuration classes for all secrets and environment settings

---

For further questions, reach out to project maintainers or check code comments for guidance.
