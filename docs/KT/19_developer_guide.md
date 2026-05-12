# 19. Developer Guide

## 19.1 Coding Conventions (Inferred from Codebase)

### File Naming
- API files: `post_{noun}.py`, `get_{noun}.py` (HTTP verb prefix)
- Helper files: `{domain}_{noun}_helper.py` or `{domain}_helper.py`
- Config files: `{service}_config.py`
- Test files: `test_{original_filename}.py`

### Class Naming
- API Resources: `PascalCase` class inheriting `Resource`
- Config classes: always named `param` within their module
- Helper classes: `PascalCase` (e.g., `SignInV2Helper`, `BackgroundEmailProcessor`)

### Function Naming
- Private helpers: `_snake_case` prefix with underscore
- DB fetch functions: `fetch_*`, `get_*`
- DB insert functions: `insert_*`, `save_*`
- DB update functions: `update_*`
- Builder functions: `build_*`

### Module Structure Convention
```python
# Standard module structure
import logging
from helpers.db_connection_manager import get_db_connection
from helpers.response import success_response, bad_request_response

logger = logging.getLogger(__name__)

# Private helpers first
def _build_filters(...):
    ...

# Public functions
def fetch_something(param):
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("...", (param,))
            result = cursor.fetchall()
            cursor.close()
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"[fetch_something] Error: {e}")
        return {"success": False, "error": str(e)}
```

---

## 19.2 How to Add a New API Endpoint

### Step 1: Create the API module

```python
# api/my_module/get_my_data.py
from flask_restful import Resource
from flask import request
from helpers.authenticate import token_required, permission_required, extract_user_id
from helpers.my_helper import fetch_my_data
from helpers.response import success_response, bad_request_response, internal_server_response
import logging

logger = logging.getLogger(__name__)


class get_my_data(Resource):
    @token_required
    @permission_required("my_module", "r")
    @extract_user_id
    def get(self, user_id=None):
        try:
            param = request.args.get("param")
            if not param:
                return bad_request_response("Missing param", ["param is required"])
            
            result = fetch_my_data(param, user_id)
            return success_response("Data fetched", result)
        
        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return bad_request_response(str(e), [str(e)])
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return internal_server_response(str(e))
```

### Step 2: Register the route in `api/routes.py`

```python
# Add import at top with appropriate group
from api.my_module.get_my_data import get_my_data

# Add route in initialize_routes(api)
api.add_resource(get_my_data, "/api/my_data")
```

### Step 3: Create the helper

```python
# helpers/my_helper.py
import logging
from helpers.db_connection_manager import get_db_connection

logger = logging.getLogger(__name__)


def fetch_my_data(param, user_id=None):
    """
    Fetch data based on param, scoped to user if user_id provided.
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            if user_id:
                cursor.execute(
                    'SELECT * FROM "MM_schema".my_table WHERE param = %s AND created_by = %s',
                    (param, user_id)
                )
            else:
                cursor.execute(
                    'SELECT * FROM "MM_schema".my_table WHERE param = %s',
                    (param,)
                )
            
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            result = [dict(zip(columns, row)) for row in rows]
            cursor.close()
        
        return result
    except Exception as e:
        logger.error(f"[fetch_my_data] Error: {e}")
        raise  # Re-raise to API layer
```

### Step 4: Write tests

```python
# unit_test/test_api/test_get_my_data.py
import pytest
from unittest.mock import patch


def test_get_my_data_success(test_client):
    with patch('api.my_module.get_my_data.fetch_my_data') as mock:
        mock.return_value = [{"id": 1, "name": "test"}]
        
        response = test_client.get('/api/my_data?param=test',
            headers={"Authorization": "Bearer fake-token"})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["statuscode"] == 200
        assert len(data["data"]) == 1


def test_get_my_data_missing_param(test_client):
    response = test_client.get('/api/my_data',
        headers={"Authorization": "Bearer fake-token"})
    
    assert response.status_code == 400
```

---

## 19.3 How to Add a New DB Table

### Step 1: Add SQL creation script
```sql
-- Create in appropriate schema
CREATE TABLE "MM_schema".my_new_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by INTEGER REFERENCES "MM_schema".users(id),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_my_new_table_created_by ON "MM_schema".my_new_table(created_by);
```

