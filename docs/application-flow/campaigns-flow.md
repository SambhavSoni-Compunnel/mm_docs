# Campaigns Module - Application Flow

## Purpose
Campaigns manages campaign lifecycle: list, search, filter, create, edit, view details, run, status toggle, and delete.

## Entry and Access
1. Sidebar item: Campaigns.
2. Required base permission: campaign + read.
3. Sub-actions are permission-checked per action menu item.

## List and Discovery Flow
1. User lands on Campaigns list.
2. Campaign data loads with cursor-based pagination.
3. User can:
- Search by campaign name (debounced)
- Filter by status
- Scroll for incremental loading
4. If search/filter is active, search endpoint flow is used; otherwise base list fetch is used.

## Row Action Flow
1. View
- Opens campaign detail route.
2. Edit
- Opens create/edit form in edit mode with campaign prefill.
3. Toggle status
- Switches active/inactive when allowed.
- Shows in-progress state and success/error feedback.
4. Run
- Routes to Run Campaign module with campaign context for prefill.
5. Delete
- Opens confirmation dialog.
- On confirm, deletes campaign and refreshes list state.

## Create/Edit Flow
1. User opens create route or edit route.
2. Form initializes with validation rules and required fields.
3. Supporting data is loaded:
- Associated audiences
- Available tags
- Available templates
4. In edit mode, campaign is fetched and mapped to form state.
5. On submit:
- Create mode sends create payload.
- Edit mode sends update payload with diff-aware mappings.
6. On success, user returns to Campaigns list and recently saved campaign can be highlighted.

## Campaign Detail Flow
1. Detail route loads campaign metadata and metrics.
2. Detail also loads sent draft history for that campaign.
3. User can:
- Inspect performance metrics and send timeline
- Preview sent email content (desktop/mobile)
- Download attachments from sent drafts
- Run campaign again from an earlier sent draft context

## Error and Recovery
1. API errors surface through toast and inline patterns.
2. Failed list/detail fetches can be retried.
3. Selection/focus handling is used around dialogs and menus to avoid stale UI state.
