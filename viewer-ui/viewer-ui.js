// Shared controls for every LiDAR 3D viewer: one layout, one set of words, one set of URL keys.
//   Color        Height · Sun · Frost   (whatever looks the viewer has)   #color=
//   Surroundings on / off                                                #surroundings=0
//   Light        a band of light sweeps through the points               #light=1
//   Alive        the canopy breathes (canopy viewers)                    #alive=1|0
//   Points panel Size, Shape (Dot · Soft · Square), Density (All · Half · Quarter), Glow, Spin
//                                                                        #size= #shape= #density= #glow=0 #spin=1|0
// Old keys still load: look=, city=, points=0.5|0.25, style=points.
// Source: relief-renderer/studies/viewer_ui; copied to the portfolio's viewer-ui/.

const SHAPES = ['dot', 'soft', 'square'];
const DENSITY = {all: 1, half: 0.5, quarter: 0.25};

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  kids.forEach(c => c && e.append(c));
  return e;
}

function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  // older links
  if (!h.has('color') && h.has('look')) h.set('color', h.get('look'));
  if (!h.has('color') && h.get('style') === 'points') h.set('color', 'height');
  if (!h.has('surroundings') && h.has('city')) h.set('surroundings', h.get('city') === '0' ? '0' : '1');
  if (!h.has('density') && h.has('points')) h.set('density', {0.5: 'half', 0.25: 'quarter'}[+h.get('points')] || 'all');
  return h;
}

