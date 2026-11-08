// Shared controls for every LiDAR 3D viewer: one layout, one set of words, one set of URL keys.
//   top bar      Color ▾ (dropdown) · Surroundings ◐ · Light ◐ · Alive ◐ · Points ▾ · ⟲ reset
//   bottom left  small title "Place / what it is", one-line summary, (i) for how to move + sources
// URL keys: #color= &surroundings=0 &light=1 &alive=1|0 &size= &shape=soft|square &density=half|quarter
//           &glow=0 &spin=1|0 &clean    (old look= / city= / points= / style=points still load)
// Source: relief-renderer/studies/viewer_ui; copied to the portfolio's viewer-ui/.

const SHAPES = ['dot', 'soft', 'square'];
const DENSITY = {all: 1, half: 0.5, quarter: 0.25};
const RESET_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  kids.forEach(c => c && e.append(c));
  return e;
}

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (!h.has('color') && h.has('look')) h.set('color', h.get('look'));
  if (!h.has('color') && h.get('style') === 'points') h.set('color', 'height');
  if (!h.has('surroundings') && h.has('city')) h.set('surroundings', h.get('city') === '0' ? '0' : '1');
  if (!h.has('density') && h.has('points')) h.set('density', {0.5: 'half', 0.25: 'quarter'}[+h.get('points')] || 'all');
  return h;
}

