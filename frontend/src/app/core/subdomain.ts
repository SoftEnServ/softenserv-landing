/**
 * Páginas de demostración: cada proyecto del portafolio se abre en <sitio>/demo/<slug>,
 * por ejemplo softenserv.cl/demo/scheduling-professionals o localhost:8080/demo/scheduling-professionals.
 * Funciona igual en GitHub Pages y en el servidor propio, sin DNS adicional.
 *
 * Por compatibilidad, en local también se reconoce el formato anterior por subdominio
 * (scheduling-professionals.localhost:8080). En dominios reales no: usuario.github.io
 * o www.softenserv.cl no deben confundirse con una demostración.
 */
const isIp = (h: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':');
const DEMO_PATH = /^\/demo\/([a-z0-9-]+)\/?$/i;

/** Slug del proyecto en subdominio de localhost (formato anterior); null si no hay. */
function subdomainSlug(host: string): string | null {
  if (isIp(host)) return null;
  const labels = host.toLowerCase().split('.');
  return labels.length >= 2 && labels[labels.length - 1] === 'localhost' ? labels[0] : null;
}

/** Slug del proyecto si la página abierta es una demostración; null en el sitio principal. */
export function demoSlug(path = location.pathname, host = location.hostname): string | null {
  const m = DEMO_PATH.exec(path);
  return m ? m[1].toLowerCase() : subdomainSlug(host);
}

/** Dominio del sitio principal (sin el subdominio de demostración ni "www"). */
export function baseHost(host = location.hostname): string {
  if (isIp(host)) return host;
  const labels = host.toLowerCase().split('.');
  if (subdomainSlug(host)) labels.shift();
  return labels.join('.');
}

const withPort = () => (location.port ? `:${location.port}` : '');

/** Dirección de la demostración de un proyecto (con el idioma actual). */
export function demoUrl(slug: string, lang: string): string {
  return `${location.origin}/demo/${encodeURIComponent(slug)}?lang=${lang}`;
}

/** Dirección del sitio principal. */
export function mainUrl(): string {
  return subdomainSlug(location.hostname)
    ? `${location.protocol}//${baseHost()}${withPort()}/`
    : `${location.origin}/`;
}
