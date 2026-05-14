# Users and Roles Module - Application Flow

## Purpose
Users and Roles provides identity administration across users, roles, and departments, including status control, permission mapping, and bulk onboarding.

## Entry and Access
1. Sidebar item: Users and Roles.
2. Required base permission: user + read.
3. Role operations and advanced department visibility are permission and role-level gated.

## Primary Navigation Model
1. Module has tabbed views:
- Users
- Roles
- Departments (super admin only)
2. Query/state can preselect tab when routed from other screens.

## Users Tab Flow
1. User list loads with cursor pagination.
2. Filters available:
- Search text
- Status
- Role
- Department
3. Supported actions per user:
- View profile/details
- Edit user
- Delete user with confirmation
- Toggle user active/inactive status
- Resend invite mail (super admin + inactive users)

## Bulk User Upload Flow
1. User opens bulk upload dialog.
2. CSV file is validated client-side.
3. Upload request is submitted.
4. On success:
- Users list resets and reloads using current filters.
5. Downloadable CSV template supports correct file format onboarding.

## Roles Tab Flow
1. Role cards show role metadata and permission coverage summary.
2. User can open role detail view.
3. Role create/edit uses structured permission matrix by module/action.
4. Permission model maps UI CRUD toggles to backend action codes.
5. On save, roles list refreshes.

## Departments Tab Flow
1. Department cards list department and user distribution.
2. User can open department details.
3. Department detail supports status/metadata actions and return flow.

## Data and State Notes
1. Roles and departments are loaded from dedicated slices/thunks.
2. Users list refresh strategy resets pagination before new filtered load.
3. Module suppresses list headers when deep-detail views are active.
