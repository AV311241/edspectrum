import 'reflect-metadata';
import { DashboardKpiRepository } from '../src/metrics/repositories/dashboardKpi.repository';

/**
 * Prints the refresh SQL exactly as the repository sends it.
 *
 * Useful for reviewing the statement without a live database, and for eyeballing
 * that the interpolated constants landed correctly.
 */
// `buildRefreshSql` is public so the SQL can be reviewed without a live database.
const repo = new DashboardKpiRepository();
// eslint-disable-next-line no-console
console.log(repo.buildRefreshSql(30));

/**
 * Resolve the service graph from the real Inversify container.
 *
 * This is the check that actually matters for the controller: `src/ioc.ts`
 * builds its provider module by scanning whichever modules are in the require
 * cache when it is first evaluated, so a controller or service missing from that
 * file resolves to "No matching bindings found" at REQUEST time, long after
 * compilation succeeds. Resolving here proves the new bindings are really wired.
 *
 * No database connection is opened - only dependency construction.
 */
import { iocContainer } from '../src/ioc';
import { DashboardKpiService } from '../src/metrics/services/dashboardKpi.service';
import { DashboardKpiController } from '../src/metrics/controllers/dashboardKpi.controller';
import { DashboardKpiReadRepository } from '../src/metrics/repositories/dashboardKpiRead.repository';

const service = iocContainer.get<DashboardKpiService>(DashboardKpiService);
const reader = iocContainer.get<DashboardKpiReadRepository>(DashboardKpiReadRepository);
const controller = iocContainer.get<DashboardKpiController>(DashboardKpiController);
// eslint-disable-next-line no-console
console.log(
  'DI OK:',
  [service.constructor.name, reader.constructor.name, controller.constructor.name].join(', ')
);