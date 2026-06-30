if("serviceWorker" in navigator){
  window.addEventListener("load", ()=> {
    const path = window.assetPath || ((p)=>p);
    navigator.serviceWorker.register(path("sw.js?v=20260629-mobile-force-v3"))
      .then(reg=>reg.update().catch(()=>{}))
      .catch(()=>{});
  });
}
