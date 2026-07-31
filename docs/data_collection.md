# 「小目标」网页版 · 相关资料搜集
> 为「自行导入API + API保护 + 网页(PWA)」三项需求的落地搜集整理
> 版本 v0.1 ｜ 日期 2026-07-31 ｜ 依据：产品设计文档 v1.0 + 在线核验

---

## 目录
- [一、需求解读](#一)
- [二、主流大模型 API 接入卡片（支撑"自行导入API"）](#二)
- [三、API 保护方案（支撑"API保护"）](#三)
- [四、可复用的现有代码（全日健康已实现）](#四)
- [五、成本测算与模型推荐](#五)
- [六、竞品数据（PlanJoy 定价锚点）](#六)
- [七、可引用的循证科学依据（App内机制的设计支撑）](#七)

---

## <a name="一"></a>一、需求解读

用户新需求四个关键词，本质是把「小目标」从"内含本地规则AI"的纯离线App，
升级为 **手机优先网页/PWA + 用户自带API Key驱动真实大模型AI** 的形态：

| 关键词 | 含义 | 对应文档功能 |
|--------|------|-------------|
| **自行导入API** | 用户自己填 API Key / endpoint / 模型名（OpenAI·DeepSeek·通义·智谱·Kimi·Ollama等） | P11 AI目标拆解、P12 人格适配推荐、小胖鸭对话 |
| **API保护** | Key 不暴露在前端 JS / 不被人抓包盗用；公网部署下不被当"公开代理"滥用 | 技术架构、安全 |
| **网页** | 手机优先 PWA，本地存储（localStorage/IndexedDB），与全日健康/远见计划形态一致 | 全模块 |
| **先搜集数据** | 本文件：把接入参数、保护方案、成本数据先核验整理 | — |

> 关键结论：**AI 拆解/推荐这类任务，真实大模型远比本地规则引擎强**，
> 且国内有多款"免费/极便宜"模型（智谱 GLM-4.7-Flash 免费、DeepSeek 1元/百万输入、通义 qwen-plus），
> 用户"自备Key"甚至能**零成本**获得 AI 能力。这是本方案成立的经济基础。

---

## <a name="二"></a>二、主流大模型 API 接入卡片（支撑"自行导入API"）

> 全部为 **OpenAI Chat Completions 兼容** 格式：`POST {base_url}/chat/completions`
> 鉴权：`Authorization: Bearer {API_KEY}`
> Body：`{model, messages:[{role,system|user|assistant,content}], temperature, max_tokens, response_format?}`

### ① OpenAI —— 全球基准（国内需代理）
| 项 | 值 |
|----|----|
| Base URL | `https://api.openai.com/v1` |
| 端点 | `https://api.openai.com/v1/chat/completions` |
| 常用模型 | gpt-4o / gpt-4o-mini / o3-mini |
| 价格 | gpt-4o-mini 输入$0.15/1M·输出$0.60/1M；gpt-4o 输入$2.5/1M·输出$10/1M |
| 备注 | 国内裸连被墙（实测本环境 curl 返回 http 000），需代理或改用国内厂商 |

### ② DeepSeek —— 国产高性价比明星
| 项 | 值 |
|----|----|
| Base URL | `https://api.deepseek.com`（OpenAI格式）|
| 端点 | `https://api.deepseek.com/chat/completions` |
| 当前模型 | **deepseek-v4-flash** / **deepseek-v4-pro**（2026已更新至V4）|
| 价格 | v4-flash：输入缓存命中0.02元、未命中1元/1M，输出2元/1M；v4-pro：3元输入/6元输出 |
| 上下文 | 1M；输出最大384K；支持 JSON Output / Tool Calls / Responses API(v4-flash) |
| 峰谷定价 | ⚠️ 高峰(北京时间9:00-12:00、14:00-18:00)价格×2。**API拆解建议避开高峰或用flash** |
| 备注 | 中文强、便宜，**最适合"小目标"的AI拆解/推荐**。可自建key即用 |

### ③ 通义千问(阿里云百炼) —— 全系列覆盖
| 项 | 值 |
|----|----|
| Base URL | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| 端点 | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` |
| 常用模型 | qwen-plus / qwen-turbo / qwen-max、qwen-long |
| 备注 | 业务空间域名需 `{WorkspaceId}`，个人可用 dashscope 旧域名；**KEY按地域独立**；三方直供(DeepSeek/Kimi/GLM)也能在这买 |
| 支持 | JSON Mode、Tool、多模态(qwen-vl)、流式 |

### ④ 智谱 GLM —— 有免费模型（最佳"零成本AI"）
| 项 | 值 |
|----|----|
| Base URL | `https://open.bigmodel.cn/api/paas/v4` |
| 端点 | `https://open.bigmodel.cn/api/paas/v4/chat/completions` |
| 模型 & 价格 | **GLM-4.7-Flash：完全免费**；GLM-4.7-FlashX：0.5输入/3输出元；GLM-4.5-Air：0.8/2元；GLM-5.2：8/28元 |
| 上下文 | FLashX 200K；GLM-5.2 1M |
| 备注 | 还提供 Search-Pro 等搜索工具；GLM-4-Flash微调。**免费Flash = 理想默认项** |

### ⑤ Kimi(月之暗面) —— 长上下文多模态
| 项 | 值 |
|----|----|
| Base URL | `https://api.moonshot.cn/v1` |
| 端点 | `https://api.moonshot.cn/v1/chat/completions` |
| 模型 | kimi-k3（旗舰，1M ctx）、kimi-k2.6、kimi-k2.7-code |
| 备注 | 兼容OpenAI；支持 JSON Mode、多模态(文本/图片/视频)、工具调用；官方建议把 Key 放环境变量 |

### ⑥ Ollama —— 完全本地（零成本·离线·隐私最强）
| 项 | 值 |
|----|----|
| Base URL | `http://localhost:11434/v1` 或局域网 `http://192.168.x.x:11434/v1` |
| 端点 | `http://localhost:11434/v1/chat/completions` |
| 模型 | llama3 / qwen2.5 / deepseek-r1 等本地模型 |
| 鉴权 | 无 Key（空 Authorization）|
| 备注 | 需与 node server 同局域网；**离线可用、数据不出设备**，隐私最彻底 |

### ⑦ 豆包(火山方舟) —— 可选
| 项 | 值 |
|----|----|
| Base URL | `https://ark.cn-beijing.volces.com/api/v3`（OpenAI兼容）|
| 端点 | `https://ark.cn-beijing.volces.com/api/v3/chat/completions` |
| 备注 | 官方文档按"接入点ID"调用不便，建议作为高级配置项，需用户自行确认 |

---

## <a name="三"></a>三、API 保护方案（支撑"API保护"）

### 3.1 核心原则（全网共识）
> **前端"天生透明"**，任何写在 JS 里、发在请求里的 Key 都能被 DevTools / 抓包看到。
> 唯一稳妥方案 = **服务端持有密钥 + 后端代理转发**（企搜多篇一致结论）。

### 3.2 四种保护强度（由弱到强）

| 方案 | 说明 | Key是否暴露 | 适用 |
|------|------|:-----------:|------|
| **A. 前端直连** | 浏览器直接 POST 到供应商 | ❌ 完全暴露（带在JS/请求头）| 仅纯静态托管且图省事 |
| **B. localStorage混淆** | Key存浏览器本地Storage(XOR+Base64) | ⚠️ 本机可见（防意外截屏，非真加密）| 纯本地个人用 |
| **C. 本地node代理** | 浏览器→本地node(server.js)/api/proxy→供应商，Key只存在于本机进程 | ✅ 局域网内安全 | **目标形态**（参考全日健康）|
| **D. 服务端配置Key** | Key存服务器环境变量 .env，前端完全没有Key | ✅✅ 最强 | 部署到公网/给自己和别人用 |

### 3.3 关键安全风险与对策（重点）

| 风险 | 场景 | 对策 |
|------|------|------|
| **抓包盗 Key** | 浏览器请求被中间人/插件抓取 | 方案C/D：Key不出本机/不出服务器；用HTTPS |
| **公网被当公开代理** | ngrok/cpolar 穿透后任何人可用你的 server 带自己Key或你配置的Key白嫖 | 见下方"公网护栏" |
| **逆向前端JS** | 把Key硬编码在bundle里 | 永不硬编码；Key来自用户输入/环境变量 |
| **Key混在日志** | 请求头Key被日志记录 | 代理层禁止打印/持久化 Authorization |
| **默认Key共享** | 多人共用一把Key被刷爆额度 | 强烈建议每人自备Key(方案C)、或服务端配额(方案D) |

### 3.4 公网部署时的"护栏"清单（防止代理被滥用）
仅想局域网自用，方案C(node server)就够；一旦穿透到公网，必须有：

1. **访问令牌(Access Token)**：浏览器访问代理前先验证一个你自己定的密钥（前端不易暴露的，可缓存），未验证一律拒绝，而不是直接转发任何请求。
2. **白名单目标域**：`X-Target-Endpoint` 只允许落到指定的供应商域名，禁止转发到任意URL（防止被用来 SSRF / 代理攻击内网）。
3. **禁止任意Key透传**：若走方案D（服务器持Key），则 **忽略前端传来的Authorization**，统一用服务器自己的Key——这样别人就算用你的接口也只是用你的额度，无法窃取你的Key；且可人为控制。
4. **限流 / 来源检查**：简单频率限制 + 必要的鉴权头。
5. **HTTPS**：穿透建议自备(cloudflared 免费 HTTPS / frp + 证书)。

> 落地建议给「小目标」：
> - **默认**：方案C（本地 node server 透明代理，复用全日健康 `/api/proxy`）。
> - **进阶**：`.env` 里预配置好某家 Key，前端无需填（方案D），供部署者一键启用，前端彻底无Key明码。
> - 前端即使走 localStorage 也会 **掩码显示密钥**，只显示后4位，避免肩屏/截图泄露。

---

## <a name="四"></a>四、可复用的现有代码（全日健康已实现，小目标可直接移植）

来源：`/var/minis/shared/quanri/`

### 4.1 透明代理 server.js（方案C核心）
- 端点 `POST /api/proxy`
- 请求头：`Authorization: Bearer {Key}` + `X-Target-Endpoint: {目标端点}`
- 服务器读取 Key 和目标端点 → 用 Node http/https 向供应商转发 → 返回结果
- **支持 http/https 双协议**（兼容本地 Ollama `http://192.168.x.x:11434`）
- 顺带提供 `/api/health`、`GET /` 静态服务

```js
// 核心逻辑（现有实现摘要）
const authHeader = req.headers['authorization'] || '';
const apiKey = authHeader.replace(/^Bearer\s+/i, '');
const targetEndpoint = req.headers['x-target-endpoint'] || process.env.AI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
const mod = url.protocol === 'http:' ? http : https;
// 用 apiKey 向 targetEndpoint 发起 POST，Content-Type/Body 原样透传
```

### 4.2 前端 callLLM（接入供应商 + 回退直连）
- 从本地 Store 读 `apiEndpoint` / `apiModel` / `useProxy`
- 开代理 → 打 `/api/proxy`；静态托管环境(`405/404`)自动回退直连
- 解析返回的 JSON（含代码块清洗、尾逗号去除），支持非流式整体返回
- **增强建议**：加 `response_format:{type:'json_object'}`，让 AI 稳定输出结构化拆解结果

### 4.3 API Key 本地存储（localStorage 混淆）
- `setApiKey`：`btoa('ak:'+key)` 存入；`getApiKey` 解码
- 注释明确：这是"防意外泄露的混淆，非加密"
- **增强建议**：掩码显示后4位 + 提醒"建议服务端持Key用.env"

---

## <a name="五"></a>五、成本测算与模型推荐

### 5.1 AI 目标拆解单次调用 token 估算
- 系统提示(拆解方法论)：~800 tokens
- 用户输入(目标描述/健康数据)：~300-800 tokens
- 输出(里程碑计划JSON)：~500-1000 tokens
- **单次合计 ≈ 2000-3000 tokens**（输入约1100-1600，输出约500-1000）

| 模型 | 单次拆解成本(估算) | 备注 |
|------|:-----------------:|------|
| 智谱 **GLM-4.7-Flash** | **¥0（免费）** | ✅ 推荐默认 |
| DeepSeek v4-flash | ~¥0.002 | ✅ 高峰外极便宜 |
| 通义 qwen-plus | ~¥0.002-0.004 | 稳定 |
| Kimi k2.6 | ~¥0.01 | 长文才值得 |
| Ollama 本地 | ¥0（离线） | 要自跑模型 |

> 结论：拆解类轻任务，**智谱Flash免费 or DeepSeek flash (避开高峰)** 最划算。
> 90分的规则引擎打底 + AI润色，几乎零成本。

### 5.2 推荐默认配置预设（"自行导入API"下拉）
```
[供应商预设]  [Base URL(endpoint)]                    [默认模型]       [计费]
OpenAI      https://api.openai.com/v1/chat/completions       gpt-4o-mini       $
DeepSeek    https://api.deepseek.com/chat/completions        deepseek-v4-flash $极低
通义千问    https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions  qwen-plus  $
智谱GLM     https://open.bigmodel.cn/api/paas/v4/chat/completions   glm-4.7-flash  免费
Kimi        https://api.moonshot.cn/v1/chat/completions      kimi-k2.6         $
Ollama(本地) http://localhost:11434/v1/chat/completions      llama3            ¥0离线
```
每个预设=「endpoint + 模型名」联动，用户只需填 Key；也允许"自定义"手动填。

---

## 附：后续开发待办（基于本文档）
- [ ] 写 server.js（含3.4公网护栏：访问令牌/域名白名单/忽略前端Key的服务端密钥模式）
- [ ] 写前端 AI 设置页（预设下拉+掩码Key+测试连接，复用全日健康"测试连接"）
- [ ] AI 拆解 prompt（稳定输出 JSON：breakdown+milestones+频率建议）
- [ ] localStorage/IndexedDB 数据模型落地（文档第七章 interface）

---

## <a name="六"></a>六、竞品数据（PlanJoy 定价锚点 · 在线核验2026）

### PlanJoy 当前定价（App Store 自动续费套餐）
| 套餐 | 价格 | 说明 |
|------|------|------|
| 连续包月 | **¥12/月** | 自动续费 |
| 连续包年 | **¥98/年** | 自动续费 |
| 永久会员 | **¥138 一次买断** | — |

> 与产品设计文档"¥88-148/年"区间吻合。作为对比营销锚点：
> 「小目标」承诺 ¥0 永久、无限目标、四象限/番茄钟/统计/导出全免费、宠物永远开心。
> 注意：竞品从 iOS-Only 的付费订阅切入，网页/PWA 全免费形态是我们差异化最大的空档。

### 补充竞品（学习/目标打卡赛道，App Store 在售）
- **番茄ToDo**：极简自律番茄钟，主打专注计时+数据统计。
- **极简计划**：待办+日历+番茄钟四象限，轻量 GTD/提醒工具。
- **我要做计划 / 打卡群等**：时间管理+学习打卡+工作记录。
> 共性的付费点：同步、统计、主题、去广告、多设备。"全免费+本地优先"仍是稀缺定位。

---

## <a name="七"></a>七、可引用的循证科学依据（App内机制的设计支撑）

> 以下为「小目标」各功能模块可直接引用的研究数据，用于产品文案、机制设计、
> 并可在 AI 拆解/推荐时作为 prompt 依据（增强"小胖鸭正向激励"等机制的合理性）。

| 机制 | 科学依据 | 数据/出处 |
|------|---------|----------|
| **目标设定 + 反馈** | Locke & Latham 目标设定理论：具体且有挑战的目标 + 及时反馈最有效 | 目标越明确，绩效越好（严格/适度挑战目标优于"尽力而为"）|
| **WOOP 四步法**（愿望-结果-障碍-计划）| Gollwitzer/Oettingen MCII | 行为改变效果显著（习惯/目标达成荟萃，效应量中等偏高）|
| **if-then 实施意图** | Gollwitzer（"当X时做Y"）| 大幅提升目标执行率；642项测试元分析（2024）支持有效性 |
| **连续打卡 / 连胜激励** | 行为链条 vs 中断恢复的动机研究 | 连胜提供即时正向反馈、降低放弃率（契合小胖鸭庆贺设计）|
| **正向激励 > 惩罚** | 增强/操作性条件作用（行为塑造）| 强化期更稳定；对应"小胖鸭永远开心、反而减轻中断负罪感"|
| **里程碑拆解** | 目标梯度效应（接近目标的努力提升）| 大目标拆小步 → 不断"接近"→ 动机更强（对应里程碑型）|
| **人格适配推荐** | IPIP-NEO-300（Johnson,2014）| 五因素(OCEAN)重测信度高，尽责性高者适合按计划推进等 |
| **间隔重复** | Ebbinghaus 遗忘曲线 + 间隔效应 | 分散复习优于集中（适合学习类目标的频率推荐）|
| **番茄工作法** | 专注/短休息的注意恢复 | 25min专注+5min休息提升持续专注（对应 P06）|
| **四象限法** | 艾森豪威尔矩阵（重要/紧急）| 时间管理基础框架（对应 P05）|

> 选句可直接用于 App 内"科学小贴士"：
> - "把大目标拆成小步子，每完成一步都离终点更近——这就是动力的来源。"
> - "明天具体在几点、做什么，比'我明天要努力'有用一百倍。"
> - "错过一天没关系，回来就好。小胖鸭从不责怪你，它只等你重新开始。🐤"

---

*数据搜集与核验完成。下一步可直接据此开发 server.js（含API保护）与前/后端骨架，或继续补充某一块（如Ollama详细配置、更多供应商）。*
