import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { I18nService } from '../../core/i18n.service';
import { SplashService } from '../../core/splash.service';
import { GoToDirective } from '../../core/go-to.directive';

interface Seg { t: string; c?: string }
interface Line { indent: number; segs: Seg[] }
/** Estado de la escritura: caracteres visibles por línea, línea del cursor y dónde está la llave de cierre. */
interface Typing { shown: number[]; line: number; brace: 'none' | 'same' | 'below'; formatted: boolean; caret: boolean }
const CLOSE_LINE = 8;
const lineLength = (l: Line) => l.segs.reduce((n, s) => n + s.t.length, 0);

@Component({
  selector: 'app-hero',
  imports: [GoToDirective],
  template: `
    <section id="inicio" class="hero">
      <!-- El dibujo del ingeniero de fondo, fundido con la página (el mismo en todas las secciones) -->
      <div class="engineer-bg" aria-hidden="true"></div>
      <div class="container hero__inner">
        <div class="hero__copy">
          <!-- La misma casita del menú al comienzo del título (vuela desde el menú al llegar al Inicio) -->
          <span class="eyebrow eyebrow--home"><svg class="house" viewBox="0 0 26 26" preserveAspectRatio="none" aria-hidden="true">
              <path class="house__body" d="M4.5 11.5 V22.5 H21.5 V11.5" />
              <path class="house__roof" d="M2 12.5 L13 3 L24 12.5" />
              <rect class="house__light" x="9.6" y="14" width="6.8" height="8.5" rx=".6" />
              <rect class="house__door house__door--l" x="9.6" y="14" width="3.4" height="8.5" />
              <rect class="house__door house__door--r" x="13" y="14" width="3.4" height="8.5" />
            </svg><span class="tall">{{ t().eyebrow }}</span></span>
          <h1>{{ t().titleA }}<span class="hl">{{ t().titleHl }}</span>{{ t().titleB }}</h1>
          <!-- Bajada: cómo trabajamos, en una frase -->
          <p class="hero__lead">{{ t().lead }}</p>
          <div class="hero__cta">
            <a sesGoTo="/contact" class="btn btn--primary">{{ t().cta }}</a>
            <a sesGoTo="proyectos" class="btn btn--ghost">{{ t().ctaSecondary }}</a>
          </div>
        </div>
        <!-- La terminal translúcida sobre el dibujo del ingeniero, como una ventana de Terminal con transparencia en Mac -->
        <div class="hero__card" aria-hidden="true">
          <div class="code">
            <div class="code__bar"><i></i><i></i><i></i></div>
            <div class="code__body">
            <!-- Código en Rust, línea a línea (la primera vez se "escribe" como en un editor y luego se formatea) -->
            <div class="src" [class.is-formatted]="formatted()" [class.is-typing]="typing() !== null">
              @for (row of rows(); track $index) {
                <div class="ln" [class.ln--ghost]="row.ghost" [style.--ind]="row.indent" [style.--n]="$index">@for (seg of row.segs; track $index) {<span [class]="seg.c">{{ seg.t }}</span>}@if (row.caret) {<span class="caret"></span>}@if (row.close) {<span>{{ '}' }}</span>}</div>
              }
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    /* padding superior alineado con las demás secciones: el contenido queda ~36px bajo el navbar */
    .hero { min-height: var(--band); display: flex; align-items: center; padding: clamp(18px, 4vh, 44px) 0; background:
      radial-gradient(800px 380px at 85% 10%, var(--teal-soft), transparent 70%); }
    /* Texto e imagen centrados como un conjunto: el texto queda junto a la imagen, no en el borde opuesto */
    .hero__inner { width: 100%; display: grid; grid-template-columns: minmax(0, 420px) minmax(0, 700px); justify-content: center;
      gap: clamp(28px, 2.6vw, 40px); align-items: center; }
    .hl { color: var(--teal); }
    .eyebrow--home { display: inline-flex; align-items: center; gap: .45em; }
    /* Neomorfismo en el texto y el ícono del inicio: relieve suave (luz arriba a la izquierda, sombra abajo a la derecha) */
    .eyebrow--home .tall { text-shadow: var(--neo-text); }
    .eyebrow--home .house { filter: var(--neo-icon); }
    h1 { text-shadow: var(--neo-text-lg); }
    /* Casita estirada en vertical igual que el texto del título (alto propio, no transformación: así la que vuela
       desde el menú llega exactamente a su forma) */
    .house { width: 1.35em; height: calc(1.35em * 1.36); flex: none; overflow: visible; margin-top: -.72em; }
    .house__body, .house__roof { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .house__body { fill: var(--surface); }
    .house__light { fill: var(--rust); }
    .house__door { fill: var(--surface); stroke: currentColor; stroke-width: 1.3; transform-box: fill-box; transform: scaleX(.22); }
    .house__door--l { transform-origin: left center; }
    .house__door--r { transform-origin: right center; }
    /* La bajada separada del título y, con más aire, de los botones */
    .hero__lead { margin: 0; max-width: 34ch; color: var(--muted); font-size: clamp(1rem, 2.3vh, 1.16rem); line-height: 1.6; }
    .hero__cta { display: flex; gap: 14px; flex-wrap: wrap; margin-top: clamp(26px, 4.4vh, 40px); }

    /* ---------- La terminal translúcida (el dibujo de fondo es .engineer-bg, en styles.scss) ---------- */
    .hero__card { position: relative; }
    /* Terminal con transparencia, como en Mac: el fondo se ve a través, apenas difuminado */
    .code { position: relative; z-index: 1; background: color-mix(in srgb, var(--code-bg) 78%, transparent);
      -webkit-backdrop-filter: blur(5px) saturate(1.3); backdrop-filter: blur(5px) saturate(1.3);
      border: 1px solid rgba(255, 255, 255, .22); border-radius: 18px; box-shadow: var(--code-shadow), 0 24px 50px -14px rgba(10, 18, 32, .45); overflow: hidden; }
    .code__bar { display: flex; gap: 7px; padding: 14px 16px; background: rgba(255, 255, 255, .07); border-bottom: 1px solid rgba(255, 255, 255, .08); }
    /* Botones de ventana estilo Apple: cerrar, minimizar y ampliar */
    .code__bar i { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; box-shadow: inset 0 0 0 .5px rgba(0,0,0,.25); }
    .code__bar i:nth-child(2) { background: #febc2e; }
    .code__bar i:nth-child(3) { background: #28c840; }
    .src { margin: 0; padding: 24px 30px 32px; color: #eef3f9; font: 500 clamp(.95rem, min(1.2vw, 2vh), 1.14rem)/1.8 ui-monospace, 'SFMono-Regular', Menlo, monospace;
      text-shadow: 0 1px 2px rgba(0, 0, 0, .35); /* legible sobre el fondo que se transparenta */ }
    .ln { white-space: pre; min-height: 1.8em; padding-left: 0; }
    .ln--ghost { visibility: hidden; }
    /* Formato (como rustfmt): cada línea se desliza hasta su indentación */
    .src.is-formatted .ln { padding-left: calc(var(--ind) * 2ch); }
    .src.is-typing .ln { transition: padding-left 420ms cubic-bezier(.34, 1.4, .64, 1) calc(var(--n) * 35ms); }
    .caret { display: inline-block; width: .6em; height: 1.15em; vertical-align: -.2em; background: #e8eef6; opacity: .85;
      animation: ses-caret 1s steps(2, jump-none) infinite; }
    @keyframes ses-caret { 50% { opacity: 0; } }
    .k { color: #8fd3cb; } .f { color: #f4d58d; } .s { color: #a8d5a2; } .c { color: #8796ab; } .t { color: #f0a47c; }
    .code__body { position: relative; }

    h1 { font-size: clamp(1.9rem, min(3.7vw, 6.2vh), 2.8rem); }
    @media (max-width: 900px) {
      .hero__inner { grid-template-columns: minmax(0, 640px); gap: 12px; }
      .hero { padding: 20px 0; }
    }
    /* En celular, el bloque de código decorativo se oculta para que todo quepa */
    /* En celular: sin la ventana de código (no cabe sin chocar con el botón flotante); el contenido se centra
       en la pantalla y sus tamaños y separaciones crecen con el alto disponible, para no dejar vacíos */
    @media (max-width: 720px) {
      .hero__card { display: none; }
      .hero__inner { gap: 0; }
      h1 { font-size: clamp(1.7rem, min(8.6vw, 4.4vh), 2.4rem); margin-bottom: clamp(14px, 2.6vh, 26px); }
      /* El título del inicio en UNA línea: letra algo menor y sin cortes */
      .eyebrow--home { white-space: nowrap; font-size: clamp(.92rem, 4.6vw, 1.15rem); letter-spacing: .06em; margin-bottom: clamp(10px, 2vh, 20px); }
      .hero__lead { font-size: clamp(.98rem, 4.2vw, 1.1rem); }
      /* Botones a lo ancho, uno junto al otro */
      /* el principal más ancho: cada texto en una sola línea */
      .hero__cta { display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px; margin-top: clamp(24px, 4vh, 38px); }
      .hero__cta .btn { padding-inline: 8px; min-height: clamp(42px, 5.6vh, 50px); white-space: nowrap; text-align: center; font-size: clamp(.84rem, 3.9vw, .95rem); }
    }
  `,
})
export class Hero {
  private i18n = inject(I18nService);
  splash = inject(SplashService);
  t = () => this.i18n.t().hero;


