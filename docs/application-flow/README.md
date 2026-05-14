# Market Minder Frontend - Sidebar Module Application Flows

This folder documents application logic for each sidebar module implemented in the frontend.

Scope covered:
- Dashboard
- Campaigns
- Audiences
- Templates
- Users and Roles
- Run Campaign
- Analytics
- Settings

Reference documents:
- [dashboard-flow.md](dashboard-flow.md)
- [campaigns-flow.md](campaigns-flow.md)
- [audiences-flow.md](audiences-flow.md)
- [templates-flow.md](templates-flow.md)
- [users-and-roles-flow.md](users-and-roles-flow.md)
- [run-campaign-flow.md](run-campaign-flow.md)
- [analytics-flow.md](analytics-flow.md)
- [settings-flow.md](settings-flow.md)

## Cross-module behavior

1. Authentication gate
- All sidebar routes are protected.
- Unauthenticated users are redirected to login.

2. Permission gate
- Sidebar visibility is permission-based.
- Route access is also permission-based.
- If a user lands on an unauthorized route, the app redirects to the first accessible module.

3. Shared filter model
- Dashboard and Analytics consume shared dashboard filters.
- Filter updates trigger downstream data reloads in analytics and metric widgets.
