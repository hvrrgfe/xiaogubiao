/* ============================================================
 * 液态玻璃完整复刻 —— 边缘折射膨胀（Liquid Glass Refraction）
 * 算法参考: shuding/liquid-glass (roundedRectSDF + feDisplacementMap)
 * 苹果定义: 反射 + 折射 + 动态变形 —— 仅边缘折射，中间不变形
 *
 * 原理：
 *  1. 用「圆角矩形有符号距离场(SDF)」计算每个像素到玻璃边缘的距离
 *  2. smoothStep 让位移只在边缘区域生效（中间 scaled≈0，不变形）
 *  3. 把位移向量编码进 canvas 的 R/G 通道，生成置换贴图
 *  4. SVG feImage 引用贴图，feDisplacementMap 对背景做边缘折射
 *  5. 叠加原磨砂 backdrop-filter：url(折射) + blur(磨砂)
 * ============================================================ */
window.LiquidGlass = (function () {
  'use strict';

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let instances = [];
  let initialized = false;

  /* ---- 数学工具 ---- */
  function smoothStep(a, b, t) {
    t = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function length(x, y) {
    return Math.sqrt(x * x + y * y);
  }
  /* 圆角矩形有符号距离场（负=内部，正=外部） */
  function roundedRectSDF(x, y, hw, hh, r) {
    const qx = Math.abs(x) - hw + r;
    const qy = Math.abs(y) - hh + r;
    return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - r;
  }

  /* ---- 为单个元素生成折射滤镜 ---- */
  function applyTo(el) {
    if (!el || el.dataset.lg) return;
    const rect = el.getBoundingClientRect();
    const w = Math.max(24, Math.round(rect.width));
    const h = Math.max(24, Math.round(rect.height));
    const cw = Math.round(w * DPR);
    const ch = Math.round(h * DPR);

    /* 圆角半径（从计算样式读取） */
    const cs = getComputedStyle(el);
    let radius = parseFloat(cs.borderTopLeftRadius) || 0;
    if (!radius) radius = Math.min(w, h) * 0.12;

    /* 1. 逐像素计算位移（仅边缘折射） */
    const n = cw * ch;
    const rawX = new Float32Array(n);
    const rawY = new Float32Array(n);
    let maxScale = 0;
    const hw = 0.5 - 0.5 / cw;      // 半宽（uv 空间）
    const hh = 0.5 - 0.5 / ch;      // 半高
    const rNorm = Math.max(0.001, Math.min(radius, Math.min(w, h) / 2) / Math.max(w, h)) * 2; // 归一化半径(直径比例)
    const edgeWidth = 0.10;         // 折射带宽度（边缘 10% 区域）
    const bend = 0.55;              // 折射强度（0.5=完全向中心采样）

    for (let i = 0; i < n; i++) {
      const px = i % cw;
      const py = (i / cw) | 0;
      const ix = px / cw - 0.5;
      const iy = py / ch - 0.5;
      const dist = roundedRectSDF(ix, iy, hw, hh, rNorm);
      /* 仅边缘：距离 0（贴边）→ 1（edgeWidth 外）→ 0 */
      const disp = smoothStep(edgeWidth, 0, dist) * (dist < 0 ? 1 : smoothStep(0, edgeWidth, dist));
      /* 边缘像素向中心采样 → 内容在边缘被"膨胀"放大 */
      const scaled = 1 - disp * bend;
      const dx = ix * scaled;
      const dy = iy * scaled;
      rawX[i] = dx;
      rawY[i] = dy;
      const a = Math.abs(dx), b = Math.abs(dy);
      if (a > maxScale) maxScale = a;
      if (b > maxScale) maxScale = b;
    }

    /* 2. 编码到 R/G 通道 → canvas */
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

    /* 3. SVG filter（feImage + feDisplacementMap） */
    const id = 'lg' + Math.random().toString(36).slice(2, 9);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
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

    /* 4. 应用到元素：折射 + 保留原磨砂模糊 */
    const orig = cs.backdropFilter || cs.webkitBackdropFilter || '';
    const base = orig && orig.indexOf('url(') === -1
      ? orig
      : 'blur(42px) saturate(190%) brightness(1.12)';
    const combined = 'url(#' + id + '_f) ' + base;
    el.style.backdropFilter = combined;
    el.style.webkitBackdropFilter = combined;
    el.dataset.lg = id;

    instances.push({ el: el, svg: svg, id: id, w: w, h: h });
  }

  /* ---- 移除某个元素的折射（清理） ---- */
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

  /* ---- 全量刷新（页面切换 / resize 后调用） ----
   * 导航条(.app-nav)独立管理，不随内容刷新移除 */
  function refresh() {
    const els = document.querySelectorAll(
      '.goal-card, .card, .stat-box, .tpl-card, .today-item, .pet-speech, .quickbar-inner, .pet-level'
    );
    /* 移除旧的（保留导航） */
    instances.slice().forEach(x => {
      if (!x.el.classList.contains('app-nav')) removeFrom(x.el);
    });
    els.forEach(el => applyTo(el));
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function init() {
    if (initialized) return;
    initialized = true;

    refresh();

    /* 导航条独立应用（fixed 元素不随页面切换重建） */
    const nav = document.querySelector('.app-nav');
    if (nav) applyTo(nav);

    window.addEventListener('resize', debounce(refresh, 300));

    /* 内容变化自动重建（页面渲染/弹窗打开/数据更新） */
    const targets = ['main-content', 'modal-content'].map(id => document.getElementById(id)).filter(Boolean);
    targets.forEach(main => {
      new MutationObserver(debounce(refresh, 120)).observe(main, { childList: true, subtree: true });
    });
  }

  return { init: init, refresh: refresh, applyTo: applyTo, removeFrom: removeFrom };
})();