  /** El programa en Rust ya formateado: indentación (en niveles de 2 espacios) y segmentos coloreados. */
  readonly lines = computed<Line[]>(() => {
    const c = this.t().code;
    return [
      { indent: 0, segs: [{ t: 'fn', c: 'k' }, { t: ' ' }, { t: 'main', c: 'f' }, { t: '() {' }] },
      { indent: 1, segs: [{ t: 'let', c: 'k' }, { t: ` ${c.varName} = ` }, { t: c.type, c: 't' }, { t: '::' }, { t: c.fn, c: 'f' }, { t: '(' }] },
      { indent: 2, segs: [{ t: c.req, c: 't' }, { t: ' {' }] },
      { indent: 3, segs: [{ t: `${c.arch}: ` }, { t: `"${c.archVal}"`, c: 's' }, { t: ',' }] },
      { indent: 3, segs: [{ t: `${c.quality}: ` }, { t: `"${c.qualityVal}"`, c: 's' }, { t: ',' }] },
      { indent: 2, segs: [{ t: '},' }] },
      { indent: 1, segs: [{ t: ');' }] },
      { indent: 1, segs: [{ t: c.comment, c: 'c' }] },
      { indent: 0, segs: [{ t: '}' }] },
    ];
  });

  /** null = código completo y formateado (sin animación). */
  readonly typing = signal<Typing | null>(null);
  readonly formatted = computed(() => this.typing()?.formatted ?? true);

