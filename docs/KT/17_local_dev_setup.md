# 17. Local Development Setup

## 17.1 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python | 3.12 | Match Docker base image |
| pip | Latest | Comes with Python |
| Git | Any | For cloning |
| Azure Access | — | Key Vault service principal credentials |
| PostgreSQL | 14+ | Local or Azure-hosted |

---

## 17.2 Repository Setup

```powershell
# Clone repository
git clone <repository-url>
cd market-minder-ai-product

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1

# Activate virtual environment (Linux/macOS)
source .venv/bin/activate
```

---

## 17.3 Install Dependencies

```bash
# Install all dependencies
pip install -r requirements.txt

# Install Waitress (production WSGI server)
pip install waitress

# Install Playwright browser (required for report generation)
playwright install chromium
```

---

## 17.4 Environment Configuration

Create `configuration/.env` with Azure Key Vault service principal credentials:

```env
AZURE_TENANT_ID=<your-azure-tenant-id>
AZURE_CLIENT_ID=<your-service-principal-client-id>
AZURE_CLIENT_SECRET=<your-service-principal-client-secret>
```

**Where to get these:**
1. Go to Azure Portal → Azure Active Directory → App Registrations
2. Create or find the existing service principal for Market Minder
3. Copy Tenant ID, Client ID
4. Create a Client Secret in "Certificates & secrets"
5. Ensure the service principal has `Key Vault Secrets User` role on `mmai-keyvault`

**Important:** The `configuration/.env` file is in `.gitignore` — never commit it.

---

## 17.5 Database Setup

The PostgreSQL database schemas must exist before running the application. No migration framework is used — schemas are created manually.

### Required Schemas
```sql
CREATE SCHEMA IF NOT EXISTS "MM_schema";
CREATE SCHEMA IF NOT EXISTS "tracking";
CREATE SCHEMA IF NOT EXISTS "scheduler";
CREATE SCHEMA IF NOT EXISTS "MM_linkedin_schema";
```

### Verify Connectivity
The app will attempt to connect to PostgreSQL on startup using credentials from Azure Key Vault. If you want to test connectivity:

```python
# Test from Python
from configuration.sql_database_config import param
import psycopg2
p = param()
conn = psycopg2.connect(
    host=p.sql_host, database=p.sql_database_name,
    user=p.sql_username, password=p.sql_password, port=5432
)
print("Connected!")
conn.close()
```

---

## 17.6 Running the Application

### Development Mode (Flask dev server)
```bash
python main.py
# Runs on http://127.0.0.1:5000
# No auto-reload (debug=False)
```

### Production Mode (Waitress)
```bash
waitress-serve --port=5000 --call main:create_app
```

### With Docker
```bash
# Build image
docker build -t market-minder:dev .

# Run with local .env mounted
docker run -p 5000:5000 \
  -v "$(pwd)/configuration/.env:/app/configuration/.env" \
  market-minder:dev
```

---

## 17.7 Verifying the Application

```bash
# Health check
curl http://localhost:5000/

# Expected:
# {"status": "API is running"}

# Pool status
curl http://localhost:5000/pool_status

# Swagger UI (non-production only)
# Open in browser: http://localhost:5000/swagger
```

---

## 17.8 Running Tests

```powershell
# Run all tests
pytest unit_test/

# Run with coverage report
pytest unit_test/ --cov=. --cov-report=term-missing

# Run with HTML coverage report
pytest unit_test/ --cov=. --cov-report=html
# Open htmlcov/index.html in browser

# Run specific test file
pytest unit_test/test_helpers/test_db_operations.py -v

# Run specific test
pytest unit_test/ -k "test_create_campaign" -v

# Run API tests only
pytest unit_test/test_api/ -v

# Run helper tests only
pytest unit_test/test_helpers/ -v
```

---

## 17.9 Common Development Tasks

### Adding a New Secret to Key Vault
```python
# configuration/azure_secret_store.py
from configuration.azure_secret_store import store_secret_in_azure
store_secret_in_azure("myNewSecret", "secret-value")
```

### Testing Without Key Vault (offline)
```python
# Patch the secret fetch in your test or script
from unittest.mock import patch

with patch('configuration.azure_secret_fetch.fetch_secret_from_azure') as mock_kv:
    mock_kv.side_effect = lambda name: {
        "genericSecretKey": "test-secret",
        "FLASK-SECRET-KEY": "test-flask-key",
        "BASE-URL": "http://localhost:5000",
        "azureConnectionString": "DefaultEndpointsProtocol=...",
        # Add all needed secrets
    }.get(name, "mock-value")
    
    # Your code here
```

### Checking DB Schema
```sql
-- List all tables in MM_schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'MM_schema';

-- List columns in a table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'MM_schema' AND table_name = 'users';
```

### Generating a Test JWT Token
```python
# unit_test/tokenhelp.py — use for manual testing
import jwt
from datetime import datetime, timedelta, timezone
from configuration.generic_config import param

token = jwt.encode({
    "user": "test@example.com",
    "user_id": 1,
    "role": "superadmin",
    "department_id": 1,
    "permissions": {
        "campaign": "r,c,u,d",
        "run_campaign": "rc",
        "analytics": "r",
        "report": "c",
        "users_and_roles": "r,c,u,d",
        "dashboard": "r"
    },
    "exp": datetime.now(timezone.utc) + timedelta(hours=2)
}, param().secret_key, algorithm="HS256")
print(f"Bearer {token}")
```

---

## 17.10 IDE Setup (VS Code)

The project has a `.vscode/` directory. Recommended extensions:
- Python (Microsoft)
- Pylance (type checking)
- GitHub Copilot (AI assistance)

Recommended `settings.json` additions:
```json
{
    "python.defaultInterpreterPath": ".venv\\Scripts\\python.exe",
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": ["unit_test"],
    "python.testing.cwd": "${workspaceFolder}"
}
```

---

## 17.11 Troubleshooting Setup

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `EnvironmentError: Missing Azure env variables` | `.env` not found or incomplete | Create/fix `configuration/.env` |
| `RuntimeError: Could not initialize database connection pool` | DB unreachable | Check DB host/credentials in Key Vault |
| `playwright._impl._errors.Error: Executable doesn't exist` | Chromium not installed | Run `playwright install chromium` |
| `ImportError: No module named 'X'` | Dependencies not installed | Run `pip install -r requirements.txt` |
| Tests fail with `KeyVault` errors | Key Vault mocking not working | Check `conftest.py` mock setup |
| `psycopg2.OperationalError: could not connect` | Wrong DB config in Key Vault | Verify Key Vault secret values |
