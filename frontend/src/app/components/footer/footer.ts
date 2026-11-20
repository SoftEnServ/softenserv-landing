import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { SplashService } from '../../core/splash.service';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="footer">
      <div class="container footer__inner">
        <!-- Primero el logo y, a su derecha, la fecha -->
        <p>
          <img src="assets/logo-ses-blanco.svg" alt="Software Engineering Services" width="124" height="17"
               [style.visibility]="splash.done() ? 'visible' : 'hidden'" />
          <span>· © {{ date() }}</span>
        </p>
      </div>
    </footer>
  `,
  styles: `
    /* Fijo abajo, siempre visible. Efecto tubular inverso al del navbar */
    .footer { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; view-transition-name: site-footer; height: var(--footer-h);
      background-color: var(--footer-bg); background-image: var(--footer-tube); box-shadow: var(--footer-neo), var(--footer-tube-shadow); }
    .footer__inner { display: flex; align-items: center; justify-content: center; height: 100%; }
    /* El logo reemplaza al nombre de la empresa dentro del texto */
    .footer p { margin: 0; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px 12px;
      color: rgba(255,255,255,.78); font-size: .86rem; text-align: center; }
    :host-context([data-theme='dark']) .footer p { color: rgba(255,255,255,.9); }
    .footer img { height: 24px; width: auto; } /* casi del mismo tamaño que el del header (28px), en un footer más delgado */
    @media (max-width: 720px) { .footer img { height: 21px; } } /* en celular el del header mide 23px */
  `,
})
export class Footer {
  i18n = inject(I18nService);
  splash = inject(SplashService);

  /** Fecha actual del visitante; se revisa cada hora por si cambia el mes con la página abierta. */
  private now = signal(new Date());

  /** Mes en texto y año, en el idioma activo: "November 2026" / "noviembre 2026". */
  date = computed(() => {
    const d = this.now();
    const month = new Intl.DateTimeFormat(this.i18n.lang(), { month: 'long' }).format(d);
    return `${month} ${d.getFullYear()}`; // en español los meses van en minúscula
  });

  constructor() {
    const id = setInterval(() => this.now.set(new Date()), 60 * 60 * 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