  /** Filas a pintar: las líneas escritas, la llave de cierre bajo el cursor y huecos invisibles que reservan el alto final. */
  readonly rows = computed(() => {
    const lines = this.lines();
    const st = this.typing();
    const cut = (l: Line, n: number): Seg[] => {
      const out: Seg[] = [];
      for (const s of l.segs) { if (n <= 0) break; out.push({ t: s.t.slice(0, n), c: s.c }); n -= s.t.length; }
      return out;
    };
    type Row = { segs: Seg[]; indent: number; caret?: boolean; close?: boolean; ghost?: boolean };
    // Código final: el cursor queda parpadeando donde terminó de escribir (al final del comentario)
    if (!st) return lines.map((l, i): Row => ({ segs: l.segs, indent: l.indent, caret: i === CLOSE_LINE - 1 }));
    const rows: Row[] = [];
    for (let i = 0; i <= st.line; i++) {
      rows.push({ segs: cut(lines[i], st.shown[i]), indent: lines[i].indent,
        caret: st.caret && i === st.line, close: i === 0 && st.brace === 'same' });
    }
    if (st.brace === 'below') rows.push({ segs: lines[CLOSE_LINE].segs, indent: 0 });
    while (rows.length < lines.length) rows.push({ segs: [], indent: 0, ghost: true });
    return rows;
  });
  private static readonly DELAY = 450; // pausa tras el splash antes de empezar a escribir

  constructor() {
    const timers: ReturnType<typeof setTimeout>[] = [];
    inject(DestroyRef).onDestroy(() => {
      timers.forEach(clearTimeout);
      if (this.typing()) this.splash.heroIntroPlayed = true; // si se sale a mitad, no se repite
    });
    // Solo la primera vez, y no en celular (allí la terminal está oculta)
    if (this.splash.heroIntroPlayed) return;
    if (typeof matchMedia !== 'undefined' && matchMedia('(max-width: 720px)').matches) { this.splash.heroIntroPlayed = true; return; }
    // El editor espera vacío (con el cursor) hasta que termina el splash
    this.typing.set({ shown: Array(CLOSE_LINE + 1).fill(0), line: 0, brace: 'none', formatted: false, caret: true });
    let started = false;
    effect(() => {
      if (!this.splash.done() || started) return;
      started = true;
      timers.push(setTimeout(() => this.typeCode(timers), Hero.DELAY));
    });
  }

  /**
   * Escribe el código como en un editor: la firma, luego "{" y "}", Enter, el cuerpo y el
   * comentario sin indentar y, al final, se aplica el formato (cada línea se desliza a su sangría).
   */
  private typeCode(timers: ReturnType<typeof setTimeout>[]) {
    const steps: [number, (s: Typing) => Typing][] = [];
    const add = (ms: number, fn: (s: Typing) => Typing) => steps.push([ms, fn]);
    const key = (ch: string) => (ch === ' ' ? 14 : 20 + Math.random() * 22); // ritmo de tecleo ágil
    const typeLine = (i: number, upto: number, from = 0) => {
      const text = this.lines()[i].segs.map((g) => g.t).join('');
      for (let n = from + 1; n <= upto; n++) add(key(text[n - 1]), (s) => ({ ...s, shown: s.shown.map((v, j) => (j === i ? n : v)) }));
    };
    const l0 = lineLength(this.lines()[0]);
    typeLine(0, l0 - 1);                                   // fn main()
    add(120, (s) => s);
    typeLine(0, l0, l0 - 1);                               // {
    add(110, (s) => ({ ...s, brace: 'same' }));            // }  (cursor entre las llaves)
    add(160, (s) => ({ ...s, brace: 'below', line: 1 }));  // Enter
    for (let i = 1; i < CLOSE_LINE; i++) {
      typeLine(i, lineLength(this.lines()[i]));
      if (i < CLOSE_LINE - 1) add(60, (s) => ({ ...s, line: i + 1 })); // Enter, sin sangría
    }
    add(380, (s) => ({ ...s, formatted: true }));          // formatear el documento (el cursor sigue parpadeando)
    add(400, () => { this.splash.heroIntroPlayed = true; return null as unknown as Typing; }); // queda el código final, estático

    let t = 0;
    for (const [ms, fn] of steps) {
      t += ms;
      timers.push(setTimeout(() => this.typing.update((s) => (s ? fn(s) : s) || null), t));
    }
  }
}
