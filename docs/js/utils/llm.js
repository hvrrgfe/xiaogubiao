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
