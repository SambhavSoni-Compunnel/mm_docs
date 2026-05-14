# Templates Module - Application Flow

## Purpose
Templates handles email template lifecycle: list, search, create, view, edit, analytics view, and delete.

## Entry and Access
1. Sidebar item: Templates.
2. Required base permission: email_template + read.
3. Create/update/delete operations are permission-gated.

## List Flow
1. User opens Templates.
2. List loads via paginated template fetch.
3. Search input updates filter state with debounce.
4. Table supports incremental load for large result sets.
5. Row actions:
- View template
- Edit template
- Delete template (confirmation required)

## View Mode Flow
1. Route with template name switches module into viewer mode.
2. Template can be resolved from route state or Redux list cache.
3. From viewer, user can:
- Go back to list
- Open edit flow
- Open template analytics view

## Create/Edit Flow
1. Create route opens template builder.
2. Edit route opens template edit screen with selected template context.
3. After save/update, user returns to list/view path according to navigation intent.

## Delete Flow
1. User triggers delete from row action.
2. Confirmation dialog opens with template context.
3. On confirm, delete request is sent.
4. On success, list state updates and user remains in module.

## Error Handling
1. List-level load error shows recovery view with retry action.
2. Delete and fetch errors show feedback messages without hard navigation breaks.
