# Audiences Module - Application Flow

## Purpose
Audiences manages contact groups used for campaign targeting, including creation from integrations/CSV, contact review, status control, export, and deletion.

## Entry and Access
1. Sidebar item: Audiences.
2. Required base permission: audience + read.
3. Create/update/delete actions are permission-gated individually.

## Audience Group List Flow
1. User opens Audiences.
2. Audience group list loads with cursor-based pagination.
3. User can:
- Search by group name (debounced)
- Filter by status
- Switch between table and grid views
- Infinite scroll/load more
4. Row actions:
- View group details
- Edit group
- Toggle active/inactive status
- Delete group with confirmation

## Create/Edit Audience Group Flow
1. User opens create or edit route.
2. User selects one or more audience sources.
3. Source-specific paths:
- CSV source: upload CSV file (with validation) and optional template download
- Integration source (Salesforce/HubSpot): select integration and account context
4. User defines group metadata:
- Group name
- Description
- Tags/filters
5. For connected sources, dynamic filter options are resolved from integration metadata.
6. On submit:
- Create sends new audience payload.
- Edit updates existing audience payload while preserving/merging valid filter state.
7. On success, user returns to audience listing.

## Audience Group Detail Flow
1. User opens group detail.
2. Contact data loading path depends on source:
- Salesforce-backed groups use account contact data fetch path
- Other groups use paginated audience contact listing path
3. User can:
- Search contacts within group
- Scroll through contacts
- Open external profile links when available
- Export group members to CSV (with confirmation)
- Navigate to edit screen

## Data Handling Notes
1. Contact mapping normalizes source-specific payloads into a common display model.
2. Pagination and local cursors are maintained for detail-level contact browsing.
3. Status changes and deletes provide immediate feedback and list refresh behavior.
