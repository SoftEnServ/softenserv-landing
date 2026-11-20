import { Injectable, signal } from '@angular/core';

const MIN_MS = 450, MAX_MS = 800;  // duración según la distancia
/** Secciones de la landing, en el orden en que aparecen. */
const SECTIONS = ['inicio', 'servicios', 'proyectos'];
/** Secciones cuyo título vuela desde el menú al elegirlas. */
const FLY_TITLES = ['inicio', 'servicios', 'proyectos'];

/**
 * Posición de un elemento en el documento como si las secciones no estuvieran apiladas.
 * Las capas de la landing quedan fijas (sticky) y se achican al taparse, así que
 * getBoundingClientRect no sirve directamente: sumamos las alturas de las capas previas.
 */
export function naturalTop(el: Element): number {
  const layer = el.closest<HTMLElement>('app-landing > *');
  if (!layer?.parentElement) return el.getBoundingClientRect().top + window.scrollY;
  const landing = layer.parentElement;
  let y = landing.getBoundingClientRect().top + window.scrollY;
  for (let s = landing.firstElementChild; s && s !== layer; s = s.nextElementSibling) y += (s as HTMLElement).offsetHeight;
  const lr = layer.getBoundingClientRect();
  const k = lr.height / (layer.offsetHeight || 1) || 1; // escala actual de la capa
  return y + (el.getBoundingClientRect().top - lr.top) / k;
}

/** Escala actual de la capa que contiene al elemento (1 si no está apilada). */
function layerScale(el: Element): { k: number; cx: number } {
  const layer = el.closest<HTMLElement>('app-landing > *');
  if (!layer) return { k: 1, cx: 0 };
  const r = layer.getBoundingClientRect();
  return { k: r.height / (layer.offsetHeight || 1) || 1, cx: r.left + r.width / 2 };
}

/**
 * Desplazamiento animado entre las secciones de la landing y detección de la
 * sección visible para resaltarla en el navbar. Se hace con JavaScript para que
 * sea igual en todos los navegadores, incluso con "reducir animaciones" activado.
 */
/** Pausa (ms) sin eventos de rueda que marca el fin de un gesto y su inercia. */
const GESTURE_GAP = 200;

@Injectable({ providedIn: 'root' })
export class SmoothScrollService {
  /** Sección que se está viendo (vacío fuera de la landing). */
  readonly active = signal('inicio');

  private frame = 0;
  private animating = false;
  /** Último evento de rueda: un gesto (con su inercia) termina tras una pausa de GESTURE_GAP ms. */
  private lastWheel = 0;
  private touch: { x: number; y: number; axis: 'x' | 'y' | null } | null = null;
  private spyQueued = false;
  /** Sección a mantener en pantalla mientras la página termina de cargar (por ejemplo, los proyectos). */
  private pinned: { id?: string; y?: number; until: number } | null = null;

