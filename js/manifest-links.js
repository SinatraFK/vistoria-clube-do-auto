(function () {
    const path = window.assetPath || ((p)=>p);
    const ml = document.getElementById("manifestLink");
    const al = document.getElementById("appleIconLink");
    if (ml) ml.href = path("manifest.webmanifest");
    if (al) al.href = path("assets/icon-192.png");
  })();
