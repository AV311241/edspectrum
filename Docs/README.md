# Lumino1 NGO System Architecture & Backend Documentation

Welcome to the **Lumino1 NGO Application Documentation System**.

## AI Agent Context Map Strategy
To optimize context window usage and prevent context bloat during AI pair programming sessions:
- **Primary AI Entry Point**: AI sessions MUST start by reading [`docs/backend/CONTEXT.md`](file:///c:/Users/av311/Desktop/NGO-app/docs/backend/CONTEXT.md).
- **Sub-Document Directory**: Deep modular specifications are kept in [`docs/backend/`](file:///c:/Users/av311/Desktop/NGO-app/docs/backend/).

## Sub-Document Index
1. **[Architecture Specification](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/architecture.md)**: Clean Layered Architecture, stage calculation rules, and data pipeline.
2. **[Configuration Guide](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/configuration.md)**: `.env` keys, security middleware, and DB pool configuration.
3. **[API Tracking & Registry](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/tracking.md)**: Complete list of HTTP endpoints, method signatures, DTOs, and JSON response contracts.
4. **[Attendance Module](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/attendance_api.md)**: Attendance statuses & weights, the canonical bulk-upload Zod schema, batch-upsert write semantics, and risk formulas.
5. **[Bulk Data Upload (Excel)](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/data_upload_api.md)**: The centralized Excel-to-database pipeline - Classes / Students / Attendance contracts, the 5-step wizard, and the `/batch` endpoints.
6. **[Metrics Module (Akshara Dashboard)](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/metrics_api.md)**: The read-only dashboard module - KPI ribbons, learning progress & SAS distribution, school performance matrix, dynamic alerts, objective coverage matrix, engagement, finance, and the 3 derived metrics.

5. **[Metrics Module](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/metrics_api.md)**: The Akshara dashboard module — the 5 top KPIs, learning progress & SAS distribution, the school performance matrix, the dynamic Needs-Attention alert generator, objective coverage, engagement, finance, and the 3 derived metrics (Risk Score, Equity Score, MoM delta).

> [!IMPORTANT]
> **Route prefix**: TSOA routes are served from the **application root** (`/attendance/...`, `/classes/...`), not under `/api/v1`. The `/api/v1` mount only carries `/health` plus empty legacy router stubs. **Exception**: the metrics module is additionally aliased under `/api/v1/metrics/...` because the dashboard product spec names that prefix — see [`metrics_api.md`](file:///c:/Users/av311/Desktop/NGO-app/Docs/backend/metrics_api.md).
