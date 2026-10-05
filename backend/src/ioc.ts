import 'reflect-metadata';
import { Container, decorate, injectable } from 'inversify';
import { buildProviderModule } from 'inversify-binding-decorators';
import { Controller } from 'tsoa';

// The `@provide` decorator records its metadata on `Reflect` when the decorating
// module is *evaluated*. `buildProviderModule()` then reads that metadata via
// `Reflect.getMetadata(METADATA_KEY.provide, Reflect)` and binds only what it
// finds at the moment `container.load()` executes.
//
// That makes import order load-bearing: if this file is evaluated before the
// controller modules, the metadata array is still empty and the container is
// populated with ZERO bindings. Every request needing a controller then fails
// with "No matching bindings found for serviceIdentifier: <X>Controller".
//
// `src/index.ts` imports `./routes` (which imports this file) *before* tsoa's
// generated `routes.ts` pulls the controllers in, so the ordering must be
// forced here rather than left to the entry point. Importing the controllers for
// their side effects - each `@provide` decorator runs on evaluation - guarantees
// the metadata is complete before the provider module is built.
//
// None of these modules import `ioc.ts`, so this introduces no import cycle.
// Keep this list in sync with `controllerPathGlobs` in `tsoa.json`: a new
// controller omitted here will not be bound and will fail at request time
// exactly as described above.
import './controllers/auth.controller';
import './controllers/attendance.controller';
import './controllers/baselineAssessment.controller';
import './controllers/class.controller';
import './controllers/parentInteraction.controller';
import './controllers/role.controller';
import './controllers/school.controller';
import './controllers/student.controller';
import './controllers/user.controller';
import './metrics/controllers/dashboardKpi.controller';
import './metrics/controllers/metrics.controller';

/**
 * Root Inversify Container setup.
 * Integrates TSOA controllers with Inversify Dependency Injection.
 */
const iocContainer = new Container();

// Make TSOA Controller base class injectable for Inversify
decorate(injectable(), Controller);

// Auto-register decorated dependencies using @provide.
// The controller imports above MUST stay above this line: they are what
// populates the metadata this call consumes.
iocContainer.load(buildProviderModule());

export { iocContainer };
