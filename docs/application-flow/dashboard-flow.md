# Dashboard Module - Application Flow

## Purpose
Dashboard provides performance visibility for campaign outcomes through KPIs, trend charts, and filter-driven views.

## Entry and Access
1. Sidebar item: Dashboard.
2. Required permission: dashboard + read.
3. On access, page loads header, filters, and operational insights widgets.

## Main User Flow
1. User opens Dashboard.
2. Dashboard filter panel is initialized.
3. User can apply one or more filters:
- Date range (custom range)
- Period (daily/weekly/monthly/yearly)
- Campaign
- Sender
- Tag
4. Filter changes update centralized dashboard filter state.
5. KPI cards and trend visualizations refresh using current filter state.

## View/Tab Behavior
1. Dashboard supports internal active view mapping:
- dashboard -> overview
- business -> campaigns
- analytics -> analytics
2. Changing view updates selected dashboard view state.
3. Current implementation renders campaign overview and engagement trends as core insights.

## Data and State Logic
1. On mount, dashboard-related lookup data is fetched:
- Sender list
- Campaign list used by filter dropdown
- Tag list
2. Filters are reset when filter component unmounts.
3. Date range and period are mutually exclusive:
- Choosing date range clears period.
- Choosing period clears date range.
4. Invalid partial date selection is guarded (requires complete range).

## Outcomes
1. User gets a filtered overview of campaign performance.
2. Same filter context can be reused by Analytics module for deeper operational reporting.
