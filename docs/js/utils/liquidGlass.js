/* ============================================================
 * 液态玻璃折射 —— 导航条专用版
 *
 * 重要技术限制（已实测确认）：
 *  feDisplacementMap 使用 userSpaceOnUse 坐标，滤镜区域固定。
 *  滚动容器内的卡片滚动时，背景移动但折射区域不动 → 折射错位 + 闪烁。
 *  iOS 原生用 Metal 实时渲染无此问题，纯 CSS/SVG 有固有限制。
 *
 * 因此：边缘折射只应用于【固定不滚动的导航条】，稳定无闪烁；
 *  内容卡片使用 CSS 玻璃层（最透+噪点+边缘高光），稳定可靠。
 * ============================================================ */
window.LiquidGlass = (function () {
  'use strict';

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let instances = [];
  let enabled = true;

  function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function length(x, y) {
    return Math.sqrt(x * x + y * y);
  }
  function roundedRectSDF(x, y, hw, hh, r) {
    const qx = Math.abs(x) - hw + r;
    const qy = Math.abs(y) - hh + r;
    return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - r;
  }

  /* 为单个固定元素生成折射滤镜 */
  function applyTo(el) {
    if (!enabled || !el || el.dataset.lg) return;
    const rect = el.getBoundingClientRect();
    const w = Math.max(24, Math.round(rect.width));
    const h = Math.max(24, Math.round(rect.height));
    const cw = Math.round(w * DPR);
    const ch = Math.round(h * DPR);

    const cs = getComputedStyle(el);
    let radius = parseFloat(cs.borderTopLeftRadius) || 0;
    if (!radius) radius = Math.min(w, h) * 0.12;

    /* 1. 逐像素计算位移（仅边缘折射） */
    const n = cw * ch;
    const rawX = new Float32Array(n);
    const rawY = new Float32Array(n);
    let maxScale = 0;
    const hw = 0.5 - 0.5 / cw;
    const hh = 0.5 - 0.5 / ch;
    const rNorm = Math.max(0.001, Math.min(radius, Math.min(w, h) / 2) / Math.max(w, h)) * 2;
    const edgeWidth = 0.10;
    const bend = 0.45;

    for (let i = 0; i < n; i++) {
      const px = i % cw;
      const py = (i / cw) | 0;
      const ix = px / cw - 0.5;
      const iy = py / ch - 0.5;
      const dist = roundedRectSDF(ix, iy, hw, hh, rNorm);
      const disp = smoothStep(edgeWidth, 0, dist) * (dist < 0 ? 1 : smoothStep(0, edgeWidth, dist));
      const scaled = 1 - disp * bend;
      const dx = ix * scaled;
      const dy = iy * scaled;
      rawX[i] = dx;
      rawY[i] = dy;
      const a = Math.abs(dx), b = Math.abs(dy);
      if (a > maxScale) maxScale = a;
      if (b > maxScale) maxScale = b;
    }

    /* 2. 编码到 canvas R/G 通道 */
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(cw, ch);
    const data = img.data;
    const norm = Math.max(0.0001, maxScale * 0.5);
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      data[o] = (rawX[i] / norm + 0.5) * 255;
      data[o + 1] = (rawY[i] / norm + 0.5) * 255;
      data[o + 2] = 128;
      data[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const mapURL = canvas.toDataURL('image/png');

    /* 3. SVG filter */
    const id = 'lg' + Math.random().toString(36).slice(2, 9);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', id + '_f');
    filter.setAttribute('filterUnits', 'userSpaceOnUse');
    filter.setAttribute('colorInterpolationFilters', 'sRGB');
    filter.setAttribute('x', '0');
    filter.setAttribute('y', '0');
    filter.setAttribute('width', w);
    filter.setAttribute('height', h);
    const feImage = document.createElementNS('http://www.w3.org/2000/svg', 'feImage');
    feImage.setAttribute('id', id + '_m');
    feImage.setAttribute('width', w);
    feImage.setAttribute('height', h);
    feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', mapURL);
    feImage.setAttribute('href', mapURL);
    const feDisp = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    feDisp.setAttribute('in', 'SourceGraphic');
    feDisp.setAttribute('in2', id + '_m');
    feDisp.setAttribute('xChannelSelector', 'R');
    feDisp.setAttribute('yChannelSelector', 'G');
    feDisp.setAttribute('scale', (maxScale / DPR * 0.5).toFixed(2));
    filter.appendChild(feImage);
    filter.appendChild(feDisp);
    defs.appendChild(filter);
    svg.appendChild(defs);
    (document.body || document.documentElement).appendChild(svg);

    /* 4. 应用：折射 + 保留磨砂 */
    const orig = cs.backdropFilter || cs.webkitBackdropFilter || '';
    const base = orig && orig.indexOf('url(') === -1
      ? orig
      : 'blur(44px) saturate(190%) brightness(1.12)';
    const combined = 'url(#' + id + '_f) ' + base;
    el.style.backdropFilter = combined;
    el.style.webkitBackdropFilter = combined;
    el.dataset.lg = id;

    instances.push({ el: el, svg: svg, id: id });
  }

  function removeFrom(el) {
    const id = el.dataset.lg;
    if (!id) return;
    const idx = instances.findIndex(x => x.el === el);
    if (idx > -1) {
      instances[idx].svg.remove();
      instances.splice(idx, 1);
    }
    el.style.backdropFilter = '';
    el.style.webkitBackdropFilter = '';
    delete el.dataset.lg;
  }

  /* 只作用于固定元素（导航条） */
  function refresh() {
    instances.slice().forEach(x => removeFrom(x.el));
    const nav = document.querySelector('.app-nav');
    if (nav) applyTo(nav);
  }

  function enable() {
    enabled = true;
    refresh();
  }
  function disable() {
    enabled = false;
    instances.slice().forEach(x => removeFrom(x.el));
  }
  function isEnabled() {
    return enabled;
  }

  function init() {
    refresh();
    window.addEventListener('resize', debounce(refresh, 400));
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  return { init: init, refresh: refresh, enable: enable, disable: disable, isEnabled: isEnabled, applyTo: applyTo, removeFrom: removeFrom };
})();
