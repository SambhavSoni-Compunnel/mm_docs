# 15. Testing Architecture

## 15.1 Test Structure Overview

```
unit_test/
├── test_api/               # ~60 API endpoint tests
│   └── conftest.py         # Global mock setup (auth + DB)
├── test_helpers/           # ~70 helper unit tests
│   └── basetest.py         # Base test class
├── test_config.py          # Configuration tests
├── test_change_password.py # Password change tests
├── tokenhelp.py            # Token generation utility for tests
└── test_data/              # Test fixtures and data files
```

**Total test files:** ~130+ test files covering nearly every module.

---

## 15.2 Test Configuration & Global Mocking

The most critical piece of the test setup is `unit_test/test_api/conftest.py`:

```python
# Prevent DB pool initialization at import time
_db_pool_mock = patch('helpers.db_connection_manager.init_connection_pool')
_db_connection_mock = patch('helpers.db_connection_manager.get_db_connection')
_db_check_mock = patch('helpers.db_connection_manager.check_pool_status', return_value=True)

# Bypass all auth decorators globally
_token_required_mock = patch('helpers.authenticate.token_required', lambda x: x)
_permission_required_mock = patch('helpers.authenticate.permission_required', lambda *args, **kwargs: lambda f: f)
_extract_user_id_mock = patch('helpers.authenticate.extract_user_id', lambda x: x)

# Start ALL mocks at module level (before any test)
_db_pool_mock.start()
_db_connection_mock.start()
_db_check_mock.start()
_token_required_mock.start()
_permission_required_mock.start()
_extract_user_id_mock.start()
```

**Key Implications:**
1. Auth is completely bypassed in all API tests — tests do not exercise auth logic
2. DB pool never initializes — DB calls must be mocked per-test
3. This approach enables fast, isolated unit tests without infrastructure

---

## 15.3 Test Fixtures

### `test_client` Fixture
```python
@pytest.fixture
def test_client():
    with patch('helpers.scheduler_config.start_followup_scheduler'):
        from main import create_app
        app = create_app()
        app.config['TESTING'] = True
        with app.test_client() as client:
            with app.app_context():
                yield client
```
Creates a full Flask test client with scheduler disabled.

### `clean_flask_app` Fixture
```python
@pytest.fixture
def clean_flask_app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    with app.app_context():
        yield app
```
Bare Flask app for tests that don't need routing.

### `mock_auth_decorators` Fixture
Opt-in fixture (no-op since auth is already globally mocked):
```python
@pytest.fixture
def mock_auth_decorators():
    yield  # Auth already mocked globally
```

---

## 15.4 Helper Test Patterns

Helper tests in `test_helpers/` use direct function testing with mocked dependencies:

```python
# Example: test_db_operations.py
from unittest.mock import patch, MagicMock
from helpers.db_operations import insert_campaign_audience_group_map_with_cursor

def test_insert_mapping_success():
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    
    with patch('helpers.db_operations.get_db_connection') as mock_ctx:
        mock_ctx.return_value.__enter__ = lambda s: mock_conn
        mock_ctx.return_value.__exit__ = MagicMock(return_value=False)
        
        success, error = insert_campaign_audience_group_map_with_cursor([1, 2], 5)
        
        assert success == True
        assert error is None
        mock_cursor.execute.assert_called()
```

---

## 15.5 API Test Patterns

API tests use the `test_client` fixture and mock specific helpers:

```python
# Example: test_post_create_camp.py
def test_create_campaign_success(test_client):
    with patch('api.manage_campaign.post_create_camp.create_campaign_in_db') as mock_create:
        mock_create.return_value = {"id": 1, "name": "Test Campaign"}
        
        response = test_client.post('/api/create_camp',
            json={"name": "Test", "description": "...", "audience_group_ids": [1]},
            headers={"Authorization": "Bearer fake-token"}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["statuscode"] == 200
```

---

## 15.6 Token Generation Utility

`unit_test/tokenhelp.py` provides test token generation:

```python
# Generates valid JWT tokens for auth-aware test scenarios
# Not used by API tests (auth is globally mocked)
# Used when testing auth helper functions directly
```

---

## 15.7 Base Test Class

`unit_test/test_helpers/basetest.py` provides a base class for helper tests with common setup.

---

## 15.8 Test Data

`unit_test/test_data/` contains test fixture files, and `unit_test/test_helpers/alexandranaya.joblib` is a serialized ML model used for email generation tests.

---

## 15.9 Running Tests

```bash
# Activate virtual environment first
.venv\Scripts\Activate.ps1

# Run all tests
pytest unit_test/

# Run specific module
pytest unit_test/test_helpers/test_db_operations.py

# Run with coverage
pytest unit_test/ --cov=. --cov-report=html

# Run only API tests
pytest unit_test/test_api/

# Run only helper tests
pytest unit_test/test_helpers/

# Run a specific test by name
pytest unit_test/ -k "test_create_campaign_success"

# Verbose output
pytest unit_test/ -v
```

---

## 15.10 Coverage Configuration

`.coverage` file is present in both root and `unit_test/test_helpers/`. Coverage is collected for the project root.

```bash
# View coverage report
pytest unit_test/ --cov=. --cov-report=term-missing
```

---

## 15.11 Testing Gaps

| Gap | Risk | Recommendation |
|-----|------|---------------|
| Auth bypassed globally in API tests | Auth bugs not caught at API level | Add dedicated auth flow tests using real decorators |
| No integration tests against real DB | Schema changes not caught until production | Add a Docker-based integration test suite |
| Background thread testing | Async email sends not tested end-to-end | Mock `threading.Thread` or test `_execute_task` directly |
| APScheduler jobs not tested in live scheduler context | Job execution logic only tested via unit tests | Add scheduler integration tests |
| No load/stress tests | Pool exhaustion, concurrency issues hidden | Add load tests (locust) |
| External APIs (MCMP, ZeroBounce, Proxycurl) fully mocked | Real API contract changes not detected | Add contract tests or regular manual validation |

---

## 15.12 Adding New Tests

### For a new helper function:
1. Create `unit_test/test_helpers/test_{helper_name}.py`
2. Import the function directly
3. Patch `helpers.db_connection_manager.get_db_connection` and any external calls
4. Test success and failure paths

### For a new API endpoint:
1. Create `unit_test/test_api/test_{filename}.py`
2. Use the `test_client` fixture
3. Patch the specific helper function called by the endpoint
4. Test HTTP status codes and response structure
5. Auth decorators are already globally bypassed — no need to set Authorization headers (but include them for realism)

### Template for new API test:
```python
import pytest
from unittest.mock import patch

def test_my_endpoint_success(test_client):
    with patch('api.my_module.my_helper_function') as mock_helper:
        mock_helper.return_value = {"key": "value"}
        
        response = test_client.post('/api/my_endpoint',
            json={"param": "value"},
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["statuscode"] == 200
        assert "key" in data["data"]

def test_my_endpoint_helper_error(test_client):
    with patch('api.my_module.my_helper_function') as mock_helper:
        mock_helper.side_effect = Exception("DB error")
        
        response = test_client.post('/api/my_endpoint', json={})
        
        assert response.status_code == 500
```
