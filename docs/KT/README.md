# Market Minder Backend — Knowledge Transfer Documentation

**Project:** Market Minder AI  
**Audience:** Backend engineers inheriting or maintaining the codebase  
**Documentation Date:** May 2026  
**Confidence Level:** Inferred directly from codebase — high fidelity

---

## Index of KT Documents

| # | Document | Description |
|---|----------|-------------|
| 01 | [Executive Overview](./01_executive_overview.md) | System purpose, business workflows, architecture summary |
| 02 | [Tech Stack](./02_tech_stack.md) | All languages, frameworks, services and libraries |
| 03 | [Repository Structure](./03_repository_structure.md) | Full directory walkthrough with responsibilities |
| 04 | [Application Startup Flow](./04_startup_flow.md) | Entry points, initialization sequence, Mermaid diagrams |
| 05 | [Environment & Configuration](./05_environment_configuration.md) | Env vars, secrets, Azure Key Vault, config classes |
| 06 | [Backend Architecture](./06_backend_architecture.md) | Layered architecture, request lifecycle, service boundaries |
| 07 | [Authentication & Authorization](./07_auth_authorization.md) | JWT, RBAC, decorators, token flow diagrams |
| 08 | [Database Documentation](./08_database.md) | Schemas, tables, ERDs, query patterns, connection pooling |
| 09 | [API Documentation](./09_api_documentation.md) | All 60+ endpoints with routes, methods, payloads |
| 10 | [Module Deep Dive](./10_module_deep_dive.md) | Per-module analysis: campaign, audience, email, reporting |
| 11 | [External Integrations](./11_external_integrations.md) | Salesforce, HubSpot, Mailchimp, MCMP, ZeroBounce, LinkedIn |
| 12 | [Reporting System](./12_reporting_system.md) | Report generation, Playwright PDF, HTML pipeline |
| 13 | [Concurrency & Background Processing](./13_concurrency_background.md) | APScheduler, threading, daemon workers, rate limiting |
| 14 | [Error Handling & Logging](./14_error_handling_logging.md) | Logging standards, exception patterns, observability |
| 15 | [Testing Architecture](./15_testing_architecture.md) | pytest structure, mocking strategy, conftest, fixtures |
| 16 | [Deployment Architecture](./16_deployment_architecture.md) | Docker, Waitress, CORS, production configs |
| 17 | [Local Development Setup](./17_local_dev_setup.md) | Setup steps, venv, env, DB, testing commands |
| 18 | [Operational Runbook](./18_operational_runbook.md) | Troubleshooting, debugging flows, deployment checklist |
| 19 | [Developer Guide](./19_developer_guide.md) | Coding conventions, how to add APIs, modules, auth |
| 20 | [Technical Debt & Risk Areas](./20_technical_debt.md) | Risky patterns, coupling, scaling bottlenecks |
| 21 | [Improvement Opportunities](./21_improvement_opportunities.md) | Recommended enhancements across all layers |
| 22 | [Appendix](./22_appendix.md) | Glossary, utilities reference, architectural terms |

---

## Quick-Start Reference

```
Entry point:     main.py → create_app()
WSGI server:     waitress-serve --port=5000 --call main:create_app
Routes:          api/routes.py → initialize_routes()
DB connection:   helpers/db_connection_manager.py → get_db_connection()
Auth decorator:  helpers/authenticate.py → @token_required + @permission_required
Config secrets:  configuration/azure_secret_fetch.py → fetch_secret_from_azure()
Scheduler:       helpers/scheduler_config.py → start_followup_scheduler()
```
