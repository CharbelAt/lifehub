/* LifeHub service worker — offline cache + notifications */
const CACHE = "lifehub-v4";
const FILES = [
  "./", "./index.html", "./style.css", "./manifest.webmanifest",
  "./util.js", "./charts.js", "./store.js", "./ui.js", "./money.js", "./planner.js",
  "./gym.js", "./health.js", "./habits.js", "./home.js", "./settings.js", "./main.js",
  "./icon.svg", "./icon-maskable.svg", "./LifeHub.html"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});

/* tapping a notification opens / focuses the app */
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for(const c of list){ if("focus" in c) return c.focus(); }
      return clients.openWindow("./index.html");
    })
  );
});

/* daily nudge even when the app is closed (supported Android, installed PWA) */
self.addEventListener("periodicsync", e => {
  if(e.tag === "lifehub-daily"){
    e.waitUntil(self.registration.showNotification("LifeHub 🏃", {
      body: "Time to move — and don't forget to log today.",
      icon: "icon.svg", badge: "icon.svg", tag: "lifehub-daily"
    }));
  }
});
