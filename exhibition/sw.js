// 전시 페이지 껍데기 — 와이파이가 끊긴 채 다시 열려도 뜨게. 영상은 페이지가 Cache 에 넣는다
var C = 'exh-shell-v2';
self.addEventListener('install', function (e) { self.skipWaiting(); e.waitUntil(caches.open(C).then(function (c) { return c.addAll(['/exhibition/', '/exhibition/poster.jpg']); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('exh-shell-') === 0 && k !== C; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  if (u.pathname === '/exhibition/' || u.pathname === '/exhibition') {
    e.respondWith(fetch(e.request).then(function (r) { var copy = r.clone(); caches.open(C).then(function (c) { c.put('/exhibition/', copy); }); return r; }).catch(function () { return caches.match('/exhibition/'); }));
  } else if (u.pathname === '/exhibition/poster.jpg') {
    e.respondWith(caches.match('/exhibition/poster.jpg').then(function (r) { return r || fetch(e.request); }));
  }
});
