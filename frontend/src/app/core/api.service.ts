import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ContactRequest, Project } from './models';
import { I18nService, Lang } from './i18n.service';

/** Acceso a la API (/api, que nginx reenvía al contenedor de la API). El contenido general está en ContentService. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private base = '/api';

  /** Proyectos en memoria por idioma: al volver a la landing aparecen al instante, sin saltos de alto. */
  private projectsCache = new Map<Lang, Observable<Project[]>>();

  getProjects(lang: Lang) {
    let req = this.projectsCache.get(lang);
    if (!req) {
      req = this.http.get<Project[]>(`${this.base}/projects`, { params: { lang } }).pipe(shareReplay(1));
      this.projectsCache.set(lang, req);
      // Si falla, no guardamos el error: se reintenta la próxima vez
      req.subscribe({ error: () => this.projectsCache.delete(lang) });
    }
    return req;
  }

  /** Un proyecto por su slug (título de la página de demostración). */
  getProject(slug: string, lang: Lang): Observable<Project> {
    return this.http.get<Project>(`${this.base}/projects/${encodeURIComponent(slug)}`, { params: { lang } });
  }

  /** Envía el formulario: la API lo registra en la base (con el idioma) y avisa por correo. */
  sendContact(body: ContactRequest): Observable<{ ok: boolean; id: number }> {
    return this.http.post<{ ok: boolean; id: number }>(`${this.base}/contact`, { ...body, lang: this.i18n.lang() });
  }
}
