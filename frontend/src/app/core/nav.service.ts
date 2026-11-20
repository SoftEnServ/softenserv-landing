import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { SmoothScrollService } from './smooth-scroll.service';

/**
 * Navegación del sitio:
 *  - destino que empieza con "/" → otra página (por ejemplo "/contact")
 *  - destino sin "/" → sección de la landing (por ejemplo "proyectos")
 * Además anima el cambio de página con un círculo que se abre (ida) o se cierra (vuelta).
 */
@Injectable({ providedIn: 'root' })
export class NavService {
  private router = inject(Router);
  private scroll = inject(SmoothScrollService);

  readonly path = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => this.clean(e.urlAfterRedirects)),
    ),
    // Al recargar, el router aún no navegó: partimos de la URL real del navegador
    { initialValue: this.clean(typeof location !== 'undefined' ? location.pathname : this.router.url) },
  );

  private pendingSection: string | null = null;
  private landingY = 0;        // posición del scroll al salir de la landing
  private viaBack = false;     // navegación con "volver" / botón Atrás
  private ownBack = false;     // el "volver" lo pidió el botón del sitio (no el del navegador)
  private navigations = 0;     // páginas visitadas dentro del sitio
  /** Posición de scroll a aplicar cuando la página nueva esté lista. */
  private scrollAction: (() => void) | null = null;

  constructor() {
    // El sitio maneja el scroll al volver (evita que el navegador lo mueva por su cuenta)
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    this.router.events.subscribe((e) => {
      if (e instanceof NavigationStart) {
        if (this.path() === '/') this.landingY = window.scrollY;
        this.viaBack = e.navigationTrigger === 'popstate';
        this.ownBack = false;
      }
      if (e instanceof NavigationEnd) {
        this.navigations++;
        // Al terminar de cambiar de página: sección pedida, posición anterior (si se volvió) o inicio
        const section = this.pendingSection, back = this.viaBack, y = this.landingY;
        this.pendingSection = null;
        this.scrollAction = () => {
          if (this.path() !== '/') this.scroll.jump(null);
          else if (section) this.scroll.jump(section);
          else if (back) this.scroll.restore(y);
          else this.scroll.jump(null);
        };
        // Con transición, el scroll se aplica justo cuando la página nueva está lista (ver animate),
        // así nunca se ve un cuadro en la posición equivocada. Sin soporte, en el próximo cuadro.
        if (!('startViewTransition' in document)) requestAnimationFrame(() => this.flushScroll());
      }
    });
  }

  /** Vuelve a la página anterior del sitio (o a la landing si se entró directo a esta página). */
  back(from?: { x: number; y: number }) {
    if (this.navigations > 1) { this.ownBack = true; history.back(); }
    else this.router.navigateByUrl('/');
  }

  /** @param from punto de la pantalla desde donde nace la transición */
  go(target: string, from?: { x: number; y: number }, source?: HTMLElement) {
    if (target.startsWith('/')) {
      if (this.path() === target) this.scroll.go('inicio');
      else this.router.navigateByUrl(target);
      return;
    }
    if (this.path() === '/') this.scroll.go(target, source);
    else { this.pendingSection = target; this.router.navigateByUrl('/'); }
  }

  /**
   * Transición entre páginas (la animación está en CSS, styles.scss):
   *  - ida a contacto: círculo que se abre desde el centro de la pantalla
   *  - vuelta: círculo que se cierra hacia el centro
   */
  animate(transition: ViewTransition, toPath: string) {
    const html = document.documentElement;
    html.classList.toggle('vt-close', toPath !== '/contact');
    const x = window.innerWidth / 2, y = window.innerHeight / 2;
    html.style.setProperty('--vt-x', `${x}px`);
    html.style.setProperty('--vt-y', `${y}px`);
    html.style.setProperty('--vt-r', `${Math.ceil(Math.hypot(x, y))}px`);
    // La página nueva ya está en el DOM pero aún no se muestra: es el momento de fijar el scroll
    transition.updateCallbackDone.then(() => this.flushScroll(), () => this.flushScroll());
    transition.finished.finally(() => html.classList.remove('vt-close')).catch(() => { /* transición omitida */ });
  }

  private flushScroll() {
    const action = this.scrollAction;
    this.scrollAction = null;
    action?.();
  }

  private clean(url: string) {
    return url.split(/[?#]/)[0] || '/';
  }
}
