document.addEventListener("DOMContentLoaded", () => {
  const path = window.assetPath || ((p)=>p);
  const a = document.getElementById("logoLogin");
  const b = document.getElementById("logoTop");
  if (a) a.src = path("assets/logo.png");
  if (b) b.src = path("assets/logo.png");
});
