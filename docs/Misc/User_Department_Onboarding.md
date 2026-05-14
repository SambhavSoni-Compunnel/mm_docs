# User & Department Onboarding Guide

## Core Roles

| Role | Permissions | Scope |
|------|------------|-------|
| **Superadmin** | All permissions across all modules | Entire system |
| **Admin** | Create, Read, Update for all modules; full CRUD for email templates | Users within their own department only; **cannot** delete users or roles |
| **Agent** | Full CRUD for campaign, audience, and run campaign features | Standard app features only |

> **Key Rule:** Only **Superadmin** can create departments, roles, and users across the system. **Admin** can only create users within their own department.

---

## Onboarding a New Department

> Superadmin only.

1. Go to **Users & Roles** in Market Minder
2. Click on **Departments**
3. Click **Create Department**
4. Enter the department **Name** and **Description**
5. Submit — department is created

---

## Creating a New Role

> Superadmin only.

1. Go to **Users & Roles → Roles**
2. Click **Create New Role**
3. Enter **Name**, **Description**, and assign **Permissions**
4. Submit — role is created

> **Note:** Only create a new role if a specific set of permissions is required for a user group that does not match any existing role. Otherwise, use the pre-existing roles (superadmin, admin, agent).

---

## Onboarding a New User

### Option A — Single User

1. Go to **Users & Roles → Users**
2. Click **Add User**
3. Fill in the relevant user information
4. Click **Create User**

### Option B — Bulk Upload

1. Go to **Users & Roles → Users**
2. Click **Bulk User Upload**
3. **Download the CSV template** from the page
4. Fill in user details following the template exactly
5. Upload the completed CSV file and submit

> **Important for bulk upload:**
> - Fill the template exactly as provided — do not alter column names or their order
> - The file must be in `.csv` format when uploaded

---

## Post User Creation Flow

Applies to both single and bulk onboarding:

1. User is created in the database with **Inactive** status
2. An **onboarding email** is sent to the user's email address prompting them to create their password
3. Once the user sets their password, their status automatically becomes **Active**
4. The user can now log in successfully

---

## Changing User / Department Status (Active ↔ Inactive)

### User Status

- Available to both **Admin** and **Superadmin**
- Go to **Users & Roles → Users**
- Click **Actions** on the user row
- Select **Active** or **Inactive** as required

### Department Status

> **Superadmin only.**

- The endpoint is deployed on **dev** but the **frontend has not been deployed on dev yet**
- Until the FE is available, use the API directly:

**Endpoint:**
```
POST /api/department_status
```

**Payload:**
```json
{
  "department_id": <id>
}
```

**Behavior — 3 Cases:**

| Scenario | Result |
|----------|--------|
| All users in department are **Active** | All marked **Inactive** |
| Mix of Active and Inactive users | Only the **Active** users are marked **Inactive** |
| All users are **Inactive** (some with password set, some without) | Only inactive users **who completed onboarding** (have a password set) are marked **Active**; users who never set a password are skipped |
