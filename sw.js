const CACHE_NAME = "clube-do-auto-pwa-v5_2";
const ASSETS = ["./","./index.html","./manifest.webmanifest","./logo.png","./icon-192.png","./icon-512.png"];

self.addEventListener("install",(event)=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",(event)=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>(k!==CACHE_NAME)?caches.delete(k):null)))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",(event)=>{
  const req=event.request;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;
  event.respondWith(
    caches.match(req).then(cached=>{
      if(cached) return cached;
      return fetch(req).then(resp=>{
        if(req.method==="GET" && resp.status===200){
          const copy=resp.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));
        }
        return resp;
      }).catch(()=>cached);
    })
  );
});
