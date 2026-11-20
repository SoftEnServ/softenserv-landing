import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { I18nService } from '../../core/i18n.service';
import { ApiService } from '../../core/api.service';
import { Project } from '../../core/models';
import { demoUrl } from '../../core/subdomain';
import { SmoothScrollService } from '../../core/smooth-scroll.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

type State = { loading: boolean; error: boolean; data: Project[] };

/** Cinta continua: velocidad (px/s) y suavidad con que frena y retoma (constante de tiempo, s). */
const SPEED = 42;
const EASE_S = 0.35;

/**
 * Proyectos: una muestra de lo que hacemos, como una cinta continua que se desliza a velocidad
 * constante en un ciclo sin fin. Las tarjetas muestran solo su título; al pasar el mouse (o tocar una)
 * la cinta frena suavemente y esa tarjeta se levanta y despliega su detalle. Se puede recorrer a mano
 * con la rueda horizontal, el trackpad o arrastrando.
 */
@Component({
  selector: 'app-projects',
  template: `
    <section id="proyectos" class="section">
      <div class="engineer-bg" aria-hidden="true"></div>
      <div class="container">
        <div class="section__head">
          <span class="eyebrow"><span class="tall">{{ t().eyebrow }}</span></span>
          <h2>{{ t().title }}</h2>
        </div>

        @if (state().error) {
          <p class="notice">{{ t().error }}</p>
        } @else {
          <div class="marquee" #viewport [class.is-dragging]="dragging()"
               (pointerenter)="enter($event)" (mouseleave)="onMouseLeave()" (focusout)="onFocusOut($event)"
               (wheel)="onWheel($event)" (pointerdown)="dragStart($event)" (pointermove)="dragMove($event)"
               (pointerup)="dragEnd()" (pointercancel)="dragEnd()" (click)="onClick($event)" (dragstart)="$event.preventDefault()">
            <!-- Tarjetas fantasma, desplegadas, invisibles y superpuestas: el alto de la pista es el de la MÁS
                 ALTA de todas (título en dos líneas, descripción larga, otro idioma...). La pista tiene ese alto
                 fijo, así ninguna tarjeta al desplegarse puede mover la cinta ni la sección -->
            @if (state().data.length) {
              <div class="ghosts" #ghostEl aria-hidden="true">
                @for (g of state().data; track g.slug) {
                  <article class="card card--ghost is-hl">
                    <div class="card__head"><span class="card__icon" [innerHTML]="icon(g.slug)"></span><h3>{{ g.title }}</h3></div>
                    <div class="card__more"><div class="card__more-in"><span class="tag">{{ g.category }}</span><p>{{ g.summary }}</p></div></div>
                  </article>
                }
              </div>
            }
            <div class="track" #track>
              @if (state().loading) {
                @for (i of [1, 2, 3, 4]; track i) { <div class="card card--skeleton"></div> }
              } @else {
                @for (p of loop(); track $index; let i = $index) {
                  <!-- Toda la tarjeta es clicable: abre la demo del proyecto en su subdominio -->
                  <article class="card glass-sheen is-clickable" [class.is-hl]="highlighted() === i" role="link"
                           [attr.tabindex]="isCopy(i) ? -1 : 0" [attr.aria-label]="p.title"
                           (click)="openDemo(p.slug, $event)" (keydown.enter)="openDemo(p.slug)"
                           (pointerenter)="hover(i, $event)" (pointermove)="hover(i, $event)" (pointerleave)="leaveCard(i, $event)" (pointerdown)="touch(i, $event)" (focusin)="focusCard(i)">
                    <div class="card__head"><span class="card__icon" [innerHTML]="icon(p.slug)"></span><h3>{{ p.title }}</h3></div>
                    <!-- El detalle aparece solo cuando la tarjeta se acerca (destacada por la marquesina o por hover) -->
                    <div class="card__more" [attr.aria-hidden]="highlighted() === i ? null : 'true'">
                      <div class="card__more-in">
                        <span class="tag">{{ p.category }}</span>
                        <p>{{ p.summary }}</p>
                      </div>
                    </div>
                  </article>
                }
              }
            </div>
          </div>
          <!-- Solo en pantallas táctiles (sin hover): cómo abrir una demo -->
          <p class="touch-hint">{{ t().touchHint }}</p>
        }
      </div>
    </section>
  `,
  styles: `
    .touch-hint { display: none; }
    @media (hover: none) and (pointer: coarse) {
      .touch-hint { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 4px 0 0; font-size: .85rem; color: var(--muted); }
      .touch-hint::before { content: ''; width: 16px; height: 16px; flex: none; background: currentColor; opacity: .8;
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 11V5a2 2 0 0 1 4 0v6m0-1a2 2 0 0 1 4 0v1m0 0a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L4.6 15a2 2 0 0 1 3.4-2l1 1.6'/%3E%3C/svg%3E") center / contain no-repeat;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 11V5a2 2 0 0 1 4 0v6m0-1a2 2 0 0 1 4 0v1m0 0a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L4.6 15a2 2 0 0 1 3.4-2l1 1.6'/%3E%3C/svg%3E") center / contain no-repeat; }
    }

    /* ---------- Marquesina ---------- */
    /* Recorta solo hacia los lados: la tarjeta destacada puede sobresalir hacia arriba y abajo.
       Los márgenes dejan espacio para que al crecer no tape el texto de la sección. */
    .marquee { --gap: 22px; --fade: 9%; position: relative; overflow-x: clip; overflow-y: visible; margin: 72px 0 20px; /* más abajo */
      touch-action: pan-y; cursor: grab; }
    /* Bordes difuminados con el color del fondo (no recortan la tarjeta del centro) */
    .marquee::before, .marquee::after { content: ''; position: absolute; top: -12px; bottom: -56px; width: var(--fade); z-index: 3; pointer-events: none; }
    .marquee::before { left: 0; background: linear-gradient(90deg, var(--bg), transparent); }
    .marquee::after { right: 0; background: linear-gradient(-90deg, var(--bg), transparent); }
    /* Arrastrando: la pista sigue al puntero sin animación y no se selecciona texto */
    .marquee.is-dragging { cursor: grabbing; }
    .track { display: flex; align-items: center; gap: var(--gap); width: max-content; will-change: transform; transform: translate3d(0, 0, 0); }

    .card { position: relative; flex: 0 0 var(--card-w, 320px); display: flex; flex-direction: column; gap: 0; padding: 18px 22px;
      border: 1px solid transparent; border-radius: var(--radius); background: var(--card-bg); /* sin línea */ box-shadow: var(--card-shadow);
      opacity: .94; transform: scale(.86);
      transition: transform 380ms cubic-bezier(.2, .8, .2, 1), opacity 380ms ease, box-shadow 380ms ease, border-color 380ms ease, background-color 380ms ease; }
    /* La tarjeta destacada (la del centro o la que tiene el mouse) sobresale de las demás */
    /* Al destacarse se acerca muy rápido (110 ms, más que los 160 ms de Services) y se aleja con calma */
    /* Zona de hover un poco mayor que la tarjeta en reposo (que es pequeña): más fácil de alcanzar */
    /* Zona de hover ampliada solo para la tarjeta pequeña (en reposo); levantada, es la tarjeta misma */
    /* Zona ampliada en reposo; al plegarse vuelve recién cuando la tarjeta ya es pequeña (si no, la alcanzaría el puntero que acaba de salir) */
    .card::before { content: ''; position: absolute; inset: -58px -14px; transition: inset 0s linear 520ms; }
    .card.is-hl::before { inset: 0; }
    /* Levantada: su zona de hover pasa a ser solo la tarjeta misma, pero recién cuando terminó de desplegarse
       (si se redujera antes, el puntero quedaría "fuera" de la tarjeta aún pequeña y se plegaría de nuevo) */
    .card.is-hl::before { inset: 0; transition: inset 0s linear 560ms; }
    .ghosts { position: absolute; top: 0; left: 0; width: var(--card-w, 320px); display: grid; visibility: hidden; pointer-events: none; }
    .card--ghost { grid-area: 1 / 1; transform: none !important; transition: none !important; }
    .card--ghost .card__more { transition: none !important; }
    .card--ghost::before { display: none; }
    /* Destacada: sube rápido y se "pega al vidrio" con un pequeño rebote (curva con sobrepaso) */
    .card.is-hl { transition-duration: 480ms; transition-timing-function: cubic-bezier(.3, 1.4, .55, 1);
      opacity: 1; transform: perspective(800px) translateZ(85px) translateY(-8px); position: relative; z-index: 1;
      background-color: var(--rust-card);
      box-shadow: var(--neo-bevel-color), 0 40px 64px -16px rgba(16, 24, 40, .42), 0 8px 16px rgba(16, 24, 40, .1); }
    :host-context([data-theme='dark']) .card.is-hl { box-shadow: var(--neo-bevel-color), 0 40px 64px -10px rgba(0, 0, 0, .8), 0 8px 16px rgba(0, 0, 0, .35); }
    .card.is-hl .tag { background: var(--rust); color: var(--surface); box-shadow: var(--neo-bevel-color), 2px 3px 6px rgba(60, 22, 6, .3); }
    .tag { transition: background-color 400ms ease, color 400ms ease, box-shadow 400ms ease; align-self: flex-start; font-size: .75rem; font-weight: 600; color: var(--heading); background: var(--bg-alt); padding: 4px 10px; border-radius: 9px;
      box-shadow: var(--neo-bevel), -2px -2px 5px var(--neo-hi), 3px 3px 6px var(--neo-lo); } /* pastilla en relieve */
    .card h3 { font-size: 1.08rem; margin: 0; font-variant-caps: small-caps; letter-spacing: .02em; }
    /* ---------- Neomorfismo en el contenido ---------- */
    /* Ícono del proyecto: hundido en la tarjeta (como en Servicios); al destacarse, sale en relieve en óxido */
    .card__head { display: flex; align-items: center; gap: 12px; }
    .card__icon { flex: none; width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center;
      background: var(--teal-soft); color: var(--teal);
      box-shadow: inset 3px 3px 6px var(--neo-lo), inset -3px -3px 6px var(--neo-hi);
      transition: background-color 380ms ease, color 380ms ease, box-shadow 380ms ease; }
    .card__icon ::ng-deep svg { width: 17px; height: 17px; }
    .card.is-hl .card__icon { background: var(--rust); color: var(--surface); box-shadow: var(--neo-bevel-color), 2px 3px 6px rgba(60, 22, 6, .32); }
    /* Textos en bajorrelieve: un canto de luz y uno de sombra los graban en la superficie */
    .card h3, .card p { text-shadow: var(--neo-text); }
    .card.is-hl h3, .card.is-hl p { text-shadow: -1px -1px 1px rgba(255, 255, 255, .7), 2px 2px 3px rgba(110, 45, 15, .3); }
    :host-context([data-theme='dark']) .card.is-hl h3, :host-context([data-theme='dark']) .card.is-hl p { text-shadow: -1px -1px 1px rgba(255, 220, 200, .14), 2px 2px 4px rgba(0, 0, 0, .7); }
    /* Detalle plegado: se despliega (alto y opacidad) cuando la tarjeta se acerca */
    .card__more { display: grid; grid-template-rows: 0fr; opacity: 0;
      transition: grid-template-rows 500ms cubic-bezier(.2, .8, .2, 1), opacity 360ms ease; }
    .card__more-in { min-height: 0; overflow: hidden; display: flex; flex-direction: column; gap: 8px; }
    .card__more-in > :first-child { margin-top: 10px; }
    .card.is-hl .card__more { grid-template-rows: 1fr; opacity: 1; transition-delay: 90ms, 170ms; }
    .card p { font-size: .86rem; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    /* Tarjeta clicable: al presionarla se hunde levemente, como un botón (igual que en Servicios) */
    .card.is-clickable { cursor: pointer; }
    .card.is-hl.is-clickable:active { transform: perspective(800px) translateZ(60px) translateY(-6px); transition-duration: 90ms; transition-timing-function: ease-out; }
    .card.is-clickable:not(.is-hl):active { transform: scale(.83); transition-duration: 90ms; }
    .card.is-clickable:focus-visible { outline: 2px solid var(--rust); outline-offset: 4px; }
    .card--skeleton { height: 200px; background: linear-gradient(90deg, var(--bg-alt), var(--surface), var(--bg-alt)); background-size: 200% 100%;
      animation: shimmer 1.4s infinite; border: 0; }
    @keyframes shimmer { to { background-position: -200% 0; } }
    @media (min-width: 721px) and (max-height: 820px) {
      .marquee { margin: 56px 0 18px; }
      .card { padding: 14px 18px; }
      .card__more-in { gap: 6px; }
      .card p { -webkit-line-clamp: 2; }
    }
    @media (max-width: 720px) {
      .marquee { --gap: 14px; --fade: 6%; margin: 48px -24px 18px; }
      .card { padding: 16px 18px; }
      .card p { font-size: .82rem; }
    }
    .notice { padding: 28px; border: 1px dashed var(--line); border-radius: var(--radius); text-align: center; }
  `,
})
export class Projects {
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  /** Ícono de cada proyecto (por su slug); los proyectos nuevos usan el de una pantalla. */
  private icons = new Map(Object.entries({
    'customer-portal': '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4.5a3.2 3.2 0 0 1 0 6.2M21 20a6 6 0 0 0-4-5.6"/>',
    'inventory-system': '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    'scheduling-professionals': '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m9 15 2 2 4-4"/>',
    'erp-integration': '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    'reports-dashboard': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    'entrepreneur-website': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  }).map(([k, d]) => [k, this.svg(d)]));
  private fallbackIcon = this.svg('<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>');
  icon = (slug: string): SafeHtml => this.icons.get(slug) ?? this.fallbackIcon;
  private svg(d: string) {
    return this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`);
  }
  private i18n = inject(I18nService);

  t = () => this.i18n.t().projects;
  demoHref = (slug: string) => demoUrl(slug, this.i18n.lang());

  // Se vuelven a pedir los proyectos cada vez que cambia el idioma
  state = toSignal(
    toObservable(this.i18n.lang).pipe(
      switchMap((lang) =>
        this.api.getProjects(lang).pipe(
          map((data): State => ({ loading: false, error: false, data })),
          catchError(() => of<State>({ loading: false, error: true, data: [] })),
        ),
      ),
      startWith<State>({ loading: true, error: false, data: [] }),
    ),
    { requireSync: true },
  );

  // ---------- Cinta continua ----------
  private scroll = inject(SmoothScrollService);
  private viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  private trackEl = viewChild<ElementRef<HTMLElement>>('track');
  private ghostEl = viewChild<ElementRef<HTMLElement>>('ghostEl');
  private lastW = -1;
  private n = computed(() => this.state().data.length);
  /** Tres copias seguidas: la cinta recorre la del medio y, al cumplir una vuelta, sigue en la copia idéntica sin que se note. */
  loop = computed(() => { const d = this.state().data; return [...d, ...d, ...d]; });
  isCopy = (i: number) => i < this.n() || i >= 2 * this.n();

  /** Tarjeta con el mouse encima (o tocada / con foco): se levanta y despliega. */
  readonly focused = signal<number | null>(null);
  readonly highlighted = computed(() => this.focused());
  readonly dragging = signal(false);

  private cardW = 320;
  private gap = 22;
  /** Distancia recorrida por la cinta (px) y su velocidad actual (px/s). */
  private pos = 0;
  private vel = 0;
  private hovering = false;
  private lastScroll = 0;
  private lastWheel = 0;
  private drag: { x: number; base: number; moved: boolean; id: number } | null = null;
  private suppressClick = false;
  private touchTimer: ReturnType<typeof setTimeout> | undefined;
  /** Sin mouse (celulares y tablets): la tarjeta del centro se destaca sola */
  private touchMode = typeof matchMedia !== 'undefined' && matchMedia('(hover: none) and (pointer: coarse)').matches;
  /** Hasta cuándo se respeta la tarjeta que el usuario tocó (no se cambia por la del centro) */
  private touchHold = 0;
  /** Última posición conocida del mouse y cuándo se comprobó por última vez si sigue sobre la tarjeta levantada. */
  private ptr: { x: number; y: number } | null = null;
  private lastCheck = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Alto FIJO de la pista = alto de la tarjeta desplegada más alta (se vuelve a medir si cambia)
    let ghostRo: ResizeObserver | undefined;
    effect(() => {
      const g = this.ghostEl()?.nativeElement;
      const tr = this.trackEl()?.nativeElement;
      ghostRo?.disconnect();
      if (!g || !tr) return;
      // (en el cuadro siguiente: cambiar la pista dentro del aviso haría que el observador de la marquesina,
      // que la contiene, reciba otro aviso en el mismo ciclo y el navegador reporte un error)
      ghostRo = new ResizeObserver(() => requestAnimationFrame(() => (tr.style.height = `${g.offsetHeight}px`)));
      ghostRo.observe(g);
    });
    destroyRef.onDestroy(() => ghostRo?.disconnect());

    afterNextRender(() => {
      const vp = this.viewport()?.nativeElement;
      const measure = () => {
        const el = this.viewport()?.nativeElement;
        if (!el) return;
        const w = el.clientWidth;
        if (w === this.lastW) return; // el observador también avisa cambios de alto: solo importa el ancho
        this.lastW = w;
        // Ancho de tarjeta: ~3,3 tarjetas visibles en escritorio, 2,3 en tablet y una con las vecinas asomándose en celular
        const per = w > 1000 ? 3.3 : w > 700 ? 2.3 : 1.35;
        this.gap = parseFloat(getComputedStyle(el).getPropertyValue('--gap')) || 22;
        this.cardW = Math.round((w - this.gap * (Math.ceil(per) - 1)) / per);
        el.style.setProperty('--card-w', `${this.cardW}px`);
      };
      measure();
      const ro = new ResizeObserver(measure);
      if (vp) ro.observe(vp);
      destroyRef.onDestroy(() => ro.disconnect());

      // Bucle de la cinta: avanza cuadro a cuadro; la velocidad se acerca suavemente a la deseada
      let raf = 0, last = performance.now();
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const tr = this.trackEl()?.nativeElement;
        const n = this.n();
        if (tr && n) {
          const target = this.paused(now) ? 0 : SPEED;
          this.vel += (target - this.vel) * (1 - Math.exp(-dt / EASE_S));
          if (Math.abs(this.vel) < 0.05 && target === 0) this.vel = 0;
          if (!this.drag?.moved) this.pos += this.vel * dt;
          const L = n * (this.cardW + this.gap);            // largo de una copia
          const m = ((this.pos % L) + L) % L;               // posición dentro de la vuelta
          tr.style.transform = `translate3d(${-(L + m)}px, 0, 0)`;
          // Con el cursor quieto, la cinta pasa tarjetas por debajo y el navegador no avisa: se comprueba a mano
          // (~12 veces por segundo) qué tarjeta está bajo el cursor; ésa se levanta y la anterior baja.
          if (this.ptr && !this.drag?.moved && !this.justScrolled() && now - this.lastCheck > 80 && !document.querySelector('dialog[open]')) {
            this.lastCheck = now;
            this.pickUnderPointer(tr);
          }
          // Pantallas táctiles (sin mouse no hay hover): se destaca sola la tarjeta que pasa por el centro de la
          // cinta, así su detalle se ve sin tocar nada. Un toque o un arrastre del usuario tienen prioridad.
          else if (this.touchMode && !this.drag && now > this.touchHold && now - this.lastCheck > 100
                   && this.scroll.active() === 'proyectos' && !document.querySelector('dialog[open]')) {
            this.lastCheck = now;
            this.pickCenter(tr);
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      destroyRef.onDestroy(() => cancelAnimationFrame(raf));
    });

    // Si la página se desplaza (scroll vertical), la tarjeta bajo el puntero deja de destacarse de
    // inmediato: el navegador no avisa que el puntero salió de ella hasta que el scroll se detiene.
    const onScroll = () => {
      this.lastScroll = performance.now();
      if (this.hovering || this.focused() !== null) this.unhover();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const onPointer = (e: PointerEvent) => { if (e.pointerType === 'mouse') this.ptr = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('pointermove', onPointer, { passive: true });
    // salió de la ventana (en pantallas táctiles no hay mouse: los eventos de mouse que el navegador simula tras un toque no cuentan)
    const onOut = (e: MouseEvent) => { if (!e.relatedTarget && !this.touchMode) { this.ptr = null; this.focused.set(null); } };
    // Al cambiar de pestaña (p. ej. tras abrir una demo) nada queda levantado
    const onHide = () => { this.ptr = null; this.focused.set(null); };
    window.addEventListener('blur', onHide);
    document.addEventListener('visibilitychange', onHide);
    destroyRef.onDestroy(() => { window.removeEventListener('blur', onHide); document.removeEventListener('visibilitychange', onHide); });
    document.addEventListener('mouseout', onOut);
    destroyRef.onDestroy(() => document.removeEventListener('mouseout', onOut));
    destroyRef.onDestroy(() => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      clearTimeout(this.touchTimer);
    });
  }

  /** La cinta solo frena mientras se la recorre a mano, hay una ventana abierta o la sección no está a la vista. */
  private paused(now: number) {
    // El hover no la detiene: la tarjeta se levanta y sigue avanzando con la cinta
    return this.dragging() || now - this.lastWheel < 500
      || this.scroll.active() !== 'proyectos' || !!document.querySelector('dialog[open]');
  }

  hover(i: number, e: PointerEvent) {
    if (e.pointerType !== 'mouse' || this.justScrolled() || this.drag?.moved) return;
    if (this.focused() === i && this.hovering) return; // ya destacada: nada que hacer en cada movimiento
    this.hovering = true;
    this.focusCard(i);
  }

  focusCard(i: number) {
    this.focused.set(i);
  }

  /** Al salir de la tarjeta levantada, vuelve a su estado pequeño (la cinta sigue detenida mientras el mouse esté encima). */
  leaveCard(i: number, e: PointerEvent) {
    if (e.pointerType === 'mouse' && this.focused() === i) this.focused.set(null);
  }

  enter(e: PointerEvent) {
    if (e.pointerType === 'mouse' && !this.justScrolled()) this.hovering = true;
  }

  /**
   * Tarjeta bajo el cursor (aunque el cursor esté quieto y sea la cinta la que se mueve). La levantada conserva
   * su propia zona; las pequeñas tienen su zona ampliada (igual que el hover normal).
   */
  private pickUnderPointer(tr: HTMLElement) {
    const { x, y } = this.ptr!;
    const inside = (el: Element | undefined, padX: number, padY: number) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left - padX && x <= r.right + padX && y >= r.top - padY && y <= r.bottom + padY;
    };
    const cards = tr.children;
    const f = this.focused();
    if (f !== null && inside(cards[f], 0, 0)) return; // sigue sobre la levantada
    let hit: number | null = null;
    for (let i = 0; i < cards.length; i++) if (inside(cards[i], 12, 50)) { hit = i; break; }
    if (hit === null && f !== null && cards[f] === document.activeElement) return; // enfocada con el teclado: se respeta
    if (hit !== f) this.focused.set(hit);
  }

  /** La tarjeta más cercana al centro de la cinta. La destacada se mantiene hasta que otra quede 40px más cerca
   *  (así no parpadea entre dos cuando están a la misma distancia). */
  private pickCenter(tr: HTMLElement) {
    const vp = this.viewport()?.nativeElement;
    if (!vp) return;
    const v = vp.getBoundingClientRect();
    const cx = v.left + v.width / 2;
    const dist = (el: Element) => { const r = el.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - cx); };
    const cards = tr.children;
    let best = -1, bestD = Infinity;
    for (let i = 0; i < cards.length; i++) { const d = dist(cards[i]); if (d < bestD) { bestD = d; best = i; } }
    const f = this.focused();
    if (best < 0 || best === f) return;
    if (f !== null && cards[f] && dist(cards[f]) < bestD + 40) return;
    this.focused.set(best);
  }

  /** Los eventos de puntero que el navegador genera al terminar un scroll no cuentan como hover. */
  private justScrolled() { return performance.now() - this.lastScroll < 150; }

  onMouseLeave() { if (!this.touchMode) this.unhover(); }

  unhover() {
    this.hovering = false;
    this.focused.set(null);
  }

  /** Rueda horizontal o trackpad (y Shift + rueda): desplaza la cinta. La vertical sigue moviendo la página. */
  onWheel(e: WheelEvent) {
    const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!dx || !this.n()) return;
    e.preventDefault();
    e.stopPropagation();
    this.focused.set(null);
    this.lastWheel = performance.now();
    this.vel = 0;
    this.pos += dx;
  }

  dragStart(e: PointerEvent) {
    if (e.button !== 0 || !this.n()) return;
    this.drag = { x: e.clientX, base: this.pos, moved: false, id: e.pointerId };
  }

  dragMove(e: PointerEvent) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 6) return; // un toque o clic, no un arrastre
      d.moved = true;
      clearTimeout(this.touchTimer);
      this.focused.set(null);
      this.dragging.set(true);
      this.vel = 0;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    this.pos = d.base - dx; // la cinta sigue al puntero
  }

  dragEnd() {
    const d = this.drag;
    this.drag = null;
    if (!d?.moved) return;
    this.dragging.set(false);
    this.suppressClick = true; // el clic que sigue a un arrastre no abre la demo
    setTimeout(() => (this.suppressClick = false), 0);
  }

  /** Abre la demo del proyecto en una pestaña nueva (salvo que el clic venga de terminar un arrastre). */
  openDemo(slug: string, e?: MouseEvent) {
    if (this.suppressClick) { e?.preventDefault(); return; }
    window.open(this.demoHref(slug), '_blank', 'noopener');
    // La tarjeta vuelve a su tamaño: se quita el foco que dejó el clic y se olvida la posición del cursor
    // (al volver a esta pestaña se levanta de nuevo solo si el cursor se mueve sobre ella)
    (document.activeElement as HTMLElement | null)?.blur?.();
    this.ptr = null;
    this.focused.set(null);
  }

  onClick(e: MouseEvent) {
    if (this.suppressClick) { e.preventDefault(); e.stopPropagation(); }
  }

  onFocusOut(e: FocusEvent) {
    const vp = this.viewport()?.nativeElement;
    if (!vp?.contains(e.relatedTarget as Node | null)) this.unhover();
  }

  /** En pantallas táctiles: tocar una tarjeta la destaca y detiene la cinta unos segundos. */
  touch(i: number, e: PointerEvent) {
    if (e.pointerType === 'mouse') return;
    this.focusCard(i);
    this.touchHold = performance.now() + 4000;
    clearTimeout(this.touchTimer);
    this.touchTimer = setTimeout(() => this.unhover(), 4000);
  }
}
