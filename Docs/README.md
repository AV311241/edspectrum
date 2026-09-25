# Lumino1 NGO System Architecture & Backend Documentation

Welcome to the **Lumino1 NGO Application Documentation System**.

## AI Agent Context Map Strategy
To optimize context window usage and prevent context bloat during AI pair programming sessions:
- **Primary AI Entry Point**: AI sessions MUST start by reading [`docs/backend/CONTEXT.md`](file:///c:/Users/av311/Desktop/NGO-app/docs/backend/CONTEXT.md).
- **Sub-Document Directory**: Deep modular specifications are kept in [`docs/backend/`](file:///c:/Users/av311/Desktop/NGO-app/docs/backend/).

## Sub-Document Index
1. **[Architecture Specification](file:///c:/Users/av311/Desktop/NGO-app/docs/backend/architecture.md)**: Clean Layered Architecture, stage calculation rules, and data pipeline.
2. **[Configuration Guide](file:///c:/Users/av311/Desktop/NGO-app/docs/backend/configuration.md)**: `.env` keys, security middleware, and DB pool configuration.
3. **[API Tracking & Registry](file:///c:/Users/av311/Desktop/NGO-app/docs/backend/tracking.md)**: Complete list of HTTP endpoints, method signatures, DTOs, and JSON response contracts.
