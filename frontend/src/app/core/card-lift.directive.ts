import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/**
 * Efecto "carta pegándose en un vidrio": la tarjeta sube en el eje Z, choca con un pequeño rebote y
 * queda casi plana, apenas inclinada hacia el puntero; la sombra se aleja en sentido contrario.
 * Los estilos están en styles.scss (.card--lift). En pantallas táctiles no se activa.
 *
 * Si la página se desplaza, la tarjeta baja de inmediato: el navegador no avisa que el puntero
 * salió de ella hasta que el scroll se detiene, y la tarjeta quedaría levantada mientras se mueve.
 *
 * Uso: <article class="card" sesCardLift>
 */
@Directive({
  selector: '[sesCardLift]',
  host: { class: 'card--lift', '(pointermove)': 'tilt($event)', '(pointerleave)': 'untilt()', '(animationend)': 'waveEnd($event)' },
})
export class CardLiftDirective {
  private readonly MAX = 4; // inclinación máxima (grados): pegada al vidrio queda casi plana
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** Tras un scroll, no se vuelve a levantar hasta que el puntero se mueva de verdad sobre la tarjeta. */
  private lastScroll = 0;

  /** Última posición del mouse (compartida), para levantar una tarjeta que ya tiene el mouse encima. */
  private static pointer: { x: number; y: number } | null = null;
  private static tracking = false;

  constructor() {
    if (!CardLiftDirective.tracking && typeof window !== 'undefined') {
      CardLiftDirective.tracking = true;
      window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') CardLiftDirective.pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
    }
    const onScroll = () => { this.lastScroll = performance.now(); this.untilt(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    inject(DestroyRef).onDestroy(() => window.removeEventListener('scroll', onScroll));
  }

  tilt(e: PointerEvent) {
    if (e.pointerType === 'touch') return;
    // Mientras corre la ola sobre ESTA tarjeta no responde al hover; apenas termina la suya, sí
    if (this.el.closest('.is-waving') && !this.el.classList.contains('wave-done')) return;
    // Los movimientos "sintéticos" que el navegador genera al terminar un scroll no levantan la tarjeta
    if (performance.now() - this.lastScroll < 120 && !e.movementX && !e.movementY) return;
    const el = this.el;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;   // -0.5 (izquierda) … 0.5 (derecha)
    const py = (e.clientY - r.top) / r.height - 0.5;   // -0.5 (arriba) … 0.5 (abajo)
    el.style.setProperty('--ry', `${(px * 2 * -this.MAX).toFixed(2)}deg`); // el borde tomado sube hacia ti
    el.style.setProperty('--rx', `${(py * 2 * this.MAX).toFixed(2)}deg`);
    el.style.setProperty('--sx', `${(-px * 28).toFixed(1)}`);              // sombra hacia el lado contrario
    el.style.setProperty('--sy', `${(-py * 20).toFixed(1)}`);
    el.classList.add('is-lifted');
  }

  /** Terminó la ola de esta tarjeta: queda lista para el hover y, si el mouse ya está encima, se levanta de inmediato. */
  waveEnd(e: AnimationEvent) {
    // (Angular antepone un prefijo a los nombres de animación de cada componente: se compara el final)
    if (!e.animationName.endsWith('card-wave') || e.target !== this.el) return;
    this.el.classList.add('wave-done');
    const p = CardLiftDirective.pointer;
    if (p && this.el.matches(':hover')) this.tilt(new PointerEvent('pointermove', { clientX: p.x, clientY: p.y, pointerType: 'mouse', movementX: 1 }));
  }

  untilt() {
    if (!this.el.classList.contains('is-lifted')) return;
    this.el.classList.remove('is-lifted');
    for (const v of ['--rx', '--ry', '--sx', '--sy']) this.el.style.removeProperty(v);
  }
}
