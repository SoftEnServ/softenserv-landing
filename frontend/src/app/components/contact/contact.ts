import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { SplashService } from '../../core/splash.service';
import { BlockCaretDirective } from '../../core/block-caret.directive';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, BlockCaretDirective],
  template: `
    <section id="contacto" class="section section--page" [class.is-entering]="splash.done()">
      <div class="engineer-bg" aria-hidden="true"></div>
      <div class="container contact">
        <div class="contact__intro">
          <span class="eyebrow enter" style="--d: 0"><span class="tall">{{ t().eyebrow }}</span></span>
          <h2 class="enter" style="--d: 1">{{ t().title }}</h2>
          <p class="enter" style="--d: 2">{{ t().lead }}</p>
          <ul class="perks">
            @for (p of t().perks; track $index) { <li class="enter" [style.--d]="3 + $index">{{ p }}</li> }
          </ul>
          <div class="direct enter" style="--d: 6">
            <span class="direct__label">{{ t().directly }}</span>
            <div class="direct__row">
              <!-- Sin href: el navegador no muestra la dirección al pasar el mouse -->
              <a class="direct__mail" role="link" tabindex="0" (click)="mailTo()" (keydown.enter)="mailTo()"
                 (pointerenter)="glow($event)" (pointermove)="glow($event)">
                <!-- Luz suave bajo el puntero, que lo sigue (ver glow()) -->
                <span class="direct__glow" aria-hidden="true"></span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                     stroke-linejoin="round" aria-hidden="true" class="direct__icon"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>
                <span class="direct__addr">{{ email() }}</span>
              </a>
              <button type="button" class="direct__copy" (click)="copyEmail()" [attr.aria-label]="t().copy" [attr.title]="t().copy">
                @if (copied()) {
                  <span class="direct__ok">{{ t().copied }}</span>
                } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                       stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                }
              </button>
            </div>
          </div>
        </div>

        <form class="form form--enter" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (sent()) {
            <div class="ok" role="status">
              <h3>{{ t().okTitle }}</h3>
              <p>{{ t().okText }} <strong class="ok__mail">{{ sentEmail() }}</strong>.</p>
              <button type="button" class="btn btn--ghost" (click)="sent.set(false)">{{ t().again }}</button>
            </div>
          } @else {
            <label class="field" style="--f: 0">{{ t().email }}
              <input sesBlockCaret type="text" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" formControlName="email"
                     [placeholder]="t().emailPlaceholder" [class.invalid]="invalid('email')" />
              @if (invalid('email')) { <span class="err">{{ t().errEmail }}</span> }
            </label>
            <label class="field" style="--f: 1">{{ t().message }}
              <textarea sesBlockCaret rows="6" formControlName="message" (focus)="msgFocused.set(true)" (blur)="msgFocused.set(false)" [placeholder]="typed()" [attr.aria-placeholder]="t().messagePlaceholder"
                        [class.invalid]="invalid('message')"></textarea>
              @if (invalid('message')) { <span class="err">{{ t().errMessage }}</span> }
            </label>
            @if (error()) { <p class="err err--box">{{ t().errSend }}</p> }
            <button class="btn btn--primary field" style="--f: 2" type="submit" [disabled]="sending()">
              {{ sending() ? t().sending : t().send }}
            </button>
          }
        </form>
      </div>
    </section>
  `,
  styles: `
    /* Fondo de la página de contacto: óxido suave, con un resplandor óxido arriba a la derecha */
    .section { background: radial-gradient(900px 440px at 88% 0%, rgba(var(--rust-rgb), .22), transparent 70%), var(--rust-soft); }
    /* Sobre el óxido suave, el teal del título se oscurece un poco para mantener el contraste (modo claro) */
    .eyebrow { color: var(--teal); } /* aquí el fondo ya es óxido: el título se mantiene teal */
    :host-context(:root:not([data-theme='dark'])) .eyebrow { color: #2a7d75; }
    .contact { display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(32px, 5vw, 64px); align-items: center; }
    .perks { list-style: none; padding: 0; margin: clamp(12px, 2.5vh, 24px) 0 0; display: grid; gap: clamp(6px, 1.4vh, 12px); }
    .perks li { display: flex; gap: 10px; align-items: center; color: var(--ink); font-weight: 500; font-size: .88rem; }
    .perks li::before { content: '✓'; color: var(--teal); font-weight: 700; }
    .direct { margin-top: clamp(16px, 3.5vh, 32px); padding-top: clamp(12px, 2.5vh, 24px); border-top: 1px solid var(--line); }
    .direct__label { display: block; font-size: .8rem; font-weight: 600; letter-spacing: .04em; font-variant-caps: small-caps; color: var(--muted); margin-bottom: 10px; }
    .direct__row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .direct__mail { display: inline-flex; align-items: center; gap: 10px; font-size: 1.1rem; font-weight: 600; color: var(--heading); cursor: pointer; }
    .direct__mail svg { color: var(--rust); }
    .direct__mail { transition: color 350ms ease, --mx 260ms cubic-bezier(.2, .7, .3, 1), --my 260ms cubic-bezier(.2, .7, .3, 1); }
    .direct__mail.glow-jump { transition: color 350ms ease; } /* al entrar, la luz aparece donde está el puntero */
    .direct__mail:hover { color: var(--teal); }
    /* Hover: una mancha de luz suave (más oscura en modo claro, más clara en oscuro) bajo el puntero, que lo sigue
       deslizándose; aparece y se desvanece despacio */
    .direct__glow { position: absolute; inset: 0; border-radius: 16px; pointer-events: none; z-index: 0; opacity: 0;
      background: radial-gradient(84px 24px at var(--mx, 50%) var(--my, 50%), var(--glow), transparent);
      /* bordes difuminados: la luz nunca muestra el recuadro que la contiene */
      -webkit-mask-image: linear-gradient(90deg, transparent, #000 16px, #000 calc(100% - 16px), transparent);
      mask-image: linear-gradient(90deg, transparent, #000 16px, #000 calc(100% - 16px), transparent);
      transition: opacity 450ms ease; }
    .direct__mail { --glow: rgba(120, 52, 20, .16); }
    :host-context([data-theme='dark']) .direct__mail { --glow: rgba(255, 236, 222, .17); }
    .direct__mail:hover .direct__glow { opacity: 1; }
    .direct__mail > svg, .direct__addr { position: relative; z-index: 1; }
    /* Neomorfismo: el email y su sobre en bajorrelieve */
    .direct__addr { text-shadow: var(--neo-text); }
    .direct__icon { filter: var(--neo-icon); }
    .direct__copy { display: inline-grid; place-items: center; min-width: 34px; height: 34px; padding: 0 10px; border-radius: 7px;
      border: 1px solid var(--line); background-color: var(--surface); background-image: var(--nav-tube); box-shadow: var(--tube-inset);
      color: var(--muted); cursor: pointer; font: inherit; font-size: .78rem; font-weight: 600;
      box-shadow: var(--tube-inset), var(--neo-raise-sm); transition: color .2s, border-color .2s, box-shadow .25s; }
    .direct__copy:active { box-shadow: var(--neo-press); transition-duration: 90ms; }
    .direct__copy:hover { color: var(--teal); border-color: var(--teal); }
    .direct__ok { color: var(--teal); }

    /* ---------- Entrada a la página de contacto ----------
       Arranca sincronizada con la transición del círculo (--base) y, si se entra directo, tras el splash. */
    .section { --base: 380ms; --gap: 110ms; }
    /* 1) Bloques de la izquierda: suben desde abajo con fundido, uno tras otro */
    .enter { opacity: 0; translate: 0 28px; }
    .is-entering .enter { animation: rise 650ms cubic-bezier(.2, .7, .2, 1) both; animation-delay: calc(var(--base) + var(--d) * var(--gap)); }
    @keyframes rise { from { opacity: 0; translate: 0 28px; } to { opacity: 1; translate: 0 0; } }

    /* 2) El email se destaca al llegar: el sobre "suena", se dibuja una línea y lo recorre un brillo */
    .direct { --hl: calc(var(--base) + 6 * var(--gap) + 450ms); }
    .direct__mail { position: relative; overflow: hidden; padding: 8px 14px; margin: -4px -12px; border-radius: 16px; } /* más aire para la luz; el texto y el botón de copiar quedan donde estaban */
    .direct__mail::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: 4px; height: 2px; border-radius: 2px;
      background: var(--rust); transform: scaleX(0); transform-origin: left center; }
    .direct__mail::before { content: ''; position: absolute; inset: 0; width: 45%; pointer-events: none;
      background: linear-gradient(100deg, transparent, rgba(var(--rust-rgb), .3), transparent); translate: -120% 0; }
    .is-entering .direct__icon { transform-origin: 50% 20%; animation: ring 800ms ease-in-out var(--hl) both; }
    .is-entering .direct__mail::after { animation: draw 600ms cubic-bezier(.6, 0, .3, 1) calc(var(--hl) + 150ms) both; }
    .is-entering .direct__mail::before { animation: shine 1700ms ease-in-out calc(var(--hl) + 350ms) both; }
    @keyframes ring { 0%, 100% { rotate: 0deg; scale: 1; } 15% { rotate: -16deg; scale: 1.2; } 30% { rotate: 14deg; scale: 1.2; }
      45% { rotate: -10deg; } 60% { rotate: 7deg; } 75% { rotate: -3deg; } }
    @keyframes draw { to { transform: scaleX(1); } }
    /* el brillo recorre el email de ida y luego de vuelta */
    @keyframes shine { 0% { translate: -120% 0; } 50% { translate: 260% 0; } 100% { translate: -120% 0; } }

    /* 3) El formulario: la tarjeta sube y se asienta; adentro, los campos aparecen en cascada */
    .form--enter { opacity: 0; translate: 0 44px; scale: .97; }
    .is-entering .form--enter { animation: card-in 800ms cubic-bezier(.25, 1.25, .45, 1) calc(var(--base) + 2 * var(--gap)) both; }
    @keyframes card-in { from { opacity: 0; translate: 0 44px; scale: .97; } to { opacity: 1; translate: 0 0; scale: 1; } }
    .field { opacity: 0; translate: 0 16px; }
    .is-entering .field { animation: rise-sm 550ms cubic-bezier(.2, .7, .2, 1) both;
      animation-delay: calc(var(--base) + 2 * var(--gap) + 320ms + var(--f) * 140ms); }
    @keyframes rise-sm { from { opacity: 0; translate: 0 16px; } to { opacity: 1; translate: 0 0; } }
    /* El botón de enviar termina con un pequeño "latido" */
    .is-entering .btn.field { animation: rise-sm 550ms cubic-bezier(.2, .7, .2, 1) both, nudge 600ms ease-in-out both;
      animation-delay: calc(var(--base) + 2 * var(--gap) + 320ms + 2 * 140ms), calc(var(--base) + 2 * var(--gap) + 1300ms); }
    @keyframes nudge { 0%, 100% { scale: 1; } 40% { scale: 1.07; } 70% { scale: .98; } }
    /* Formulario como bloque sólido en relieve (neomorfismo); los campos van hundidos en él */
    .form { background: var(--surface); border: 1px solid var(--line); border-radius: 28px; padding: clamp(18px, 3.5vh, 32px); box-shadow: var(--neo-bevel), var(--neo-raise), var(--shadow); display: grid; gap: clamp(2px, .8vh, 6px); }
    label { display: grid; gap: 6px; font-size: .85rem; font-weight: 600; color: var(--heading); }
    input, select, textarea { font: inherit; font-weight: 400; font-size: .95rem; color: var(--ink); padding: 11px 14px;
      border: 1.5px solid var(--line); border-radius: 15px; background: var(--input-bg); resize: none; /* tamaño fijo */
      box-shadow: var(--input-depth); transition: border-color .2s, box-shadow .25s ease, background-color .2s; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: var(--teal); box-shadow: var(--input-depth-focus); }
    ::placeholder { color: var(--muted); opacity: .75; }
    .invalid { border-color: var(--danger); box-shadow: var(--input-depth-error); }
    /* Los avisos ocupan un espacio reservado bajo cada campo: el formulario nunca cambia de alto */
    label.field { position: relative; padding-bottom: 18px; }
    .err { position: absolute; left: 0; right: 0; bottom: 0; color: var(--danger); font-size: .78rem; font-weight: 500;
      line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; animation: err-in 180ms ease-out; }
    @keyframes err-in { from { opacity: 0; translate: 0 -3px; } }
    .form { position: relative; }
    .err--box { margin: 0; top: auto; bottom: 4px; left: clamp(18px, 3.5vh, 32px); right: clamp(18px, 3.5vh, 32px); text-align: center; }
    .form .btn { justify-self: start; }
    .ok h3 { color: var(--teal); }
    .ok__mail { color: var(--rust-text); overflow-wrap: anywhere; }
    textarea { height: clamp(96px, 22vh, 190px); }
    @media (max-width: 900px) { .contact { grid-template-columns: 1fr; gap: 18px; } }
    /* En celular: se ocultan los beneficios y se compacta todo para que quepa en la pantalla */
    @media (max-width: 720px) {
      .perks { display: none; }
      .contact__intro > p { font-size: .82rem; margin-bottom: 0; }
      .direct { margin-top: 12px; padding-top: 10px; }
      .direct__label { margin-bottom: 4px; }
      .direct__mail { font-size: 1rem; }
      .form { padding: 16px 16px 20px; gap: 2px; }
      .err--box { left: 16px; right: 16px; }
      .err { font-size: .74rem; }
      textarea { height: clamp(80px, 15vh, 140px); }
    }
    /* Celulares bajos: el subtítulo largo se compacta un poco para que todo quepa */
    @media (max-width: 720px) and (max-height: 760px) {
      .contact__intro h2 { font-size: 1.02rem; line-height: 1.3; }
      .contact__intro > p { font-size: .8rem; line-height: 1.45; }
    }
    /* Celulares muy bajos (p. ej. con las barras del navegador visibles): sin el párrafo de introducción,
       para que el formulario completo quepa sobre el footer */
    @media (max-width: 720px) and (max-height: 700px) {
      .contact__intro > p { display: none; }
    }
  `,
})
export class Contact {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private i18n = inject(I18nService);
  splash = inject(SplashService);
  t = () => this.i18n.t().contact;

