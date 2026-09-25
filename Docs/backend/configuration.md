# Lumino1 Baseline Assessment - System Configuration Specification

## 1. Environment Variable Specifications (`.env`)

| Variable Name | Type | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Enum (`development`, `production`, `test`) | `development` | Application runtime environment |
| `PORT` | Number | `5000` | HTTP server listening port |
| `CORS_ORIGIN` | String | `*` | Allowed CORS origins for web application clients |
| `LOG_LEVEL` | Enum (`error`, `warn`, `info`, `http`, `debug`) | `info` | Winston logger logging threshold |
| `DB_HOST` | String | `localhost` | MySQL HeatWave Database server host |
| `DB_PORT` | Number | `3306` | MySQL HeatWave Database server port |
| `DB_USER` | String | `root` | Database username |
| `DB_PASSWORD` | String | `password` | Database password |
| `DB_NAME` | String | `lumino1_db` | Database schema name |

## 2. Validation & Security Controls
- **Zod Schema Runtime Validation**: Strict runtime schema enforcement guarantees no malformed payload hits backend controllers.
- **Helmet**: Secures Express apps by setting various HTTP headers (XSS Filter, HSTS, Frameguard).
- **CORS**: Configurable cross-origin request sharing middleware.
- **Rate Limiting**: Defends API endpoints against brute force and DDoS attacks.
