"use strict";
/* ============ main.js — boot ============ */

applyRecur();
render();
route();
checkRemind();
setInterval(checkRemind, 60000);
setInterval(applyRecur, 3600000);
if("serviceWorker" in navigator && location.protocol === "https:"){
  navigator.serviceWorker.register("sw.js").catch(function(){});
}