  sending = signal(false);
  sent = signal(false);
  /** Email con el que se envió el mensaje (se muestra en la confirmación; el formulario se limpia). */
  sentEmail = signal('');
  error = signal(false);

  form = this.fb.nonNullable.group({
    // Formato: usuario@dominio.ext (extensión de al menos 2 letras). Igual que en la API.
    email: ['', [Validators.required, Validators.maxLength(160), Validators.pattern(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
  });

  /** Email de contacto: viene de la base de datos (site_settings.contact_email) */
  readonly email = this.i18n.contactEmail;
  copied = signal(false);

  mailTo() { window.location.href = `mailto:${this.email()}`; }

  /** Posición del puntero sobre el email: la luz se desliza hacia ella. */
  glow(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    if (e.type === 'pointerenter') {
      el.classList.add('glow-jump');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('glow-jump')));
    }
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }

  async copyEmail() {
    try { await navigator.clipboard.writeText(this.email()); }
    catch {
      // Respaldo para navegadores sin acceso al portapapeles
      const ta = document.createElement('textarea'); ta.value = this.email(); document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
    }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1800);
  }

  /** Placeholder del mensaje con efecto máquina de escribir. */
  typed = signal('');
  /** Con el cursor real dentro del área de mensaje, la máquina de escribir se detiene. */
  msgFocused = signal(false);

