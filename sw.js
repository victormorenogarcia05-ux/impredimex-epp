// Service worker de la app de EPP.
// Existe por dos razones: hacer la app instalable y que abra aunque la red
// esté lenta. NO la vuelve funcional sin conexión: guardar un registro
// siempre necesita alcanzar Firebase.

const CACHE = 'epp-v2.0.0';
const ESENCIALES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ESENCIALES)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero, caché como respaldo.
// Al revés —caché primero— una versión vieja del index.html se quedaría
// pegada en los dispositivos y nadie recibiría las correcciones. En una app
// que se publica editando un solo archivo, ese es el riesgo real.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Firebase, gstatic y demás no se cachean: van directo a la red.
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