export function mountViewerUI(o) {
  const hp = readHash();
  const fx = o.effects || {};
  const colors = o.colors || [];
  const defaults = {
    color: o.color || (colors[0] && colors[0].key),
    alive: !!(fx.alive && fx.alive.default), glow: !(fx.glow && fx.glow.default === false), spin: !!(fx.spin && fx.spin.default),
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const s = {
    color: colors.some(c => c.key === hp.get('color')) ? hp.get('color') : defaults.color,
    surroundings: hp.has('surroundings') ? hp.get('surroundings') !== '0' : true,
    size: Math.min(3, Math.max(0.3, +(hp.get('size') || 1))),
    shape: SHAPES.includes(hp.get('shape')) ? hp.get('shape') : 'dot',
    density: DENSITY[hp.get('density')] ? hp.get('density') : 'all',
    light: hp.get('light') === '1',
    alive: hp.has('alive') ? hp.get('alive') === '1' : defaults.alive && !reduce,
    glow: hp.has('glow') ? hp.get('glow') !== '0' : defaults.glow,
    spin: hp.has('spin') ? hp.get('spin') !== '0' : defaults.spin,
  };
  const wake = () => o.wake && o.wake();
  const sync = () => {
    const h = new URLSearchParams(), keep = new URLSearchParams(location.hash.slice(1));
    ['cam', 'target', 'clean'].forEach(k => keep.has(k) && h.set(k, keep.get(k)));
    if (s.color !== defaults.color) h.set('color', s.color);
    if (!s.surroundings) h.set('surroundings', '0');
    if (s.size !== 1) h.set('size', s.size);
    if (s.shape !== 'dot') h.set('shape', s.shape);
    if (s.density !== 'all') h.set('density', s.density);
    if (s.light) h.set('light', '1');
    if (s.alive !== defaults.alive) h.set('alive', s.alive ? '1' : '0');
    if (s.glow !== defaults.glow) h.set('glow', s.glow ? '1' : '0');
    if (s.spin !== defaults.spin) h.set('spin', s.spin ? '1' : '0');
    const str = h.toString().replace(/=(&|$)/g, '$1');
    history.replaceState(null, '', str ? '#' + str : location.pathname + location.search);
  };
  const pressed = (b, on) => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); };
  const switched = (b, on) => b.setAttribute('aria-checked', String(on));
  const sw = (label, title, onclick) => el('button', {class: 'vui-switch', role: 'switch', 'aria-checked': 'false', title, onclick},
    el('span', {text: label}), el('span', {class: 'vui-track', 'aria-hidden': 'true'}));

  // ---- popovers (Color menu, Points panel): one open at a time, close on outside click / Esc
  const pops = [];
  const openPop = (pop, btn) => {
    const show = pop.hidden;
    pops.forEach(([p, b]) => { p.hidden = true; b.setAttribute('aria-expanded', 'false'); });
    if (!show) return;
    pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
    if (innerWidth > 600) {  // align under its button, kept on screen
      const r = btn.getBoundingClientRect();
      pop.style.right = Math.max(12, innerWidth - r.right) + 'px'; pop.style.left = 'auto';
    } else { pop.style.left = ''; pop.style.right = ''; }
  };
  document.addEventListener('pointerdown', e => {
    if (!pops.some(([p, b]) => p.contains(e.target) || b.contains(e.target))) pops.forEach(([p, b]) => { p.hidden = true; b.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') pops.forEach(([p, b]) => { p.hidden = true; b.setAttribute('aria-expanded', 'false'); }); });

  const bar = el('div', {class: 'vui vui-bar', role: 'toolbar', 'aria-label': 'View controls'});
  const layer = [];

  // Color ▾
  let colorBtn, colorVal, menuItems = [];
  if (colors.length > 1) {
    colorVal = el('span');
    colorBtn = el('button', {'aria-haspopup': 'true', 'aria-expanded': 'false', title: 'How the points are colored'},
      el('span', {class: 'vui-k', text: 'Color'}), colorVal, el('span', {class: 'vui-caret', text: '▾'}));
    const menu = el('div', {class: 'vui vui-pop vui-menu', role: 'menu', hidden: ''});
    colors.forEach(c => {
      const b = el('button', {role: 'menuitemradio', 'aria-checked': 'false', onclick: () => { setColor(c.key); menu.hidden = true; colorBtn.setAttribute('aria-expanded', 'false'); }},
        el('span', {text: c.label}));
      b.dataset.key = c.key; menuItems.push(b); menu.append(b);
    });
    colorBtn.addEventListener('click', () => openPop(menu, colorBtn));
    pops.push([menu, colorBtn]); bar.append(colorBtn); layer.push(menu);
  }
  // switches
  let surrBtn, lightBtn, aliveBtn;
  if (o.onSurroundings) { surrBtn = sw('Surroundings', o.surroundingsTitle || 'Show or hide what is around the subject', () => setSurroundings(!s.surroundings)); bar.append(surrBtn); }
  if (o.onLight) { lightBtn = sw('Light', 'A band of light sweeps through the points', () => setLight(!s.light)); bar.append(lightBtn); }
  if (o.onAlive) { aliveBtn = sw('Alive', 'The canopy gently breathes', () => setAlive(!s.alive)); bar.append(aliveBtn); }
  // Points ▾
  const panel = el('div', {class: 'vui vui-pop vui-panel', role: 'group', 'aria-label': 'Points', hidden: ''});
  const row = (label, ...kids) => panel.append(el('label', {text: label}), el('div', {class: 'vui-row'}, ...kids));
  let sizeIn, shapeBtns = [], densBtns = [], glowBtn, spinBtn;
  if (o.onSize) { sizeIn = el('input', {type: 'range', min: '0.3', max: '3', step: '0.05', 'aria-label': 'Point size', oninput: () => setSize(+sizeIn.value)}); panel.append(el('label', {text: 'Size'}), sizeIn); }
  if (o.onShape) { shapeBtns = SHAPES.map(k => { const b = el('button', {text: k[0].toUpperCase() + k.slice(1), onclick: () => setShape(k)}); b.dataset.key = k; return b; }); row('Shape', ...shapeBtns); }
  if (o.onDensity) { densBtns = Object.keys(DENSITY).map(k => { const b = el('button', {text: k[0].toUpperCase() + k.slice(1), onclick: () => setDensity(k)}); b.dataset.key = k; return b; }); row('Density', ...densBtns); }
  const extras = [];
  if (o.onGlow) { glowBtn = el('button', {text: 'Glow', onclick: () => setGlow(!s.glow)}); extras.push(glowBtn); }
  if (o.controls) { spinBtn = el('button', {text: 'Spin', onclick: () => setSpin(!s.spin)}); extras.push(spinBtn); }
  if (extras.length) row('Motion', ...extras);
  if (panel.children.length) {
    const pb = el('button', {'aria-haspopup': 'true', 'aria-expanded': 'false', title: 'Point size, shape and density'},
      el('span', {text: 'Points'}), el('span', {class: 'vui-caret', text: '▾'}));
    pb.addEventListener('click', () => openPop(panel, pb));
    pops.push([panel, pb]); bar.append(pb); layer.push(panel);
  }
  // reset (icon)
  if (o.reset) bar.append(el('button', {class: 'vui-icon', 'aria-label': 'Reset view', title: 'Reset view', html: RESET_SVG, onclick: () => { o.reset(); wake(); }}));

  // ---- title, small, bottom left; (i) holds how to move and the sources
  const [place, kind] = (o.title || '').split(' / ');
  const aliveNote = fx.alive && fx.alive.note ? el('p', {text: fx.alive.note}) : null;
  const tip = el('div', {class: 'vui-tip', role: 'tooltip', id: 'vui-tip'},
    el('p', {text: 'Drag to orbit · Scroll or pinch to zoom · Right-drag or two fingers to pan'}), aliveNote,
    ...(o.notes || []).map(t => el('p', {text: t})));
  const info = el('span', {class: 'vui-info'},
    el('button', {text: 'i', 'aria-label': 'About this view', 'aria-describedby': 'vui-tip', onclick: e => { e.currentTarget.parentNode.classList.toggle('open'); }}), tip);
  const sub = el('p', {text: o.subtitle || ''});
  const title = el('div', {class: 'vui vui-title'},
    el('h1', {}, el('span', {text: place || ''}), kind ? el('span', {text: '/ ' + kind}) : null, info), sub);
  title.querySelector('h1 span').style.color = 'var(--ink)';

  // back returns wherever the visitor came from on this site (the city viewer, the studies page at
  // the tab they were on, another viewer), through history so that page comes back as it was left.
  // Opened straight from a link elsewhere, it falls back to the page's own back link.
  let ref = ''; try { ref = document.referrer; } catch (e) {}
  let from = null; try { from = ref && new URL(ref); } catch (e) {}
  const came = from && from.origin === location.origin && from.pathname !== location.pathname && history.length > 1;
  const fromCity = came && /\/lidar-viewer\//.test(from.pathname);
  const label = !came ? (o.back && o.back.label) || 'LiDAR studies' : fromCity ? 'Seattle'
    : /lidar-studies/.test(from.pathname) ? 'LiDAR studies' : 'Back';
  const back = o.back ? el('a', {class: 'vui vui-back', href: came ? ref : o.back.href, text: '← ' + label}) : null;
  if (back && came) back.addEventListener('click', e => { if (!e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); history.back(); } });
  if (fromCity) {
    const veil = el('div', {class: 'vui-veil'});
    document.body.appendChild(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => { veil.style.opacity = 0; setTimeout(() => veil.remove(), 900); }));
  }
  document.body.append(...[back, bar, ...layer, title].filter(Boolean));
  if (hp.has('clean')) document.body.classList.add('vui-clean');

  // ---- setters: state, viewer, buttons, URL
  function setColor(k) { s.color = k; if (colorVal) colorVal.textContent = (colors.find(c => c.key === k) || {}).label || k;
    menuItems.forEach(b => b.setAttribute('aria-checked', String(b.dataset.key === k))); o.onColor && o.onColor(k); sync(); wake(); }
  function setSurroundings(v) { s.surroundings = v; switched(surrBtn, v); o.onSurroundings(v); sync(); wake(); }
  function setLight(v) { s.light = v; switched(lightBtn, v); o.onLight(v); sync(); wake(); }
  function setAlive(v) { s.alive = v; switched(aliveBtn, v); if (aliveNote) aliveNote.hidden = !v; o.onAlive(v); sync(); wake(); }
  function setSize(v) { s.size = +(+v).toFixed(2); if (sizeIn) sizeIn.value = s.size; o.onSize(s.size); sync(); wake(); }
  function setShape(k) { s.shape = k; shapeBtns.forEach(b => pressed(b, b.dataset.key === k)); o.onShape(SHAPES.indexOf(k)); sync(); wake(); }
  function setDensity(k) { s.density = k; densBtns.forEach(b => pressed(b, b.dataset.key === k)); o.onDensity(DENSITY[k]); sync(); wake(); }
  function setGlow(v) { s.glow = v; pressed(glowBtn, v); o.onGlow(v); sync(); wake(); }
  function setSpin(v) { s.spin = v; if (spinBtn) pressed(spinBtn, v); o.controls.autoRotate = v; o.onSpin && o.onSpin(v); sync(); wake(); }

  if (colors.length || o.onColor) setColor(s.color);
  if (surrBtn) setSurroundings(s.surroundings);
  if (lightBtn) setLight(s.light);
  if (aliveBtn) setAlive(s.alive);
  if (o.onSize) setSize(s.size);
  if (o.onShape) setShape(s.shape);
  if (o.onDensity) setDensity(s.density);
  if (o.onGlow) setGlow(s.glow);
  if (o.controls) setSpin(s.spin);
  return {state: s, setSubtitle: t => { sub.textContent = t; }};
}
