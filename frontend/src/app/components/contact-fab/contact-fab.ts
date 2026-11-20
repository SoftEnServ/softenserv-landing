import { Component, DestroyRef, ElementRef, computed, effect, inject } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { NavService } from '../../core/nav.service';
import { SplashService } from '../../core/splash.service';

/**
 * Botón flotante:
 *  - en la landing lleva a Contacto (ícono de mensaje)
 *  - en Contacto muestra una flecha y vuelve a la página anterior
 * Aparece tras el splash inflándose como un globo.
 * En la landing, tras esperar 6 s, se vuelve a inflar en ciclo (pausas de 0,9 s y 1,8 s, alternadas).
 * En Contacto, al intentar hacer scroll, salta como una moneda; en la landing, al llegar al final y al intentar seguir bajando estando en el fondo
 * (y el ciclo de inflado vuelve a empezar).
 */
@Component({
  selector: 'app-contact-fab',
  template: `
    <button type="button" class="fab btn btn--primary" [class.fab--hidden]="!splash.done()" [class.fab--on-contact]="onContact()"
            [attr.aria-hidden]="!splash.done()" [attr.tabindex]="splash.done() ? 0 : -1"
            [attr.aria-label]="label()" [attr.title]="label()" (click)="onClick($event)">
      <span class="fab__icon" [class.fab__icon--back]="onContact()">
        @if (onContact()) {
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        } @else {
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        }
      </span>
      <span class="fab__label">{{ label() }}</span>
    </button>
  `,
  styles: `
    .fab { position: fixed; z-index: 45; view-transition-name: contact-fab; right: 24px; bottom: calc(var(--footer-h) + 20px);
      /* Ancho fijo: no cambia de tamaño al pasar de "Let's talk" a "Back" ni al cambiar de idioma */
      width: 160px; height: 52px; padding: 0 18px; justify-content: center; border-radius: 10px; /* como los demás botones: esquinas poco suavizadas */ gap: 10px; font: inherit; font-weight: 600; font-size: .95rem;
      opacity: 1; transition: opacity 300ms ease, transform 350ms ease, box-shadow 350ms ease, background-color 250ms ease; }
    .fab--hidden { opacity: 0; pointer-events: none; }
    .fab__icon { display: grid; place-items: center; animation: icon-in 450ms cubic-bezier(.3, 1.5, .5, 1); }
    @keyframes icon-in { from { rotate: -90deg; scale: .4; opacity: 0; } }
    /* En celular, solo el ícono */
    @media (max-width: 720px) {
      .fab { right: 16px; bottom: calc(var(--footer-h) + 16px); width: 56px; height: 56px; padding: 0; }
      .fab__label { display: none; }
      /* En Contacto no cabe sin tapar el formulario, y volver ya está en el menú y en la casita del header */
      .fab--on-contact { display: none; }
    }
  `,
})
export class ContactFab {
  i18n = inject(I18nService);
  splash = inject(SplashService);
  private nav = inject(NavService);
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  onContact = computed(() => this.nav.path() === '/contact');
  label = computed(() => (this.onContact() ? this.i18n.t().nav.back : this.i18n.t().nav.cta));

  /** Espera antes de empezar el ciclo y pausas entre inflados en la landing. */
  private readonly START_DELAY = 6000;
  private readonly PAUSES = [900, 1800];
  private loopToken = 0;       // cambia cada vez que se inicia o detiene el ciclo
  private looping = false;
  private spinning: Animation | null = null;
  private lastSpinEnd = 0;

  constructor() {
    let appeared = false;
    effect(() => {
      if (!this.splash.done()) return;
      const onContact = this.onContact();
      if (!appeared) {
        // Primera aparición tras el splash: inflado desde cero, con ondas
        appeared = true;
        requestAnimationFrame(async () => {
          await this.inflate(true);
          if (!this.onContact()) this.startLoop();
        });
        return;
      }
      if (onContact) this.stopLoop();
      else this.startLoop();
    });

    // En Contacto: cualquier intento de scroll hace girar la "moneda".
    // En la landing: también salta si, estando ya al final, se intenta seguir bajando.
    const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0; };
    const isDown = (e: Event) => {
      if (e instanceof WheelEvent) return e.deltaY > 0;
      if (e instanceof KeyboardEvent) return ['ArrowDown', 'PageDown', 'End'].includes(e.key) || (e.key === ' ' && !e.shiftKey);
      if (e instanceof TouchEvent) return (e.touches[0]?.clientY ?? touchY) < touchY - 8; // dedo hacia arriba = bajar
      return false;
    };
    const atEnd = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    const onScrollIntent = (e: Event) => {
      if (!this.splash.done()) return;
      if (e instanceof KeyboardEvent && !SCROLL_KEYS.includes(e.key)) return;
      if (this.onContact()) { this.coinSpin(); return; }
      // Ya en el fondo y empujando hacia abajo (y sin un salto en curso)
      if (atBottom && atEnd() && isDown(e) && !this.spinning && performance.now() - this.lastSpinEnd > 250) this.bottomReached();
    };
    const events = ['wheel', 'touchmove', 'keydown'] as const;
    events.forEach((ev) => window.addEventListener(ev, onScrollIntent, { passive: true }));
    window.addEventListener('touchstart', onTouchStart, { passive: true });

