import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { I18nService } from '../../core/i18n.service';
import { CardLiftDirective } from '../../core/card-lift.directive';
import { SmoothScrollService } from '../../core/smooth-scroll.service';
import { SplashService } from '../../core/splash.service';

@Component({
  selector: 'app-services',
  imports: [CardLiftDirective],
  template: `
    <section id="servicios" class="section section--alt">
      <div class="engineer-bg" aria-hidden="true"></div>
      <div class="container">
        <div class="section__head">
          <span class="eyebrow"><span class="tall">{{ t().eyebrow }}</span></span>
          <h2>{{ t().title }}</h2>
          <p>{{ t().lead }}</p>
        </div>
        <!-- Al entrar a la sección, las tarjetas hacen una ola en el eje Z, una tras otra -->
        <div class="grid" #grid [class.is-waving]="waving()" (scroll)="onGridScroll()">
          @for (s of t().items; track s.slug) {
            <!-- Clic (o Enter / Espacio) en una tarjeta: abre su ventana emergente -->
            <article class="card glass-sheen is-clickable" sesCardLift role="button" tabindex="0" aria-haspopup="dialog"
                     (click)="open($index)" (keydown.enter)="open($index)" (keydown.space)="$event.preventDefault(); open($index)">
              <div class="card__icon" [innerHTML]="icon(s.icon)"></div>
              <h3>{{ s.title }}</h3>
              <p>{{ s.text }}</p>
            </article>
          }
        </div>
        <!-- En celular: puntos que muestran qué tarjeta se ve y que hay más al deslizar (tocar uno lleva a esa tarjeta) -->
        <div class="dots" role="tablist" [attr.aria-label]="t().eyebrow">
          @for (s of t().items; track $index) {
            <button type="button" class="dot" role="tab" [class.is-on]="slide() === $index" [attr.aria-selected]="slide() === $index"
                    [attr.aria-label]="s.title" (click)="goToSlide($index)"></button>
          }
        </div>
      </div>
    </section>

    <!-- Ventana emergente (~70% de la pantalla) con el contenido de la tarjeta. Es un <dialog> nativo:
         queda por encima de todo aunque la sección esté transformada por el efecto de capas. -->
    <dialog #dlg class="svc-modal" [class.is-closing]="closing()" (click)="onDialogClick($event)" (cancel)="$event.preventDefault(); close()"
            [attr.aria-labelledby]="'svc-modal-title'">
      @if (selected(); as i) {
        @let it = t().items[i - 1];
        <button type="button" class="svc-modal__close" (click)="close()" [attr.aria-label]="closeLabel()">✕</button>
        <div class="svc-modal__body">
          <div class="svc-modal__in">
            <div class="svc-modal__icon" [innerHTML]="icon(it.icon)"></div>
            <h2 id="svc-modal-title">{{ it.title }}</h2>
            <!-- texto largo del servicio si la base lo tiene; si no, el resumen de la tarjeta -->
            <p class="svc-modal__text">{{ it.details || it.text }}</p>
          </div>
        </div>
      }
    </dialog>
  `,
  styles: `
    /* margen superior: deja aire para que la tarjeta levantada no tape la bajada, sin alejar demasiado las tarjetas */
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-top: 44px; }
    .card { background: var(--card-bg); border: 1px solid transparent; /* sin línea: el relieve define el borde */ box-shadow: var(--card-shadow); border-radius: var(--radius); padding: 28px; transform: perspective(900px) translateZ(0);
      transition: transform 350ms ease, box-shadow 350ms ease; will-change: transform; }
    /* Hover: la tarjeta se acerca levemente en el eje Z */
    .card:not(.card--lift):hover { transform: perspective(900px) translateZ(14px); box-shadow: var(--neo-bevel), var(--neo-raise), var(--shadow-hover); }
    .card h3 { font-variant-caps: small-caps; letter-spacing: .02em; }
    .card p { margin: 0; font-size: .86rem; }
    @media (max-height: 760px) { .card { padding: 20px; } .card__icon { margin-bottom: 12px; } }
    /* En celular: carrusel horizontal que se desliza con el dedo, para que la sección quepa en la pantalla */
    @media (max-width: 720px) {
      .grid { margin-top: 0; display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 14px;
        margin: 0 -24px; padding: 4px 24px 12px; scroll-padding-inline: 24px; scrollbar-width: thin; }
      .grid > .card { flex: 0 0 82%; scroll-snap-align: start; }
      /* Espacio para el relieve (sombras) de las tarjetas: el carrusel recorta lo que se sale de su caja,
         y sin este margen se veía un corte recto bajo las tarjetas. Los márgenes negativos lo compensan. */
      .grid { padding-block: 16px 30px; margin-block: -12px -24px; }
    }
    .dots { display: none; }
    @media (max-width: 720px) {
      .dots { display: flex; justify-content: center; gap: 4px; margin-top: 6px; }
      /* zona táctil de 28px; el punto visible es más chico y se alarga cuando está activo */
      .dot { width: 28px; height: 28px; padding: 0; border: 0; background: none; cursor: pointer; display: grid; place-items: center; }
      .dot::before { content: ''; width: 8px; height: 8px; border-radius: 4px; background: color-mix(in srgb, var(--muted) 45%, transparent);
        box-shadow: inset 1px 1px 2px var(--neo-lo), inset -1px -1px 2px var(--neo-hi);
        transition: width 300ms ease, background-color 300ms ease; }
      .dot.is-on::before { width: 22px; background: var(--rust); box-shadow: var(--neo-bevel-color); }
    }
    .card__icon { width: 46px; height: 46px; border-radius: 16px; background: var(--teal-soft); color: var(--teal);
      display: grid; place-items: center; margin-bottom: 18px;
      box-shadow: inset 3px 3px 7px var(--neo-lo), inset -3px -3px 7px var(--neo-hi); /* hundido en la tarjeta */
      transition: background-color 300ms ease, color 300ms ease, box-shadow 300ms ease; }
    .card.is-lifted .card__icon { background: var(--rust); color: var(--surface); box-shadow: var(--neo-bevel-color), 2px 3px 6px rgba(60, 22, 6, .3); } /* y en relieve al levantarse */
    /* Ola como la que llega a la orilla: el frente sube de a poco (primero el costado izquierdo), revienta,
       retrocede lento con una pequeña resaca y se asienta. Las tarjetas se mueven superpuestas, como un
       fluido; la ola avanza cada vez más lenta y con menos fuerza hasta la última. (Curva generada por
       una función suave y muestreada en 25 puntos.) */
    /* Durante la ola no hay hover ni clic: se habilitan apenas termina */
    .grid.is-waving .card:not(.is-lifted):not(.wave-done) { animation: card-wave var(--wl) linear calc(200ms + var(--wd)) both; }
    .grid > .card:nth-child(1) { --wd: 0ms;   --wl: 1050ms; --amp: 1; }
    .grid > .card:nth-child(2) { --wd: 150ms; --wl: 1120ms; --amp: .9; }
    .grid > .card:nth-child(3) { --wd: 320ms; --wl: 1200ms; --amp: .78; }
    .grid > .card:nth-child(4) { --wd: 520ms; --wl: 1300ms; --amp: .66; }
    /* ---------- Ventana emergente ---------- */
    .svc-modal { width: 70vw; height: 70vh; max-width: 1200px; max-height: 820px; padding: 0; border: 1px solid var(--line);
      border-radius: 34px; background: #f0f3f7; color: var(--ink); /* un tono bajo el blanco: así el canto de luz del borde se ve */
      /* Neomorfismo: bisel ancho (canto iluminado arriba a la izquierda, en sombra abajo a la derecha) sobre su sombra de siempre */
      box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, .95), inset 9px 9px 8px #ffffff, inset 16px 16px 30px rgba(255, 255, 255, .95),
        inset -12px -14px 20px rgba(29, 53, 87, .3), inset -22px -26px 52px rgba(29, 53, 87, .2),
        0 0 0 1.5px rgba(255, 255, 255, .85), 0 40px 90px -20px rgba(10, 18, 32, .55);
      overflow: hidden; transform-origin: center; } /* el recuadro nunca muestra barra de scroll */
    .svc-modal::backdrop { background: rgba(14, 22, 36, .55); backdrop-filter: blur(4px); animation: backdrop-in 260ms ease; }
    /* Al cerrar se difumina: se desvanece con un desenfoque progresivo */
    .svc-modal.is-closing { animation: modal-out 380ms cubic-bezier(.25, .6, .4, 1) forwards; }
    .svc-modal.is-closing::backdrop { animation: backdrop-out 380ms ease-out forwards; }
    @keyframes modal-out { to { opacity: 0; filter: blur(14px); transform: scale(1.03); } }
    @keyframes backdrop-in { from { opacity: 0; } }
    @keyframes backdrop-out { to { opacity: 0; } }
    .svc-modal__close { position: absolute; top: 16px; right: 16px; width: 40px; height: 40px; border-radius: 8px; border: 1px solid var(--line);
      background: var(--surface); color: var(--heading); font-size: 1rem; cursor: pointer; display: grid; place-items: center;
      box-shadow: var(--neo-bevel), var(--neo-raise-sm); transition: background-color 200ms, transform 200ms, box-shadow 200ms; }
    .svc-modal__close:active { box-shadow: var(--neo-press); transition-duration: 90ms; }
    .svc-modal__close:hover { background: var(--rust-card); transform: rotate(90deg); }
    /* Solo el interior hace scroll, y solo si el contenido es más largo que la ventana */
    .svc-modal__body { box-sizing: border-box; height: 100%; overflow-y: auto; overscroll-behavior: contain;
      display: flex; flex-direction: column; padding: clamp(28px, 6vw, 80px); }
    .svc-modal__in { margin-block: auto; /* centrado vertical que no corta el inicio si hay scroll */
      display: flex; flex-direction: column; align-items: flex-start; gap: 18px; max-width: 860px; }
    .svc-modal__icon { width: 76px; height: 76px; border-radius: 26px; background: var(--rust); color: var(--surface); display: grid; place-items: center;
      box-shadow: var(--neo-bevel-color), var(--neo-raise-sm); }
    .svc-modal__icon ::ng-deep svg { width: 38px; height: 38px; }
    .svc-modal h2 { margin: 0; font-size: clamp(1.6rem, 3vw, 2.4rem); color: var(--heading); font-variant-caps: small-caps; letter-spacing: .02em; }
    .svc-modal p { margin: 0; font-size: clamp(1rem, 1.4vw, 1.2rem); line-height: 1.6; color: var(--muted); }
    .svc-modal__text { white-space: pre-line; } /* respeta los saltos de línea del texto largo */
    @media (max-width: 720px) { .svc-modal { width: 92vw; height: 80vh; } }
    /* Tema oscuro: la ventana se despega más del fondo (tono más claro, borde y sombra marcados, textos más claros) */
    :host-context([data-theme='dark']) .svc-modal { background: #263248; border-color: #44536f;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08), inset 6px 6px 6px rgba(255, 255, 255, .2), inset 12px 12px 24px rgba(160, 180, 215, .1),
        inset -10px -12px 20px rgba(0, 0, 0, .55), inset -18px -22px 48px rgba(0, 0, 0, .4), 0 0 0 1px rgba(255, 255, 255, .04), 0 40px 100px -10px rgba(0, 0, 0, .85); }
    :host-context([data-theme='dark']) .svc-modal::backdrop { background: rgba(4, 8, 16, .72); }
    :host-context([data-theme='dark']) .svc-modal p { color: #c3cbd8; }
    :host-context([data-theme='dark']) .svc-modal__close { background: #31405b; border-color: #4a5a78; color: #f1f4f8; }
    @keyframes card-wave {
      0.0% { --wave: calc(-0.000 * var(--amp) * 70px); --wave-ry: calc(0.000 * var(--amp) * 18deg); }
      4.17% { --wave: calc(0.047 * var(--amp) * 70px); --wave-ry: calc(0.429 * var(--amp) * 18deg); }
      8.33% { --wave: calc(0.179 * var(--amp) * 70px); --wave-ry: calc(0.778 * var(--amp) * 18deg); }
      12.5% { --wave: calc(0.371 * var(--amp) * 70px); --wave-ry: calc(0.981 * var(--amp) * 18deg); }
      16.67% { --wave: calc(0.587 * var(--amp) * 70px); --wave-ry: calc(1.000 * var(--amp) * 18deg); }
      20.83% { --wave: calc(0.787 * var(--amp) * 70px); --wave-ry: calc(0.832 * var(--amp) * 18deg); }
      25.0% { --wave: calc(0.933 * var(--amp) * 70px); --wave-ry: calc(0.508 * var(--amp) * 18deg); }
      29.17% { --wave: calc(0.998 * var(--amp) * 70px); --wave-ry: calc(0.094 * var(--amp) * 18deg); }
      33.33% { --wave: calc(0.972 * var(--amp) * 70px); --wave-ry: calc(-0.316 * var(--amp) * 18deg); }
      37.5% { --wave: calc(0.867 * var(--amp) * 70px); --wave-ry: calc(-0.637 * var(--amp) * 18deg); }
      41.67% { --wave: calc(0.707 * var(--amp) * 70px); --wave-ry: calc(-0.813 * var(--amp) * 18deg); }
      45.83% { --wave: calc(0.528 * var(--amp) * 70px); --wave-ry: calc(-0.831 * var(--amp) * 18deg); }
      50.0% { --wave: calc(0.361 * var(--amp) * 70px); --wave-ry: calc(-0.726 * var(--amp) * 18deg); }
      54.17% { --wave: calc(0.226 * var(--amp) * 70px); --wave-ry: calc(-0.557 * var(--amp) * 18deg); }
      58.33% { --wave: calc(0.129 * var(--amp) * 70px); --wave-ry: calc(-0.385 * var(--amp) * 18deg); }
      62.5% { --wave: calc(0.066 * var(--amp) * 70px); --wave-ry: calc(-0.259 * var(--amp) * 18deg); }
      66.67% { --wave: calc(0.022 * var(--amp) * 70px); --wave-ry: calc(-0.209 * var(--amp) * 18deg); }
      70.83% { --wave: calc(-0.021 * var(--amp) * 70px); --wave-ry: calc(-0.214 * var(--amp) * 18deg); }
      75.0% { --wave: calc(-0.068 * var(--amp) * 70px); --wave-ry: calc(-0.182 * var(--amp) * 18deg); }
      79.17% { --wave: calc(-0.097 * var(--amp) * 70px); --wave-ry: calc(-0.045 * var(--amp) * 18deg); }
      83.33% { --wave: calc(-0.086 * var(--amp) * 70px); --wave-ry: calc(0.114 * var(--amp) * 18deg); }
      87.5% { --wave: calc(-0.050 * var(--amp) * 70px); --wave-ry: calc(0.163 * var(--amp) * 18deg); }
      91.67% { --wave: calc(-0.019 * var(--amp) * 70px); --wave-ry: calc(0.109 * var(--amp) * 18deg); }
      95.83% { --wave: calc(-0.005 * var(--amp) * 70px); --wave-ry: calc(0.045 * var(--amp) * 18deg); }
      100.0% { --wave: calc(0.000 * var(--amp) * 70px); --wave-ry: calc(0.000 * var(--amp) * 18deg); }
    }
  `,
})
export class Services {
  private sanitizer = inject(DomSanitizer);
  private i18n = inject(I18nService);
  private scroll = inject(SmoothScrollService);
  private splash = inject(SplashService);
  /** La ola se reproduce una vez cada vez que se llega a Servicios (y luego se quita la clase). */
  private inSection = computed(() => this.splash.done() && this.scroll.active() === 'servicios');
  readonly waving = signal(false);
  /** Celular: tarjeta visible en el carrusel (para los puntos) */
  readonly slide = signal(0);
  private grid = viewChild<ElementRef<HTMLElement>>('grid');