  constructor() {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Se reinicia al cambiar el idioma y al salir del campo; se detiene (texto completo, sin cursor) al enfocarlo
    effect((onCleanup) => {
      const text = this.t().messagePlaceholder;
      clearTimeout(timer);
      if (this.msgFocused()) this.typed.set(text);
      else this.typewriter(text, (t) => (timer = t));
      onCleanup(() => clearTimeout(timer));
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  }

  /**
   * Escribe el texto letra por letra con un cursor, lo deja un momento con el cursor parpadeando,
   * lo borra y vuelve a empezar.
   */
  private typewriter(text: string, schedule: (t: ReturnType<typeof setTimeout>) => void) {
    const TYPE_MS = 65, DELETE_MS = 28, HOLD_MS = 2200, GAP_MS = 500, BLINK_MS = 450;
    const CARET = '█'; // mismo cursor de bloque que los campos
    let i = 0;
    const later = (fn: () => void, ms: number) => schedule(setTimeout(fn, ms));

    const type = () => {
      i++;
      this.typed.set(text.slice(0, i) + CARET);
      if (i < text.length) {
        // pausa un poco más larga después de signos de puntuación, como al escribir de verdad
        later(type, /[?!.,]/.test(text[i - 1]) ? TYPE_MS * 5 : TYPE_MS + Math.random() * 40);
      } else hold(0);
    };
    const hold = (elapsed: number) => {
      this.typed.set(text + (Math.floor(elapsed / BLINK_MS) % 2 === 0 ? CARET : ' '));
      if (elapsed < HOLD_MS) later(() => hold(elapsed + BLINK_MS), BLINK_MS);
      else later(erase, BLINK_MS);
    };
    const erase = () => {
      i--;
      this.typed.set(text.slice(0, Math.max(i, 0)) + CARET);
      if (i > 0) later(erase, DELETE_MS);
      else later(type, GAP_MS);
    };
    this.typed.set(CARET);
    later(type, GAP_MS);
  }

  invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.sending.set(true);
    this.error.set(false);
    this.api.sendContact(this.form.getRawValue()).subscribe({
      next: () => { this.sentEmail.set(this.form.getRawValue().email.trim()); this.sending.set(false); this.sent.set(true); this.form.reset(); },
      error: () => { this.sending.set(false); this.error.set(true); },
    });
  }
}
