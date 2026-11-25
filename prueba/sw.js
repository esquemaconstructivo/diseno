/* Diseño de Esquema: guarda solo los archivos de la app para usarla sin internet.
   No guarda datos de los proyectos: la app no hace peticiones con datos y solo se guardan los archivos de esta lista.
   Primero intenta la red para traer siempre la última versión.
   Fase 1 (nov 2026): lista permitida, nombre de caché con la versión y la huella del build, borrado de cachés viejas. */
const VERSION = "v50-1f118c2692"; // build.mjs pone aquí APP_VER y la huella de index.html
const PREFIJO = "diseno-esquema-prueba-";
const CACHE = PREFIJO + VERSION;
const ARCHIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];
const AL_VISITAR = ["./guia.html"]; // se guarda solo si el usuario la abre
const base = (u) => { const x = new URL(u, self.registration.scope); return x.origin + x.pathname; };
const PERMITIDOS = new Set([...ARCHIVOS, ...AL_VISITAR].map(base));
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x.startsWith(PREFIJO) && x !== CACHE).map((x) => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;
  const clave = base(r.url), nav = r.mode === "navigate";
  if (!PERMITIDOS.has(clave) && !nav) return; // fuera de la lista: el navegador lo maneja normal, sin caché
  const guardada = () => caches.open(CACHE).then((c) => c.match(clave).then((m) => m || (nav ? c.match(base("./index.html")) : undefined)));
  e.respondWith(
    fetch(r).then((res) => {
      if (res.ok && res.type === "basic" && PERMITIDOS.has(clave)) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(clave, copia)); }
      // auditoría 2026-11: si el servidor falla (5xx) se usa la copia guardada en vez de mostrar el error
      if (res.status >= 500) return guardada().then((m) => m || res);
      return res;
    }).catch(guardada)
  );
});