  onGridScroll() {
    const g = this.grid()?.nativeElement; const first = g?.firstElementChild as HTMLElement | null;
    if (!g || !first) return;
    const step = first.offsetWidth + parseFloat(getComputedStyle(g).columnGap || '0');
    // en el borde derecho, la última aunque no llegue a alinearse
    const last = g.scrollLeft + g.clientWidth >= g.scrollWidth - 4;
    this.slide.set(last ? this.t().items.length - 1 : Math.round(g.scrollLeft / step));
  }

  goToSlide(i: number) {
    const g = this.grid()?.nativeElement; const card = g?.children[i] as HTMLElement | undefined;
    // distancia desde la primera tarjeta (ambas medidas respecto del mismo contenedor)
    if (g && card) g.scrollTo({ left: card.offsetLeft - (g.firstElementChild as HTMLElement).offsetLeft, behavior: 'smooth' });
  }
  private waveTimer: ReturnType<typeof setTimeout> | undefined;
  private static readonly WAVE_MS = 200 + 520 + 1300 + 60; // retardo inicial + inicio de la última + su duración

  constructor() {
    effect(() => {
      const inside = this.inSection();
      clearTimeout(this.waveTimer);
      if (inside) document.querySelectorAll('#servicios .grid > .card.wave-done').forEach((c) => c.classList.remove('wave-done'));
      this.waving.set(inside);
      if (inside) this.waveTimer = setTimeout(() => this.waving.set(false), Services.WAVE_MS);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.waveTimer));
  }
  t = () => this.i18n.t().services;
  closeLabel = () => (this.i18n.lang() === 'es' ? 'Cerrar' : 'Close');

