# Industry-Standard Login Implementation (V2)

## Overview
This document explains the new industry-standard login endpoints (`/api/v2/login` and `/api/v2/refresh-token`) and the security practices they implement.

## New Endpoints

### 1. **POST /api/v2/login**
Industry-standard authentication endpoint with enhanced security.

**Request:**
```json
{
    "email": "user@example.com",
    "password": "plain_password"
}
```

**Success Response (200):**
```json
{
    "statuscode": 200,
    "message": "Login successful",
    "data": [
        {
            "message": "Login successful",
            "success": true,
            "user": {
                "id": "user_id",
                "first_name": "John",
                "last_name": "Doe",
                "email": "user@example.com",
                "role_id": "role_id",
                "role_name": "Admin",
                "department_id": "dept_id",
                "department_name": "Sales",
                "permissions": {...}
            },
            "tokens": {
                "access_token": "<YOUR_ACCESS_TOKEN>",
                "refresh_token": "<YOUR_REFRESH_TOKEN>",
                "access_token_expires_in": 7200,
                "refresh_token_expires_in": 604800,
                "token_type": "Bearer"
            }
        }
    ],
    "total_records": 1,
    "error": []
}
```

**Error Response (400):**
```json
{
    "statuscode": 400,
    "message": "Invalid email or password",
    "data": [],
    "total_records": 0,
    "error": ["Invalid email or password"]
}
```

---

### 2. **POST /api/v2/refresh-token**
Generate a new access token using a valid refresh token.

**Request:**
```json
{
    "refresh_token": "<YOUR_REFRESH_TOKEN>"
}
```

**Success Response (200):**
```json
{
    "statuscode": 200,
    "message": "Token refreshed successfully",
    "data": [
        {
            "message": "Token refreshed successfully",
            "success": true,
            "tokens": {
                "access_token": "<YOUR_ACCESS_TOKEN>",
                "token_type": "Bearer",
                "access_token_expires_in": 7200
            }
        }
    ],
    "total_records": 1,
    "error": []
}
```

---

## Industry-Standard Security Practices Implemented

### 1. **Password Hashing with Bcrypt**
- Uses bcrypt with 12 rounds (industry standard)
- Never stores plain text passwords
- Password verification is constant-time (prevents timing attacks)

**Why:** Protects against:
- Database breach exposure
- Rainbow table attacks
- Brute force attacks

```python
# In signinv2_helper.py
hash_password(password)  # Uses bcrypt.hashpw with 12 rounds
verify_password(plain_password, hashed_password)  # Constant-time comparison
```

---

### 2. **JWT Tokens with Expiration**
- **Access Token:** Short-lived (default 1 hour)
- **Refresh Token:** Long-lived (default 7 days)
- Both tokens are cryptographically signed

**Why:**
- Access token expiration limits exposure if compromised
- Refresh token allows users to stay logged in without storing credentials
- Tokens are stateless (no server-side session needed)

```python
# Token payload includes:
{
    'user_id': '...',
    'email': '...',
    'role_id': '...',
    'iat': issued_at,
    'exp': expiration_time,
    'type': 'access' or 'refresh'
}
```

---

### 3. **HTTPS Enforcement**
- Prevents man-in-the-middle attacks
- Credentials transmitted over encrypted channel
- Production environment enforces `request.is_secure`

```python
if os.getenv('FLASK_ENV') == 'production' and not request.is_secure:
    return bad_request_response("Secure connection required", [...])
```

---

### 4. **Rate Limiting**
- Login endpoint: **10 requests per minute** (prevents brute force)
- Token refresh: **30 requests per minute**

```python
decorators = [limiter.limit("10 per minute")]
```

---

### 5. **Input Validation**
- Email format validation (regex)
- Email normalization (lowercase)
- Password length validation (6-128 characters)
- JSON payload validation

```python
# Email validation
pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

# Prevents:
- SQL injection (via parameterized queries)
- Invalid data entry
- Buffer overflow attacks
```

---

### 6. **Generic Error Messages**
- Doesn't reveal if email exists in system
- Same error for invalid email or password
- Generic "internal error" for exceptions

**Security reason:** Prevents user enumeration attacks

```python
# Always returns same message for invalid credentials
return bad_request_response(
    "Invalid email or password",
    ["Invalid email or password"]
)
```

---

### 7. **No Sensitive Data in Response**
- Password hash never included
- Token metadata (not token itself) sent to frontend
- User permissions included for authorization

---

### 8. **Token Type Validation**
- Access tokens for API requests
- Refresh tokens only for refreshing
- Prevents token type confusion attacks

```python
def validate_token(self, token: str, token_type: str = 'access'):
    if payload.get('type') != token_type:
        return {}, False  # Token type mismatch
```

---

## Environment Configuration

Add these to your `.env` file:

```env
# Login token expiration (in seconds)
ACCESS_TOKEN_EXPIRY=3600          # 1 hour
REFRESH_TOKEN_EXPIRY=604800       # 7 days

# Must be set for production
FLASK_ENV=production
```

---

