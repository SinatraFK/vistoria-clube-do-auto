const CACHE_NAME = "clube-auto-2026-03-03-nofotos-users-fix2";
const ASSETS = ["./","./index.html","./logo.png","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",(e)=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).catch(()=>{}));});
self.addEventListener("activate",(e)=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):Promise.resolve()));await self.clients.claim();})());});
self.addEventListener("fetch",(e)=>{
  const url=new URL(e.request.url);
  if(url.origin!==location.origin) return;
  const isIndex=url.pathname.endsWith("/")||url.pathname.endsWith("/index.html");
  if(isIndex){
    e.respondWith((async()=>{try{const fresh=await fetch(e.request);(await caches.open(CACHE_NAME)).put(e.request,fresh.clone());return fresh;}catch{return (await caches.match(e.request))||caches.match("./index.html");}})());
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy)).catch(()=>{});return res;})));
});