  // ---------- Ventana emergente ----------
  private dlg = viewChild<ElementRef<HTMLDialogElement>>('dlg');
  private injector = inject(Injector);
  /** Tarjeta abierta (1..n; 0/null = ninguna). Se guarda +1 para que @if no descarte la primera. */
  readonly selected = signal<number | null>(null);
  readonly closing = signal(false);

  /**
   * Abre la ventana saliendo de la tarjeta: parte con la posición, el tamaño y el color de la tarjeta
   * y crece hasta su tamaño final; el contenido aparece al final del crecimiento.
   */
  open(i: number) {
    const d = this.dlg()?.nativeElement;
    if (!d || d.open) return;
    this.closing.set(false);
    this.selected.set(i + 1);
    // se abre y anima una vez que Angular pintó el contenido de la tarjeta elegida
    afterNextRender(() => this.grow(d, i), { injector: this.injector });
  }

  private grow(d: HTMLDialogElement, i: number) {
    d.showModal();
    const card = document.querySelectorAll<HTMLElement>('#servicios .grid > .card')[i];
    if (!card) return;
    const c = card.getBoundingClientRect();
    const r = d.getBoundingClientRect();
    const dx = c.left + c.width / 2 - (r.left + r.width / 2);
    const dy = c.top + c.height / 2 - (r.top + r.height / 2);
    const from = getComputedStyle(card);
    const to = getComputedStyle(d);
    // Al partir, sus esquinas (que se ven escaladas) tienen exactamente la curva de las de la tarjeta
    const sx = c.width / r.width, sy = c.height / r.height, cr = parseFloat(from.borderTopLeftRadius) || 22;
    d.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        backgroundColor: from.backgroundColor, borderColor: from.borderColor, borderRadius: `${cr / sx}px / ${cr / sy}px` },
      { transform: 'none', backgroundColor: to.backgroundColor, borderColor: to.borderColor, borderRadius: to.borderRadius },
    ], { duration: 520, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    // el contenido (se deformaría al escalar) aparece cuando la ventana ya casi llegó a su tamaño
    for (const el of Array.from(d.children) as HTMLElement[]) {
      // solo opacidad: desplazar el contenido lo haría desbordar un instante y asomaría la barra de scroll
      el.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: 300, delay: 300, easing: 'ease-out', fill: 'backwards' });
    }
  }

  /** Cierre con animación (✕, Esc o clic fuera de la ventana). */
  close() {
    const d = this.dlg()?.nativeElement;
    if (!d?.open || this.closing()) return;
    this.closing.set(true);
    d.classList.add('is-closing'); // de inmediato, sin esperar el ciclo de actualización de Angular
    setTimeout(() => { d.close(); d.classList.remove('is-closing'); this.closing.set(false); this.selected.set(null); }, 400);
  }

  /** Un clic en el fondo oscuro (fuera del recuadro) cierra la ventana. */
  onDialogClick(e: MouseEvent) {
    const d = this.dlg()?.nativeElement;
    if (!d) return;
    const r = d.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) this.close();
  }
  // SVG fijo y propio (no viene del usuario), por eso es seguro marcarlo como confiable
  private svg = (d: string) =>
    this.sanitizer.bypassSecurityTrustHtml(`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`);

  /**
   * Catálogo de íconos de servicio. La base de datos elige uno por su clave (columna services.icon);
   * las claves válidas son las de la restricción de esa columna (migración 005). Para agregar un ícono:
   * agrégalo aquí y su clave en la restricción.
   */
  private icons: Record<string, SafeHtml> = {
    requirements: this.svg('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
    web: this.svg('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>'),
    systems: this.svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
    integrations: this.svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
    mobile: this.svg('<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>'),
    data: this.svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    cloud: this.svg('<path d="M17.5 19a4.5 4.5 0 0 0 .4-8.98A6 6 0 0 0 6.2 9.2 4 4 0 0 0 6.5 19z"/>'),
    support: this.svg('<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2z"/>'),
  };
  icon = (key: string): SafeHtml => this.icons[key] ?? this.icons['web'];
}
