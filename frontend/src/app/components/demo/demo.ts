import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { I18nService, Lang } from '../../core/i18n.service';
import { demoSlug, mainUrl } from '../../core/subdomain';
import { Project } from '../../core/models';
import { ApiService } from '../../core/api.service';
import { firstValueFrom } from 'rxjs';
import { PortalMock, InventoryMock, SchedulingMock, ErpMock, ReportsMock, WebsiteMock } from './mocks';

/** Proyectos que tienen maqueta de demostración (slug → nombre ficticio del producto). */
export const DEMOS = ['customer-portal', 'inventory-system', 'scheduling-professionals',
  'erp-integration', 'reports-dashboard', 'entrepreneur-website'] as const;

/**
 * Página de demostración de un proyecto del portafolio, servida en /demo/<slug> (o en su propio subdominio).
 * Por ahora son maquetas (mocks) con datos ficticios, enmarcadas por una cinta que lo aclara
 * y que lleva de vuelta al sitio principal.
 */
@Component({
  selector: 'app-demo',
  encapsulation: ViewEncapsulation.None,
  imports: [PortalMock, InventoryMock, SchedulingMock, ErpMock, ReportsMock, WebsiteMock],
  template: `
    <div class="demo">
      <div class="demo-ribbon">
        <span class="demo-ribbon__tag">{{ tr('Portfolio demo', 'Demo de portafolio') }}</span>
        <span class="demo-ribbon__txt">
          @if (project(); as p) { <strong>{{ p.title }}</strong> · }
          {{ tr('Mock with fictional data', 'Maqueta con datos ficticios') }}
        </span>
        <span class="demo-ribbon__end">
          <button type="button" class="demo-ribbon__lang" (click)="toggleLang()">{{ lang() === 'es' ? 'EN' : 'ES' }}</button>
          <a [href]="home">{{ tr('Built by Software Engineering Services', 'Hecho por Software Engineering Services') }} ↗</a>
        </span>
      </div>

      @switch (slug) {
        @case ('customer-portal') { <demo-portal /> }
        @case ('inventory-system') { <demo-inventory /> }
        @case ('scheduling-professionals') { <demo-scheduling /> }
        @case ('erp-integration') { <demo-erp /> }
        @case ('reports-dashboard') { <demo-reports /> }
        @case ('entrepreneur-website') { <demo-website /> }
        @default {
          <div class="demo-missing">
            <h1>{{ tr('Demo not found', 'Demo no encontrada') }}</h1>
            <p>{{ tr('There is no portfolio demo at this address.', 'No hay una demo del portafolio en esta dirección.') }}</p>
            <a class="m-btn" [href]="home">{{ tr('Go to the main site', 'Ir al sitio principal') }}</a>
          </div>
        }
      }
    </div>
  `,
  styles: `
    /* ===== Marco común de las demos (independiente del tema del sitio) ===== */
    html:has(.demo), html:has(.demo) body { background: #f4f6f9 !important; color-scheme: light; }
    .demo { min-height: 100dvh; font-family: var(--font-text, Inter, system-ui, sans-serif); color: #1f2937; background: #f4f6f9; }
    .demo * { box-sizing: border-box; }
    .demo h1, .demo h2, .demo h3 { font-family: var(--font-title, Manrope, sans-serif); color: #111827; margin: 0; }
    .demo p { margin: 0; }
    .demo-ribbon { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 8px 18px; background: #1d3557; color: #e8eef6; font-size: .8rem; }
    .demo-ribbon__tag { padding: 3px 9px; border-radius: 999px; background: #d9784a; color: #fff; font-weight: 700; letter-spacing: .02em; }
    .demo-ribbon__end { margin-left: auto; display: flex; align-items: center; gap: 14px; }
    .demo-ribbon a { color: #fff; text-decoration: none; font-weight: 600; }
    .demo-ribbon a:hover { text-decoration: underline; }
    .demo-ribbon__lang { border: 1px solid rgba(255,255,255,.35); background: transparent; color: #fff; border-radius: 6px;
      padding: 2px 8px; font: 700 .72rem/1.4 inherit; cursor: pointer; }
    .demo-missing { max-width: 520px; margin: 18vh auto; text-align: center; display: grid; gap: 14px; justify-items: center; padding: 0 20px; }

    /* ===== Piezas reutilizables de las maquetas ===== */
    .m-app { --ac: #3b6fd8; --ac-soft: #e8effc; display: grid; grid-template-columns: 220px 1fr; min-height: calc(100dvh - 38px); }
    .m-side { background: #fff; border-right: 1px solid #e5e7eb; padding: 18px 14px; display: flex; flex-direction: column; gap: 4px; }
    .m-brand { display: flex; align-items: center; gap: 10px; font: 800 1.05rem/1 var(--font-title, Manrope, sans-serif); margin: 0 6px 18px; color: #111827; }
    .m-logo { width: 30px; height: 30px; border-radius: 9px; background: var(--ac); display: grid; place-items: center; color: #fff; font-size: .9rem; }
    .m-nav { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 9px; color: #4b5563; font-size: .9rem; cursor: pointer; border: 0; background: none; text-align: left; font-family: inherit; }
    .m-nav:hover { background: #f3f4f6; }
    .m-nav.is-on { background: var(--ac-soft); color: var(--ac); font-weight: 600; }
    .m-main { padding: 26px 30px 40px; display: flex; flex-direction: column; gap: 20px; min-width: 0; }
    .m-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .m-top h1 { font-size: 1.5rem; }
    .m-sub { color: #6b7280; font-size: .9rem; margin-top: 4px !important; }
    .m-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--ac-soft); color: var(--ac); display: grid; place-items: center; font-weight: 700; font-size: .85rem; }
    .m-btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; border-radius: 9px; border: 0; background: var(--ac, #1d3557); color: #fff;
      font: 600 .88rem/1.2 inherit; cursor: pointer; text-decoration: none; }
    .m-btn--ghost { background: #fff; color: #374151; border: 1px solid #e5e7eb; }
    .m-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }
    .m-kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 18px; }
    .m-kpi small { color: #6b7280; font-size: .8rem; }
    .m-kpi strong { display: block; font: 800 1.6rem/1.2 var(--font-title, Manrope, sans-serif); color: #111827; margin-top: 6px; }
    .m-kpi em { font-style: normal; font-size: .78rem; font-weight: 600; }
    .up { color: #15803d; } .down { color: #b91c1c; }
    .m-grid2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 18px; align-items: start; }
    .m-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; min-width: 0; }
    .m-card h2 { font-size: 1rem; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .m-card h2 small { font: 500 .78rem/1 inherit; color: #6b7280; }
    .m-table { width: 100%; border-collapse: collapse; font-size: .86rem; }
    .m-table th { text-align: left; font-weight: 600; color: #6b7280; font-size: .8rem; font-variant-caps: small-caps; letter-spacing: .03em; padding: 0 10px 10px; }
    .m-table td { padding: 11px 10px; border-top: 1px solid #f0f1f3; white-space: nowrap; }
    .m-table td.num, .m-table th.num { text-align: right; }
    .m-scroll { overflow-x: auto; }
    .pill { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: .74rem; font-weight: 600; background: #f3f4f6; color: #4b5563; }
    .pill--ok { background: #dcfce7; color: #166534; } .pill--warn { background: #fef3c7; color: #92400e; }
    .pill--bad { background: #fee2e2; color: #991b1b; } .pill--info { background: #dbeafe; color: #1e40af; }
    .m-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; font-size: .86rem; }
    .m-list li { display: flex; gap: 10px; align-items: flex-start; justify-content: space-between; }
    .m-muted { color: #6b7280; font-size: .8rem; }
    .m-bar { height: 8px; border-radius: 99px; background: #f0f1f3; overflow: hidden; min-width: 90px; }
    .m-bar span { display: block; height: 100%; border-radius: inherit; background: var(--ac); }
    .m-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .m-tab { padding: 7px 14px; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; font: 600 .82rem/1 inherit; color: #4b5563; cursor: pointer; }
    .m-tab.is-on { background: var(--ac); border-color: var(--ac); color: #fff; }
    .m-field { display: grid; gap: 6px; font-size: .82rem; color: #374151; font-weight: 600; }
    .m-input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 9px; font: 400 .9rem/1.3 inherit; background: #fff; color: #111827; width: 100%; }

    @media (max-width: 900px) {
      .m-app { grid-template-columns: 1fr; }
      .m-side { flex-direction: row; overflow-x: auto; border-right: 0; border-bottom: 1px solid #e5e7eb; padding: 10px; align-items: center; }
      .m-brand { margin: 0 10px 0 4px; }
      .m-nav { white-space: nowrap; }
      .m-main { padding: 18px 16px 30px; }
      .m-grid2 { grid-template-columns: 1fr; }
      .demo-ribbon__txt { display: none; }
    }
  `,
})
export class Demo {
  private i18n = inject(I18nService);
  private api = inject(ApiService);
  readonly slug = demoSlug() ?? '';
  readonly home = mainUrl();
  readonly lang = this.i18n.lang;
  readonly project = signal<Project | null>(null);
  tr = (en: string, es: string) => (this.lang() === 'es' ? es : en);

  constructor() {
    // El idioma llega en la dirección (?lang=es) desde la tarjeta del proyecto
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'es' || q === 'en') this.i18n.lang.set(q as Lang);
    this.load();
  }

  toggleLang() {
    this.i18n.lang.set(this.lang() === 'es' ? 'en' : 'es');
    this.load();
  }

  /** Datos reales del proyecto (título) desde la API; la maqueta en sí es estática. */
  private async load() {
    try {
      const p = await firstValueFrom(this.api.getProject(this.slug, this.lang()));
      this.project.set(p);
      document.title = `${p.title} — Demo | Software Engineering Services`;
    } catch { /* sin datos del proyecto: la maqueta igual se muestra */ }
  }
}
