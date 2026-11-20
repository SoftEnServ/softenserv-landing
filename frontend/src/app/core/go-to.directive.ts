import { Directive, ElementRef, inject, input } from '@angular/core';
import { NavService } from './nav.service';

/**
 * Enlace SIN atributo href, para que el navegador no muestre la ruta al pasar el mouse.
 *  - sesGoTo="/contact"  → otra página
 *  - sesGoTo="proyectos" → sección de la landing
 * Sigue siendo accesible: se anuncia como enlace, se recorre con Tab y se activa con Enter.
 */
@Directive({
  selector: '[sesGoTo]',
  host: {
    role: 'link',
    tabindex: '0',
    style: 'cursor: pointer',
    '(click)': 'go($event)',
    '(keydown.enter)': 'go($event)',
  },
})
export class GoToDirective {
  readonly sesGoTo = input.required<string>();
  private nav = inject(NavService);
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  go(e: Event) {
    e.preventDefault();
    // La transición nace desde el punto del clic (o desde el centro del enlace si se usó el teclado)
    let from: { x: number; y: number };
    if (e instanceof MouseEvent && (e.clientX || e.clientY)) from = { x: e.clientX, y: e.clientY };
    else { const r = this.el.nativeElement.getBoundingClientRect(); from = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    this.nav.go(this.sesGoTo(), from, this.el.nativeElement);
  }
}