export function mountViewerUI(o) {
  const hp = readHash();
  const fx = o.effects || {};
  const pts = o.points || {};
  const defaults = {
    color: o.color || (o.colors && o.colors[0] && o.colors[0].key),
    surroundings: true, size: 1, shape: 'dot', density: 'all', light: false,
    alive: !!(fx.alive && fx.alive.default), glow: !(fx.glow && fx.glow.default === false), spin: !!(fx.spin && fx.spin.default),
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const s = {
    color: o.colors && o.colors.some(c => c.key === hp.get('color')) ? hp.get('color') : defaults.color,
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
    const h = new URLSearchParams();
    const keep = new URLSearchParams(location.hash.slice(1));
    ['cam', 'target', 'clean'].forEach(k => keep.has(k) && h.set(k, keep.get(k)));  // viewer-specific keys
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
  const toggle = (btn, on) => { btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on)); };

  // ---- header: back link, "Place / what it is", one-line summary
  const sub = el('p', {text: o.subtitle || ''});
  const header = el('header', {class: 'vui vui-header'},
    o.back ? el('a', {href: o.back.href, text: '← ' + (o.back.label || 'LiDAR studies')}) : null,
    el('h1', {text: o.title || ''}), sub);

  // ---- top right: Color, then Surroundings
  const top = el('div', {class: 'vui vui-top'});
  const colorBtns = [];
  if (o.colors && o.colors.length > 1) {
    const g = el('div', {class: 'vui-group', role: 'group', 'aria-label': 'Color'});
    o.colors.forEach(c => {
      const b = el('button', {text: c.label, title: c.title || '', onclick: () => setColor(c.key)});
      b.dataset.key = c.key; colorBtns.push(b); g.append(b);
    });
    top.append(g);
  }
  let surrBtn = null;
  if (o.onSurroundings) {
    surrBtn = el('button', {text: o.surroundingsLabel || 'Surroundings', title: o.surroundingsTitle || 'Show or hide what is around the subject',
      onclick: () => setSurroundings(!s.surroundings)});
    top.append(surrBtn);
  }

  // ---- Points panel
  const panel = el('div', {class: 'vui vui-panel', role: 'group', 'aria-label': 'Points', hidden: ''});
  const row = (label, ...kids) => { panel.append(el('label', {text: label}), el('div', {class: 'vui-row'}, ...kids)); };
  let sizeIn, shapeBtns = [], densBtns = [], glowBtn, spinBtn;
  if (o.onSize) {
    sizeIn = el('input', {type: 'range', min: '0.3', max: '3', step: '0.05', 'aria-label': 'Point size', oninput: () => setSize(+sizeIn.value)});
    panel.append(el('label', {text: 'Size'}), sizeIn);
  }
  if (o.onShape) {
    shapeBtns = SHAPES.map(k => { const b = el('button', {text: k[0].toUpperCase() + k.slice(1), onclick: () => setShape(k)}); b.dataset.key = k; return b; });
    row('Shape', ...shapeBtns);
  }
  if (o.onDensity) {
    densBtns = Object.keys(DENSITY).map(k => { const b = el('button', {text: k[0].toUpperCase() + k.slice(1), onclick: () => setDensity(k)}); b.dataset.key = k; return b; });
    row('Density', ...densBtns);
  }
  const extras = [];
  if (o.onGlow) { glowBtn = el('button', {text: 'Glow', onclick: () => setGlow(!s.glow)}); extras.push(glowBtn); }
  if (o.controls) { spinBtn = el('button', {text: 'Spin', onclick: () => setSpin(!s.spin)}); extras.push(spinBtn); }
  if (extras.length) row('Motion', ...extras);

  // ---- bottom: caption left, actions right
  const aliveNote = fx.alive && fx.alive.note ? el('p', {text: fx.alive.note}) : null;
  const caption = el('div', {class: 'vui-caption'},
    el('p', {text: 'Drag to orbit · Pinch or scroll to zoom · Right-drag or two fingers to pan'}), aliveNote,
    ...(o.notes || []).map(t => el('p', {text: t})));
  const actions = el('div', {class: 'vui-actions'});
  let lightBtn, aliveBtn;
  if (o.onLight) { lightBtn = el('button', {text: 'Light', title: 'A band of light sweeps through the points', onclick: () => setLight(!s.light)}); actions.append(lightBtn); }
  if (o.onAlive) { aliveBtn = el('button', {text: 'Alive', title: 'The canopy gently breathes', onclick: () => setAlive(!s.alive)}); actions.append(aliveBtn); }
  if (panel.children.length) {
    const pb = el('button', {text: 'Points', 'aria-expanded': 'false', onclick: () => {
      panel.hidden = !panel.hidden; pb.classList.toggle('on', !panel.hidden); pb.setAttribute('aria-expanded', String(!panel.hidden)); }});
    actions.append(pb);
  }
  if (o.camera && o.controls) {
    const zoom = f => { o.camera.position.sub(o.controls.target).multiplyScalar(f).add(o.controls.target); o.controls.update(); wake(); };
    actions.append(el('button', {text: '+', 'aria-label': 'Zoom in', onclick: () => zoom(0.8)}),
                   el('button', {text: '−', 'aria-label': 'Zoom out', onclick: () => zoom(1.25)}));
  }
  if (o.reset) actions.append(el('button', {text: 'Reset view', onclick: () => { o.reset(); wake(); }}));
  const bottom = el('div', {class: 'vui vui-bottom'}, caption, actions);
  document.body.append(header, top, panel, bottom);
  if (hp.has('clean')) document.body.classList.add('vui-clean');

  // ---- setters: update state, the viewer, the buttons and the URL
  function setColor(k) { s.color = k; colorBtns.forEach(b => toggle(b, b.dataset.key === k)); o.onColor && o.onColor(k); sync(); wake(); }
  function setSurroundings(v) { s.surroundings = v; toggle(surrBtn, v); o.onSurroundings(v); sync(); wake(); }
  function setSize(v) { s.size = +(+v).toFixed(2); if (sizeIn) sizeIn.value = s.size; o.onSize(s.size); sync(); wake(); }
  function setShape(k) { s.shape = k; shapeBtns.forEach(b => toggle(b, b.dataset.key === k)); o.onShape(SHAPES.indexOf(k)); sync(); wake(); }
  function setDensity(k) { s.density = k; densBtns.forEach(b => toggle(b, b.dataset.key === k)); o.onDensity(DENSITY[k]); sync(); wake(); }
  function setGlow(v) { s.glow = v; toggle(glowBtn, v); o.onGlow(v); sync(); wake(); }
  function setSpin(v) { s.spin = v; if (spinBtn) toggle(spinBtn, v); o.controls.autoRotate = v; o.onSpin && o.onSpin(v); sync(); wake(); }
  function setLight(v) { s.light = v; toggle(lightBtn, v); o.onLight(v); sync(); wake(); }
  function setAlive(v) { s.alive = v; toggle(aliveBtn, v); if (aliveNote) aliveNote.hidden = !v; o.onAlive(v); sync(); wake(); }

  if (colorBtns.length || o.onColor) setColor(s.color);
  if (surrBtn) setSurroundings(s.surroundings);
  if (o.onSize) setSize(s.size);
  if (o.onShape) setShape(s.shape);
  if (o.onDensity) setDensity(s.density);
  if (o.onGlow) setGlow(s.glow);
  if (o.controls) setSpin(s.spin);
  if (o.onLight) setLight(s.light);
  if (o.onAlive) setAlive(s.alive);
  return {state: s, setSubtitle: t => { sub.textContent = t; }};
}
