/**
 * CLI entry point for the dashboard KPI snapshot refresh.
 *
 * Intended to be driven by cron (or any scheduler) twice a day, e.g.:
 *
 *   0  6 * * *  cd /path/to/backend && pnpm kpi:refresh -- --ay 2026-2027
 *   0 18 * * *  cd /path/to/backend && pnpm kpi:refresh -- --ay 2026-2027
 *
 * A MySQL EVENT calling `POST /metrics/kpi-snapshot/refresh` works equally well
 * if the API is the preferred trigger.
 *
 * Arguments (all optional except the academic year):
 *   --ay    <string>  Academic year key, e.g. "2026-2027".       [required]
 *   --start <string>  Period start for date-only tables, YYYY-MM-DD.
 *   --end   <string>  Period end for date-only tables, YYYY-MM-DD.
 *   --window <number> Rolling engagement window in days.
 *
 * The script is intentionally thin: it parses argv, resolves the service from
 * the Inversify container (so the refresh uses the exact same code path as the
 * HTTP endpoint) and reports the result. It never touches source tables.
 */

import 'reflect-metadata';
import { DatabaseManager } from '../config/db.config';
import { logger } from '../config/logger.config';
import { iocContainer } from '../ioc';
import { DashboardKpiService } from '../metrics/services/dashboardKpi.service';
import { DashboardKpiRepository } from '../metrics/repositories/dashboardKpi.repository';

interface ParsedArgs {
  academicYear?: string;
  academicYearStart?: string;
  academicYearEnd?: string;
  engagementWindowDays?: number;
}

/** Minimal `--flag value` parser; deliberately dependency-free. */
function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];

    switch (flag) {
      case '--ay':
        args.academicYear = value;
        i += 1;
        break;
      case '--start':
        args.academicYearStart = value;
        i += 1;
        break;
      case '--end':
        args.academicYearEnd = value;
        i += 1;
        break;
      case '--window': {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          throw new Error(`--window must be a positive integer, received "${value}"`);
        }
        args.engagementWindowDays = parsed;
        i += 1;
        break;
      }
      default:
        break;
    }
  }

  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.academicYear) {
    logger.error('Missing required --ay <academic-year>. Example: --ay 2026-2027');
    process.exitCode = 1;
    return;
  }

  await DatabaseManager.connect();

  try {
    const service = iocContainer.get<DashboardKpiService>(DashboardKpiService);
    // Referencing the repository binding too forces inversify to resolve the
    // write path eagerly, so a DI misconfiguration fails fast here rather than
    // as a confusing runtime failure inside the transaction.
    iocContainer.get<DashboardKpiRepository>(DashboardKpiRepository);

    const result = await service.refresh(args);

    logger.info(
      `Dashboard KPI snapshot refreshed for ${result.academicYear}: ` +
        `${result.upserted} row(s) upserted, ${result.deleted} stale row(s) removed, ` +
        `batch slot ${result.batchSlot} at ${result.computedAt.toISOString()}`
    );
  } catch (error) {
    logger.error('Dashboard KPI snapshot refresh failed:', error);
    process.exitCode = 1;
  } finally {
    await DatabaseManager.disconnect();
  }
}

void main();