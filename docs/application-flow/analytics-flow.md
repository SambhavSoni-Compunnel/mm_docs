# Analytics Module - Application Flow

## Purpose
Analytics provides operational-level performance analysis and report generation on top of shared dashboard filters.

## Entry and Access
1. Sidebar item: Analytics.
2. Required permission: analytics + read.
3. Super admin users get report generation controls.

## Main Flow
1. User opens Analytics page.
2. Shared dashboard filters are displayed and can be updated.
3. Filter state is transformed into operational analytics filter payload.
4. Data fetch triggers with debounce to avoid rapid duplicate calls.
5. Page renders multi-widget operational analytics sections:
- Device analytics
- Geo engagement map
- Tag analytics
- Top URLs
- Delivery failures
- Opt-outs and complaints

## Report Generation Flow (Super Admin)
1. User selects a required date range.
2. User clicks Generate Report.
3. API receives start/end date payload.
4. On success, user gets confirmation that report is sent by email.
5. Errors are shown inline with retry capability.

## Loading and Error States
1. First load shows skeleton placeholders until data is available.
2. Error state shows contextual retry action.
3. Manual refresh button triggers immediate refetch.
