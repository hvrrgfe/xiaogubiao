/* ============ 本地存储层（localStorage + 版本化） ============ */
window.Store = {
  KEY: 'xiaogubiao_v1',

  _load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  },

  _save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  /* ---- 数据仓库 ---- */
  getData() {
    const d = this._load();
    if (d && d.goals) return d;
    const fresh = {
      version: 1,
      goals: [],            // 目标
      checkins: [],         // 打卡记录 {id, goalId, date, value, note, source, createdAt}
      tasks: [],            // 四象限任务
      poms: [],             // 番茄钟记录 {date, duration, count}
      pet: {               // 虚拟宠物
        happy: 80,          // 开心度 0-100
        fed: 70,            // 饱腹 0-100
        lastPlay: null,
        lastFeed: null
      },
      settings: {
        apiProvider: 'zhipu',       // 供应商 id
        apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        apiModel: 'glm-4.7-flash',
        apiKey: '',                 // 混淆存储
        useProxy: true,             // 走本地代理(API保护)
        makeupLeft: 3,              // 当月补卡次数
        makeupMonth: '',
        remindTime: '21:00',
        duckChat: true,
        linkedTags: {}
      },
      createdAt: new Date().toISOString()
    };
    this._save(fresh);
    return fresh;
  },

  save() {
    if (window.__data) this._save(window.__data);
  },

  /* ---- 工具 ---- */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  dateStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return this.dateStr(d);
  },

  daysBetween(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  },

  /* ---- API Key 混淆存储（防意外泄露，非加密） ---- */
  getApiKey() {
    const raw = localStorage.getItem('xgb_apikey');
    if (!raw) return '';
    try {
      const decoded = atob(raw);
      if (decoded.startsWith('ak:')) return decoded.slice(3);
      return decoded;
    } catch { return ''; }
  },
  setApiKey(key) {
    localStorage.setItem('xgb_apikey', btoa('ak:' + key));
  },
  removeApiKey() {
    localStorage.removeItem('xgb_apikey');
  },
  maskKey(key) {
    if (!key) return '';
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.slice(0, 4) + '*'.repeat(Math.min(key.length - 8, 12)) + key.slice(-4);
  },

  /* ---- 打卡 ---- */
  getCheckinsForDate(goalId, date) {
    return (window.__data.checkins || []).filter(c => c.goalId === goalId && c.date === date);
  },
  hasCheckin(goalId, date) {
    return this.getCheckinsForDate(goalId, date).length > 0;
  },
  addCheckin(goalId, date, value, note, source) {
    const d = window.__data;
    d.checkins.push({
      id: this.uid(),
      goalId, date,
      value: value || null,
      note: note || '',
      source: source || 'manual',
      createdAt: new Date().toISOString()
    });
    this.save();
    return d.checkins[d.checkins.length - 1];
  },
  removeCheckin(id) {
    const d = window.__data;
    d.checkins = d.checkins.filter(c => c.id !== id);
    this.save();
  },

  /* ---- 目标 ---- */
  getGoal(id) {
    return window.__data.goals.find(g => g.id === id);
  },
  activeGoals() {
    return window.__data.goals.filter(g => g.status === 'active');
  },

  /* ---- 补卡次数（每月3次） ---- */
  useMakeup() {
    const s = window.__data.settings;
    const now = new Date();
    const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    if (s.makeupMonth !== month) {
      s.makeupMonth = month;
      s.makeupLeft = 3;
    }
    if (s.makeupLeft <= 0) return false;
    s.makeupLeft--;
    this.save();
    return true;
  }
};

/* 启动时初始化数据 */
window.__data = Store.getData();
