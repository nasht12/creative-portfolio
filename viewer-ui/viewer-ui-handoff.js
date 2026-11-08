// Seamless page changes between the LiDAR viewers (the city viewer's fly-in to a landmark, and back).
// The page being left stores its last frame in sessionStorage ('lidarHandoff': {path, at, snap, offset,
// fov}). This classic script, loaded in <head> so it runs before the first paint, holds that frame
// over the new page until the page has drawn its own first frame and calls vuiHandoffDone(), then
// dissolves it away. viewer-ui.js reads window.__vuiHandoff for the camera and the spin.
// Source: relief-renderer/studies/viewer_ui; copied next to viewer-ui.js.
(function () {
  var st = null, timer = 0;
  window.vuiHandoff = function () {   // shows the frame waiting for this page, if any; returns the handoff
    var h = null;
    try { h = JSON.parse(sessionStorage.getItem('lidarHandoff')); } catch (e) {}
    if (!h || h.path !== location.pathname || Date.now() - h.at > 30000) return null;
    try { sessionStorage.removeItem('lidarHandoff'); } catch (e) {}
    window.__vuiHandoff = h;
    if (!h.snap) return h;
    if (document.body) document.body.classList.remove('vui-handoff-go');
    if (!st) { st = document.createElement('style'); document.head.appendChild(st); }
    st.textContent = 'body::after{content:"";position:fixed;inset:0;z-index:30;pointer-events:none;' +
      'background:#05070c url("' + h.snap + '") center/cover no-repeat;transition:opacity .9s ease}' +
      'body.vui-handoff-go::after{opacity:0}body:not(.vui-handoff-go) #status{visibility:hidden}';
    clearTimeout(timer); timer = setTimeout(window.vuiHandoffDone, 10000);   // never hold a slow page hostage
    return h;
  };
  window.vuiHandoffDone = function () {   // call after the first live frame: dissolve into it
    clearTimeout(timer);
    if (!st || !document.body) return;
    getComputedStyle(document.body, '::after').opacity;   // so the transition starts from the held frame
    document.body.classList.add('vui-handoff-go');
  };
  window.vuiHandoff();
})();
