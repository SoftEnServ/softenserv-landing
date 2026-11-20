import { Component, computed, inject, signal } from '@angular/core';
import { NavService } from '../../core/nav.service';
import { ThemeService } from '../../core/theme.service';
import { SplashService } from '../../core/splash.service';
import { I18nService, LANGS } from '../../core/i18n.service';
import { SmoothScrollService } from '../../core/smooth-scroll.service';
import { GoToDirective } from '../../core/go-to.directive';

@Component({
  selector: 'app-header',
  imports: [GoToDirective],
  template: `
    <header class="header">
      <div class="container header__inner">
        <a sesGoTo="inicio" class="header__brand" aria-label="Software Engineering Services">
          <img [src]="themeSvc.theme() === 'dark' ? 'assets/logo-ses-blanco.svg' : 'assets/logo-ses.svg'" alt="Software Engineering Services" width="207" height="28"
               [style.visibility]="splash.done() ? 'visible' : 'hidden'" />
        </a>
        <nav class="header__nav" [class.is-open]="open()" (click)="open.set(false)">
          @for (l of links(); track l.id) {
            @if (l.id === 'inicio') {
              <!-- Inicio: casita con puertas abiertas mientras se está en la sección y cerradas al salir -->
              <a class="link link--home" [sesGoTo]="l.id" [attr.data-section]="l.id" [style.--i]="$index" [class.is-active]="current() === l.id"
                 [class.is-open]="current() === l.id" [attr.aria-label]="l.label" [attr.title]="l.label"
                 [attr.aria-current]="current() === l.id ? 'location' : null">
                <svg class="house" width="26" height="26" viewBox="0 0 26 26" preserveAspectRatio="none" aria-hidden="true">
                  <path class="house__body" d="M4.5 11.5 V22.5 H21.5 V11.5" />
                  <path class="house__roof" d="M2 12.5 L13 3 L24 12.5" />
                  <rect class="house__light" x="9.6" y="14" width="6.8" height="8.5" rx=".6" />
                  <rect class="house__door house__door--l" x="9.6" y="14" width="3.4" height="8.5" />
                  <rect class="house__door house__door--r" x="13" y="14" width="3.4" height="8.5" />
                  <circle class="house__knob house__knob--l" cx="12.2" cy="18.6" r=".55" />
                  <circle class="house__knob house__knob--r" cx="13.8" cy="18.6" r=".55" />
                </svg>
                <span class="link__txt"><span class="tall">{{ l.label }}</span></span>
              </a>
            } @else {
              <a class="link" [sesGoTo]="l.id" [attr.data-section]="l.id" [style.--i]="$index" [class.is-active]="current() === l.id"
                 [attr.aria-current]="current() === l.id ? 'location' : null"><span class="tall">{{ l.label }}</span></a>
            }
          }
        </nav>
        <div class="header__actions">
        <!-- Interruptor: un clic en cualquier parte cambia de idioma -->
        <button type="button" class="lang" role="switch" [attr.aria-checked]="i18n.lang() === 'es'"
                [attr.aria-label]="i18n.t().nav.language + ': ' + (i18n.lang() === 'es' ? 'Español' : 'English')"
                [attr.title]="i18n.lang() === 'es' ? 'English' : 'Español'"
                [style.--idx]="i18n.lang() === 'es' ? 1 : 0" (click)="toggleLang()">
          @for (l of langs; track l.code) {
            <span class="lang__opt" [class.active]="i18n.lang() === l.code" [attr.lang]="l.code">{{ l.label }}</span>
          }
        </button>
        <button class="theme" type="button" (click)="themeSvc.toggle()"
                [attr.aria-label]="themeSvc.theme() === 'dark' ? i18n.t().nav.toLight : i18n.t().nav.toDark"
                [attr.title]="themeSvc.theme() === 'dark' ? i18n.t().nav.light : i18n.t().nav.dark">
          @if (themeSvc.theme() === 'dark') {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          } @else {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          }
        </button>
        <button class="header__toggle" (click)="open.set(!open())" [attr.aria-expanded]="open()" [attr.aria-label]="i18n.t().nav.menu">
          <span></span><span></span><span></span>
        </button>
        </div>
      </div>
    </header>
  `,
  styles: `
    .header { position: sticky; top: 0; z-index: 50; view-transition-name: site-header; background: var(--nav-tube), var(--header-bg);
      box-shadow: var(--header-neo), var(--nav-tube-shadow); backdrop-filter: saturate(140%) blur(8px); }
    .header__inner { display: flex; align-items: center; justify-content: space-between; height: 72px; }
    .header__brand img { height: 28px; width: auto; } /* logo sin cuadrado: mismo tamaño de letras que antes */
    .header__nav { display: flex; align-items: center; gap: 28px; margin-left: auto; }
    .header__actions { display: flex; align-items: center; gap: 16px; margin-left: 64px; } /* separación del menú y entre idioma y tema */
    .theme { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 8px; border: 1px solid var(--line);
      background-color: var(--surface); background-image: var(--nav-tube); box-shadow: var(--tube-inset), var(--neo-bevel), var(--neo-raise-sm);
      color: var(--heading); cursor: pointer; transition: border-color .2s, color .2s, box-shadow .3s ease, transform .3s ease; }
    .theme:hover { border-color: var(--teal); color: var(--teal); box-shadow: var(--tube-inset), var(--neo-bevel), var(--neo-raise); }
    /* Neomorfismo, igual que los demás botones: en relieve y, al presionar, se hunde */
    .theme:active, .lang:active { box-shadow: var(--tube-inset), var(--neo-press), -1px -1px 3px var(--neo-hi), 1px 1px 3px var(--neo-lo); transition-duration: 100ms; }
    .lang { position: relative; display: flex; height: 40px; padding: 3px; border: 1px solid var(--line); border-radius: 8px;
      cursor: pointer; font: inherit; color: inherit; transition: border-color .2s, box-shadow .3s ease;
      background-color: var(--surface); background-image: var(--nav-tube); box-shadow: var(--tube-inset), var(--neo-bevel), var(--neo-raise-sm); }
    .lang__opt { position: relative; z-index: 1; display: grid; place-items: center; font-size: .78rem; font-weight: 600;
      letter-spacing: .04em; width: var(--lang-w); border-radius: 5px; color: var(--muted); transition: color .3s; }
    .lang:hover { border-color: var(--teal); box-shadow: var(--tube-inset), var(--neo-bevel), var(--neo-raise); }
    .lang__opt.active { color: var(--teal); }
    /* Indicador que se desliza al idioma elegido */
    .lang { --lang-w: 34px; }
    .lang::before { content: ''; position: absolute; top: 3px; bottom: 3px; left: 3px; width: var(--lang-w); border-radius: 5px;
      background: var(--teal-soft); translate: calc(var(--idx, 0) * var(--lang-w)) 0;
      box-shadow: inset 2px 2px 4px var(--neo-lo), inset -2px -2px 4px var(--neo-hi); /* el idioma elegido queda hundido */ transition: translate 380ms cubic-bezier(.5, 1.6, .4, 1); }
    .header__nav a { white-space: nowrap; }
    /* Neomorfismo en el navbar: textos e íconos en bajorrelieve, grabados en la barra */
    .link, .lang__opt { text-shadow: var(--neo-text); }
    .house, .theme svg, .header__brand img { filter: var(--neo-icon); }
    .header__nav a:not(.btn) { color: var(--ink); font-weight: 500; font-size: .95rem; }
    .header__nav a:not(.btn):hover { color: var(--teal); }

    /* Sección activa: texto destacado, levemente más grande y subrayado que se "completa" */
    .link { position: relative; display: inline-block; padding: 4px 0;
      transition: color 300ms ease, transform 300ms ease; transform-origin: center bottom; }
    .link::after { content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 3px; border-radius: 3px;
      background: var(--teal); transform: scaleX(0); transform-origin: left center; transition: transform 450ms cubic-bezier(.65, 0, .35, 1); }
    .header__nav a.link.is-active { color: var(--heading); font-weight: 500; transform: scale(1.08); }
    .link.is-active::after { transform: scaleX(1); }
    /* ---------- Ícono de casa ---------- */
    .link--home { display: inline-flex; align-items: center; gap: 10px; padding: 2px 0; }
    .link__txt { display: none; }
    /* casita estirada en vertical, como los textos del menú y los títulos */
    /* En el header, textos y casita algo menos estirados que los títulos de sección */
    .header { --tall-y: 1.22; }
    .header .tall { transform: scaleY(var(--tall-y)); }
    .house { display: block; overflow: visible; height: calc(26px * var(--tall-y)); }
    .house__body, .house__roof { fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
    .house__body { fill: var(--surface); }
    .house__light { fill: var(--rust); opacity: 0; transition: opacity 400ms ease; }
    .house__door { fill: var(--surface); stroke: currentColor; stroke-width: 1.3; transform-box: fill-box;
      transition: transform 520ms cubic-bezier(.5, 1.5, .5, 1), fill 300ms; }
    .house__door--l { transform-origin: left center; }
    .house__door--r { transform-origin: right center; }
    .house__knob { fill: currentColor; transition: opacity 200ms; }
    /* Puertas abiertas: las hojas giran hacia sus bisagras y se ve la luz cálida del interior */
    .link--home.is-open .house__door { transform: scaleX(.22); }
    .link--home.is-open .house__light { opacity: 1; }
    .link--home.is-open .house__knob { opacity: 0; }
    .header__nav a.link--home.is-active { transform: scale(1.12); }
    .header__toggle { display: none; background: none; border: 0; padding: 8px; cursor: pointer; }
    .header__toggle span { display: block; width: 22px; height: 2px; background: var(--heading); margin: 5px 0; border-radius: 2px; }
    @media (max-width: 1040px) {
      .header__toggle { display: block; }
      /* Menú desplegable: aparece y se cierra con un deslizamiento suave */
      .header__nav { position: absolute; top: 72px; left: 0; right: 0; flex-direction: column; align-items: stretch;
        gap: 8px; background: var(--bg); border-bottom: 1px solid var(--line); padding: 14px 24px 20px;
        box-shadow: 0 16px 30px -18px rgba(0, 0, 0, .45);
        visibility: hidden; opacity: 0; translate: 0 -12px; pointer-events: none;
        transition: opacity 280ms ease, translate 280ms ease, visibility 0s linear 280ms; }
      .header__nav.is-open { visibility: visible; opacity: 1; translate: 0 0; pointer-events: auto;
        transition: opacity 280ms ease, translate 280ms ease, visibility 0s; }
      /* Los ítems entran uno tras otro */
      .header__nav > a { opacity: 0; translate: 0 -8px; transition: opacity 220ms ease, translate 220ms ease, color 300ms ease, transform 300ms ease; }
      .header__nav.is-open > a { opacity: 1; translate: 0 0; transition-delay: calc(60ms + var(--i, 0) * 45ms); }
      /* Cada ítem con efecto tubular */
      .header__nav a:not(.btn) { padding: 12px 16px; border: 1px solid var(--line); border-radius: 8px;
        background-color: var(--surface); background-image: var(--nav-tube); box-shadow: var(--tube-inset), var(--tube-item-shadow); }
      .header__nav a.link.is-active { transform: none; border-color: var(--teal); }
      .header__nav a.link--home.is-active { transform: none; }
      .link--home { padding: 9px 16px; }
      .link__txt { display: inline; }
      .link::after { left: 16px; right: auto; width: 40px; bottom: 7px; }
      .link--home::after { bottom: 3px; } /* la casita estirada es más alta: la línea va un poco más abajo */
      .header__brand img { height: 23px; }
      .header__actions { margin-left: 8px; gap: 10px; }
      .lang { --lang-w: 30px; }
    }
  `,
})
export class Header {
  themeSvc = inject(ThemeService);
  splash = inject(SplashService);
  i18n = inject(I18nService);
  langs = LANGS;
  toggleLang() { this.i18n.set(this.i18n.lang() === 'es' ? 'en' : 'es'); }
  scroll = inject(SmoothScrollService);
  private nav = inject(NavService);
  /** Sección resaltada en el menú: solo en la landing (en Contacto no se marca ninguna). */
  current = computed(() => (this.nav.path() === '/' ? this.scroll.active() : ''));
  links = () => {
    const n = this.i18n.t().nav;
    return [
      { id: 'inicio', label: n.home },
      { id: 'servicios', label: n.services },
      { id: 'proyectos', label: n.projects },
    ];
  };
  open = signal(false);
}
