import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { Hero } from '../hero/hero';
import { Services } from '../services/services';
import { Projects } from '../projects/projects';

/**
 * Página principal: todas las secciones en una sola página con scroll.
 * Las secciones se apilan como capas: cada una queda fija bajo el navbar y la
 * siguiente se desliza por encima tapándola; al subir, la capa se retira y
 * destapa la anterior. La capa que va quedando debajo se oscurece y se achica.
 */
@Component({
  selector: 'app-landing',
  imports: [Hero, Services, Projects],
  template: `
    <app-hero />
    <app-services />
    <app-projects />
  `,
  styles: `
    :host { display: block; --stack-dim: rgba(16, 28, 46, .34); --stack-shadow: rgba(16, 28, 46, .28); }
    :host-context([data-theme='dark']) { --stack-dim: rgba(0, 0, 0, .55); --stack-shadow: rgba(0, 0, 0, .6); }
    :host > * {
      display: block; position: sticky; top: var(--stick-top, 72px); isolation: isolate;
      background: var(--bg); transform-origin: 50% 0;
      transform: scale(calc(1 - .05 * var(--cover, 0)));
    }
    /* Borde superior de cada capa: sombra sobre la sección que va tapando */
    :host > * + * { box-shadow: 0 -26px 46px -22px var(--stack-shadow); }
    /* Velo que oscurece la capa a medida que la tapa la siguiente */
    :host > *::after {
      content: ''; position: absolute; inset: 0; z-index: 20; pointer-events: none;
      background: var(--stack-dim); opacity: var(--cover, 0);
    }
  `,
})
export class Landing {
  private host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const layers = () => Array.from(this.host.children) as HTMLElement[];
      let frame = 0;
      let headerH = 72, footerH = 64;

      /** Dónde se fija cada capa: bajo el navbar o, si es más alta que la franja, cuando su borde inferior llega al footer. */
      const measure = () => {
        headerH = document.querySelector<HTMLElement>('.header')?.offsetHeight ?? 72;
        footerH = document.querySelector<HTMLElement>('.footer')?.offsetHeight ?? 64;
        const bottom = window.innerHeight - footerH;
        for (const el of layers()) el.style.setProperty('--stick-top', `${Math.min(headerH, bottom - el.offsetHeight)}px`);
        update();
      };

      /** Cuánto tapa cada capa a la anterior (0 = nada, 1 = completamente). */
      const update = () => {
        frame = 0;
        const bottom = window.innerHeight - footerH;
        const els = layers();
        els.forEach((el, i) => {
          const next = els[i + 1];
          let cover = 0;
          if (next) {
            const stick = parseFloat(next.style.getPropertyValue('--stick-top')) || headerH;
            const top = next.getBoundingClientRect().top;
            cover = Math.min(1, Math.max(0, (bottom - top) / Math.max(1, bottom - stick)));
          }
          el.style.setProperty('--cover', cover.toFixed(4));
          // Dónde está la capa en la pantalla: el dibujo del ingeniero lo descuenta para quedar fijo mientras la capa se desliza
          el.style.setProperty('--layer-top', `${el.getBoundingClientRect().top.toFixed(1)}px`);
        });
      };
      const queue = () => { if (!frame) frame = requestAnimationFrame(update); };

      const ro = new ResizeObserver(measure);
      layers().forEach((el) => ro.observe(el));
      // Alto del contenido de Servicios: Inicio y Proyectos lo usan para alinear su contenido a la misma altura
      const svc = this.host.querySelector<HTMLElement>('#servicios > .container');
      // (en el cuadro siguiente y solo si cambió: actualizarlo dentro del aviso cambia el alto de las capas, que
      // tienen su propio observador, y el navegador reportaría un ciclo de ResizeObserver)
      let svcH = '';
      const roSvc = new ResizeObserver(() => requestAnimationFrame(() => {
        const h = svc ? `${svc.offsetHeight}px` : '';
        if (svc && h !== svcH) { svcH = h; this.host.style.setProperty('--svc-h', h); }
      }));
      if (svc) roSvc.observe(svc);
      destroyRef.onDestroy(() => roSvc.disconnect());
      window.addEventListener('scroll', queue, { passive: true });
      window.addEventListener('resize', measure, { passive: true });
      measure();
      destroyRef.onDestroy(() => {
        ro.disconnect();
        cancelAnimationFrame(frame);
        window.removeEventListener('scroll', queue);
        window.removeEventListener('resize', measure);
      });
    });
  }
}
