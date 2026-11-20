import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import type { Lang } from './i18n.service';

/** Un servicio tal como lo entrega la API (tabla services + service_texts). */
export interface ServiceItem {
  slug: string;
  /** Clave del ícono: el dibujo está en el código (services.ts), la base solo elige cuál */
  icon: string;
  title: string;
  summary: string;
  /** Texto largo para la ventana del servicio; si no hay, se muestra el resumen */
  details: string | null;
}

/** Contenido de la página en un idioma (GET /api/content?lang=…). */
export interface SiteContent {
  /** Títulos, subtítulos y bajadas por sección: texts.hero.title, texts.contact.lead… */
  texts: Record<string, Record<string, string>>;
  services: ServiceItem[];
  contactEmail: string | null;
}

/**
 * Contenido editable de la página, que viene de la base de datos a través de la API.
 * Se pide una vez por idioma y queda en memoria. I18nService lo combina con los textos de la
 * interfaz (botones, etiquetas, mensajes), que siguen en el código.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);
  private pending = new Map<Lang, Promise<void>>();

  /** Contenido ya cargado, por idioma (undefined mientras no llega o si la API no respondió) */
  readonly byLang = signal<Partial<Record<Lang, SiteContent>>>({});

  /**
   * Carga el contenido de un idioma (una sola vez). Nunca falla: si la API no responde a tiempo,
   * la página usa los textos de respaldo del código y se reintenta la próxima vez que se pida.
   */
  load(lang: Lang, ms = 4000): Promise<void> {
    if (this.byLang()[lang]) return Promise.resolve();
    let p = this.pending.get(lang);
    if (!p) {
      p = firstValueFrom(this.http.get<SiteContent>('/api/content', { params: { lang } }).pipe(timeout(ms)))
        .then((c) => this.byLang.update((all) => ({ ...all, [lang]: c })))
        .catch((err) => console.warn(`Contenido (${lang}) no disponible; se usan los textos de respaldo.`, err?.message ?? err))
        .finally(() => this.pending.delete(lang));
      this.pending.set(lang, p);
    }
    return p;
  }
}
