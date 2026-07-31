/* ============================================================
 * 「小目标」主应用
 * 纯前端 · 零依赖 · 本地存储 · PWA
 * 核心：目标管理 / 打卡 / 虚拟宠物 / 四象限 / 番茄钟 / 统计 / AI拆解
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 工具 ---------- */
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = () => window.__data;

  /* ---------- UI 工具 ---------- */
  const UI = {
    toast(msg, ms) {
      const t = $('#toast');
      t.textContent = msg;
      t.classList.remove('hidden');
      clearTimeout(this._tt);
      this._tt = setTimeout(() => t.classList.add('hidden'), ms || 2200);
    },
    openModal(html) {
      $('#modal-content').innerHTML = '<div class="modal-wrap">' + html + '</div>';
      $('#modal-overlay').classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    },
    closeModal() {
      $('#modal-overlay').classList.add('hidden');
      document.body.style.overflow = '';
    },
    confirmModal(title, msg, okText, cb) {
      this.openModal(
        '<h3 class="modal-title">' + esc(title) + '</h3>' +
        '<p style="text-align:center;font-size:14px;color:var(--ink-2);margin-bottom:20px">' + msg + '</p>' +
        '<div class="step-btns">' +
        '<button class="btn btn-ghost" style="flex:1" id="m-cancel">取消</button>' +
        '<button class="btn btn-danger" style="flex:1" id="m-ok">' + esc(okText || '确定') + '</button>' +
        '</div>'
      );
      $('#m-cancel').onclick = () => this.closeModal();
      $('#m-ok').onclick = () => { this.closeModal(); cb && cb(); };
    },
    celebrate(emoji, title, sub) {
      const ov = document.createElement('div');
      ov.className = 'celebrate-overlay';
      ov.innerHTML = '<div class="celebrate-box">' +
        '<div class="celebrate-emoji">' + emoji + '</div>' +
        '<div class="celebrate-title">' + esc(title) + '</div>' +
        '<div class="celebrate-sub">' + esc(sub || '') + '</div>' +
        '<button class="btn" style="min-width:140px">继续加油！</button>' +
        '</div>';
      document.body.appendChild(ov);
      $('.btn', ov).onclick = () => ov.remove();
      ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    },
    duckPop(msg) {
      const d = $('#duck-pop');
      d.innerHTML = '<span class="dp-emoji">🐤</span><span>' + esc(msg) + '</span>';
      d.classList.remove('hidden');
      clearTimeout(this._dp);
      this._dp = setTimeout(() => d.classList.add('hidden'), 3600);
    }
  };

  /* ---------- 虚拟宠物系统 ---------- */
  const Pet = {
    /* 计算当前等级（取最高解锁） */
    level() {
      const data = S();
      const total = data.checkins.length;
      let best = 'duck';
      const stats = Stats.all();
      if (stats.longestStreak >= 30 || stats.curStreak >= 30) best = 'fire';
      else if (stats.completedGoals >= 1) best = 'crown';
      else if (stats.longestStreak >= 7 || stats.curStreak >= 7) best = 'star';
      if (total >= 100) best = 'sakura';
      return best;
    },
    levelIndex() {
      return DUCK.levels.findIndex(l => l.id === this.level());
    },
    /* 数值随时间轻微自然回落（很慢，绝不惩罚） */
    tick() {
      const p = S().pet;
      const now = Date.now();
      if (p.lastPlay) {
        const days = (now - p.lastPlay) / 86400000;
        if (days > 0.5) p.happy = Math.max(40, p.happy - Math.floor(days * 2));
      }
      if (p.lastFeed) {
        const days = (now - p.lastFeed) / 86400000;
        if (days > 0.5) p.fed = Math.max(40, p.fed - Math.floor(days * 2));
      }
      Store.save();
    },
    /* 摸摸：+开心 */
    pet() {
      const p = S().pet;
      p.happy = Math.min(100, p.happy + 6);
      p.lastPlay = Date.now();
      Store.save();
      const msgs = ['好舒服呀~再摸摸！', '咕咕咕~好开心！', '最喜欢你摸我啦！', '嘿嘿，这里也要摸！'];
      UI.duckPop(msgs[Math.floor(Math.random() * msgs.length)]);
      const svg = $('.pet-stage .duck-svg');
      if (svg) {
        svg.classList.add('duck-pet');
        setTimeout(() => svg.classList.remove('duck-pet'), 500);
        // 换成 love 表情 1.2 秒
        const stage = $('.pet-stage .duck-big');
        if (stage) {
          const lv = this.level();
          stage.innerHTML = DuckArt.render(lv, 'love', 140);
        }
        setTimeout(() => {
          if (stage) stage.innerHTML = DuckArt.render(this.level(), 'happy', 140);
        }, 1300);
      }
      this.refreshStatus();
    },
    /* 喂食 */
    feed() {
      const p = S().pet;
      p.fed = Math.min(100, p.fed + 9);
      p.lastFeed = Date.now();
      Store.save();
      const foods = ['嗝~吃饱啦！', '好吃！还有吗？', '咕咕咕，谢谢投喂！', '最喜欢吃这个啦！'];
      UI.duckPop(foods[Math.floor(Math.random() * foods.length)]);
      const stage = $('.pet-stage .duck-big');
      if (stage) {
        stage.innerHTML = DuckArt.render(this.level(), 'eat', 140);
        setTimeout(() => { stage.innerHTML = DuckArt.render(this.level(), 'happy', 140); }, 1500);
      }
      this.refreshStatus();
    },
    /* 随机说话 */
    randomSay() {
      const data = S();
      const today = Store.today();
      const pending = Stats.pendingToday();
      let msg;
      if (pending.length === 0) msg = DUCK.pick(DUCK.noPending);
      else if (Stats.curStreak >= 3) msg = '已经连续打卡 ' + Stats.curStreak + ' 天啦，太棒了！';
      else msg = DUCK.pick(DUCK.idleMsgs);
      UI.duckPop(msg);
    },
    refreshStatus() {
      const p = S().pet;
      const hf = $('.ps-fill.happy-f');
      const ff = $('.ps-fill.fed-f');
      if (hf) hf.style.width = p.happy + '%';
      if (ff) ff.style.width = p.fed + '%';
      const hn = $('.ps-happy-n');
      const fn = $('.ps-fed-n');
      if (hn) hn.textContent = p.happy;
      if (fn) fn.textContent = p.fed;
    },
    /* 打卡后的鸭鸭反应 */
    onCheckin(streak, milestone) {
      let msg;
      if (milestone) msg = DUCK.pick(DUCK.milestoneMsgs) + ' 里程碑达成！';
      else msg = DUCK.pick(DUCK.greetings, { day: streak });
      UI.duckPop('🐤 ' + msg);
    },
    onReturn() {
      if (Math.random() < 0.6) UI.duckPop('🐤 ' + DUCK.pick(DUCK.returnMsgs));
    }
  };

  /* ---------- 统计引擎 ---------- */
  const Stats = {
    /* 某目标某天的打卡 */
    checkins(goalId, date) { return Store.getCheckinsForDate(goalId, date); },

    /* 当前连续打卡（按"是否有待打卡目标已打卡"粗略计，这里按打卡总天数连续） */
    curStreak() {
      const dates = new Set(S().checkins.map(c => c.date));
      let n = 0;
      let d = new Date();
      while (true) {
        const ds = Store.dateStr(d);
        if (dates.has(ds)) { n++; d.setDate(d.getDate() - 1); }
        else break;
      }
      return n;
    },
    longestStreak() {
      const dates = Array.from(new Set(S().checkins.map(c => c.date))).sort();
      let max = 0, cur = 0, prev = null;
      dates.forEach(ds => {
        if (prev && Store.daysBetween(prev, ds) === 1) cur++;
        else cur = 1;
        max = Math.max(max, cur);
        prev = ds;
      });
      return max;
    },
    /* 今天待打卡目标 */
    pendingToday() {
      const today = Store.today();
      return S().goals.filter(g => g.status === 'active' && this.dueToday(g) && !Store.hasCheckin(g.id, today));
    },
    /* 该目标今天是否应打卡 */
    dueToday(goal) {
      const today = Store.today();
      if (goal.type === 'milestone') return false; // 里程碑型不每日打卡
      if (today < goal.startDate || today > goal.endDate) return false;
      if (goal.checkInFrequency === 'daily') return true;
      if (goal.checkInFrequency === 'workday') {
        const wd = new Date(today + 'T00:00:00').getDay();
        return wd >= 1 && wd <= 5;
      }
      // custom: [1,3,5] 每周几
      if (goal.customFrequency && goal.customFrequency.length) {
        const wd = new Date(today + 'T00:00:00').getDay();
        return goal.customFrequency.indexOf(wd) !== -1;
      }
      return true;
    },
    /* 目标进度 */
    progress(goal) {
      if (goal.type === 'quantitative') {
        const cur = goal.currentValue || 0;
        return { cur, target: goal.targetValue, pct: goal.targetValue ? Math.min(100, cur / goal.targetValue * 100) : 0 };
      }
      if (goal.type === 'habit') {
        const days = goal.startDate ? Math.max(0, Store.daysBetween(goal.startDate, Store.today()) + 1) : 1;
        const done = S().checkins.filter(c => c.goalId === goal.id).length;
        return { cur: done, target: days, pct: Math.min(100, done / Math.max(1, days) * 100) };
      }
      // milestone
      const ms = goal.milestones || [];
      const done = ms.filter(m => m.status === 'achieved').length;
      return { cur: done, target: ms.length, pct: ms.length ? Math.min(100, done / ms.length * 100) : 0 };
    },
    /* 全局统计 */
    all() {
      const data = S();
      const goals = data.goals;
      return {
        active: goals.filter(g => g.status === 'active').length,
        completed: goals.filter(g => g.status === 'completed').length,
        totalCheckins: data.checkins.length,
        curStreak: this.curStreak(),
        longestStreak: this.longestStreak(),
        completedGoals: goals.filter(g => g.status === 'completed').length,
        total: data.checkins.length
      };
    },
    /* 本月完成率：本月应打卡次数中实际打卡占比 */
    monthRate() {
      const now = new Date();
      const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      const goals = S().goals.filter(g => g.status === 'active');
      let due = 0, done = 0;
      goals.forEach(g => {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const ds = ym + '-' + String(d).padStart(2, '0');
          if (ds > Store.today()) break;
          if (this.dueToday({ ...g, startDate: g.startDate < ds ? g.startDate : ds })) {
            due++;
            if (Store.hasCheckin(g.id, ds)) done++;
          }
        }
      });
      return due ? Math.round(done / due * 100) : 100;
    },
    /* 本周完成率（周一起至今） */
    weekRate() {
      const now = new Date();
      const dow = now.getDay(); // 0=周日
      const mondayOffset = dow === 0 ? 6 : dow - 1;
      const monday = Store.addDays(Store.today(), -mondayOffset);
      const goals = S().goals.filter(g => g.status === 'active');
      let due = 0, done = 0;
      for (let i = 0; i <= mondayOffset; i++) {
        const ds = Store.addDays(monday, i);
        goals.forEach(g => {
          if (this.dueToday({ ...g, startDate: g.startDate < ds ? g.startDate : ds, endDate: g.endDate > ds ? g.endDate : ds })) {
            due++;
            if (Store.hasCheckin(g.id, ds)) done++;
          }
        });
      }
      return due ? Math.round(done / due * 100) : 100;
    }
  };

  /* ---------- 目标操作 ---------- */
  const Goals = {
    create(data) {
      const goal = {
        id: Store.uid(),
        type: data.type,
        name: data.name,
        description: data.description || '',
        category: data.category || '生活',
        startDate: data.startDate,
        endDate: data.endDate,
        checkInFrequency: data.checkInFrequency || 'daily',
        customFrequency: data.customFrequency || null,
        targetValue: data.targetValue || null,
        unit: data.unit || '',
        currentValue: 0,
        milestones: (data.milestones || []).map(m => ({
          id: Store.uid(),
          title: m.title,
          targetDate: m.targetDate || null,
          days: m.days || null,
          status: 'pending',
          achievedDate: null
        })),
        status: 'active',
        createdAt: new Date().toISOString()
      };
      S().goals.push(goal);
      Store.save();
      return goal;
    },
    update(id, patch) {
      const g = Store.getGoal(id);
      if (!g) return;
      Object.assign(g, patch);
      Store.save();
    },
    remove(id) {
      const data = S();
      data.goals = data.goals.filter(g => g.id !== id);
      data.checkins = data.checkins.filter(c => c.goalId !== id);
      Store.save();
    },
    setStatus(id, status) {
      this.update(id, { status });
    },
    /* 打卡 */
    checkin(goal, value, note) {
      const today = Store.today();
      const addVal = value != null ? Number(value) : 1;
      if (goal.type === 'quantitative') {
        goal.currentValue = (goal.currentValue || 0) + addVal;
        this.update(goal.id, { currentValue: goal.currentValue });
        Store.addCheckin(goal.id, today, addVal, note, 'manual');
      } else {
        Store.addCheckin(goal.id, today, null, note, 'manual');
      }
      // 里程碑检查
      const achievedMs = this.checkMilestones(goal);
      return achievedMs;
    },
    checkMilestones(goal) {
      let achieved = null;
      if (goal.type === 'quantitative' && goal.milestones && goal.milestones.length) {
        const cur = goal.currentValue || 0;
        goal.milestones.forEach(m => {
          if (m.status === 'pending' && m.targetValue != null && cur >= m.targetValue) {
            m.status = 'achieved';
            m.achievedDate = Store.today();
            achieved = m;
          }
        });
        this.update(goal.id, { milestones: goal.milestones });
      }
      if (goal.type === 'milestone') {
        const pending = (goal.milestones || []).find(m => m.status === 'pending');
        if (pending) {
          pending.status = 'achieved';
          pending.achievedDate = Store.today();
          achieved = pending;
          this.update(goal.id, { milestones: goal.milestones });
        }
      }
      // 全部完成 → 目标完成
      if (goal.type === 'milestone' && (goal.milestones || []).every(m => m.status === 'achieved')) {
        this.setStatus(goal.id, 'completed');
      }
      if (goal.type === 'quantitative' && goal.targetValue && (goal.currentValue || 0) >= goal.targetValue) {
        this.setStatus(goal.id, 'completed');
      }
      return achieved;
    },
    /* 补卡 */
    makeup(goal, date) {
      if (!Store.useMakeup()) return false;
      Store.addCheckin(goal.id, date, null, '补卡', 'makeup');
      return true;
    }
  };

  /* ============================================================
   * 页面渲染
   * ============================================================ */
  const Page = {};

  /* ---------- 今天页 ---------- */
  Page.home = function () {
    const data = S();
    const today = Store.today();
    const pending = Stats.pendingToday();
    const activeGoals = data.goals.filter(g => g.status === 'active');
    const doneToday = activeGoals.filter(g => Store.hasCheckin(g.id, today)).length;
    const hour = new Date().getHours();
    const greet = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

    let html = '';
    html += '<div class="pet-stage">';
    html += '<div class="duck-big" id="duck-big" title="点我说话">' + DuckArt.render(Pet.level(), 'happy', 140) + '</div>';
    html += '<div class="pet-name">' + esc(DUCK.levels[Pet.levelIndex()].name) + '</div>';
    html += '<div class="pet-status">';
    html += '<span class="ps-item">😊 <span class="ps-bar"><span class="ps-fill happy-f" style="width:' + data.pet.happy + '%"></span></span> <span class="ps-happy-n">' + data.pet.happy + '</span></span>';
    html += '<span class="ps-item">🍎 <span class="ps-bar"><span class="ps-fill fed-f" style="width:' + data.pet.fed + '%"></span></span> <span class="ps-fed-n">' + data.pet.fed + '</span></span>';
    html += '</div>';
    html += '<div class="pet-actions">';
    html += '<button class="pet-action-btn" id="pet-pet">' + icon('heart') + ' 摸摸</button>';
    html += '<button class="pet-action-btn" id="pet-feed">' + icon('coffee') + ' 喂食</button>';
    html += '<button class="pet-action-btn" id="pet-say">' + icon('zap') + ' 聊天</button>';
    html += '</div>';
    html += '</div>';

    html += '<div class="pet-speech" id="pet-speech">' + esc(greet + '，' + (data.goals.length ? '今天也要加油哦！' : '先立一个小目标吧！')) + '</div>';

    // 每周复盘（周日）
    if (new Date().getDay() === 0) {
      const weekRate = Stats.weekRate();
      html += '<div class="card" style="border-left:4px solid var(--primary);cursor:pointer" id="review-card">';
      html += '<div class="card-title">' + icon('trending') + ' 周日复盘</div>';
      html += '<p style="font-size:13px;color:var(--ink-2)">本周完成率 <b style="color:var(--primary-dark);font-size:17px">' + weekRate + '%</b> · 当前连续 ' + Stats.curStreak() + ' 天 🔥</p>';
      html += '<p style="font-size:12px;color:var(--ink-3);margin-top:6px">点开看看这周的你有多棒，顺便规划下周 →</p>';
      html += '</div>';
    }

    // 今日待打卡
    html += '<div class="section-title">今日待打卡 <span style="font-size:12px;color:var(--ink-3)">(' + pending.length + ')</span></div>';
    if (pending.length) {
      html += '<div class="today-list">';
      pending.forEach(g => {
        html += '<div class="today-item" data-gid="' + g.id + '">';
        html += '<span class="today-check" data-check="' + g.id + '" title="打卡">' + icon('check') + '</span>';
        html += '<span class="ti-name">' + esc(g.name) + '<small>' + esc(Goals.typeName(g.type)) + (g.type === 'quantitative' ? ' · ' + (g.currentValue || 0) + '/' + g.targetValue + g.unit : '') + '</small></span>';
        html += '</div>';
      });
      html += '</div>';
      html += '<button class="btn btn-olive btn-block" id="batch-checkin" style="margin-bottom:6px">' + icon('zap') + ' 一键全部打卡</button>';
    } else if (activeGoals.length) {
      html += '<div class="card" style="text-align:center;color:var(--ink-2);font-size:13px;padding:18px">' + icon('check', '') + ' 今天的任务都完成啦！</div>';
    }

    // 进行中的目标
    const show = activeGoals;
    if (show.length) {
      html += '<div class="section-title">进行中的目标 (' + show.length + ')</div>';
      show.forEach(g => { html += this.goalCard(g, today); });
    }

    // 空状态
    if (!data.goals.length) {
      html += '<div class="empty-state">';
      html += '<div class="es-emoji">🎯</div>';
      html += '<div class="es-title">还没有目标</div>';
      html += '<div class="es-desc">立一个目标，小胖鸭陪你一起完成</div>';
      html += '<button class="btn" style="margin-top:16px" id="empty-new">' + icon('plus') + ' 新建目标</button>';
      html += '</div>';
    }

    $('#main-content').innerHTML = html;

    // 事件绑定
    const big = $('#duck-big');
    if (big) big.onclick = () => Pet.randomSay();
    $('#pet-pet').onclick = () => Pet.pet();
    $('#pet-feed').onclick = () => Pet.feed();
    $('#pet-say').onclick = () => Pet.randomSay();

    $$('.today-check').forEach(el => {
      el.onclick = () => {
        const g = Store.getGoal(el.dataset.check);
        if (!g) return;
        const ms = Goals.checkin(g, null, '');
        Pet.onCheckin(Stats.curStreak(), !!ms);
        if (ms) UI.celebrate('🎉', '里程碑达成！', '「' + g.name + '」· ' + ms.title);
        this.render();
      };
    });
    const batch = $('#batch-checkin');
    if (batch) batch.onclick = () => {
      pending.forEach(g => Goals.checkin(g, null, ''));
      Pet.onCheckin(Stats.curStreak(), false);
      UI.duckPop('🐤 ' + DUCK.pick(DUCK.noPending));
      this.render();
    };
    const emptyNew = $('#empty-new');
    if (emptyNew) emptyNew.onclick = () => GoalWizard.open();
    const reviewCard = $('#review-card');
    if (reviewCard) reviewCard.onclick = () => this.weekReview();
  };

  /* 周日复盘弹窗 */
  Page.weekReview = function () {
    const rate = Stats.weekRate();
    const st = Stats.all();
    let html = '<h3 class="modal-title">本周复盘</h3>';
    html += '<div class="stats-grid">';
    html += '<div class="stat-box"><div class="stat-num">' + rate + '%</div><div class="stat-label">本周完成率</div></div>';
    html += '<div class="stat-box"><div class="stat-num">' + st.curStreak + '</div><div class="stat-label">当前连续 🔥</div></div>';
    html += '<div class="stat-box"><div class="stat-num">' + st.totalCheckins + '</div><div class="stat-label">总打卡次数</div></div>';
    html += '<div class="stat-box"><div class="stat-num">' + st.longestStreak + '</div><div class="stat-label">最长连续</div></div>';
    html += '</div>';
    const msg = rate >= 80 ? '这周超棒！下周继续保持！' : rate >= 50 ? '这周不错，下周可以更稳一点！' : '没关系，下周重新开始，小胖鸭陪你！';
    html += '<div class="duck-line"><span class="dl-e">🐤</span><span>' + msg + '</span></div>';
    html += '<div class="form-group" style="margin-top:14px"><label class="form-label">下周的小目标（可选）</label><textarea class="form-textarea" id="wk-plan" placeholder="写下下周想完成的一件事..."></textarea></div>';
    html += '<button class="btn btn-block" id="wk-save">写下并关闭</button>';
    UI.openModal(html);
    const prev = S().settings.weekPlan;
    if (prev) $('#wk-plan').value = prev;
    $('#wk-save').onclick = () => {
      S().settings.weekPlan = $('#wk-plan').value.trim();
      Store.save();
      UI.closeModal();
      UI.toast('复盘完成，下周加油 🐤');
    };
  };

  /* 目标卡片 */
  Page.goalCard = function (g, today) {
    const p = Stats.progress(g);
    const doneToday = Store.hasCheckin(g.id, today);
    let html = '<div class="goal-card type-' + g.type + (g.status === 'completed' ? ' done-goal' : '') + '" data-gid="' + g.id + '">';
    html += '<div class="goal-head"><div>';
    html += '<div class="goal-name">' + esc(g.name) + '</div>';
    html += '<div class="goal-cat">' + esc(g.category) + ' · ' + Goals.typeName(g.type) + (g.status === 'completed' ? ' · 已完成 ✅' : '') + '</div>';
    html += '</div>';
    html += '<button class="btn btn-ghost btn-sm" data-detail="' + g.id + '">' + icon('target') + ' 详情</button>';
    html += '</div>';

    // 进度
    html += '<div class="goal-progress"><div class="progress-bar"><div class="progress-fill" style="width:' + p.pct + '%"></div></div>';
    html += '<div class="progress-text"><span>' + esc(this.progressLabel(g, p)) + '</span><span>' + Math.round(p.pct) + '%</span></div></div>';

    // 里程碑型显示节点
    if (g.type === 'milestone' && g.milestones && g.milestones.length) {
      html += '<div class="milestones">';
      g.milestones.forEach(m => {
        const done = m.status === 'achieved';
        html += '<div class="milestone-item">' +
          '<span class="ms-dot ' + (done ? 'achieved' : '') + '">' + (done ? icon('check') : '') + '</span>' +
          '<span class="ms-title ' + (done ? 'done-ms' : '') + '">' + esc(m.title) + '</span>' +
          '<span class="ms-date">' + (done ? '已完成' : (m.targetDate || '')) + '</span></div>';
      });
      html += '</div>';
    }

    // 操作
    html += '<div class="goal-actions">';
    if (g.status === 'active') {
      if (g.type === 'milestone') {
        const next = (g.milestones || []).find(m => m.status === 'pending');
        if (next) {
          html += '<button class="btn btn-sm" data-ms="' + g.id + '">' + icon('check') + ' 完成「' + esc(next.title.length > 8 ? next.title.slice(0, 8) + '…' : next.title) + '」</button>';
        }
      } else if (doneToday) {
        html += '<button class="btn btn-sm btn-ghost" data-uncheck="' + g.id + '">已打卡 ✓</button>';
      } else {
        html += '<button class="btn btn-sm" data-check="' + g.id + '">' + icon('check') + ' 打卡</button>';
      }
    } else if (g.status === 'completed') {
      html += '<span style="font-size:13px;color:var(--olive);font-weight:600">🎉 已完成</span>';
    }
    html += '</div>';
    html += '</div>';
    return html;
  };

  Page.progressLabel = function (g, p) {
    if (g.type === 'quantitative') return (p.cur || 0) + '/' + p.target + (g.unit || '');
    if (g.type === 'habit') return '已坚持 ' + p.cur + ' 天 / 周期 ' + p.target + ' 天';
    return p.cur + '/' + p.target + ' 个里程碑';
  };

  /* ---------- 日历页 ---------- */
  Page.calendar = function () {
    const data = S();
    let curYear = this.calYear || new Date().getFullYear();
    let curMonth = this.calMonth || new Date().getMonth();
    const today = Store.today();
    const goals = data.goals;

    let html = '<div class="card">';
    html += '<div class="cal-header"><button class="cal-nav" id="cal-prev">‹</button>';
    html += '<span class="cal-month">' + curYear + '年 ' + (curMonth + 1) + '月</span>';
    html += '<button class="cal-nav" id="cal-next">›</button></div>';
    html += '<div class="cal-week"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>';
    html += '<div class="cal-days">';

    const first = new Date(curYear, curMonth, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const prevDays = new Date(curYear, curMonth, 0).getDate();

    // 补空格
    for (let i = 0; i < startDow; i++) {
      const pd = prevDays - startDow + i + 1;
      const pds = (curMonth === 0 ? curYear - 1 : curYear) + '-' + String(curMonth === 0 ? 12 : curMonth).padStart(2, '0') + '-' + String(pd).padStart(2, '0');
      html += '<div class="cal-day empty other-month" data-date="' + pds + '">' + pd + '</div>';
    }
    // 当月
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = curYear + '-' + String(curMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const anyCheckin = data.checkins.some(c => c.date === ds);
      const cls = ['cal-day'];
      if (ds === today) cls.push('today');
      if (anyCheckin) {
        // 是否全是补卡
        const allMakeup = data.checkins.filter(c => c.date === ds).every(c => c.source === 'makeup');
        cls.push(allMakeup ? 'makeup' : 'done');
      }
      if (ds < today) cls.push('past');
      html += '<div class="' + cls.join(' ') + '" data-date="' + ds + '">' + d + (anyCheckin ? '<span class="cal-dot"></span>' : '') + '</div>';
    }
    html += '</div>';
    html += '<div class="cal-legend"><span><i style="background:var(--done)"></i>已打卡</span><span><i style="background:var(--warn)"></i>补卡</span><span><i style="background:#FBF8F0;border:1px solid var(--line)"></i>未打卡</span></div>';
    html += '</div>';

    // 今日打卡记录
    html += '<div class="section-title">今日打卡记录</div>';
    const todayRecords = data.checkins.filter(c => c.date === today);
    if (todayRecords.length) {
      html += '<div class="card cal-records">';
      todayRecords.forEach(r => {
        const g = Store.getGoal(r.goalId);
        if (!g) return;
        html += '<div class="record-item"><span class="record-date">' + (r.source === 'makeup' ? '补卡' : '✅') + '</span>' +
          '<span class="record-note">' + esc(g.name) + (r.value ? ' +' + r.value + (g.unit || '') : '') + (r.note ? ' · ' + esc(r.note) : '') + '</span>' +
          '<button class="q-del" data-del="' + r.id + '" style="border:none;background:none;color:var(--ink-3);cursor:pointer">✕</button></div>';
      });
      html += '</div>';
    } else {
      html += '<div class="card" style="text-align:center;color:var(--ink-3);font-size:13px;padding:20px">今天还没有打卡记录</div>';
    }

    // 全部目标列表（日历可以看单个目标的日历）
    if (goals.length) {
      html += '<div class="section-title">选择目标查看日历</div>';
      html += '<div class="card"><div class="form-group" style="margin-bottom:0">';
      html += '<select class="form-select" id="goal-filter">';
      html += '<option value="">全部目标</option>';
      goals.forEach(g => { html += '<option value="' + g.id + '">' + esc(g.name) + '</option>'; });
      html += '</select></div></div>';
    }

    $('#main-content').innerHTML = html;

    $('#cal-prev').onclick = () => {
      this.calMonth = curMonth === 0 ? 11 : curMonth - 1;
      this.calYear = curMonth === 0 ? curYear - 1 : curYear;
      this.calendar();
    };
    $('#cal-next').onclick = () => {
      this.calMonth = curMonth === 11 ? 0 : curMonth + 1;
      this.calYear = curMonth === 11 ? curYear + 1 : curYear;
      this.calendar();
    };
    // 点击日期 → 查看当天详情（长按补卡在这里简化为弹窗选择）
    $$('.cal-day[data-date]').forEach(el => {
      el.onclick = () => {
        const ds = el.dataset.date;
        if (!el.classList.contains('empty')) this.dayDetail(ds);
      };
    });
    $$('.q-del').forEach(el => {
      el.onclick = () => { Store.removeCheckin(el.dataset.del); this.calendar(); };
    });
    const filter = $('#goal-filter');
    if (filter) filter.onchange = () => {
      const gid = filter.value;
      if (!gid) { this.calendar(); return; }
      // 显示该目标的当月日历
      this.goalCalendar(gid);
    };
  };

  /* 单目标日历 */
  Page.goalCalendar = function (gid) {
    const g = Store.getGoal(gid);
    if (!g) return this.calendar();
    const today = Store.today();
    let html = '<div class="card">';
    html += '<div class="section-title" style="margin-top:0">📅 ' + esc(g.name) + '</div>';
    html += '<div class="cal-days" style="grid-template-columns:repeat(7,1fr)">';
    // 显示开始到今天的日历（最多90格）
    const start = g.startDate < Store.addDays(today, -89) ? Store.addDays(today, -89) : g.startDate;
    let d = new Date(start + 'T00:00:00');
    const end = new Date(today + 'T00:00:00');
    while (d <= end) {
      const ds = Store.dateStr(d);
      const done = Store.hasCheckin(g.id, ds);
      const cls = 'cal-day' + (ds === today ? ' today' : '') + (done ? ' done' : '');
      html += '<div class="' + cls + '" style="cursor:default">' + d.getDate() + '</div>';
      d.setDate(d.getDate() + 1);
    }
    html += '</div></div>';
    html += '<div class="card"><div class="section-title" style="margin-top:0">本月打卡率</div>';
    const p = Stats.progress(g);
    html += '<div class="progress-bar"><div class="progress-fill" style="width:' + p.pct + '%"></div></div>';
    html += '<div class="progress-text"><span>' + this.progressLabel(g, p) + '</span><span>' + Math.round(p.pct) + '%</span></div>';
    html += '</div>';
    html += '<button class="btn btn-ghost btn-block" id="back-cal">' + icon('chevronLeft') + ' 返回全部日历</button>';
    $('#main-content').innerHTML = html;
    $('#back-cal').onclick = () => this.calendar();
  };

  /* 某天详情（含补卡入口） */
  Page.dayDetail = function (ds) {
    const data = S();
    const recs = data.checkins.filter(c => c.date === ds);
    const today = Store.today();
    const canMakeup = ds < today && !recs.length;
    let html = '<h3 class="modal-title">' + ds + '</h3>';
    if (recs.length) {
      html += '<div class="card" style="margin-bottom:12px">';
      recs.forEach(r => {
        const g = Store.getGoal(r.goalId);
        if (!g) return;
        html += '<div class="record-item"><span class="record-date">' + (r.source === 'makeup' ? '补卡' : '✅') + '</span>' +
          '<span class="record-note">' + esc(g.name) + (r.value ? ' +' + r.value + (g.unit || '') : '') + (r.note ? ' · ' + esc(r.note) : '') + '</span></div>';
      });
      html += '</div>';
    } else {
      html += '<p style="text-align:center;color:var(--ink-3);font-size:13px;margin-bottom:16px">当天无打卡记录</p>';
    }
    // 补卡入口（仅过去日期）
    if (canMakeup) {
      html += '<div class="form-group"><label class="form-label">选择要补卡的目标</label>';
      html += '<select class="form-select" id="makeup-goal">';
      data.goals.filter(g => g.status === 'active' && g.type !== 'milestone').forEach(g => {
        html += '<option value="' + g.id + '">' + esc(g.name) + '</option>';
      });
      html += '</select></div>';
      const s = S().settings;
      html += '<p style="font-size:12px;color:var(--ink-2);margin-bottom:14px">本月剩余补卡次数：' + s.makeupLeft + ' / 3</p>';
      html += '<div class="step-btns">';
      html += '<button class="btn btn-ghost" style="flex:1" id="dl-cancel">取消</button>';
      html += '<button class="btn btn-olive" style="flex:1" id="dl-makeup">' + icon('refresh') + ' 补卡</button>';
      html += '</div>';
    } else {
      html += '<button class="btn btn-block" id="dl-close">关闭</button>';
    }
    UI.openModal(html);
    $('#dl-cancel') && ($('#dl-cancel').onclick = () => UI.closeModal());
    $('#dl-close') && ($('#dl-close').onclick = () => UI.closeModal());
    const mk = $('#dl-makeup');
    if (mk) mk.onclick = () => {
      const gid = $('#makeup-goal').value;
      if (!gid) { UI.toast('请选择目标'); return; }
      const g = Store.getGoal(gid);
      if (Goals.makeup(g, ds)) {
        UI.toast('补卡成功 🐤');
        UI.closeModal();
        this.calendar();
      } else {
        UI.toast('本月补卡次数已用完');
      }
    };
  };

  /* ---------- 四象限 ---------- */
  Page.quadrant = function () {
    const data = S();
    const quads = [
      { key: 'q1', label: '紧急且重要', cls: 'q1' },
      { key: 'q2', label: '重要不紧急', cls: 'q2' },
      { key: 'q3', label: '紧急不重要', cls: 'q3' },
      { key: 'q4', label: '不重要不紧急', cls: 'q4' }
    ];
    let html = '<div class="quad-grid">';
    quads.forEach(q => {
      const tasks = data.tasks.filter(t => t.quadrant === q.key);
      html += '<div class="quad-cell ' + q.cls + '"><div class="quad-label">' + q.label + '</div>';
      tasks.forEach(t => {
        html += '<div class="quad-task ' + (t.status === 'done' ? 'done-t' : '') + '" data-task="' + t.id + '">' +
          '<span>' + esc(t.title) + '</span><button class="q-del" data-del="' + t.id + '">✕</button></div>';
      });
      html += '<button class="quad-add" data-add="' + q.key + '">+ 添加</button>';
      html += '</div>';
    });
    html += '</div>';
    $('#main-content').innerHTML = html;

    $$('.quad-task').forEach(el => {
      el.onclick = e => {
        if (e.target.classList.contains('q-del')) return;
        const t = data.tasks.find(x => x.id === el.dataset.task);
        if (!t) return;
        // 操作菜单：完成/恢复 + 移动到其他象限 + 删除
        const labels = { q1: '紧急且重要', q2: '重要不紧急', q3: '紧急不重要', q4: '不重要不紧急' };
        let h = '<h3 class="modal-title">' + esc(t.title) + '</h3>';
        h += '<div class="form-label">移动到象限</div><div class="type-select">';
        Object.keys(labels).forEach(k => {
          h += '<div class="type-option ' + (t.quadrant === k ? 'selected' : '') + '" data-q="' + k + '">' +
            '<div class="type-name" style="font-size:12px;margin-top:0">' + labels[k] + '</div></div>';
        });
        h += '</div>';
        h += '<div class="step-btns">';
        h += '<button class="btn btn-ghost" style="flex:1" id="qt-del">' + icon('trash') + ' 删除</button>';
        if (t.status === 'done') h += '<button class="btn btn-olive" style="flex:1" id="qt-undo">恢复</button>';
        else h += '<button class="btn" style="flex:1" id="qt-done">' + icon('check') + ' 完成</button>';
        h += '</div>';
        UI.openModal(h);
        $$('[data-q]').forEach(x => {
          x.onclick = () => {
            t.quadrant = x.dataset.q;
            Store.save();
            UI.closeModal();
            this.quadrant();
          };
        });
        $('#qt-del').onclick = () => {
          data.tasks = data.tasks.filter(x => x.id !== t.id);
          Store.save();
          UI.closeModal();
          this.quadrant();
        };
        $('#qt-done') && ($('#qt-done').onclick = () => {
          t.status = 'done';
          Store.save();
          UI.closeModal();
          this.quadrant();
        });
        $('#qt-undo') && ($('#qt-undo').onclick = () => {
          t.status = 'todo';
          Store.save();
          UI.closeModal();
          this.quadrant();
        });
      };
    });
    $$('.q-del').forEach(el => {
      el.onclick = e => {
        e.stopPropagation();
        data.tasks = data.tasks.filter(x => x.id !== el.dataset.del);
        Store.save();
        this.quadrant();
      };
    });
    $$('.quad-add').forEach(el => {
      el.onclick = () => {
        const q = el.dataset.add;
        UI.openModal(
          '<h3 class="modal-title">添加任务</h3>' +
          '<div class="form-group"><label class="form-label">任务内容</label><input class="form-input" id="qt-input" placeholder="要做什么？"></div>' +
          '<div class="step-btns"><button class="btn btn-ghost" style="flex:1" id="qt-cancel">取消</button>' +
          '<button class="btn" style="flex:1" id="qt-ok">添加</button></div>'
        );
        $('#qt-cancel').onclick = () => UI.closeModal();
        $('#qt-ok').onclick = () => {
          const v = $('#qt-input').value.trim();
          if (!v) return;
          data.tasks.push({ id: Store.uid(), title: v, quadrant: q, status: 'todo', createdAt: new Date().toISOString() });
          Store.save();
          UI.closeModal();
          this.quadrant();
        };
        setTimeout(() => $('#qt-input').focus(), 100);
      };
    });
  };

  /* ---------- 番茄钟 ---------- */
  Page.focus = function () {
    const data = S();
    const today = Store.today();
    const todayPoms = data.poms.filter(p => p.date === today);
    const totalToday = todayPoms.reduce((s, p) => s + p.count, 0);

    let html = '<div class="focus-wrap">';
    html += '<div class="focus-ring" id="focus-ring" style="--pct:0%">';
    html += '<div class="focus-time" id="focus-time">25:00</div>';
    html += '<div class="focus-mode" id="focus-mode">专注</div>';
    html += '</div>';
    html += '<div class="focus-poms" id="focus-poms">' + '🍅'.repeat(Math.min(totalToday, 8)) + (totalToday > 8 ? '…' : '') + (totalToday ? ' (' + totalToday + ')' : '') + '</div>';
    html += '<div class="focus-ctrl">';
    html += '<button class="btn" id="f-start" style="min-width:110px">' + icon('play') + ' 开始</button>';
    html += '<button class="btn btn-ghost" id="f-reset" style="min-width:90px">' + icon('refresh') + ' 重置</button>';
    html += '</div>';
    html += '<div class="focus-opts">';
    [15, 25, 45].forEach(m => {
      html += '<button class="' + (m === 25 ? 'active' : '') + '" data-min="' + m + '">' + m + '分钟</button>';
    });
    html += '</div>';
    html += '<div class="form-group focus-task">';
    html += '<label class="form-label">本次专注任务（可选）</label>';
    html += '<input class="form-input" id="f-task" placeholder="如：读《人类简史》第4章">';
    html += '</div>';
    html += '<div class="section-title" style="margin-top:10px">白噪音</div>';
    html += '<div class="noise-row" id="noise-row">';
    ['静音', '雨声', '篝火', '海浪', '纯音乐'].forEach((n, i) => {
      html += '<button class="noise-chip ' + (i === 0 ? 'active' : '') + '" data-noise="' + i + '">' + n + '</button>';
    });
    html += '</div>';
    html += '<div class="duck-line"><span class="dl-e">💡</span><span>完成一个番茄 = 自动为关联的学习目标打卡（专注 25 分钟）</span></div>';
    html += '</div>';

    $('#main-content').innerHTML = html;

    this._focus = {
      running: false, min: 25, remain: 25 * 60, total: 25 * 60,
      timer: null, task: '', noise: 0
    };
    const F = this._focus;

    const renderTime = () => {
      const m = Math.floor(F.remain / 60);
      const s = F.remain % 60;
      $('#focus-time').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      $('#focus-ring').style.setProperty('--pct', ((F.total - F.remain) / F.total * 100) + '%');
    };

    $('#f-start').onclick = () => {
      const btn = $('#f-start');
      if (!F.running) {
        F.running = true;
        F.task = $('#f-task').value.trim();
        btn.innerHTML = icon('pause') + ' 暂停';
        F.timer = setInterval(() => {
          F.remain--;
          renderTime();
          if (F.remain <= 0) { this.finishPomodoro(); }
        }, 1000);
        this.startNoise(F.noise);
      } else {
        F.running = false;
        clearInterval(F.timer);
        btn.innerHTML = icon('play') + ' 继续';
        this.stopNoise();
      }
    };
    $('#f-reset').onclick = () => {
      clearInterval(F.timer);
      F.running = false;
      F.remain = F.total;
      $('#f-start').innerHTML = icon('play') + ' 开始';
      renderTime();
      this.stopNoise();
    };
    $$('.focus-opts button').forEach(b => {
      b.onclick = () => {
        $$('.focus-opts button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        F.min = parseInt(b.dataset.min, 10);
        F.total = F.min * 60;
        F.remain = F.total;
        renderTime();
      };
    });
    $$('.noise-chip').forEach(ch => {
      ch.onclick = () => {
        $$('.noise-chip').forEach(x => x.classList.remove('active'));
        ch.classList.add('active');
        F.noise = parseInt(ch.dataset.noise, 10);
        this.startNoise(F.noise);
      };
    });
  };

  /* 完成一个番茄 */
  Page.finishPomodoro = function () {
    const F = this._focus;
    clearInterval(F.timer);
    F.running = false;
    const data = S();
    const today = Store.today();
    let rec = data.poms.find(p => p.date === today);
    if (!rec) { rec = { date: today, count: 0, totalMin: 0 }; data.poms.push(rec); }
    rec.count++;
    rec.totalMin = (rec.totalMin || 0) + F.min;
    Store.save();
    this.stopNoise();
    $('#f-start').innerHTML = icon('play') + ' 开始';
    F.remain = F.total;
    // 自动打卡：关联学习类目标
    const linked = data.goals.find(g => g.status === 'active' && g.category === '学习' && !Store.hasCheckin(g.id, today) && g.type !== 'milestone');
    let msg = '🍅 完成 ' + F.min + ' 分钟专注！';
    if (linked) {
      Goals.checkin(linked, null, '番茄钟 · ' + (F.task || '专注'));
      msg += '「' + linked.name + '」已自动打卡 ✅';
    }
    UI.celebrate('🍅', '专注完成！', F.task || '太棒了');
    UI.duckPop('🐤 ' + msg);
    this.focus();
  };

  /* Web Audio 白噪音生成（零依赖） */
  Page._noiseCtx = null;
  Page._noiseNodes = null;
  Page._noiseInterval = null;
  Page.startNoise = function (type) {
    this.stopNoise();
    if (type === 0) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      this._noiseCtx = ctx;

      // 纯音乐：舒缓琶音（C → Am → F → G 循环），不依赖白噪音 buffer
      if (type === 4) {
        const chords = [
          [261.63, 329.63, 392.00],  // C
          [220.00, 261.63, 329.63],  // Am
          [174.61, 220.00, 261.63],  // F
          [196.00, 246.94, 293.66]   // G
        ];
        const gain = ctx.createGain();
        gain.gain.value = 0.10;
        gain.connect(ctx.destination);
        let chordIdx = 0, noteIdx = 0;
        const playNote = () => {
          const chord = chords[chordIdx];
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = chord[noteIdx];
          const og = ctx.createGain();
          og.gain.setValueAtTime(0, ctx.currentTime);
          og.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.12);
          og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.9);
          osc.connect(og);
          og.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 2.1);
          noteIdx++;
          if (noteIdx >= chord.length) { noteIdx = 0; chordIdx = (chordIdx + 1) % chords.length; }
        };
        playNote();
        this._noiseInterval = setInterval(playNote, 620);
        return;
      }

      const nodes = [];
      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // 白噪音 buffer
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const ch = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) ch[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      if (type === 1) { // 雨声：低通滤波白噪音
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 1000;
        noise.connect(lp); lp.connect(master);
      } else if (type === 2) { // 篝火：带通 + 波动
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.8;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 1.5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 180;
        lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
        noise.connect(bp); bp.connect(master);
        lfo.start();
        nodes.push(lfo);
      } else { // 海浪：低频调制
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 600;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.1;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.3;
        const amp = ctx.createGain();
        amp.gain.value = 0.4;
        lfo.connect(lfoGain); lfoGain.connect(amp.gain);
        noise.connect(lp); lp.connect(amp); amp.connect(master);
        lfo.start();
        nodes.push(lfo);
      }
      noise.start();
      nodes.push(noise);
      this._noiseNodes = nodes;
    } catch (e) {
      console.warn('音频不可用:', e.message);
    }
  };
  Page.stopNoise = function () {
    if (this._noiseInterval) { clearInterval(this._noiseInterval); this._noiseInterval = null; }
    if (this._noiseCtx) { try { this._noiseCtx.close(); } catch (e) {} this._noiseCtx = null; }
    this._noiseNodes = null;
  };

  /* ---------- 统计页 ---------- */
  Page.stats = function () {
    const data = S();
    const st = Stats.all();
    const monthRate = Stats.monthRate();
    const badges = this.badges(st);

    let html = '<div class="stats-grid">';
    html += '<div class="stat-box"><div class="stat-num">' + st.active + '</div><div class="stat-label">进行中目标</div></div>';
    html += '<div class="stat-box"><div class="stat-num">' + st.completed + '</div><div class="stat-label">已完成目标 🎉</div></div>';
    html += '<div class="stat-box"><div class="stat-num">' + st.totalCheckins + '</div><div class="stat-label">总打卡次数</div></div>';
    html += '<div class="stat-box"><div class="stat-num">' + (st.longestStreak || st.curStreak) + '</div><div class="stat-label">最长连续打卡 🔥</div></div>';
    html += '</div>';

    // 本月完成率
    html += '<div class="card">';
    html += '<div class="card-title">' + icon('trending') + ' 本月完成率</div>';
    html += '<div class="progress-bar"><div class="progress-fill" style="width:' + monthRate + '%"></div></div>';
    html += '<div class="progress-text"><span>' + monthRate + '%</span><span>' + (monthRate >= 80 ? '很棒！' : monthRate >= 50 ? '继续加油' : '慢慢来') + '</span></div>';
    html += '</div>';

    // 近7天打卡分布
    html += '<div class="card"><div class="card-title">' + icon('calendar') + ' 近7天打卡</div><div class="cal-days" style="grid-template-columns:repeat(7,1fr)">';
    for (let i = 6; i >= 0; i--) {
      const ds = Store.addDays(Store.today(), -i);
      const cnt = data.checkins.filter(c => c.date === ds).length;
      const d = new Date(ds + 'T00:00:00');
      const wd = '日一二三四五六'[d.getDay()];
      html += '<div class="cal-day ' + (cnt ? 'done' : '') + '" style="cursor:default;aspect-ratio:auto;padding:8px 0;flex-direction:column;gap:2px">' +
        '<span style="font-size:11px">' + wd + '</span><span style="font-size:16px;font-weight:700">' + (cnt || '·') + '</span></div>';
    }
    html += '</div></div>';

    // 本月打卡趋势（SVG 折线）
    html += '<div class="card"><div class="card-title">' + icon('trending') + ' 本月打卡趋势</div>';
    html += this.monthLine();
    html += '</div>';

    // 分类分布
    const cats = {};
    data.goals.forEach(g => { cats[g.category] = (cats[g.category] || 0) + 1; });
    const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    if (catEntries.length) {
      const totalCat = catEntries.reduce((s, e) => s + e[1], 0);
      html += '<div class="card"><div class="card-title">' + icon('grid') + ' 目标分类分布</div>';
      catEntries.forEach(([c, n]) => {
        const pct = Math.round(n / totalCat * 100);
        html += '<div class="cat-bar-row"><span class="cat-bar-label">' + esc(c) + '</span>' +
          '<div class="cat-bar"><div class="cat-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="cat-bar-pct">' + pct + '%</span></div>';
      });
      html += '</div>';
    }

    // 徽章
    html += '<div class="card"><div class="card-title">' + icon('award') + ' 成就徽章</div><div class="badge-row">';
    badges.forEach(b => {
      html += '<span class="badge ' + (b.got ? '' : 'locked') + '">' + icon(b.got ? 'award' : 'lock') + ' ' + b.name + (b.got ? '' : '（未达成）') + '</span>';
    });
    html += '</div></div>';

    $('#main-content').innerHTML = html;
  };

  /* 本月打卡趋势折线图（SVG） */
  Page.monthLine = function () {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const today = Store.today();
    const todayIdx = Store.daysBetween(ym + '-01', today);
    const W = 320, H = 90, PAD = 10;
    let maxCnt = 1;
    const counts = [];
    for (let d = 1; d <= days; d++) {
      const ds = ym + '-' + String(d).padStart(2, '0');
      const cnt = S().checkins.filter(c => c.date === ds).length;
      counts.push(cnt);
      if (cnt > maxCnt) maxCnt = cnt;
    }
    const stepX = (W - PAD * 2) / Math.max(1, days - 1);
    const pts = counts.map((cnt, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - (cnt / maxCnt) * (H - PAD * 2);
      return [x, y];
    });
    const line = pts.slice(0, todayIdx + 1).map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const fillArea = line + ' ' + (PAD + todayIdx * stepX).toFixed(1) + ',' + (H - PAD) + ' ' + PAD + ',' + (H - PAD);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">';
    // 网格线
    for (let g = 1; g <= 4; g++) {
      const gy = PAD + (H - PAD * 2) * g / 5;
      svg += '<line x1="' + PAD + '" y1="' + gy + '" x2="' + (W - PAD) + '" y2="' + gy + '" stroke="#F2EADB" stroke-width="1"/>';
    }
    // 面积
    svg += '<polygon points="' + fillArea + '" fill="var(--olive)" opacity="0.12"/>';
    // 折线
    svg += '<polyline points="' + line + '" fill="none" stroke="var(--olive)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    // 数据点（到今天）
    pts.slice(0, todayIdx + 1).forEach((p, i) => {
      if (counts[i] > 0) {
        svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="#fff" stroke="var(--olive)" stroke-width="2"/>';
      }
    });
    svg += '</svg>';
    svg += '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--ink-3);margin-top:4px"><span>1日</span><span>' + now.getMonth() + 1 + '月' + days + '日</span></div>';
    return svg;
  };

  Page.badges = function (st) {
    return [
      { name: '第一次打卡', got: st.totalCheckins >= 1 },
      { name: '连续7天', got: st.longestStreak >= 7 },
      { name: '连续21天', got: st.longestStreak >= 21 },
      { name: '连续30天', got: st.longestStreak >= 30 },
      { name: '打卡50次', got: st.totalCheckins >= 50 },
      { name: '打卡100次', got: st.totalCheckins >= 100 },
      { name: '完成1个目标', got: st.completed >= 1 },
      { name: '完成5个目标', got: st.completed >= 5 },
      { name: '月完成率80%+', got: Stats.monthRate() >= 80 }
    ];
  };

  /* ---------- 更多页 ---------- */
  Page.more = function () {
    const data = S();
    const s = data.settings;
    const today = Store.today();
    const provider = API_PRESETS.find(p => p.id === s.apiProvider);

    let html = '';
    // 宠物等级展示
    html += '<div class="card"><div class="card-title">' + icon('heart') + ' 小胖鸭等级</div><div class="pet-levels">';
    DUCK.levels.forEach((l, i) => {
      const cur = i === Pet.levelIndex();
      const unlocked = i <= Pet.levelIndex();
      html += '<div class="pet-level ' + (cur ? 'current-lv' : '') + (!unlocked ? 'locked-lv' : '') + '">' +
        '<div class="pl-emoji">' + l.emoji + '</div><div class="pl-name">' + l.name + '</div><div class="pl-desc">' + l.desc + '</div></div>';
    });
    html += '</div></div>';

    // AI 智能分析（入口）
    html += '<div class="card" style="border-left:4px solid var(--primary);cursor:pointer" data-action="ai-analyze">';
    html += '<div style="display:flex;align-items:center;gap:12px">';
    html += '<div style="width:44px;height:44px;border-radius:14px;background:linear-gradient(155deg,rgba(201,160,108,0.35),rgba(240,214,122,0.2));display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0">' + icon('sparkles') + '</div>';
    html += '<div style="flex:1"><div style="font-size:15px;font-weight:700">AI 智能分析</div>';
    html += '<div style="font-size:12px;color:var(--ink-2)">自动询问你的目标与障碍，融合科学依据生成个性化报告</div></div>';
    html += '<span style="color:var(--ink-3);font-size:18px">›</span>';
    html += '</div></div>';

    // AI 设置
    html += '<div class="card"><div class="card-title">' + icon('sparkles') + ' AI 目标拆解</div>';
    html += '<p style="font-size:12px;color:var(--ink-2);margin-bottom:12px">用自己的 API Key 让 AI 帮你把大目标拆成里程碑计划。Key 经本地代理转发（API 保护），不直接暴露给浏览器。</p>';
    html += '<div class="setting-row" data-action="ai-settings">' +
      '<span class="s-label">' + icon('key') + ' AI 配置</span>' +
      '<span class="s-val">' + esc(provider ? provider.name : '未配置') + '<span style="color:var(--ink-3)">›</span></span></div>';
    html += '<div class="setting-row" data-action="ai-test">' +
      '<span class="s-label">' + icon('zap') + ' 测试连接</span>' +
      '<span class="s-val" id="ai-test-state">' + (Store.getApiKey() ? '已配置 Key' : '未填 Key') + '</span></div>';
    html += '</div>';

    // 工具
    html += '<div class="card"><div class="card-title">' + icon('grid') + ' 工具</div>';
    html += '<div class="setting-row" data-action="templates"><span class="s-label">' + icon('book') + ' 目标模板库</span><span class="s-val">›</span></div>';
    html += '<div class="setting-row" data-action="duck-detail"><span class="s-label">' + icon('heart') + ' 我的小胖鸭</span><span class="s-val">›</span></div>';
    html += '<div class="setting-row" data-action="export"><span class="s-label">' + icon('download') + ' 导出数据</span><span class="s-val">JSON ›</span></div>';
    html += '<div class="setting-row" data-action="import"><span class="s-label">' + icon('upload') + ' 导入数据</span><span class="s-val">JSON ›</span></div>';
    html += '</div>';

    // 关于
    html += '<div class="card"><div class="card-title">' + icon('info') + ' 关于</div>';
    html += '<p style="font-size:12px;color:var(--ink-2);line-height:1.8">「小目标」—— 一个人也能认真完成目标的安静角落。<br>完全免费 · 无付费墙 · 数据本地存储 · 小胖鸭永远开心 🐤<br><span style="color:var(--ink-3)">今天是 ' + today + '</span></p>';
    html += '</div>';

    $('#main-content').innerHTML = html;

    $$('[data-action]').forEach(el => {
      el.onclick = () => {
        const a = el.dataset.action;
        if (a === 'ai-analyze') this.aiAnalyze();
        else if (a === 'ai-settings') this.aiSettings();
        else if (a === 'ai-test') this.aiTest();
        else if (a === 'templates') this.templates();
        else if (a === 'duck-detail') this.duckDetail();
        else if (a === 'export') this.exportData();
        else if (a === 'import') this.importData();
      };
    });
  };

  /* ---------- AI 智能分析（自动询问向导） ---------- */
  Page.aiAnalyze = function () {
    this._aiq = { step: 0, answers: {}, report: null };
    this.aiqRender();
  };

  /* AI 询问问题流（自动询问） */
  Page.aiqQuestions = [
    { key: 'goal', q: '你正在坚持的【最重要目标】是什么？说得越具体越好（比如"一年读24本书"而不是"多读书"）。' },
    { key: 'plan', q: '你为这个目标制定了怎样的【计划】？有没有拆成小步骤、里程碑，或设定固定打卡时间？' },
    { key: 'blocker', q: '最近遇到的【最大障碍】是什么？是时间不够、动力不足、方法不对，还是环境干扰？' },
    { key: 'score', q: '如果用 1-10 分给现在的【投入程度】打分，你打几分？为什么是这个分数？' }
  ];

  Page.aiqRender = function () {
    const w = this._aiq;
    const qs = this.aiqQuestions;

    if (w.report) {
      /* ---- 报告页 ---- */
      const r = w.report;
      let html = '<h3 class="modal-title">🐤 AI 智能分析报告' +
        (w.usedLocal ? '<div style="font-size:10px;color:var(--ink-3);font-weight:400;margin-top:4px">· 本地智能分析引擎（配置 API Key 后更精准）</div>' : '') + '</h3>';
      html += '<div style="text-align:center;margin-bottom:14px">';
      html += '<span class="stat-num" style="font-size:38px">' + r.score + '</span>';
      html += '<div class="stat-label">目标健康度</div>';
      html += '<div class="progress-bar" style="margin-top:8px"><div class="progress-fill" style="width:' + r.score + '%"></div></div>';
      html += '</div>';
      html += '<div class="duck-line" style="margin-bottom:12px"><span class="dl-e">🧭</span><span>' + esc(r.diagnosis || '') + '</span></div>';

      if (r.strengths && r.strengths.length) {
        html += '<div class="card" style="margin-bottom:10px"><div class="card-title">' + icon('award') + ' 你的优势</div>';
        r.strengths.forEach(s => {
          html += '<div class="record-item"><span class="record-date">✅</span><span class="record-note">' + esc(s) + '</span></div>';
        });
        html += '</div>';
      }
      if (r.issues && r.issues.length) {
        html += '<div class="card" style="margin-bottom:10px"><div class="card-title">' + icon('info') + ' 待优化（科学依据）</div>';
        r.issues.forEach(iss => {
          html += '<div class="record-item"><span class="record-date" style="color:var(--warn)">💡</span>' +
            '<span class="record-note"><b>' + esc(iss.title) + '</b><br><span style="font-size:12px;color:var(--ink-2)">' + esc(iss.detail) + '</span></span></div>';
        });
        html += '</div>';
      }
      if (r.actions && r.actions.length) {
        html += '<div class="card" style="margin-bottom:10px"><div class="card-title">' + icon('zap') + ' 行动方案</div>';
        r.actions.forEach((a, i) => {
          html += '<div class="record-item"><span class="record-date">' + (i + 1) + '</span>' +
            '<span class="record-note"><b>' + esc(a.title) + '</b><br><span style="font-size:12px;color:var(--ink-2)">' + esc(a.detail) + '</span></span></div>';
        });
        html += '</div>';
      }
      html += '<div class="duck-line"><span class="dl-e">🐤</span><span>' + esc(r.encouragement || '') + '</span></div>';
      html += '<div class="step-btns">';
      html += '<button class="btn btn-ghost" style="flex:1" id="ar-again">' + icon('refresh') + ' 重新分析</button>';
      html += '<button class="btn" style="flex:1" id="ar-close">完成</button>';
      html += '</div>';
      UI.openModal(html);
      $('#ar-again').onclick = () => { this._aiq = { step: 0, answers: {}, report: null }; this.aiqRender(); };
      $('#ar-close').onclick = () => UI.closeModal();
      return;
    }

    if (w.step >= qs.length) {
      /* ---- 生成报告 ---- */
      let html = '<h3 class="modal-title">AI 智能分析</h3>';
      html += '<div class="ai-loading"><div class="spinner"></div><p>正在融合目标管理科学知识<br>分析你的回答与打卡数据…</p></div>';
      UI.openModal(html);
      this.aiGenerate();
      return;
    }

    /* ---- 询问页 ---- */
    const q = qs[w.step];
    const done = Object.keys(w.answers).length;
    let html = '<h3 class="modal-title">AI 智能分析</h3>';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">';
    for (let i = 0; i < qs.length; i++) {
      html += '<div style="flex:1;height:5px;border-radius:3px;background:' + (i < w.step ? 'var(--olive)' : 'rgba(255,255,255,0.5)') + '"></div>';
    }
    html += '</div>';
    html += '<div class="duck-line" style="font-size:14px;margin-bottom:14px"><span class="dl-e">🐤</span><span>' + esc(q.q) + '</span></div>';
    html += '<div class="form-group"><textarea class="form-textarea" id="aq-input" placeholder="在这里回答…" style="min-height:90px"></textarea></div>';
    html += '<div class="step-btns">';
    if (w.step > 0) html += '<button class="btn btn-ghost" style="flex:1" id="aq-back">上一步</button>';
    html += '<button class="btn" style="flex:1" id="aq-next">' + (w.step === qs.length - 1 ? '生成分析报告' : '下一步') + '</button>';
    html += '</div>';
    html += '<p style="font-size:11px;color:var(--ink-3);text-align:center;margin-top:10px">分析将融合 Locke目标设定 / WOOP / if-then 实施意图等科学依据</p>';
    UI.openModal(html);
    const inp = $('#aq-input');
    if (w.step === 0) inp.placeholder = '试试："每天背20个单词，坚持了10天"';
    if (inp) setTimeout(() => inp.focus(), 150);
    $('#aq-back') && ($('#aq-back').onclick = () => { w.step--; this.aiqRender(); });
    $('#aq-next').onclick = () => {
      const v = inp.value.trim();
      if (!v) { UI.toast('先写点什么吧，AI 才能帮你分析 🐤'); return; }
      w.answers[q.key] = v;
      w.step++;
      this.aiqRender();
    };
  };

  /* 调用 LLM 生成报告（无 Key / 失败时降级本地智能分析引擎） */
  Page.aiGenerate = async function () {
    const s = S().settings;
    const w = this._aiq;
    const key = Store.getApiKey();
    const useLLM = !!key || s.apiProvider === 'ollama';

    if (!useLLM) {
      w.report = this.localReport(w.answers, this._appStatsData());
      w.usedLocal = true;
      this.aiqRender();
      return;
    }
    try {
      const report = await LLM.smartAnalysis({
        answers: w.answers,
        appStats: this._appStatsData(),
        settings: { endpoint: s.apiEndpoint, model: s.apiModel, apiKey: key, useProxy: s.useProxy }
      });
      w.report = report;
      w.usedLocal = false;
      this.aiqRender();
    } catch (e) {
      /* 降级：本地智能分析引擎 */
      w.report = this.localReport(w.answers, this._appStatsData());
      w.usedLocal = true;
      this.aiqRender();
      UI.toast('AI 服务暂不可用，已用本地智能分析 🐤');
    }
  };

  /* App 数据汇总（供分析使用） */
  Page._appStatsData = function () {
    const goals = S().goals.filter(g => g.status === 'active');
    const st = Stats.all();
    return {
      activeGoals: st.active,
      completed: st.completed,
      totalCheckins: st.totalCheckins,
      curStreak: st.curStreak,
      longestStreak: st.longestStreak,
      goalNames: goals.map(g => g.name + '(' + Math.round(Stats.progress(g).pct) + '%)').join('、') || '暂无'
    };
  };

  /* ---- 本地智能分析引擎（无 Key 降级，融合科学知识） ---- */
  Page.localReport = function (answers, appStats) {
    const a = answers;
    const goalTxt = a.goal || '';
    const planTxt = a.plan || '';
    const blockerTxt = a.blocker || '';
    const scoreTxt = a.score || '';

    const hasNumber = /\d+/.test(goalTxt);
    const hasRoutine = /每天|每周|睡前|早上|晚上|固定|时间|点/.test(goalTxt + planTxt);
    const hasMilestone = /里程碑|步骤|阶段|拆|计划|小目标/.test(planTxt);
    const isTime = /时间|忙|加班|累|晚|没空/.test(blockerTxt);
    const isMotivation = /动力|不想|坚持|放弃|懒|无聊/.test(blockerTxt);
    const isMethod = /方法|不会|不懂|不知道|怎么|效率/.test(blockerTxt);
    const isEnv = /环境|手机|打扰|干扰|吵|乱/.test(blockerTxt);
    const selfScore = parseInt((scoreTxt.match(/\d+/) || [5])[0], 10) || 5;

    const strengths = [];
    if (hasRoutine) strengths.push('你已为行动设定了固定场景/时间——这是习惯回路（提示→惯例→奖励）的关键第一步');
    if (hasNumber) strengths.push('目标含明确数字，符合 Locke & Latham 的"具体且有挑战的目标优于尽力而为"研究结论');
    if (appStats.curStreak >= 3) strengths.push('当前已连续打卡 ' + appStats.curStreak + ' 天，连续性本身就是强大的动力资产');
    if (appStats.totalCheckins > 0) strengths.push('累计打卡 ' + appStats.totalCheckins + ' 次，你在持续行动而非空想');
    if (selfScore >= 7) strengths.push('自评 ' + selfScore + ' 分，说明你有较好的投入意愿，这是最难能可贵的起点');
    if (!strengths.length) strengths.push('你愿意认真回答这些问题、正视自己的目标，这已经是行动的开始');

    const issues = [];
    if (!hasMilestone) issues.push({ title: '缺少里程碑拆解', detail: '目标梯度效应表明：接近目标本身就能提升动机。把大目标拆成每月/每阶段的小里程碑，每达成一个都会强化继续的动力。' });
    if (isTime) issues.push({ title: '时间与精力不足', detail: '加班后意志力薄弱是普遍规律。用 if-then 实施意图（Gollwitzer，642项元分析2024）："如果下班到家，就先读10分钟"——把决定提前做好，减少启动时的决策消耗。' });
    if (isMotivation) issues.push({ title: '动力波动', detail: '动力天然会波动，靠"感觉"行动不可靠。用 WOOP 四步法：先想象达成目标的好处（结果），再预演障碍与对策——预演障碍能显著提高坚持率。' });
    if (isMethod) issues.push({ title: '方法需要调整', detail: '方法不对时努力会低效。用间隔重复（Ebbinghaus 遗忘曲线）安排复习；每周用统计页复盘完成率，数据驱动调整比自我批评更有效。' });
    if (isEnv) issues.push({ title: '环境干扰', detail: '习惯回路中"提示"决定行为触发。把手机放远、固定学习角落、用白噪音隔离——减少环境诱惑，比靠意志力更有效。' });
    if (!issues.length) issues.push({ title: '明确最大障碍', detail: '障碍描述较模糊。花2分钟用 WOOP 写下最大的一个障碍和一条 if-then 对策（具体到时间+地点+动作），坚持率会明显提升。' });

    const actions = [];
    if (!hasMilestone) actions.push({ title: '拆出 3 个里程碑', detail: '例："3个月完成1/3"→"6个月完成2/3"→"9个月全部达成"。每达成一个，小胖鸭都会为你庆祝（正向激励强化回路）。' });
    if (isTime) actions.push({ title: '写一条 if-then 保底计划', detail: '"如果今晚加班到8点后，就只读5分钟"——降低门槛保住连续性。中断后回归，比完美更重要。' });
    if (isMotivation) actions.push({ title: '给奖励回路加钩子', detail: '每连续打卡7天，奖励自己一件喜欢的小事。行为塑造中即时奖励比远期目标更能驱动坚持。' });
    if (isMethod) actions.push({ title: '建立反馈循环', detail: '每周日晚用统计页复盘（完成率/趋势），低于60%就调整方法而不是责备自己。' });
    if (isEnv) actions.push({ title: '改造环境提示', detail: '把手机放另一个房间，在固定位置放好"行动道具"（书/哑铃/笔记本），让环境替你提醒。' });
    if (!actions.length) actions.push({ title: '写一个具体明日行动', detail: '"明天晚上9点，在书桌前读10分钟"——if-then 句式，具体到时间+地点+动作。' });
    actions.push({ title: '让连续性为你工作', detail: '每次打卡都是给链条加一环。中断也没关系——小胖鸭永远欢迎你回来，回归本身就是胜利。' });

    const encouragement = '你已经比大多数只会"想想"的人走得更远。科学告诉我们：具体计划 + 正向反馈 + 允许中断的回归，远比咬牙硬撑更能抵达终点。小胖鸭会一直陪你！🐤';

    const dimension = isTime ? '时间精力' : isMotivation ? '动力维持' : isMethod ? '方法优化' : isEnv ? '环境管理' : '计划细化';
    return {
      score: Math.min(95, Math.max(25, selfScore * 9 + (hasRoutine ? 10 : 0) + (hasNumber ? 5 : 0) + (appStats.curStreak >= 3 ? 5 : 0))),
      diagnosis: '目标方向清晰' + (hasNumber ? '、有量化指标' : '') + '，' + (hasMilestone ? '计划较完整' : '缺一个可落地的里程碑拆解') + '，主要挑战在「' + dimension + '」维度。',
      strengths: strengths,
      issues: issues,
      actions: actions,
      encouragement: encouragement
    };
  };

  /* AI 设置页 */
  Page.aiSettings = function () {
    const s = S().settings;
    let html = '<h3 class="modal-title">AI 配置</h3>';
    html += '<div class="form-group"><label class="form-label">供应商</label><select class="form-select" id="ai-provider">';
    API_PRESETS.forEach(p => {
      html += '<option value="' + p.id + '" ' + (s.apiProvider === p.id ? 'selected' : '') + '>' + p.name + '</option>';
    });
    html += '<option value="custom" ' + (s.apiProvider === 'custom' ? 'selected' : '') + '>自定义（手动填写）</option>';
    html += '</select></div>';
    html += '<div class="form-group"><label class="form-label">API 端点 (endpoint)</label>';
    html += '<input class="form-input" id="ai-endpoint" value="' + esc(s.apiEndpoint) + '" placeholder="https://.../chat/completions"></div>';
    html += '<div class="form-group"><label class="form-label">模型</label><input class="form-input" id="ai-model" value="' + esc(s.apiModel) + '"></div>';
    html += '<div class="form-group"><label class="form-label">API Key（仅存本机，掩码显示）</label>';
    const key = Store.getApiKey();
    if (key) {
      html += '<input class="form-input" id="ai-key" type="password" placeholder="已保存：' + esc(Store.maskKey(key)) + '（留空则不变）">';
      html += '<button class="btn btn-ghost btn-sm" id="ai-key-clear" style="margin-top:8px">清除已保存的 Key</button>';
    } else {
      html += '<input class="form-input" id="ai-key" type="password" placeholder="sk-...">';
    }
    html += '</div>';
    html += '<div class="form-group"><label class="form-label">API 保护：本地代理转发</label>';
    html += '<div class="seg" id="proxy-seg"><button class="' + (s.useProxy ? 'active' : '') + '" data-v="1">开启（推荐）</button><button class="' + (!s.useProxy ? 'active' : '') + '" data-v="0">直连</button></div>';
    html += '<div class="form-hint">开启后 Key 经本地 server.js 转发，不直接发给供应商，避免被抓包；静态托管自动回退直连</div>';
    html += '</div>';
    html += '<div class="form-group" id="preset-note" style="background:var(--duck-soft);border-radius:12px;padding:10px 12px;font-size:12px;color:var(--ink-2)"></div>';
    html += '<div class="step-btns"><button class="btn btn-ghost" style="flex:1" id="ai-cancel">取消</button>';
    html += '<button class="btn" style="flex:1" id="ai-save">' + icon('check') + ' 保存</button></div>';

    UI.openModal(html);

    const providerSel = $('#ai-provider');
    const endpointInp = $('#ai-endpoint');
    const modelInp = $('#ai-model');
    const noteEl = $('#preset-note');

    const updatePreset = () => {
      const pid = providerSel.value;
      const p = API_PRESETS.find(x => x.id === pid);
      if (p) {
        endpointInp.value = p.endpoint;
        modelInp.value = p.defaultModel || '';
        noteEl.textContent = '💡 ' + p.note + (p.needsKey ? '。需要填写你的 API Key。' : '。本地模型无需 Key。');
      } else {
        noteEl.textContent = '💡 手动填写任意 OpenAI 兼容端点和模型名（如 Ollama、Azure OpenAI 等）。';
      }
    };
    updatePreset();
    providerSel.onchange = updatePreset;

    $$('#proxy-seg button').forEach(b => {
      b.onclick = () => {
        $$('#proxy-seg button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      };
    });

    $('#ai-cancel').onclick = () => UI.closeModal();
    $('#ai-key-clear') && ($('#ai-key-clear').onclick = () => {
      Store.removeApiKey();
      UI.toast('已清除 Key');
      this.aiSettings();
    });
    $('#ai-save').onclick = () => {
      s.apiProvider = providerSel.value;
      s.apiEndpoint = endpointInp.value.trim();
      s.apiModel = modelInp.value.trim();
      const keyVal = $('#ai-key').value.trim();
      if (keyVal) Store.setApiKey(keyVal);
      s.useProxy = $('#proxy-seg button.active').dataset.v === '1';
      Store.save();
      UI.closeModal();
      UI.toast('AI 配置已保存 🐤');
      this.more();
    };
  };

  /* 测试连接 */
  Page.aiTest = async function () {
    const s = S().settings;
    const stateEl = $('#ai-test-state');
    if (!stateEl) return;
    stateEl.textContent = '测试中…';
    try {
      const r = await LLM.testConnection({ endpoint: s.apiEndpoint, model: s.apiModel, apiKey: Store.getApiKey(), useProxy: s.useProxy });
      stateEl.textContent = '✅ 连接成功 (' + (r.model || '') + ')';
      UI.toast('连接成功！AI 可用 🐤');
    } catch (e) {
      stateEl.textContent = '❌ 连接失败';
      UI.toast('连接失败: ' + e.message);
    }
  };

  /* 模板库 */
  Page.templates = function () {
    let html = '<h3 class="modal-title">目标模板库</h3>';
    html += '<input class="form-input" id="tpl-search" placeholder="🔍 搜索模板..." style="margin-bottom:12px">';
    html += '<div class="tpl-grid" id="tpl-grid">';
    GOAL_TEMPLATES.forEach((t, i) => {
      html += '<div class="tpl-card" data-tpl="' + i + '">' +
        '<div class="tpl-emoji">' + t.emoji + '</div>' +
        '<div class="tpl-name">' + esc(t.name) + '</div>' +
        '<div class="tpl-desc">' + esc(t.desc) + '</div></div>';
    });
    html += '</div>';
    html += '<button class="btn btn-ghost btn-block" id="tpl-close" style="margin-top:16px">关闭</button>';
    UI.openModal(html);
    $('#tpl-close').onclick = () => UI.closeModal();
    /* 搜索过滤：按字符拆分匹配（更宽松友好） */
    $('#tpl-search').oninput = () => {
      const q = $('#tpl-search').value.trim().toLowerCase();
      const chars = q.split('');
      $$('#tpl-grid .tpl-card').forEach(card => {
        const t = GOAL_TEMPLATES[parseInt(card.dataset.tpl, 10)];
        if (!q) { card.style.display = ''; return; }
        const text = (t.name + t.desc + t.cat).toLowerCase();
        const match = q.length === 1 ? text.indexOf(q) !== -1 : chars.every(c => text.indexOf(c) !== -1);
        card.style.display = match ? '' : 'none';
      });
    };
    $$('.tpl-card').forEach(el => {
      el.onclick = () => {
        const t = GOAL_TEMPLATES[parseInt(el.dataset.tpl, 10)];
        UI.closeModal();
        GoalWizard.open(null, t);
      };
    });
  };

  /* 小胖鸭详情 */
  Page.duckDetail = function () {
    const data = S();
    const lv = Pet.levelIndex();
    const st = Stats.all();
    let html = '<h3 class="modal-title">我的小胖鸭</h3>';
    html += '<div style="text-align:center">' + DuckArt.render(Pet.level(), 'happy', 120) + '</div>';
    html += '<p style="text-align:center;font-size:15px;font-weight:700;margin:8px 0 4px">' + DUCK.levels[lv].name + '</p>';
    html += '<p style="text-align:center;font-size:12px;color:var(--ink-2);margin-bottom:16px">' + DUCK.levels[lv].desc + '</p>';
    html += '<div class="card" style="margin-bottom:10px">';
    DUCK.levels.forEach((l, i) => {
      const unlocked = i <= lv;
      html += '<div class="milestone-item"><span class="ms-dot ' + (unlocked ? 'achieved' : '') + '">' + (unlocked ? icon('check') : '') + '</span>' +
        '<span class="ms-title ' + (!unlocked ? '' : '') + '">' + l.emoji + ' ' + l.name + '</span>' +
        '<span class="ms-date">' + l.desc + '</span></div>';
    });
    html += '</div>';
    html += '<div class="card"><div class="card-title">' + icon('barChart') + ' 我的数据</div>';
    html += '<div style="font-size:13px;line-height:2;color:var(--ink-2)">' +
      '累计打卡：<b style="color:var(--ink)">' + st.totalCheckins + '</b> 次<br>' +
      '当前连续：<b style="color:var(--ink)">' + st.curStreak + '</b> 天<br>' +
      '最长连续：<b style="color:var(--ink)">' + st.longestStreak + '</b> 天 🔥<br>' +
      '完成目标：<b style="color:var(--ink)">' + st.completed + '</b> 个 🎉</div></div>';
    html += '<div class="duck-line"><span class="dl-e">🐤</span><span>小胖鸭永远不会难过。没打卡也没关系，它只会在你回来时说"欢迎回来"。这里是正向激励的安静角落。</span></div>';
    html += '<button class="btn btn-block" id="dd-close" style="margin-top:16px">知道了</button>';
    UI.openModal(html);
    $('#dd-close').onclick = () => UI.closeModal();
  };

  /* 导出 */
  Page.exportData = function () {
    const data = S();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'xiaogubiao-backup-' + Store.today() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('已导出 JSON 备份');
  };

  /* 导入 */
  Page.importData = function () {
    UI.openModal(
      '<h3 class="modal-title">导入数据</h3>' +
      '<p style="font-size:13px;color:var(--ink-2);text-align:center;margin-bottom:16px">导入会<b>覆盖</b>当前所有数据，请确认已备份。</p>' +
      '<input type="file" id="imp-file" accept=".json,application/json" style="width:100%;margin-bottom:16px">' +
      '<div class="step-btns"><button class="btn btn-ghost" style="flex:1" id="imp-cancel">取消</button>' +
      '<button class="btn btn-danger" style="flex:1" id="imp-ok">覆盖导入</button></div>'
    );
    $('#imp-cancel').onclick = () => UI.closeModal();
    $('#imp-ok').onclick = () => {
      const f = $('#imp-file').files[0];
      if (!f) { UI.toast('请选择备份文件'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!parsed.goals) throw new Error('格式不正确');
          window.__data = parsed;
          Store.save();
          UI.closeModal();
          UI.toast('导入成功 🐤');
          this.more();
        } catch (e) {
          UI.toast('导入失败: ' + e.message);
        }
      };
      reader.readAsText(f);
    };
  };

  /* ============================================================
   * 新建目标向导（4步）
   * ============================================================ */
  const GoalWizard = {
    step: 1,
    data: {},
    fromTemplate: null,

    open(goalId, tpl) {
      this.step = 1;
      this.fromTemplate = tpl || null;
      if (tpl) {
        this.data = {
          type: tpl.type,
          name: tpl.name,
          description: tpl.desc,
          category: tpl.cat,
          targetValue: tpl.target,
          unit: tpl.unit,
          milestones: (tpl.milestones || []).map(m => ({ title: m.title, days: m.days }))
        };
      } else {
        this.data = { type: 'habit', name: '', description: '', category: '生活', targetValue: null, unit: '', milestones: [] };
      }
      this.render();
    },

    render() {
      let html = '<h3 class="modal-title">' + (this.step === 4 ? '完成 🎉' : '新建目标 · 第 ' + this.step + ' 步 / 共 4 步') + '</h3>';
      if (this.step === 1) html += this.step1();
      else if (this.step === 2) html += this.step2();
      else if (this.step === 3) html += this.step3();
      else if (this.step === 4) html += this.step4();
      UI.openModal(html);
      this.bind();
    },

    step1() {
      const types = [
        { id: 'quantitative', icon: '📊', name: '量化型', desc: '有明确数字' },
        { id: 'habit', icon: '🔁', name: '习惯型', desc: '固定频率坚持' },
        { id: 'milestone', icon: '🏁', name: '里程碑型', desc: '分阶段完成' }
      ];
      let h = '<div class="form-label">这个目标属于哪一类？</div><div class="type-select">';
      types.forEach(t => {
        h += '<div class="type-option ' + (this.data.type === t.id ? 'selected' : '') + '" data-type="' + t.id + '">' +
          '<div class="type-icon">' + t.icon + '</div><div class="type-name">' + t.name + '</div><div class="type-desc">' + t.desc + '</div></div>';
      });
      h += '</div>';
      h += '<div class="step-btns"><button class="btn btn-block" id="w-next" style="margin-top:8px">下一步</button></div>';
      return h;
    },

    step2() {
      let h = '';
      h += '<div class="form-group"><label class="form-label">目标名称 *</label><input class="form-input" id="w-name" value="' + esc(this.data.name) + '" placeholder="如：一年读24本书"></div>';
      h += '<div class="form-group"><label class="form-label">目标描述（可选）</label><textarea class="form-textarea" id="w-desc">' + esc(this.data.description || '') + '</textarea></div>';
      h += '<div class="form-group"><label class="form-label">分类</label><select class="form-select" id="w-cat">';
      GOAL_CATEGORIES.forEach(c => {
        h += '<option ' + (this.data.category === c ? 'selected' : '') + '>' + c + '</option>';
      });
      h += '</select></div>';
      if (this.data.type === 'quantitative') {
        h += '<div class="freq-row"><div class="form-group" style="flex:1"><label class="form-label">目标数值 *</label><input class="form-input" id="w-target" type="number" value="' + (this.data.targetValue || '') + '" placeholder="如 24"></div>';
        h += '<div class="form-group" style="flex:1"><label class="form-label">单位</label><input class="form-input" id="w-unit" value="' + esc(this.data.unit || '') + '" placeholder="本 / 斤 / 元"></div></div>';
      }
      h += '<div class="freq-row"><div class="form-group" style="flex:1"><label class="form-label">开始日期</label><input class="form-input" id="w-start" type="date" value="' + (this.data.startDate || Store.today()) + '"></div>';
      h += '<div class="form-group" style="flex:1"><label class="form-label">截止日期</label><input class="form-input" id="w-end" type="date" value="' + (this.data.endDate || Store.addDays(Store.today(), 90)) + '"></div></div>';
      h += '<div class="form-group"><label class="form-label">打卡频率</label><div class="seg" id="w-freq">';
      const fr = this.data.checkInFrequency || 'daily';
      [['daily', '每天'], ['workday', '工作日'], ['custom', '自定义']].forEach(([v, n]) => {
        h += '<button class="' + (fr === v ? 'active' : '') + '" data-freq="' + v + '">' + n + '</button>';
      });
      h += '</div></div>';
      h += '<div id="w-custom-freq" class="' + (fr === 'custom' ? '' : 'hidden') + '"><div class="form-hint" style="margin-bottom:8px">选择每周哪几天（周日=0 周六=6）</div>';
      [0, 1, 2, 3, 4, 5, 6].forEach(d => {
        const sel = (this.data.customFrequency || []).indexOf(d) !== -1;
        h += '<span class="chip ' + (sel ? 'selected' : '') + '" data-day="' + d + '">' + '日一二三四五六'[d] + '</span>';
      });
      h += '</div>';
      h += '<div class="step-btns"><button class="btn btn-ghost" style="flex:1" id="w-back">上一步</button><button class="btn" style="flex:1" id="w-next2">下一步</button></div>';
      return h;
    },

    step3() {
      let h = '<div class="form-label">里程碑（可选，帮助你拆解大目标）</div>';
      h += '<div id="w-milestones">';
      (this.data.milestones || []).forEach((m, i) => {
        h += '<div class="freq-row" style="margin-bottom:8px">' +
          '<input class="form-input" data-mi="' + i + '" data-field="title" value="' + esc(m.title) + '" placeholder="里程碑名称" style="flex:2">' +
          '<input class="form-input" data-mi="' + i + '" data-field="days" type="number" value="' + (m.days || '') + '" placeholder="天数" style="flex:1">' +
          '<button class="btn btn-ghost btn-sm w-ms-del" data-mi="' + i + '">✕</button></div>';
      });
      h += '</div>';
      h += '<button class="btn btn-ghost btn-sm" id="w-ms-add">' + icon('plus') + ' 添加里程碑</button>';

      // AI 拆解
      h += '<div style="margin-top:16px;padding:12px;background:var(--duck-soft);border-radius:14px">';
      h += '<div style="font-size:13px;font-weight:600;margin-bottom:8px">' + icon('sparkles') + ' 让 AI 帮你拆解</div>';
      h += '<p style="font-size:12px;color:var(--ink-2);margin-bottom:10px">基于你的目标名称与周期，AI 生成执行计划与里程碑（需要已配置 API Key）。</p>';
      h += '<button class="btn btn-sm btn-olive" id="w-ai">' + icon('sparkles') + ' AI 拆解</button>';
      h += '<span id="w-ai-status" style="font-size:12px;color:var(--ink-2);margin-left:8px"></span>';
      h += '</div>';

      h += '<div class="step-btns"><button class="btn btn-ghost" style="flex:1" id="w-back3">上一步</button><button class="btn" style="flex:1" id="w-next3">下一步</button></div>';
      return h;
    },

    step4() {
      const d = this.data;
      const freqName = { daily: '每天', workday: '工作日', custom: '自定义' }[d.checkInFrequency] || '每天';
      let h = '<div style="text-align:center">';
      h += '<div style="font-size:48px;margin-bottom:10px">🎉</div>';
      h += '<div style="font-size:18px;font-weight:700;margin-bottom:6px">目标创建成功！</div>';
      h += '<div style="font-size:14px;color:var(--ink-2);margin-bottom:16px">' + esc(d.name) + '</div>';
      h += '<div class="card" style="text-align:left;font-size:13px;color:var(--ink-2);line-height:2">';
      h += '📅 ' + esc(d.startDate) + ' → ' + esc(d.endDate) + '<br>';
      h += '🔄 ' + freqName + '打卡<br>';
      if (d.type === 'quantitative') h += '📊 目标：' + d.targetValue + d.unit + '<br>';
      if ((d.milestones || []).length) h += '📍 ' + d.milestones.length + ' 个里程碑<br>';
      h += '</div>';
      h += '<div class="duck-line" style="text-align:left"><span class="dl-e">🐤</span><span>太棒了！这是你迈向更好自己的第一步，我会陪着你！</span></div>';
      h += '<div class="step-btns"><button class="btn btn-ghost" style="flex:1" id="w-done">回到首页</button>' +
        '<button class="btn btn-olive" style="flex:1" id="w-more">再来一个</button></div>';
      h += '</div>';
      return h;
    },

    bind() {
      // step1
      $$('.type-option').forEach(el => {
        el.onclick = () => {
          $$('.type-option').forEach(x => x.classList.remove('selected'));
          el.classList.add('selected');
          this.data.type = el.dataset.type;
        };
      });
      const next = $('#w-next');
      if (next) next.onclick = () => { this.step = 2; this.render(); };

      // step2
      const back = $('#w-back');
      if (back) back.onclick = () => { this.step = 1; this.render(); };
      const next2 = $('#w-next2');
      if (next2) next2.onclick = () => {
        this.data.name = ($('#w-name').value || '').trim();
        if (!this.data.name) { UI.toast('请填写目标名称'); return; }
        this.data.description = $('#w-desc').value.trim();
        this.data.category = $('#w-cat').value;
        this.data.startDate = $('#w-start').value;
        this.data.endDate = $('#w-end').value;
        if (!this.data.startDate || !this.data.endDate) { UI.toast('请选择日期范围'); return; }
        if (this.data.endDate < this.data.startDate) { UI.toast('截止日期需晚于开始日期'); return; }
        if (this.data.type === 'quantitative') {
          this.data.targetValue = parseFloat($('#w-target').value);
          if (!this.data.targetValue || this.data.targetValue <= 0) { UI.toast('目标数值需大于0'); return; }
          this.data.unit = $('#w-unit').value.trim();
        }
        this.data.checkInFrequency = $('#w-freq button.active').dataset.freq;
        this.data.customFrequency = $$('#w-custom-freq .chip.selected').map(c => parseInt(c.dataset.day, 10));
        this.step = 3;
        this.render();
      };
      $$('#w-freq button').forEach(b => {
        b.onclick = () => {
          $$('#w-freq button').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          $('#w-custom-freq').classList.toggle('hidden', b.dataset.freq !== 'custom');
        };
      });
      $$('#w-custom-freq .chip').forEach(c => {
        c.onclick = () => {
          c.classList.toggle('selected');
        };
      });

      // step3
      const back3 = $('#w-back3');
      if (back3) back3.onclick = () => { this.step = 2; this.render(); };
      const next3 = $('#w-next3');
      if (next3) next3.onclick = () => {
        // 收集里程碑
        this.data.milestones = $$('#w-milestones .freq-row').map(row => ({
          title: $('[data-field="title"]', row).value.trim(),
          days: parseInt($('[data-field="days"]', row).value, 10) || null
        })).filter(m => m.title);
        // 计算里程碑日期
        const start = this.data.startDate || Store.today();
        this.data.milestones.forEach(m => {
          m.targetDate = m.days ? Store.addDays(start, m.days) : null;
        });
        // 创建目标（保存）
        this.createdGoal = Goals.create(this.data);
        UI.duckPop('🐤 目标创建成功！');
        this.step = 4;
        this.render();
      };
      const add = $('#w-ms-add');
      if (add) add.onclick = () => {
        this.data.milestones.push({ title: '', days: null });
        this.render();
      };
      $$('.w-ms-del').forEach(b => {
        b.onclick = () => {
          this.data.milestones.splice(parseInt(b.dataset.mi, 10), 1);
          this.render();
        };
      });
      // 里程碑编辑（值变化时同步）
      $$('#w-milestones [data-field]').forEach(inp => {
        inp.oninput = () => {
          const mi = parseInt(inp.dataset.mi, 10);
          const field = inp.dataset.field;
          if (!this.data.milestones[mi]) this.data.milestones[mi] = { title: '', days: null };
          this.data.milestones[mi][field] = field === 'days' ? (parseInt(inp.value, 10) || null) : inp.value;
        };
      });
      const aiBtn = $('#w-ai');
      if (aiBtn) aiBtn.onclick = () => this.aiBreakdown();

      // step4
      const done = $('#w-done');
      if (done) done.onclick = () => { UI.closeModal(); App.go('home'); };
      const more = $('#w-more');
      if (more) more.onclick = () => { this.data = {}; this.createdGoal = null; this.step = 1; this.render(); };
    },

    /* AI 拆解 */
    async aiBreakdown() {
      const s = S().settings;
      const name = this.data.name || ($('#w-name') ? $('#w-name').value.trim() : '');
      const desc = this.data.description || '';
      if (!name) { UI.toast('请先填写目标名称'); return; }
      const key = Store.getApiKey();
      if (!key && s.apiProvider !== 'ollama') { UI.toast('请先在「更多 → AI 配置」填写 API Key'); return; }
      const statusEl = $('#w-ai-status');
      if (statusEl) statusEl.textContent = '⏳ AI 思考中…';
      const aiBtn = $('#w-ai');
      if (aiBtn) aiBtn.disabled = true;
      try {
        const dur = Store.daysBetween(this.data.startDate || Store.today(), this.data.endDate || Store.addDays(Store.today(), 90)) || 90;
        const result = await LLM.breakdownGoal({
          goalName: name,
          goalDesc: desc,
          type: this.data.type,
          durationDays: dur,
          settings: { endpoint: s.apiEndpoint, model: s.apiModel, apiKey: key, useProxy: s.useProxy }
        });
        if (statusEl) statusEl.textContent = '✅ ' + (result.plan || '已生成');
        if (result.suggestion) {
          this.data.checkInFrequency = result.suggestion.includes('工作日') ? 'workday' : result.suggestion.includes('每天') ? 'daily' : 'custom';
          const dayMap = { '每天': [0,1,2,3,4,5,6], '工作日': [1,2,3,4,5] };
          if (dayMap[result.suggestion]) this.data.customFrequency = dayMap[result.suggestion];
        }
        if (result.milestones && result.milestones.length) {
          this.data.milestones = result.milestones.map(m => ({
            title: m.title || '里程碑',
            days: Math.max(1, Math.min(dur, parseInt(m.days, 10) || Math.round(dur / result.milestones.length)))
          }));
        }
        UI.duckPop('🐤 AI 帮你拆好啦！');
        this.render();
      } catch (e) {
        if (statusEl) statusEl.textContent = '❌ 失败';
        UI.toast('AI 拆解失败: ' + e.message);
      } finally {
        if (aiBtn) aiBtn.disabled = false;
      }
    }
  };

  /* ---------- 路由 ---------- */
  const App = {
    currentPage: 'home',

    init() {
      // 启动画面
      setTimeout(() => {
        $('#splash-screen').classList.add('fade-out');
        $('#app').classList.remove('hidden');
        // 液态玻璃：app 可见后重建折射贴图（hidden 时尺寸为 0）
        if (window.LiquidGlass) LiquidGlass.refresh();
      }, 600);

      // 导航
      $$('#app-nav a').forEach(a => {
        a.onclick = e => {
          e.preventDefault();
          this.go(a.dataset.page);
        };
      });

      // FAB
      this.addFab();

      // 宠物数值回落
      Pet.tick();

      // 自动归档检查（超期30天未打卡）
      setTimeout(() => this.checkAutoArchive(), 1200);
      // 里程碑到期提醒
      setTimeout(() => this.checkMilestoneDue(), 2400);

      // 今日页
      this.go('home');

      // 液态玻璃：边缘折射膨胀（完整复刻）
      if (window.LiquidGlass) LiquidGlass.init();

      // 每日打卡提醒（简单的本地提醒文案）
      setInterval(() => {
        const s = S().settings;
        if (!s.remindTime) return;
        const now = new Date();
        const hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        if (hm === s.remindTime) {
          const pending = Stats.pendingToday();
          if (pending.length) UI.duckPop('🐤 该打卡啦！还有 ' + pending.length + ' 个目标等着你');
        }
      }, 30000);
    },

    go(page) {
      this.currentPage = page;
      $$('#app-nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.page === page);
      });
      const titles = { home: '小目标', calendar: '打卡日历', quadrant: '四象限', focus: '番茄钟', stats: '统计', more: '更多' };
      $('#page-title').textContent = titles[page] || '小目标';
      // 停止番茄钟声音
      if (page !== 'focus') this.stopNoiseIfRunning();
      if (Page[page]) Page[page].call(Page);
      this.renderFab(page);
    },

    stopNoiseIfRunning() {
      if (Page._noiseCtx) Page.stopNoise();
    },

    /* 自动归档：超截止日期30天未打卡的目标 → 提示延期/放弃 */
    checkAutoArchive() {
      const data = S();
      const today = Store.today();
      const expired = data.goals.filter(g =>
        g.status === 'active' &&
        today > Store.addDays(g.endDate, 30) &&
        !data.checkins.some(c => c.goalId === g.id && c.date > g.endDate)
      );
      if (!expired.length) return;
      let html = '<h3 class="modal-title">目标可能已搁置</h3>';
      html += '<p style="font-size:13px;color:var(--ink-2);text-align:center;margin-bottom:14px">以下目标已超过截止日期 30 天没有打卡，要延期还是放弃？</p>';
      expired.forEach(g => {
        html += '<div class="card" style="margin-bottom:10px">';
        html += '<div style="font-size:14px;font-weight:600;margin-bottom:8px">' + esc(g.name) + '</div>';
        html += '<div class="goal-actions">';
        html += '<button class="btn btn-sm btn-olive" data-ext="' + g.id + '">延期30天</button>';
        html += '<button class="btn btn-sm btn-ghost" data-abd="' + g.id + '">放弃</button>';
        html += '</div></div>';
      });
      html += '<button class="btn btn-block" id="aa-close" style="margin-top:4px">暂不处理</button>';
      UI.openModal(html);
      $$('[data-ext]').forEach(b => {
        b.onclick = () => {
          const gid = b.dataset.ext;
          Goals.update(gid, { endDate: Store.addDays(Store.getGoal(gid).endDate, 30) });
          UI.toast('已延期 30 天 🐤');
          UI.closeModal();
        };
      });
      $$('[data-abd]').forEach(b => {
        b.onclick = () => {
          Goals.setStatus(b.dataset.abd, 'abandoned');
          UI.toast('已标记为放弃（没关系，随时可重新开始）');
          UI.closeModal();
        };
      });
      $('#aa-close').onclick = () => UI.closeModal();
    },

    /* 里程碑到期提醒 */
    checkMilestoneDue() {
      const data = S();
      const today = Store.today();
      const due = [];
      data.goals.forEach(g => {
        if (g.status !== 'active') return;
        (g.milestones || []).forEach(m => {
          if (m.status === 'pending' && m.targetDate && m.targetDate < today) {
            const p = Stats.progress(g);
            due.push('📍 「' + g.name + '」里程碑「' + m.title + '」时间到了，当前进度 ' + Math.round(p.pct) + '%');
          }
        });
      });
      if (due.length) UI.duckPop(due[0]);
    },

    addFab() {
      if ($('#fab')) return;
      const fab = document.createElement('button');
      fab.id = 'fab';
      fab.className = 'fab';
      fab.innerHTML = icon('plus');
      fab.onclick = () => GoalWizard.open();
      document.body.appendChild(fab);
    },

    renderFab(page) {
      const fab = $('#fab');
      if (!fab) return;
      if (page === 'home' || page === 'calendar') fab.classList.remove('hidden');
      else fab.classList.add('hidden');
    }
  };

  /* ---------- 目标详情 ---------- */
  Page.goalDetail = function (gid) {
    const g = Store.getGoal(gid);
    if (!g) return this.home();
    const p = Stats.progress(g);
    const today = Store.today();
    const checkins = S().checkins.filter(c => c.goalId === gid).sort((a, b) => b.date.localeCompare(a.date));
    const records = S().checkins.filter(c => c.goalId === gid);

    let html = '<button class="btn btn-ghost btn-sm" id="gd-back" style="margin-bottom:12px">' + icon('chevronLeft') + ' 返回</button>';
    html += '<div class="card">';
    html += '<div class="goal-head"><div><div class="goal-name">' + esc(g.name) + '</div>';
    html += '<div class="goal-cat">' + esc(g.category) + ' · ' + Goals.typeName(g.type) + ' · ' + esc(g.startDate) + ' → ' + esc(g.endDate) + '</div></div></div>';
    html += '<div class="goal-progress"><div class="progress-bar"><div class="progress-fill" style="width:' + p.pct + '%"></div></div>';
    html += '<div class="progress-text"><span>' + esc(this.progressLabel(g, p)) + '</span><span>' + Math.round(p.pct) + '%</span></div></div>';

    // 量化型：手动录入进度
    if (g.type === 'quantitative' && g.status === 'active') {
      html += '<div class="freq-row" style="margin-top:12px">';
      html += '<input class="form-input" id="gd-value" type="number" placeholder="本次' + esc(g.unit || '数值') + '" style="flex:1">';
      html += '<input class="form-input" id="gd-note" placeholder="备注(可选)" style="flex:1.6">';
      html += '<button class="btn" id="gd-add">' + icon('check') + ' 记录</button>';
      html += '</div>';
    }

    // 里程碑型：显示并可完成
    if (g.type === 'milestone' && g.milestones && g.milestones.length) {
      html += '<div class="milestones" style="margin-top:12px">';
      g.milestones.forEach((m, i) => {
        const done = m.status === 'achieved';
        html += '<div class="milestone-item">' +
          '<span class="ms-dot ' + (done ? 'achieved' : 'current') + '">' + (done ? icon('check') : (i + 1)) + '</span>' +
          '<span class="ms-title ' + (done ? 'done-ms' : '') + '">' + esc(m.title) + '</span>' +
          '<span class="ms-date">' + (done ? (m.achievedDate || '已完成') : (m.targetDate || '')) + '</span>' +
          (!done && g.status === 'active' ? '<button class="btn btn-sm btn-olive" data-ms="' + m.id + '">完成</button>' : '') +
          '</div>';
      });
      html += '</div>';
    }
    html += '</div>';

    // 记录列表
    html += '<div class="card"><div class="card-title">' + icon('calendar') + ' 打卡记录 (' + records.length + ')</div>';
    if (records.length) {
      const recent = records.slice(-20).reverse();
      recent.forEach(r => {
        const editable = r.date === today;
        html += '<div class="record-item"><span class="record-date">' + r.date + '</span>' +
          '<span class="record-note">' + (r.source === 'makeup' ? '补卡' : (r.value ? '+' + r.value + (g.unit || '') : '✓')) + (r.note ? ' · ' + esc(r.note) : '') + '</span>' +
          (editable ? '<button class="q-edit" data-rid="' + r.id + '" style="border:none;background:none;color:var(--primary);cursor:pointer;font-size:12px;flex-shrink:0">编辑</button>' : '') +
          '<button class="q-del" data-del="' + r.id + '" style="border:none;background:none;color:var(--ink-3);cursor:pointer">✕</button></div>';
      });
    } else {
      html += '<p style="text-align:center;color:var(--ink-3);font-size:13px;padding:10px">还没有打卡记录</p>';
    }
    html += '</div>';

    // 操作
    html += '<div class="step-btns">';
    if (g.status === 'active') {
      html += '<button class="btn btn-ghost" style="flex:1" data-status="archived">' + icon('archive') + ' 归档</button>';
      html += '<button class="btn btn-danger" style="flex:1" id="gd-del">' + icon('trash') + ' 删除</button>';
    } else if (g.status === 'archived') {
      html += '<button class="btn btn-olive" style="flex:1" data-status="active">恢复进行</button>';
      html += '<button class="btn btn-danger" style="flex:1" id="gd-del">删除</button>';
    } else if (g.status === 'abandoned') {
      html += '<button class="btn btn-olive" style="flex:1" data-status="active">重新开始</button>';
      html += '<button class="btn btn-danger" style="flex:1" id="gd-del">删除</button>';
    } else {
      html += '<button class="btn btn-ghost" style="flex:1" data-status="active">重新开始</button>';
      html += '<button class="btn btn-danger" style="flex:1" id="gd-del">删除</button>';
    }
    html += '</div>';

    $('#main-content').innerHTML = html;

    $('#gd-back').onclick = () => this.home();
    $('#gd-add') && ($('#gd-add').onclick = () => {
      const v = parseFloat($('#gd-value').value);
      if (!v || v <= 0) { UI.toast('请输入本次数值'); return; }
      const note = $('#gd-note').value.trim();
      const ms = Goals.checkin(g, v, note);
      Pet.onCheckin(Stats.curStreak(), !!ms);
      if (ms) UI.celebrate('🎉', '里程碑达成！', ms.title);
      this.goalDetail(gid);
    });
    $$('[data-ms]').forEach(b => {
      b.onclick = () => {
        const m = g.milestones.find(x => x.id === b.dataset.ms);
        if (m && m.status === 'pending') {
          m.status = 'achieved';
          m.achievedDate = Store.today();
          Goals.update(g.id, { milestones: g.milestones });
          if (g.milestones.every(x => x.status === 'achieved')) {
            Goals.setStatus(g.id, 'completed');
            UI.celebrate('👑', '目标完成！', '「' + g.name + '」全部里程碑达成');
            Pet.onCheckin(Stats.curStreak(), true);
          } else {
            Pet.onCheckin(Stats.curStreak(), true);
          }
          this.goalDetail(gid);
        }
      };
    });
    $$('.q-del').forEach(el => {
      el.onclick = () => { Store.removeCheckin(el.dataset.del); this.goalDetail(gid); };
    });
    /* 编辑当天打卡记录（24小时内） */
    $$('.q-edit').forEach(el => {
      el.onclick = () => {
        const r = S().checkins.find(c => c.id === el.dataset.rid);
        if (!r) return;
        let h = '<h3 class="modal-title">编辑打卡记录</h3>';
        if (g.type === 'quantitative') {
          h += '<div class="form-group"><label class="form-label">本次数值 (' + esc(g.unit || '') + ')</label><input class="form-input" id="re-val" type="number" value="' + (r.value || '') + '"></div>';
        }
        h += '<div class="form-group"><label class="form-label">备注</label><input class="form-input" id="re-note" value="' + esc(r.note || '') + '" placeholder="可选"></div>';
        h += '<div class="step-btns"><button class="btn btn-ghost" style="flex:1" id="re-cancel">取消</button><button class="btn" style="flex:1" id="re-save">' + icon('check') + ' 保存</button></div>';
        UI.openModal(h);
        $('#re-cancel').onclick = () => UI.closeModal();
        $('#re-save').onclick = () => {
          if (g.type === 'quantitative') {
            const oldV = r.value || 0;
            const newV = parseFloat($('#re-val').value) || 0;
            const diff = newV - oldV;
            g.currentValue = Math.max(0, (g.currentValue || 0) + diff);
            r.value = newV;
            Goals.update(g.id, { currentValue: g.currentValue });
          }
          r.note = $('#re-note').value.trim();
          Store.save();
          UI.closeModal();
          UI.toast('已保存修改');
          this.goalDetail(gid);
        };
      };
    });
    $$('[data-status]').forEach(b => {
      b.onclick = () => {
        Goals.setStatus(gid, b.dataset.status);
        UI.toast('已更新');
        this.goalDetail(gid);
      };
    });
    $('#gd-del').onclick = () => {
      UI.confirmModal('删除目标', '删除后「' + g.name + '」及其打卡记录将永久丢失。', '删除', () => {
        Goals.remove(gid);
        UI.toast('已删除');
        this.home();
      });
    };
  };

  /* 目标类型名 */
  Goals.typeName = function (t) {
    return { quantitative: '量化型', habit: '习惯型', milestone: '里程碑型' }[t] || t;
  };

  /* 今日页卡片点击：详情 */
  document.addEventListener('click', function (e) {
    const d = e.target.closest('[data-detail]');
    if (d) {
      Page.goalDetail(d.dataset.detail);
      return;
    }
    const c = e.target.closest('[data-check]');
    if (c && Page.currentPage === 'home') {
      const gid = c.dataset.check;
      const g = Store.getGoal(gid);
      if (g) {
        const ms = Goals.checkin(g, null, '');
        Pet.onCheckin(Stats.curStreak(), !!ms);
        if (ms) UI.celebrate('🎉', '里程碑达成！', '「' + g.name + '」· ' + ms.title);
        App.go('home');
      }
      return;
    }
    const u = e.target.closest('[data-uncheck]');
    if (u) {
      const gid = u.dataset.uncheck;
      const today = Store.today();
      Store.getCheckinsForDate(gid, today).forEach(c => Store.removeCheckin(c.id));
      UI.toast('已撤销今日打卡');
      App.go('home');
      return;
    }
  });

  /* 启动 */
  window.App = App;
  window.Page = Page;
  window.Goals = Goals;
  window.Stats = Stats;
  window.Pet = Pet;
  window.UI = UI;
  window.GoalWizard = GoalWizard;
  App.init();
})();