Run this directly against the PostgreSQL database (no migration framework).

### Step 2: Add DB access function in appropriate helper
Follow the pattern in `helpers/db_operations.py` or create a new `helpers/my_table_helper.py`.

---

## 19.4 How to Add a New Module

1. Create folder `api/my_new_module/` with `__init__.py`
2. Create API files within the folder
3. Create helper file `helpers/my_new_module_helper.py`
4. Register all routes in `api/routes.py`
5. Add permission module name to `MM_schema.roles.permissions` schema
6. Update JWT generation in `signinv2_helper.py` to include new module in permissions dict
7. Create test files in `unit_test/test_api/` and `unit_test/test_helpers/`

---

## 19.5 How Auth Should Be Enforced

### Rule: Every non-public endpoint MUST have `@token_required`

```python
# Minimum auth for any authenticated endpoint:
@token_required
def get(self):
    ...

# For permission-sensitive operations:
@token_required
@permission_required("module_name", "r")   # Read
@permission_required("module_name", "c")   # Create
@permission_required("module_name", "u")   # Update
@permission_required("module_name", "d")   # Delete
@permission_required("module_name", "rc")  # Run campaign

# For user-scoped data:
@token_required
@permission_required("module_name", "r")
@extract_user_id
def get(self, user_id=None):
    # user_id=None for admin/superadmin → return all
    # user_id=N for regular user → filter by user
    ...
```

### Permission naming convention
- Module names should match keys in `MM_schema.roles.permissions` JSONB
- Use lowercase, underscore-separated (e.g., `run_campaign`, `users_and_roles`)

---

## 19.6 How Logging Should Be Added

```python
# At module top:
import logging
logger = logging.getLogger(__name__)

# In functions:
logger.info(f"[function_name] Starting: param={param}")   # Entry point
logger.debug(f"[function_name] Detail: {detail}")          # Verbose trace
logger.warning(f"[function_name] Non-fatal: {issue}")      # Unexpected but handled
logger.error(f"[function_name] Error: {e}")                # Caught exception
logger.error(f"[function_name] Error: {e}", exc_info=True) # With stack trace

# DO NOT use print() — use logger
# DO NOT log passwords, tokens, or secrets
# DO NOT log full request bodies (may contain PII)
```

---

## 19.7 How to Add a Configuration Secret

1. Add secret to Azure Key Vault `mmai-keyvault`:
   ```python
   from configuration.azure_secret_store import store_secret_in_azure
   store_secret_in_azure("myNewSecretName", "secret-value")
   ```

2. Add a lazy property to the appropriate config class:
   ```python
   # In configuration/generic_config.py
   _my_secret = None
   
   @property
   def my_secret(self):
       if self._my_secret is None:
           self._my_secret = fetch_secret_from_azure("myNewSecretName")
       return self._my_secret
   ```

3. Use in code:
   ```python
   from configuration.generic_config import param
   secret_value = param().my_secret
   ```

---

## 19.8 Architecture Constraints

| Constraint | Reason | Do / Don't |
|-----------|--------|-----------|
| No ORM | Established codebase convention | Use raw psycopg2 with parameterized queries |
| No route logic in helpers | Separation of concerns | Never import `flask.request` in `helpers/` (exception: `email_processing_helper.py`) |
| Secrets via Key Vault only | Security | Never hardcode or `.env`-file application secrets |
| Response format standardized | API consistency | Always use `success_response`, `bad_request_response`, etc. |
| DB via context manager only | Connection safety | Always use `with get_db_connection() as conn:` |
| Auth on all non-public endpoints | Security | Never bypass auth without explicit justification |
| Parameterized SQL only | SQL injection prevention | Never use string formatting for SQL queries |
| Log with logger, not print | Observability | Replace `print()` with `logger.debug/info/warning/error()` |

---

## 19.9 Testing Expectations

When submitting code changes:
1. All existing tests must continue to pass
2. New functions must have corresponding unit tests
3. New API endpoints must have API tests
4. Both success and failure paths must be tested
5. External API calls must be mocked (ZeroBounce, MCMP, Gemini, etc.)
6. DB calls must be mocked using `patch('helpers.db_connection_manager.get_db_connection')`

Run before committing:
```bash
pytest unit_test/ -v
```
