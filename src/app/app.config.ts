import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { MockDbService } from './core/data/mock-db.service';
import { HairRoutineEngineService } from './core/services/hair-routine-engine.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }), withComponentInputBinding()),
    provideHttpClient(),
    // The mock database and the Hair Quiz ruleset must be loaded before the first route renders.
    provideAppInitializer(() => Promise.all([inject(MockDbService).load(), inject(HairRoutineEngineService).load()])),
  ],
};