    // En la landing: al llegar al final del scroll, salto de moneda y el ciclo vuelve a empezar desde el principio
    let atBottom = false;
    const onScroll = () => {
      if (this.onContact() || !this.splash.done()) { atBottom = false; return; }
      const bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      if (bottom && !atBottom) this.bottomReached();
      atBottom = bottom;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    inject(DestroyRef).onDestroy(() => {
      this.stopLoop();
      events.forEach((ev) => window.removeEventListener(ev, onScrollIntent));
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('scroll', onScroll);
    });
  }

  onClick(e: MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const from = e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    if (this.onContact()) this.nav.back(from);
    else this.nav.go('/contact', from);
  }

  /** Final de la landing: se detiene el ciclo, la moneda salta y el ciclo arranca de nuevo (espera inicial incluida). */
  private async bottomReached() {
    this.stopLoop();
    await this.coinSpin();
    if (!this.onContact()) this.startLoop();
  }

  private get btn() { return this.el.nativeElement.querySelector<HTMLElement>('.fab'); }

  /** Ciclo en la landing: espera 6 s → inflado → pausa 0,9 s → inflado → pausa 1,8 s → inflado → ... */
  private async startLoop() {
    if (this.looping) return; // ya está corriendo
    this.looping = true;
    const token = ++this.loopToken;
    let i = 0;
    let first = true;
    while (this.loopToken === token) {
      const pause = first ? this.START_DELAY : this.PAUSES[i++ % this.PAUSES.length];
      first = false;
      await new Promise((r) => setTimeout(r, pause));
      if (this.loopToken !== token || this.onContact()) break;
      await this.inflate(false);
    }
    if (this.loopToken === token) this.looping = false;
  }

  private stopLoop() {
    this.loopToken++; // invalida el ciclo en curso
    this.looping = false;
    this.btn?.getAnimations().filter((a) => a.id === 'inflate').forEach((a) => a.cancel());
  }

  /**
   * Globo: crece hasta casi el doble, se balancea, se encoge y rebota varias veces hasta quedar normal.
   * @param first primera aparición (desde tamaño cero y con ondas al final)
   */
  private async inflate(first: boolean) {
    const btn = this.btn;
    if (!btn) return;
    const start = first
      ? { scale: '0 0', translate: '0 40px', rotate: '0deg', opacity: 0, offset: 0 }
      : { scale: '1 1', translate: '0 0', rotate: '0deg', opacity: 1, offset: 0 };
    const anim = btn.animate(
      [
        start,
        { scale: first ? '0.5 0.75' : '0.82 0.9', translate: '0 16px', rotate: '-6deg', opacity: 1, offset: 0.12 },
        { scale: '1.85 1.55', translate: '0 -34px', rotate: '5deg', offset: 0.32 },
        { scale: '0.7 0.86', translate: '0 6px', rotate: '-4deg', offset: 0.46 },
        { scale: '1.4 1.2', translate: '0 -16px', rotate: '3deg', offset: 0.58 },
        { scale: '0.86 0.94', translate: '0 2px', rotate: '-2deg', offset: 0.7 },
        { scale: '1.15 1.07', translate: '0 -6px', rotate: '1deg', offset: 0.8 },
        { scale: '0.96 0.99', translate: '0 0', rotate: '0deg', offset: 0.9 },
        { scale: '1 1', translate: '0 0', rotate: '0deg', opacity: 1, offset: 1 },
      ],
      { duration: 1900, easing: 'ease-in-out', id: 'inflate' },
    );
    if (first) {
      // Dos ondas que se expanden alrededor del botón
      const ring = (delay: number) => btn.animate(
        [
          { boxShadow: 'var(--btn-inset), 0 0 0 0 rgba(var(--rust-rgb), .75)' },
          { boxShadow: 'var(--btn-inset), 0 0 0 36px rgba(var(--rust-rgb), 0)' },
        ],
        { duration: 1000, delay, easing: 'ease-out' },
      );
      ring(1500);
      ring(2000);
    }
    try { await anim.finished; } catch { /* cancelado al ir a Contacto */ }
  }

  /**
   * Moneda lanzada al aire: el botón salta alto girando sobre sí mismo, cae, rebota un poco
   * y termina bamboleándose sobre la mesa hasta quedar plano (como un disco de Euler).
   */
  private async coinSpin(): Promise<void> {
    const btn = this.btn;
    if (!btn) return;
    if (this.spinning) { await this.spinning.finished.catch(() => {}); return; }
    const frames: Keyframe[] = [];
    const N = 70;
    const JUMP = 0.42, H = 120;            // fracción del tiempo en el aire y altura del salto (px)
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      let y = 0, rx = 0, ry = 0;
      if (t <= JUMP) {
        const u = t / JUMP;
        y = -H * 4 * u * (1 - u);          // parábola: sube y cae
        rx = 720 * u;                      // dos vueltas en el aire, como una moneda lanzada
      } else {
        const v = (t - JUMP) / (1 - JUMP);
        y = -10 * Math.abs(Math.sin(Math.PI * 2 * v)) * Math.pow(1 - v, 2.2);  // rebotitos al caer
        const tilt = 34 * Math.pow(1 - v, 1.5);                                // bamboleo que se apaga
        const angle = 2 * Math.PI * (1.2 * v + 4 * v * v);                    // y se acelera
        rx = tilt * Math.sin(angle);
        ry = tilt * Math.cos(angle);
      }
      frames.push({ transform: `perspective(420px) translateY(${y.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`, offset: t });
    }
    this.spinning = btn.animate(frames, { duration: 1500, easing: 'linear' });
    await this.spinning.finished.catch(() => {});
    this.spinning = null;
    this.lastSpinEnd = performance.now();
  }

}