  init() {
    // En la landing el scroll va por páginas: cada gesto lleva a la sección siguiente/anterior
    // y se detiene ahí, ignorando la inercia del trackpad o la rueda. Fuera de la landing,
    // el scroll es normal y cualquier intento del usuario cancela una animación en curso.
    window.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('keydown', (e) => this.onKey(e), { passive: false });
    window.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: true });
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: true });
    window.addEventListener('scroll', () => this.queueSpy(), { passive: true });
    window.addEventListener('resize', () => this.queueSpy(), { passive: true });
    // Si el contenido cambia de alto justo después de un salto, reajustamos la posición
    new ResizeObserver(() => {
      if (!this.pinned) return;
      if (performance.now() > this.pinned.until) { this.pinned = null; return; }
      const top = this.pinned.id ? this.offsetOf(this.pinned.id) : this.pinned.y ?? null;
      if (top !== null) window.scrollTo(0, top);
    }).observe(document.body);
  }

  /**
   * Desplaza suavemente hasta la sección (id sin "#").
   * @param source enlace del menú que se tocó: si es Services, Projects o How we work,
   *               su texto "vuela" hasta el título de la sección (como el logo en el splash).
   */
  go(id: string, source?: HTMLElement) {
    const top = this.offsetOf(id);
    if (top === null) return;
    const prev = this.active();
    this.active.set(id); // el navbar marca el destino de inmediato
    const { endY, duration } = this.scrollTo(top);
    // El título vuela solo al llegar desde otra sección (no al repetir el clic en la actual)
    if (prev !== id && source?.closest('.header__nav') && FLY_TITLES.includes(id)) this.flyTitle(id, source, endY, duration);
  }

  // ---------- Título que vuela desde el menú ----------
  private flight: { anim: Animation; clone: HTMLElement; title: Element & ElementCSSInlineStyle } | null = null;

  private flyTitle(id: string, source: HTMLElement, endY: number, scrollMs: number) {
    this.endFlight();
    if (id === 'inicio') return this.flyHouse(source, endY, scrollMs); // en el Inicio vuela solo la casita
    const title = document.querySelector<HTMLElement>(`#${id} .eyebrow`);
    if (!title) return;
    const tr = title.getBoundingClientRect();
    const sr = source.getBoundingClientRect();
    if (!sr.width) return;

    // Posición del título en pantalla cuando termine el desplazamiento
    // (sin el efecto de capas: al llegar, la sección queda en su sitio y a escala normal)
    const finalTop = naturalTop(title) - endY;
    const { k, cx } = layerScale(title);
    const finalLeft = cx + (tr.left - cx) / k;

    // Copia del título con su estilo final, fuera de la página (encima del navbar)
    const cs = getComputedStyle(title);
    const clone = document.createElement('span');
    clone.className = 'title-flight';
    clone.setAttribute('aria-hidden', 'true');
    // copia completa (texto y, en el Inicio, la casita con sus estilos)
    clone.innerHTML = title.innerHTML;
    Object.assign(clone.style, {
      display: cs.display, alignItems: cs.alignItems, gap: cs.gap, whiteSpace: 'nowrap',
      left: `${finalLeft}px`, top: `${finalTop}px`, fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing, lineHeight: cs.lineHeight, textTransform: cs.textTransform, color: cs.color,
      fontVariantCaps: cs.fontVariantCaps,
    });
    document.body.appendChild(clone);

    // Punto de partida: sobre el enlace del menú, al tamaño de su letra y con su color
    const src = getComputedStyle(source);
    const s = parseFloat(src.fontSize) / parseFloat(cs.fontSize);
    const ch = clone.getBoundingClientRect().height;
    const dx = sr.left - finalLeft;
    const dy = sr.top + sr.height / 2 - (finalTop + (ch * s) / 2);

    title.style.visibility = 'hidden';
    const anim = clone.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, color: src.color, opacity: 0.6 },
        { opacity: 1, offset: 0.15 },
        { transform: 'translate(0, 0) scale(1)', color: cs.color, opacity: 1 },
      ],
      { duration: Math.max(scrollMs, 650) + 250, easing: 'cubic-bezier(.45, 0, .15, 1)', fill: 'forwards' },
    );
    this.flight = { anim, clone, title };
    anim.finished.then(() => this.endFlight(), () => this.endFlight());
  }

  /** Termina el vuelo: el título real reaparece y la copia se elimina. */
  /**
   * Inicio: solo la casita vuela, desde la del menú hasta la del título (el texto del título no se mueve).
   * Parte con el tamaño y el color de la casita del menú y llega con los del título.
   */
  private flyHouse(source: HTMLElement, endY: number, scrollMs: number) {
    const house = document.querySelector<SVGSVGElement>('#inicio .eyebrow .house');
    const from = source.querySelector<SVGSVGElement>('svg.house') ?? source;
    if (!house) return;
    const hr = house.getBoundingClientRect();
    const fr = from.getBoundingClientRect();
    if (!fr.width || !hr.width) return;

    // Posición de la casita del título cuando termine el desplazamiento (sin el efecto de capas)
    const { k, cx } = layerScale(house);
    const w = hr.width / k, h = hr.height / k;
    const finalTop = naturalTop(house) - endY;
    const finalLeft = cx + (hr.left - cx) / k;

    const clone = document.createElement('span');
    clone.className = 'title-flight';
    clone.setAttribute('aria-hidden', 'true');
    clone.appendChild(house.cloneNode(true)); // conserva sus estilos (puertas abiertas, luz)
    const to = getComputedStyle(house).color;
    Object.assign(clone.style, { left: `${finalLeft}px`, top: `${finalTop}px`, width: `${w}px`, height: `${h}px`, color: to, lineHeight: '0' });
    const svg = clone.firstElementChild as SVGSVGElement;
    svg.style.width = '100%'; svg.style.height = '100%'; svg.style.margin = '0';
    document.body.appendChild(clone);

    // escala por eje: la casita del título es más alta (estirada) que la del menú
    const sx = fr.width / w, sy = fr.height / h;
    const dx = fr.left - finalLeft, dy = fr.top - finalTop;
    house.style.visibility = 'hidden';
    const anim = clone.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, color: getComputedStyle(from).color },
        { transform: 'translate(0, 0) scale(1)', color: to },
      ],
      { duration: Math.max(scrollMs, 650) + 250, easing: 'cubic-bezier(.45, 0, .15, 1)', fill: 'forwards' },
    );
    this.flight = { anim, clone, title: house };
    anim.finished.then(() => this.endFlight(), () => this.endFlight());
  }

  private endFlight() {
    if (!this.flight) return;
    const { clone, title } = this.flight;
    this.flight = null;
    title.style.visibility = '';
    clone.remove();
  }

  /** Salta sin animación (al volver a la landing desde otra página). */
  jump(id: string | null) {
    this.cancel();
    const top = id ? this.offsetOf(id) : 0;
    window.scrollTo(0, top ?? 0);
    if (id && id !== 'inicio') { this.active.set(id); this.pinned = { id, until: performance.now() + 2500 }; }
    this.queueSpy();
  }

  /** Vuelve a una posición de scroll anterior (al regresar a la landing). */
  restore(y: number) {
    this.cancel();
    window.scrollTo(0, y);
    this.pinned = { y, until: performance.now() + 2500 };
    this.queueSpy();
  }

  /** Recalcula la sección activa (por ejemplo, al cambiar de página). */
  refresh() { this.queueSpy(); }

  // ---------------------------------------------------------------- scroll por páginas

  private onLanding(): boolean {
    return !!document.getElementById(SECTIONS[0]) && !document.querySelector('.header__nav.is-open, dialog[open]');
  }

  /** Hay una ventana emergente abierta: la página de fondo no debe moverse. */
  private modalOpen(e: Event): boolean {
    const d = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (!d) return false;
    // Sobre el fondo oscuro el destino del evento es el propio <dialog>: se decide por la posición del puntero
    const pt = e instanceof WheelEvent ? e : e instanceof TouchEvent ? e.touches[0] : null;
    const r = d.getBoundingClientRect();
    const inside = !!pt && pt.clientX >= r.left && pt.clientX <= r.right && pt.clientY >= r.top && pt.clientY <= r.bottom;
    if (!inside && e.cancelable) e.preventDefault(); // dentro, el propio recuadro contiene su scroll (overscroll-behavior)
    return true;
  }

  private onWheel(e: WheelEvent) {
    if (this.modalOpen(e)) return;
    if (e.ctrlKey || !this.onLanding() || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { this.cancel(); return; }
    e.preventDefault(); // el navegador no desplaza: lo hacemos nosotros, una sección por gesto
    const now = performance.now();
    const newGesture = now - this.lastWheel > GESTURE_GAP; // si no, es la inercia del mismo gesto
    this.lastWheel = now;
    if (!newGesture || this.animating || Math.abs(e.deltaY) < 1) return;
    this.page(e.deltaY > 0 ? 1 : -1);
  }

  private onKey(e: KeyboardEvent) {
    const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    if (!keys.includes(e.key)) return;
    if (document.querySelector('dialog[open]')) {
      const el = e.target as HTMLElement | null;
      if (!el?.closest('input, textarea, select')) e.preventDefault(); // con la ventana abierta, el fondo no se mueve
      return;
    }
    const el = e.target as HTMLElement | null;
    const typing = !!el?.closest('input, textarea, select, [contenteditable="true"]');
    if (typing) return;
    if (!this.onLanding() || e.altKey || e.ctrlKey || e.metaKey) { this.cancel(); return; }
    if (e.key === ' ' && el?.closest('button, a, [role="button"], [role="link"], [role="switch"]')) return;
    e.preventDefault();
    if (this.animating) return;
    if (e.key === 'Home') return this.page(-99);
    if (e.key === 'End') return this.page(99);
    const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
    this.page(down ? 1 : -1);
  }

  private onTouchStart(e: TouchEvent) {
    this.cancel();
    const t = e.touches[0];
    this.touch = t && e.touches.length === 1 ? { x: t.clientX, y: t.clientY, axis: null } : null;
  }

  private onTouchMove(e: TouchEvent) {
    if (this.modalOpen(e)) return;
    if (!this.touch || !this.onLanding()) return;
    const t = e.touches[0];
    const dx = t.clientX - this.touch.x, dy = t.clientY - this.touch.y;
    // Se decide el eje con el primer movimiento claro: lo horizontal (carruseles) sigue nativo
    if (!this.touch.axis && Math.hypot(dx, dy) > 6) this.touch.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
    if (this.touch.axis === 'y' && e.cancelable) e.preventDefault();
  }

  private onTouchEnd(e: TouchEvent) {
    const start = this.touch;
    this.touch = null;
    if (!start || start.axis !== 'y' || !this.onLanding() || this.animating) return;
    const dy = (e.changedTouches[0]?.clientY ?? start.y) - start.y;
    if (Math.abs(dy) > 40) this.page(dy < 0 ? 1 : -1); // dedo hacia arriba = bajar
  }

  /**
   * Paradas del scroll: el inicio de cada sección y, si una sección es más alta que la
   * franja visible, también su final (para no saltarse su contenido).
   */
  private stops(): { y: number; id: string }[] {
    const band = window.innerHeight - (document.querySelector<HTMLElement>('.header')?.offsetHeight ?? 72)
      - (document.querySelector<HTMLElement>('.footer')?.offsetHeight ?? 64);
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const out: { y: number; id: string }[] = [];
    for (const id of SECTIONS) {
      const top = this.offsetOf(id);
      const el = document.getElementById(id);
      if (top === null || !el) continue;
      out.push({ y: Math.min(top, maxY), id });
      const end = top + el.offsetHeight - band;
      if (end > top + 8) out.push({ y: Math.min(end, maxY), id });
    }
    return out.filter((s, i) => i === 0 || s.y > out[i - 1].y + 2);
  }

  /** Avanza (dir > 0) o retrocede (dir < 0) a la parada siguiente y se queda firme ahí. */
  private page(dir: number) {
    const stops = this.stops();
    if (!stops.length) return;
    const y = window.scrollY;
    let target: { y: number; id: string } | undefined;
    if (dir >= 99) target = stops[stops.length - 1];
    else if (dir <= -99) target = stops[0];
    else if (dir > 0) target = stops.find((s) => s.y > y + 2);
    else target = [...stops].reverse().find((s) => s.y < y - 2);
    if (!target) return;
    const prev = this.active();
    this.active.set(target.id);
    const { endY, duration } = this.scrollTo(target.y);
    // Al llegar con scroll a otra sección, su título también vuela desde el menú (si el menú está visible)
    if (prev !== target.id && FLY_TITLES.includes(target.id)) {
      const link = document.querySelector<HTMLElement>(`.header__nav [data-section="${target.id}"]`);
      if (link && link.getBoundingClientRect().width > 0 && getComputedStyle(link).visibility !== 'hidden') this.flyTitle(target.id, link, endY, duration);
    }
  }

  private offsetOf(id: string): number | null {
    const target = document.getElementById(id);
    if (!target) return null;
    if (id === 'inicio') return 0;
    // La distancia al navbar se define en CSS con scroll-margin-top (ver styles.scss)
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    return naturalTop(target) - margin;
  }

  private scrollTo(targetY: number): { endY: number; duration: number } {
    this.cancel();
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const startY = window.scrollY;
    const endY = Math.max(0, Math.min(targetY, maxY));
    const distance = endY - startY;
    if (Math.abs(distance) < 2) return { endY, duration: 0 };

    // Una sección: como siempre. Varias de una vez (p. ej. del Inicio a Proyectos): cada sección extra suma
    // tiempo y la curva es más suave, para que las capas intermedias no crucen la pantalla de golpe.
    const band = Math.max(1, window.innerHeight - 72 - (document.querySelector<HTMLElement>('.footer')?.offsetHeight ?? 64));
    const sections = Math.abs(distance) / band;
    const base = Math.min(MAX_MS, Math.max(MIN_MS, Math.abs(distance) * 0.4));
    const multi = sections > 1.3;
    const duration = multi ? Math.min(1500, base + (sections - 1) * 600) : base;
    const ease = multi
      ? (t: number) => -(Math.cos(Math.PI * t) - 1) / 2                                   // easeInOutSine: arranca y frena con calma
      : (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);      // easeInOutCubic
    const start = performance.now();
    this.animating = true;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, startY + distance * ease(t));
      if (t < 1) this.frame = requestAnimationFrame(step);
      else this.animating = false;
    };
    this.frame = requestAnimationFrame(step);
    return { endY, duration };
  }

  private cancel() {
    this.endFlight();   // si el usuario interrumpe, el título aparece en su lugar
    this.pinned = null; // el usuario tomó el control del scroll
    cancelAnimationFrame(this.frame);
    if (this.animating) { this.animating = false; this.queueSpy(); }
  }

  private queueSpy() {
    if (this.spyQueued) return;
    this.spyQueued = true;
    requestAnimationFrame(() => { this.spyQueued = false; if (!this.animating) this.spy(); });
  }

  /** La sección activa es la última cuyo borde superior pasó el 35% de la pantalla. */
  private spy() {
    if (!document.getElementById(SECTIONS[0])) return this.active.set(''); // no estamos en la landing
    if (this.pinned?.id) return this.active.set(this.pinned.id);
    const doc = document.documentElement;
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 4) {
      return this.active.set(SECTIONS[SECTIONS.length - 1]);
    }
    const probe = window.innerHeight * 0.35;
    let current = SECTIONS[0];
    for (const id of SECTIONS) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= probe) current = id;
    }
    this.active.set(current);
  }
}
