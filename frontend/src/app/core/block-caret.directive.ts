import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Cursor de bloque sólido, como el de una terminal, para <input> y <textarea>.
 * Se oculta el cursor nativo y se dibuja un bloque que parpadea en la posición del texto.
 * La posición se calcula con un "espejo" invisible que copia la tipografía y el tamaño del campo,
 * así funciona igual en todos los navegadores.
 *
 * Uso: <input sesBlockCaret ...>  /  <textarea sesBlockCaret ...>
 */
@Directive({ selector: 'input[sesBlockCaret], textarea[sesBlockCaret]', host: { class: 'has-block-caret' } })
export class BlockCaretDirective {
  private field = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const f = this.field;
      const host = f.parentElement!;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

      const caret = document.createElement('span');
      caret.className = 'block-caret';
      caret.setAttribute('aria-hidden', 'true');
      host.appendChild(caret);

      const mirror = document.createElement('div');
      mirror.setAttribute('aria-hidden', 'true');
      document.body.appendChild(mirror);

      const isArea = f.tagName === 'TEXTAREA';
      const COPY = ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth',
        'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
        'letterSpacing', 'lineHeight', 'textTransform', 'wordSpacing', 'tabSize'] as const;

      let frame = 0;
      const update = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const focused = document.activeElement === f;
          const pos = f.selectionStart ?? 0;
          if (!focused || pos !== f.selectionEnd) { caret.classList.remove('is-on'); return; }

          // Espejo con el mismo estilo que el campo, con el texto hasta el cursor
          const cs = getComputedStyle(f);
          const ms = mirror.style;
          for (const k of COPY) (ms as unknown as Record<string, string>)[k] = cs[k];
          Object.assign(ms, { position: 'absolute', visibility: 'hidden', top: '0', left: '-9999px', overflow: 'hidden',
            whiteSpace: isArea ? 'pre-wrap' : 'pre', overflowWrap: isArea ? 'break-word' : 'normal', borderStyle: 'solid' });
          mirror.textContent = f.value.substring(0, pos);
          const marker = document.createElement('span');
          marker.textContent = f.value.substring(pos, pos + 1).replace(/\n|^$/, ' ') || ' ';
          mirror.appendChild(marker);

          const lineH = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
          const fontH = parseFloat(cs.fontSize) * 1.25;
          const w = Math.max(marker.getBoundingClientRect().width, parseFloat(cs.fontSize) * 0.6);
          const x = f.offsetLeft + marker.offsetLeft - f.scrollLeft;
          const y = f.offsetTop + marker.offsetTop - f.scrollTop + (lineH - fontH) / 2;

          // No dibujar fuera del campo (por ejemplo, al hacer scroll dentro del textarea)
          const inside = y >= f.offsetTop && y + fontH <= f.offsetTop + f.offsetHeight + 1;
          Object.assign(caret.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${fontH}px` });
          caret.classList.toggle('is-on', inside);
          // Al escribir, el bloque se queda encendido un momento (como en una terminal)
          caret.classList.remove('is-typing'); void caret.offsetWidth; caret.classList.add('is-typing');
        });
      };

      const events = ['input', 'keydown', 'keyup', 'click', 'focus', 'blur', 'select', 'scroll', 'mouseup'];
      events.forEach((ev) => f.addEventListener(ev, update));
      document.addEventListener('selectionchange', update);
      window.addEventListener('resize', update);
      destroyRef.onDestroy(() => {
        events.forEach((ev) => f.removeEventListener(ev, update));
        document.removeEventListener('selectionchange', update);
        window.removeEventListener('resize', update);
        caret.remove(); mirror.remove();
      });
    });
  }
}
