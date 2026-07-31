/* ============ AI 调用层（含 API 保护） ============
 * 安全模型：
 *  1. 默认走「本地代理」/api/proxy —— Key 仅存在于请求头，由本地 node server 持有转发，
 *     浏览器不直接接触供应商，避免 CORS 与 Key 被抓包（局域网内安全）。
 *  2. 若部署到静态托管（无 server.js），自动回退直连（需供应商支持 CORS）。
 *  3. 服务端可通过 .env 配置 AI_KEY/AI_ENDPOINT，此时前端无需带 Key（服务端持Key模式）。
 */
window.LLM = {
  baseUrl() {
    const loc = window.location;
    if (loc.protocol === 'http:' || loc.protocol === 'https:') return loc.origin;
    return 'http://localhost:3111';
  },

  /* 测试连接：向供应商发一个最小的 chat 请求，验证 Key 与端点可用 */
  async testConnection({ endpoint, model, apiKey, useProxy }) {
    const body = JSON.stringify({
      model,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'hi' }]
    });
    const res = await this._request({ endpoint, apiKey, useProxy, body });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.error && (data.error.message || data.error) || ('HTTP ' + res.status);
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return { ok: true, content: content || '', model: data.model || model };
  },

  /* 通用 Chat 调用，返回解析后的内容 */
  async chat({ systemPrompt, userPrompt, endpoint, model, apiKey, useProxy, maxTokens }) {
    const body = JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: maxTokens || 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });
    const res = await this._request({ endpoint, apiKey, useProxy, body });
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) {
      const msg = data.error && (data.error.message || data.error) || ('HTTP ' + res.status);
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  },

  async _request({ endpoint, apiKey, useProxy, body }) {
    const settings = window.__data.settings;
    const proxyOn = useProxy !== undefined ? useProxy : settings.useProxy;
    const key = apiKey !== undefined ? apiKey : Store.getApiKey();
    const ep = endpoint || settings.apiEndpoint;
    if (!ep) throw new Error('请先配置 API 端点');

    if (proxyOn) {
      // 本地代理模式（API 保护首选）
      const proxyUrl = this.baseUrl() + '/api/proxy';
      try {
        const res = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(key ? { 'Authorization': 'Bearer ' + key } : {}),
            'X-Target-Endpoint': ep
          },
          body
        });
        // 静态托管环境没有代理(404/405) → 自动回退直连
        if (res.status !== 404 && res.status !== 405) return res;
        console.warn('[LLM] 当前环境无本地代理，自动切换直连');
      } catch (e) {
        // 代理连接失败也回退直连（如：直接双击 index.html）
        console.warn('[LLM] 代理不可用，回退直连:', e.message);
      }
    }

    // 直连模式
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = 'Bearer ' + key;
    return fetch(ep, { method: 'POST', headers, body });
  },

  /* ---- AI 目标拆解 ---- */
  async breakdownGoal({ goalName, goalDesc, type, durationDays, settings }) {
    const systemPrompt =
      '你是目标管理专家。请把用户的大目标拆解成可执行的计划，只输出 JSON，不要输出任何其他文字。\n' +
      '输出格式：{"plan":"一句话执行计划","suggestion":"建议的打卡频率(每天/每周X次/自定义说明)","milestones":[{"title":"里程碑名称","days":从开始算的天数},{"title":"...","days":...}]}\n' +
      '规则：里程碑 2-5 个，按时间均匀分布；"days"必须是正整数且不超过总天数；每个里程碑要具体可衡量。';

    const userPrompt =
      '目标名称：' + goalName + '\n' +
      (goalDesc ? '目标描述：' + goalDesc + '\n' : '') +
      '目标类型：' + ({ quantitative: '量化型（有明确数字目标）', habit: '习惯型（固定频率坚持）', milestone: '里程碑型（分阶段完成）' }[type] || type) + '\n' +
      '总周期：' + durationDays + ' 天\n' +
      '请给出拆解计划。';

    const raw = await this.chat({ systemPrompt, userPrompt, ...settings });
    return this._parseJSON(raw);
  },

  /* ---- AI 智能分析（融合专业知识 · 自动询问后生成报告） ----
   * 输入: 用户对 4 个问题的回答 + App 内目标/打卡数据
   * 输出: 结构化分析报告 JSON
   */
  async smartAnalysis({ answers, appStats, settings }) {
    const systemPrompt =
      '你是「小目标」App 内置的目标管理专家顾问，融合科学依据给出专业、温暖、可执行的个性化分析。只输出 JSON，不要输出其他文字。\n\n' +
      '你必须融合以下科学研究：\n' +
      '1. Locke & Latham 目标设定理论：具体且有挑战的目标 + 及时反馈最有效；"尽力而为"类目标效果差\n' +
      '2. WOOP 四步法（Gollwitzer/Oettingen）：愿望-结果-障碍-计划，先想清楚结果再预演障碍\n' +
      '3. if-then 实施意图（Gollwitzer）："当X发生时，我就做Y"，642项测试元分析(2024)证实大幅提升执行率\n' +
      '4. 里程碑梯度效应：接近目标的努力提升，大目标拆小步动机更强\n' +
      '5. 正向激励优于惩罚：小目标App核心原则，中断后回归比连续更重要\n' +
      '6. 间隔重复（Ebbinghaus）：分散复习优于集中\n' +
      '7. 番茄工作法：25分钟专注+5分钟休息\n' +
      '8. 习惯回路：提示(Trigger)→惯例(Routine)→奖励(Reward)\n\n' +
      '输出格式：\n' +
      '{\n' +
      '  "score": 目标健康度0-100,\n' +
      '  "diagnosis": "对目标整体的一句话诊断",\n' +
      '  "strengths": ["优点1", "优点2"],\n' +
      '  "issues": [{"title":"问题标题","detail":"详细分析(引用科学依据)"}],\n' +
      '  "actions": [{"title":"行动建议","detail":"具体做法(引用科学依据，如if-then句式)"}],\n' +
      '  "encouragement": "一句正向鼓励(小胖鸭风格,不带责备)"\n' +
      '}';

    const userPrompt =
      '—— 用户对AI自动询问的回答 ——\n' +
      'Q1 最重要目标：' + (answers.goal || '（未回答）') + '\n' +
      'Q2 计划与里程碑：' + (answers.plan || '（未回答）') + '\n' +
      'Q3 最大障碍：' + (answers.blocker || '（未回答）') + '\n' +
      'Q4 投入自评：' + (answers.score || '（未回答）') + '\n\n' +
      '—— App 内真实数据 ——\n' +
      '进行中目标：' + appStats.activeGoals + ' 个\n' +
      '已完成目标：' + appStats.completed + ' 个\n' +
      '累计打卡：' + appStats.totalCheckins + ' 次\n' +
      '当前连续：' + appStats.curStreak + ' 天\n' +
      '最长连续：' + appStats.longestStreak + ' 天\n' +
      '目标列表：' + (appStats.goalNames || '无') + '\n\n' +
      '请给出融合专业知识的个性化分析报告。';

    const raw = await this.chat({
      systemPrompt, userPrompt,
      ...settings,
      maxTokens: 3000
    });
    return this._parseJSON(raw);
  },

  /* 解析模型输出中的 JSON（容错） */
  _parseJSON(text) {
    if (!text) throw new Error('AI 返回为空');
    let t = text.trim();
    // 去代码块
    t = t.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    try { return JSON.parse(t); } catch (e) {
      const m = t.match(/(\{[\s\S]*\})/);
      if (m) {
        try {
          return JSON.parse(m[1]
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/\/\/.*/g, '')
            .replace(/\/\*[\s\S]*?\*\//g, ''));
        } catch (e2) { /* fallthrough */ }
      }
      throw new Error('AI 输出不是有效 JSON: ' + t.slice(0, 120));
    }
  }
};
