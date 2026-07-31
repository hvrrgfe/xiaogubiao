/* ============ 小胖鸭 · SVG 形象组件 ============
 * 纯 SVG 绘制的可视化宠物：会眨眼、会浮动、可配装饰、表情可变
 * 等级装饰：星星发卡 / 火焰 / 皇冠 / 樱花
 */
window.DuckArt = {
  /* 生成小胖鸭 SVG
   * level: 'duck'|'star'|'fire'|'crown'|'sakura'
   * emotion: 'happy'|'idle'|'sleep'|'love'|'cheer'|'eat'
   * size: 像素
   */
  render(level, emotion, size) {
    const s = size || 96;
    const deco = this._deco(level);
    const face = this._face(emotion);
    return `
    <svg viewBox="0 0 120 120" width="${s}" height="${s}" class="duck-svg duck-${emotion || 'idle'}">
      <defs>
        <radialGradient id="duckBody" cx="45%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#FBF0C8"/>
          <stop offset="100%" stop-color="#F0D67A"/>
        </radialGradient>
        <radialGradient id="duckHead" cx="40%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#FDF6D8"/>
          <stop offset="100%" stop-color="#F4DC8C"/>
        </radialGradient>
      </defs>

      <!-- 火焰装饰（火焰鸭） -->
      ${deco.fire}

      <!-- 身体 -->
      <ellipse cx="58" cy="78" rx="34" ry="28" fill="url(#duckBody)" stroke="#DDBB5E" stroke-width="2"/>
      <!-- 翅膀 -->
      <path d="M30 74 q-12 -8 -6 -20 q6 -8 16 -4 q-4 10 2 16 z" fill="#E8C96E"/>
      <path d="M86 74 q12 -8 6 -20 q-6 -8 -16 -4 q4 10 -2 16 z" fill="#E8C96E"/>
      <!-- 尾巴 -->
      <path d="M86 66 q14 4 12 16 q2 -14 -12 -16 z" fill="#E2C25E"/>

      <!-- 头 -->
      <circle cx="58" cy="38" r="24" fill="url(#duckHead)" stroke="#DDBB5E" stroke-width="2"/>

      <!-- 腮红 -->
      <ellipse cx="44" cy="44" rx="5" ry="3.5" fill="#F8B0A0" opacity="0.8"/>
      <ellipse cx="72" cy="44" rx="5" ry="3.5" fill="#F8B0A0" opacity="0.8"/>

      <!-- 眼睛（眨眼动画） -->
      ${face.eyes}

      <!-- 嘴巴 -->
      <path d="M52 46 q6 -6 12 0 q-6 8 -12 0 z" fill="#F08A3C" stroke="#D9772E" stroke-width="1.5"/>
      ${face.mouth}

      <!-- 等级装饰 -->
      ${deco.extra}

      <!-- 爱心（love 表情时飘出） -->
      ${emotion === 'love' ? '<g class="duck-hearts"><path d="M14 30 q-4 -6 0 -9 q4 3 0 9z" fill="#F08080"/><path d="M104 26 q-3 -5 0 -7.5 q3 2.5 0 7.5z" fill="#F08080"/></g>' : ''}
      ${emotion === 'cheer' ? '<g class="duck-stars"><path d="M28 12 l2.2 4.5 4.8.7-3.5 3.4.9 4.9-4.4-2.3-4.4 2.3.9-4.9-3.5-3.4 4.8-.7z" fill="#F0A050"/><path d="M92 8 l1.6 3.3 3.5.5-2.5 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.5-2.5 3.5-.5z" fill="#F0A050"/></g>' : ''}

      <!-- 食物（喂食时） -->
      ${emotion === 'eat' ? '<g class="duck-food"><circle cx="58" cy="92" r="6" fill="#8BC34A"/><circle cx="58" cy="92" r="2.5" fill="#F57C00"/></g>' : ''}
    </svg>`;
  },

  /* 不同等级的外部装饰 */
  _deco(level) {
    switch (level) {
      case 'star':
        return {
          fire: '',
          extra: '<g class="deco-star"><path d="M58 10 l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#F0A050" stroke="#D9772E" stroke-width="1"/></g>'
        };
      case 'fire':
        return {
          fire: '<g class="deco-fire"><path d="M20 96 q-10 -18 2 -28 q6 8 2 16 q4 -10 0 -22 q-14 4 -10 34 z" fill="#F76B1C" opacity="0.9"/><path d="M100 96 q10 -18 -2 -28 q-6 8 -2 16 q-4 -10 0 -22 q14 4 10 34 z" fill="#F76B1C" opacity="0.9"/></g>',
          extra: '<g class="deco-spark"><circle cx="40" cy="12" r="2.5" fill="#F76B1C"/><circle cx="80" cy="16" r="2" fill="#F76B1C"/></g>'
        };
      case 'crown':
        return {
          fire: '',
          extra: '<g class="deco-crown"><path d="M44 18 l4 -7 6 5 4 -8 4 8 6 -5 4 7 v4 h-28 z" fill="#F0D67A" stroke="#D9A441" stroke-width="1.5"/><circle cx="52" cy="22" r="1.8" fill="#F76B1C"/><circle cx="64" cy="20" r="1.8" fill="#F76B1C"/></g>'
        };
      case 'sakura':
        return {
          fire: '',
          extra: '<g class="deco-sakura"><path d="M84 14 q-4 -8 -10 -6 q-2 6 3 8 q-6 -1 -7 5 q7 2 9 -3 q0 7 7 5 q-2 -6 -6 -6 q5 -4 4 -3z" fill="#F4A7B9"/><path d="M100 30 q-3 -6 -8 -4.5 q-1.5 4.5 2.5 6 q-4.5 -.7 -5.5 3.7 q5.3 1.5 6.8 -2.2 q0 5.2 5.2 3.8 q-1.5 -4.5 -4.5 -4.5 q3.7 -3 3 -2.3z" fill="#F4A7B9" opacity="0.85"/><circle cx="82" cy="14" r="1.5" fill="#F08080"/><circle cx="99" cy="30" r="1.5" fill="#F08080"/></g>'
        };
      default:
        return { fire: '', extra: '' };
    }
  },

  /* 表情：眼睛与嘴 */
  _face(emotion) {
    switch (emotion) {
      case 'sleep':
        return {
          eyes: '<g class="duck-eyes"><path d="M46 40 q4 -4 8 0" stroke="#4A4036" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M62 40 q4 -4 8 0" stroke="#4A4036" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M76 28 l6 3" stroke="#4A4036" stroke-width="1.6" stroke-linecap="round" opacity="0.5"/></g>',
          mouth: '<path d="M55 50 q3 -3 6 0" stroke="#D9772E" stroke-width="1.5" fill="none" stroke-linecap="round"/>'
        };
      case 'love':
        return {
          eyes: '<g class="duck-eyes"><path d="M42 40 q2 -6 5 0 q3 6 -2.5 4 q-5.5 2 -2.5 -4z" fill="#F08080"/><path d="M58 40 q2 -6 5 0 q3 6 -2.5 4 q-5.5 2 -2.5 -4z" fill="#F08080"/><circle cx="44" cy="38" r="1.2" fill="#fff"/><circle cx="60" cy="38" r="1.2" fill="#fff"/></g>',
          mouth: '<path d="M55 50 q3 3 6 0" stroke="#D9772E" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
        };
      case 'cheer':
        return {
          eyes: '<g class="duck-eyes"><path d="M44 38 q2 -7 5 0" stroke="#4A4036" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M58 38 q2 -7 5 0" stroke="#4A4036" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>',
          mouth: '<path d="M52 49 q6 7 12 0" stroke="#D9772E" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
        };
      case 'eat':
        return {
          eyes: '<g class="duck-eyes"><circle cx="46" cy="38" r="3.2" fill="#4A4036"/><circle cx="62" cy="38" r="3.2" fill="#4A4036"/><circle cx="47.2" cy="36.8" r="1.1" fill="#fff"/><circle cx="63.2" cy="36.8" r="1.1" fill="#fff"/></g>',
          mouth: '<path d="M52 47 q6 8 12 0 q-2 5 -6 5 q-4 0 -6 -5z" fill="#F08A3C"/>'
        };
      default: /* happy / idle */
        return {
          eyes: '<g class="duck-eyes"><circle cx="46" cy="38" r="3.4" fill="#4A4036"/><circle cx="62" cy="38" r="3.4" fill="#4A4036"/><circle cx="47.3" cy="36.7" r="1.2" fill="#fff"/><circle cx="63.3" cy="36.7" r="1.2" fill="#fff"/><path class="duck-blink" d="M46 38 h7 M62 38 h7" stroke="#4A4036" stroke-width="0" stroke-linecap="round"/></g>',
          mouth: emotion === 'happy' ? '<path d="M52 49 q6 5 12 0" stroke="#D9772E" stroke-width="2" fill="none" stroke-linecap="round"/>' : '<path d="M55 49 q3 -2 6 0" stroke="#D9772E" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
        };
    }
  }
};
