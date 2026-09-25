import 'reflect-metadata';
import { Container, decorate, injectable } from 'inversify';
import { buildProviderModule } from 'inversify-binding-decorators';
import { Controller } from 'tsoa';

/**
 * Root Inversify Container setup.
 * Integrates TSOA controllers with Inversify Dependency Injection.
 */
const iocContainer = new Container();

// Make TSOA Controller base class injectable for Inversify
decorate(injectable(), Controller);

// Auto-register decorated dependencies using @provide
iocContainer.load(buildProviderModule());

export { iocContainer };