## Frontend Integration

### Login Request:
```javascript
const response = await fetch('https://api.example.com/api/v2/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        email: 'user@example.com',
        password: 'plaintext_password'
    })
});

const data = await response.json();
const accessToken = data.data[0].tokens.access_token;
const refreshToken = data.data[0].tokens.refresh_token;

// Store tokens securely
localStorage.setItem('access_token', accessToken);
localStorage.setItem('refresh_token', refreshToken);
```

### Using Access Token:
```javascript
const response = await fetch('https://api.example.com/api/user_status', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({...})
});
```

### Refresh Token:
```javascript
if (response.status === 401) {  // Token expired
    const refreshResponse = await fetch('https://api.example.com/api/v2/refresh-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            refresh_token: localStorage.getItem('refresh_token')
        })
    });
    
    const newTokens = await refreshResponse.json();
    localStorage.setItem('access_token', newTokens.data[0].tokens.access_token);
}
```

---

## Database Migration (For Existing Systems)

If migrating from plain-text or MD5 passwords:

### Step 1: Create backup
```sql
ALTER TABLE "MM_schema".users ADD COLUMN password_hash_new VARCHAR(255);
```

### Step 2: Hash existing passwords (Python script)
```python
from helpers.signinv2_helper import SignInV2Helper

helper = SignInV2Helper()
# For each user, hash their password
hashed = helper.hash_password(plain_password)
# Update password_hash_new column
```

### Step 3: Migrate to new column
```sql
UPDATE "MM_schema".users SET password_hash = password_hash_new;
ALTER TABLE "MM_schema".users DROP COLUMN password_hash_new;
```

---

## Security Comparison: Old vs New

| Aspect | Old Login | New (V2) |
|--------|-----------|----------|
| **Password Storage** | Plain text/weak hash | Bcrypt (12 rounds) |
| **Token Type** | Custom encoding | JWT with expiration |
| **Token Expiry** | None | 1 hour (access), 7 days (refresh) |
| **HTTPS** | Optional | Required in production |
| **Rate Limiting** | Per minute limit | 10/min login, 30/min refresh |
| **Error Messages** | Reveals user existence | Generic messages |
| **Input Validation** | Minimal | Comprehensive |
| **Brute Force Protection** | Rate limit only | Rate limit + bcrypt slowdown |
| **Session Management** | Stateful | Stateless (JWT) |
| **Token Refresh** | Manual login required | Automatic via refresh token |

---

## Best Practices for SaaS Applications

### 1. **Store Tokens Securely**
- **Frontend:** Use httpOnly cookies (not localStorage for sensitive apps)
- **Backend:** Use secure, signed cookies with SameSite attribute

### 2. **Implement MFA (Multi-Factor Authentication)**
```python
# Future enhancement: Add 2FA/MFA support
generate_mfa_code()
verify_mfa_code()
```

### 3. **Add Session Management**
- Track active sessions
- Allow users to logout from other devices
- Store refresh token revocation list

### 4. **Audit Logging**
```python
logger.info(f"Successful login for user: {email}")
logger.warning(f"Failed login attempt for user: {email}")
```

### 5. **Monitor for Suspicious Activity**
- Multiple failed login attempts
- Logins from unusual locations/IPs
- Token refresh abuse

---

## Testing the New Endpoints

### Unit Tests:
```bash
pytest unit_test/test_api/test_post_signinv2.py -v
```

### Integration Tests:
```bash
curl -X POST https://localhost:5000/api/v2/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

---

## Files Created/Modified

### New Files:
1. **helpers/signinv2_helper.py** - Helper class with bcrypt and JWT logic
2. **api/signin_page/post_signinv2.py** - API endpoints for login and token refresh

### Modified Files:
1. **api/routes.py** - Added imports and route registrations

### No Changes to:
- `api/signin_page/post_signin.py` - Old endpoint remains for backward compatibility
- Existing authentication decorators

---

## Migration Path

### Phase 1: Deploy V2 (Current)
- New `/api/v2/login` endpoint available
- Old `/api/login` still works
- Frontend can gradually migrate

### Phase 2: Dual Support (3-6 months)
- Both endpoints active
- Monitor V2 adoption
- Collect feedback

### Phase 3: Deprecate Old (6-12 months)
- Old endpoint marked deprecated
- Clear timeline for removal
- Final migration deadline

### Phase 4: Remove Old (12+ months)
- Old endpoint removed
- All users on V2

---

## Troubleshooting

### Issue: "Token has expired"
**Solution:** Use refresh token to get new access token

### Issue: "Invalid token type"
**Solution:** Ensure using access token for API calls, refresh token only for refresh endpoint

### Issue: "HTTPS required"
**Solution:** Set `FLASK_ENV=production` and ensure SSL/TLS certificates are valid

### Issue: "Rate limit exceeded"
**Solution:** Wait 1 minute before next login attempt; implement exponential backoff

---

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Bcrypt Documentation](https://pypi.org/project/bcrypt/)
- [Flask Security](https://flask-limiter.readthedocs.io/)
