const CACHE_NAME = "clube-auto-2026-06-29-mobile-force-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/config.js",
  "./js/manifest-links.js",
  "./js/brand-assets.js",
  "./js/modules/users.js",
  "./js/app.js",
  "./js/pwa.js",
  "./assets/logo.png",
  "./assets/logo-full.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];
self.addEventListener("install",(e)=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).catch(()=>{}));});
self.addEventListener("activate",(e)=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):Promise.resolve()));await self.clients.claim();})());});
self.addEventListener("fetch",(e)=>{
  const url=new URL(e.request.url);
  if(url.origin!==location.origin) return;
  e.respondWith((async()=>{
    try{
      const fresh=await fetch(e.request,{cache:"no-store"});
      const cache=await caches.open(CACHE_NAME);
      cache.put(e.request,fresh.clone()).catch(()=>{});
      return fresh;
    }catch(err){
      return (await caches.match(e.request)) || caches.match("./index.html");
    }
  })());
});
