// 전시 페이지 — 한 번 받은 페이지 · 그림 · 서체를 아이패드에 두고 쓴다. 와이파이가 끊기거나 느려져도 다음 바퀴가 그대로 돈다(11-10 서준 "최종 완성상태는 아이패드가 무선 상태에서 원활하게 돌아가는 것").
// 페이지(/exhibition/ · /exhibition/about/): 네트워크 먼저, 4초 안에 안 오거나 끊기면 저장본 — 새 판은 받히는 대로 바뀐다.
// /_astro/(이름에 해시가 붙어 바뀌지 않는다): 저장본 먼저. 그림 · 서체 · 아이콘: 저장본 먼저, 뒤에서 새로 받아 둔다.
var SHELL = 'exh-shell-v3', ASSETS = 'exh-assets-v1';
var PAGES = ['/exhibition/', '/exhibition/about/'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(function (c) { return Promise.all(PAGES.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); })); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return /^exh-/.test(k) && k !== SHELL && k !== ASSETS; }).map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.clients.claim(); }));
});

var pageKey = function (u) { return u.pathname.replace(/\/?$/, '/'); };   // ?k=1 · ?kt= 같은 꼬리는 떼고 한 벌만 둔다
function networkFirst(req, key) {
  return new Promise(function (resolve) {
    var done = false;
    var fallback = function () { return caches.match(key).then(function (r) { if (!done && r) { done = true; resolve(r); } return r; }); };
    var timer = setTimeout(fallback, 4000);
    fetch(req).then(function (r) {
      if (r && r.ok) { var copy = r.clone(); caches.open(SHELL).then(function (c) { return c.put(key, copy); }).catch(function () {}); }
      if (done) return;
      if (r && r.ok) { done = true; clearTimeout(timer); resolve(r); return; }
      clearTimeout(timer); fallback().then(function (h) { if (!done) { done = true; resolve(h || r); } });   // 서버가 잠시 오류(5xx · 배포 중 404)를 내면 저장본을 먼저
    }, function () {
      clearTimeout(timer);
      fallback().then(function (r) { if (!done) { done = true; resolve(r || Response.error()); } });
    });
  });
}
function cacheFirst(req, revalidate) {
  return caches.open(ASSETS).then(function (c) {
    return c.match(req).then(function (hit) {
      var get = function () { return fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()).catch(function () {}); return r; }); };
      if (hit) { if (revalidate) get().catch(function () {}); return hit; }   // 저장본이 있으면 네트워크를 기다리지 않는다(그림 · 서체만 뒤에서 새로 받는다)
      return get();
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var u = new URL(req.url);
  if (u.origin === location.origin) {
    if (/^\/exhibition(\/about)?\/?$/.test(u.pathname)) { if (req.mode === 'navigate') e.respondWith(networkFirst(req, pageKey(u))); return; }   // 페이지 이동만 저장본으로 받친다 — 재생 스크립트의 확인용 받기는 네트워크로 가야 '지금 넘어가도 되는가'를 바로 안다(감사 11-10)
    if (u.pathname.indexOf('/_astro/') === 0) { e.respondWith(cacheFirst(req, false)); return; }
    if (/^\/(img|fonts)\//.test(u.pathname) || u.pathname === '/apple-touch-icon.png' || u.pathname === '/exhibition/manifest.webmanifest') { e.respondWith(cacheFirst(req, true)); return; }
    return;
  }
  if (u.hostname === 'cdn.jsdelivr.net') e.respondWith(cacheFirst(req, true));   // 한글 서체(Pretendard) CSS · 글꼴 조각
});
