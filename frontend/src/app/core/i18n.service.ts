import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { en, Dict } from './i18n/en';
import { es } from './i18n/es';
import { ContentService, SiteContent } from './content.service';

export type Lang = 'en' | 'es';
export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
];
const DICTS: Record<Lang, Dict> = { en, es };
const KEY = 'ses-lang';

/** Servicio tal como lo usan las plantillas (services.items) */
export interface ServiceView { slug: string; icon: string; title: string; text: string; details: string | null }

/**
 * Combina los textos de la interfaz (código) con el contenido de la base de datos.
 * Lo que viene de la base reemplaza al texto del código; el del código queda solo como respaldo
 * por si la API no responde.
 */
function merge(d: Dict, c: SiteContent | undefined) {
  const tx = c?.texts ?? {};
  const perks = [tx['contact']?.['perk1'] ?? d.contact.perks[0], tx['contact']?.['perk2'] ?? d.contact.perks[1]];
  const fallbackIcons = ['requirements', 'web', 'systems', 'integrations'];
  const items: ServiceView[] = c?.services?.length
    ? c.services.map((s) => ({ slug: s.slug, icon: s.icon, title: s.title, text: s.summary, details: s.details }))
    : d.services.items.map((s, i) => ({ slug: `item-${i}`, icon: fallbackIcons[i] ?? 'web', title: s.title, text: s.text, details: null }));
  return {
    ...d,
    hero: { ...d.hero, ...tx['hero'] },
    services: { ...d.services, ...tx['services'], items },
    projects: { ...d.projects, ...tx['projects'] },
    contact: { ...d.contact, ...tx['contact'], perks },
  };
}

/** Idioma de la interfaz. El inglés es el principal; la elección se recuerda en el navegador. */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private title = inject(Title);
  private meta = inject(Meta);
  private content = inject(ContentService);

  readonly lang = signal<Lang>(this.initial());
  /** Textos activos (interfaz + contenido de la base): en las plantillas, i18n.t().hero.title */
  readonly t = computed(() => merge(DICTS[this.lang()], this.content.byLang()[this.lang()]));
  /** Email de contacto (de la base de datos; respaldo si la API no responde) */
  readonly contactEmail = computed(() => this.content.byLang()[this.lang()]?.contactEmail ?? 'softenserv@gmail.com');

  constructor() {
    effect(() => {
      const l = this.lang();
      const d = this.t();
      document.documentElement.lang = l;
      void this.content.load(l); // por si se llega con otro idioma (p. ej. ?lang= en una demo)
      this.title.setTitle(d.meta.title);
      this.meta.updateTag({ name: 'description', content: d.meta.description });
      try { localStorage.setItem(KEY, l); } catch { /* sin almacenamiento */ }
    });
  }

  private switching = false;

  /**
   * Cambia el idioma con una transición rápida (~0,3 s): los textos se desvanecen
   * hacia arriba con un leve desenfoque y los nuevos entran desde abajo.
   */
  async set(lang: Lang) {
    if (lang === this.lang() || this.switching) return;
    this.switching = true;
    const targets = [...document.querySelectorAll<HTMLElement>('main, .header__nav, .footer p, .fab__label')];
    const out = { duration: 110, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' as const };
    const inn = { duration: 170, easing: 'cubic-bezier(0, 0, .2, 1)' };
    try {
      // El contenido del nuevo idioma se pide mientras los textos actuales se desvanecen
      const loading = this.content.load(lang);
      await Promise.all(targets.map((el) => el.animate(
        [{ opacity: 1, translate: '0 0', filter: 'blur(0px)' }, { opacity: 0, translate: '0 -10px', filter: 'blur(4px)' }], out,
      ).finished));
      await loading;
      this.lang.set(lang);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // esperar a que se dibuje
      targets.forEach((el) => {
        el.getAnimations().forEach((a) => a.cancel());
        el.animate([{ opacity: 0, translate: '0 10px', filter: 'blur(4px)' }, { opacity: 1, translate: '0 0', filter: 'blur(0px)' }], inn);
      });
    } finally {
      if (this.lang() !== lang) this.lang.set(lang);
      this.switching = false;
    }
  }

  private initial(): Lang {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'es') return saved;
    } catch { /* ignorar */ }
    return 'en';
  }
}
