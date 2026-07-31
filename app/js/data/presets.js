/* ============ API 供应商预设 ============ */
/* 全部 OpenAI Chat Completions 兼容：POST {endpoint} + Bearer Key
   数据核验日期：2026-07-31（官方文档） */
window.API_PRESETS = [
  {
    id: 'zhipu',
    name: '智谱 GLM',
    badge: '免费',
    badgeCls: 'api-free',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: ['glm-4.7-flash', 'glm-4.7-flashx', 'glm-4.5-air', 'glm-5.2'],
    defaultModel: 'glm-4.7-flash',
    note: 'glm-4.7-flash 完全免费，零成本 AI 首选',
    needsKey: true
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: '极低价',
    badgeCls: 'api-paid',
    endpoint: 'https://api.deepseek.com/chat/completions',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    defaultModel: 'deepseek-v4-flash',
    note: 'flash 输入1元/百万tokens；高峰(9-12/14-18点)价格×2',
    needsKey: true
  },
  {
    id: 'qwen',
    name: '通义千问',
    badge: '低价',
    badgeCls: 'api-paid',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
    defaultModel: 'qwen-plus',
    note: '阿里云百炼，需先开通模型服务',
    needsKey: true
  },
  {
    id: 'kimi',
    name: 'Kimi',
    badge: '低价',
    badgeCls: 'api-paid',
    endpoint: 'https://api.moonshot.cn/v1/chat/completions',
    models: ['kimi-k3', 'kimi-k2.6', 'kimi-k2.7-code'],
    defaultModel: 'kimi-k2.6',
    note: '长上下文与多模态能力强',
    needsKey: true
  },
  {
    id: 'openai',
    name: 'OpenAI',
    badge: '需代理',
    badgeCls: 'api-paid',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o-mini', 'gpt-4o', 'o3-mini'],
    defaultModel: 'gpt-4o-mini',
    note: '国内裸连不通，需代理或 VPN',
    needsKey: true
  },
  {
    id: 'ollama',
    name: 'Ollama 本地',
    badge: '离线',
    badgeCls: 'api-offline',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    models: ['llama3', 'qwen2.5', 'deepseek-r1', 'gemma2'],
    defaultModel: 'llama3',
    note: '完全本地免费、数据不出设备；需与服务器同一局域网',
    needsKey: false
  }
];

/* 自定义预设 = 用户手填 endpoint + model + key */
window.CUSTOM_PRESET = {
  id: 'custom',
  name: '自定义',
  badge: '',
  badgeCls: '',
  endpoint: '',
  models: [],
  defaultModel: '',
  note: '手动填写任意 OpenAI 兼容端点',
  needsKey: true
};
