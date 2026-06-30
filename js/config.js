window.BASE_HREF = location.hostname.includes("github.io") ? "/vistoria-clube-do-auto/" : "./";
window.assetPath = function assetPath(path){
  const base = window.BASE_HREF || "./";
  return base + String(path || "").replace(/^\.?\//, "");
};
