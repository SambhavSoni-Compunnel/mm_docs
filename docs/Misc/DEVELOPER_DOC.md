## Market-Minder AI Backend Developer Guide

Welcome to the Market-Minder backend! This guide will help you onboard quickly, understand the architecture, and contribute efficiently.

---

### 1. Project Architecture Overview

- **Tech Stack:**
  - Python 3.12+
  - Flask & Flask-RESTful (API framework)
  - PostgreSQL (database, accessed via `psycopg2`)
  - Azure Storage (Blob, Queue, Table)
  - Background workers & enrichment pipelines
  - MailchimpTransactional (email delivery)
  - Unit testing: `pytest`, `unittest.mock`, `coverage.py`

- **High-Level Responsibilities:**
  - Expose RESTful APIs for campaign, audience, contact, and enrichment management
  - Run enrichment pipelines (e.g., LinkedIn profile batch processing)
  - Manage campaigns, contacts, and automation workflows
  - Integrate with external services (Azure, Salesforce, Hubspot, Mailchimp)

---

### 2. Folder Structure Explanation

- **`api/`**: Flask resources and route definitions for all API endpoints (e.g., campaign, contact, automation, etc.)
- **`helpers/`**: Utility modules for DB operations, authentication, Azure integrations, email, validation, etc.
- **`enrichlayer_pipeline/`**: Batch enrichment scripts, notification logic, and related tests
- **`configuration/`**: Centralized config classes for Azure, Salesforce, LinkedIn, Mail, etc. (use `param()` to access)
- **`unit_test/`**: API and helper unit tests (pytest/unittest)
- **`templates/`, `static/`**: For any web assets (if needed)
- **Other folders**: `coverage_html/`, `coverage_report/`, `htmlcov/` for test coverage reports

**Naming Conventions:**
- All modules and files: lowercase, underscore-separated
- Classes: PascalCase
- Functions/variables: snake_case

---

### 3. Coding Standards & Best Practices

- **API Design:**
  - Use resource-based endpoints via Flask-RESTful
  - Decorate protected endpoints with `@token_required` (see `helpers/authenticate.py`)
  - Handle exceptions gracefully; log errors

- **Response Formatting:**
  - Use helpers in `helpers/response.py`:
    - `success_response(message, data)`
    - `bad_request_response(message, errors)`
    - `internal_server_response(errors)`
    - `unauthorised_response(message)`

- **Testing & Coverage:**
  - Write unit tests for all new logic (see `unit_test/` and `enrichlayer_pipeline/tests/`)
  - Use `pytest` and `unittest.mock` for mocking dependencies
  - Run `coverage.py` to ensure high code coverage

---

### 4. How to Use API Resources, Helpers, Utilities, and Pipelines

- **Defining a New API Resource:**
  - Create a class inheriting from `Resource` in `api/`
  - Implement HTTP methods (`get`, `post`, etc.)
  - Register the resource in `api/routes.py` via `initialize_routes()`

- **Using Helpers:**
  - Import and call functions from `helpers/` as needed
  - Example: `from helpers.db_operations import get_audience_group`
  - Use `param()` from config modules for settings (e.g., `param().connection_string`)

- **Enrichment Pipelines:**
  - Scripts in `enrichlayer_pipeline/` handle batch processing (e.g., `weekly_batch_script.py`)
  - Use helpers like `fetch_profile_data`, `process_profile_image_with_retry`
  - Notification logic in `enrichment_summary_notifier.py`

- **Configuration Usage:**
  - Access config via `from configuration.generic_config import param`
  - Example: `param().connection_string`, `param().mailchimp_api_key`

---

### 5. Example Usage

**A. Writing a New Flask Resource**
```python
from flask_restful import Resource
from helpers.response import success_response

class MyResource(Resource):
    def get(self):
        data = {...}  # fetch or compute data
        return success_response("Fetched successfully", data)
```

**B. Calling a Helper Function**
```python
from helpers.db_operations import get_audience_group
result = get_audience_group(search_value="Group A")
```

**C. Writing a Unit Test**
```python
import unittest
from unittest.mock import patch
from helpers.db_operations import get_audience_group

class TestAudienceGroup(unittest.TestCase):
    @patch("helpers.db_operations.get_db_connection")
    def test_get_audience_group(self, mock_conn):
        mock_conn.return_value = ...  # setup mock
        result = get_audience_group("Test Group")
        self.assertIsNotNone(result)
```

**D. Invoking Enrichment Logic**
```python
from enrichlayer_pipeline.weekly_batch_script import run_weekly_enrichment_from_audience_contacts
run_weekly_enrichment_from_audience_contacts()
```

---

## Additional Tips
- Always check for existing helpers/utilities before writing new code
- Follow naming and architectural conventions for consistency
- Write tests for all new features and bug fixes
- Use configuration classes for all secrets and environment settings
- For Azure, Mailchimp, and other integrations, see respective helper and config modules

---

For further questions, reach out to the project maintainers or check the code comments for guidance.
