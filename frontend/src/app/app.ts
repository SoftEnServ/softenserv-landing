import { Component, inject } from '@angular/core';
import { SmoothScrollService } from './core/smooth-scroll.service';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { Splash } from './components/splash/splash';
import { ContactFab } from './components/contact-fab/contact-fab';
import { Demo } from './components/demo/demo';
import { demoSlug } from './core/subdomain';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Splash, Header, Footer, ContactFab, Demo],
  template: `
    @if (isDemo) {
      <!-- Subdominio de un proyecto (p. ej. scheduling-professionals.localhost): su página de demostración -->
      <app-demo />
    } @else {
      <app-splash />
      <app-header />
      <main>
        <router-outlet />
      </main>
      <app-contact-fab />
      <app-footer />
    }
  `,
})
export class App {
  readonly isDemo = !!demoSlug();

  constructor() {
    if (!this.isDemo) inject(SmoothScrollService).init();
  }
}
