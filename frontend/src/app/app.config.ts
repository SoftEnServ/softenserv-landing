import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { NavService } from './core/nav.service';
import { ContentService } from './core/content.service';
import { I18nService } from './core/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    // El contenido de la página (de la base de datos) se carga antes de dibujarla: así no se ven textos
    // de respaldo que luego cambian. Si la API tarda más de 2,5 s, la página parte con el respaldo.
    provideAppInitializer(() => inject(ContentService).load(inject(I18nService).lang(), 2500)),
    provideRouter(
      routes,
      // Transición especial al cambiar de página (ver NavService.animate)
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, to }) => {
          let leaf = to;
          while (leaf.firstChild) leaf = leaf.firstChild;
          inject(NavService).animate(transition, '/' + (leaf.routeConfig?.path ?? ''));
        },
      }),
    ),
  ],
};
