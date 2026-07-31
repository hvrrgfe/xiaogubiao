/**
 * 「小目标」· 一站式服务器（网页服务 + API 保护代理）
 *
 * 启动：node server.js                  # 默认端口 3111
 *       node server.js --port 8080      # 指定端口
 * 打开：http://localhost:3111 (本机)  /  http://192.168.x.x:3111 (同一 Wi-Fi 手机)
 *
 * ─── API 保护（防止 Key 泄露与被滥用）───
 * 1. 代理模式：浏览器把 Key 放在 Authorization 头发给本服务器，
 *    由本服务器向 AI 供应商转发 —— Key 不出本机，浏览器不直接接触供应商。
 * 2. 公网护栏（环境变量可开启）：
 *    - ACCESS_TOKEN=xxx     访问令牌：前端请求代理时必须带 X-Access-Token，
 *                            否则拒绝。防止公网任何人把你的代理当"公开中转"。
 *    - ALLOWED_DOMAINS=     目标域名白名单（逗号分隔，如 api.deepseek.com,
 *                            open.bigmodel.cn），X-Target-Endpoint 只允许落到白名单。
 *    - AI_KEY=sk-xxx        服务端持 Key 模式：忽略前端传来的 Key，统一用服务器
 *                           自己的 Key（最强保护，别人无法窃取你的 Key）。
 *    - RATE_LIMIT=60        每分钟代理请求上限（默认 60，防刷爆额度）。
 * 3. 静态托管（GitHub Pages 等）无此服务器，前端自动回退直连，需供应商支持 CORS。
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ---- 参数 ----
const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const PORT = (portArg > -1 && args[portArg + 1]) ? parseInt(args[portArg + 1], 10) : 3111;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function getLanIPs() {
  const ips = [];
  try {
    const ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach((name) => {
      (ifaces[name] || []).forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
      });
    });
  } catch (e) { /* 容器/模拟器可能无网卡 */ }
  return ips;
}

/* ---------- 静态文件 ---------- */
function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(ROOT, 'index.html'), (_, html) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

/* ---------- API 保护代理 ---------- */
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || '').split(',').map(s => s.trim()).filter(Boolean);
const SERVER_KEY = process.env.AI_KEY || '';
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '60', 10) || 60;
const ipCounts = {};

function rateLimited(ip) {
  const now = Math.floor(Date.now() / 60000); // 当前分钟
  const k = ip + ':' + now;
  ipCounts[k] = (ipCounts[k] || 0) + 1;
  // 清理旧记录（防内存膨胀）
  if (Math.random() < 0.01) {
    Object.keys(ipCounts).forEach(key => {
      if (!key.endsWith(':' + now)) delete ipCounts[key];
    });
  }
  return ipCounts[k] > RATE_LIMIT;
}

function handleProxy(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Target-Endpoint, X-Access-Token');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.url === '/api/health' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      service: 'xiaogubiao',
      guard: ACCESS_TOKEN ? 'token' : 'open',
      time: new Date().toISOString()
    }));
  }

  if (req.method !== 'POST') { res.writeHead(405); return res.end('POST only'); }

  const ip = (req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');

  // 护栏 1：访问令牌
  if (ACCESS_TOKEN && req.headers['x-access-token'] !== ACCESS_TOKEN) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized: 缺少访问令牌（请设置 X-Access-Token）' }));
  }

  // 护栏 4：限流
  if (rateLimited(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Too Many Requests: 请求过于频繁' }));
  }

  // 读取 Key 与目标端点
  const authHeader = req.headers['authorization'] || '';
  const clientKey = authHeader.replace(/^Bearer\s+/i, '');
  const targetEndpoint = req.headers['x-target-endpoint'] || process.env.AI_ENDPOINT || '';

  // 护栏 3：服务端持 Key 模式 —— 忽略前端 Key
  const apiKey = SERVER_KEY || clientKey;

  if (!apiKey) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Missing API Key (Authorization: Bearer ... 或服务端 AI_KEY)' }));
  }
  if (!targetEndpoint) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Missing X-Target-Endpoint' }));
  }

  let targetUrl;
  try { targetUrl = new URL(targetEndpoint); }
  catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: '无效的 endpoint: ' + targetEndpoint }));
  }

  // 护栏 2：目标域名白名单（防 SSRF / 被当任意中转）
  if (ALLOWED_DOMAINS.length && ALLOWED_DOMAINS.indexOf(targetUrl.hostname) === -1) {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'Forbidden: 目标域名 ' + targetUrl.hostname + ' 不在白名单内（ALLOWED_DOMAINS）'
    }));
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    try {
      const mod = targetUrl.protocol === 'http:' ? http : https;
      const proxyReq = mod.request({
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'http:' ? 80 : 443),
        path: targetUrl.pathname + targetUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Authorization': 'Bearer ' + apiKey,
        },
      }, proxyRes => {
        let data = '';
        proxyRes.on('data', c => data += c);
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });
      proxyReq.on('error', e => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });
      proxyReq.write(body);
      proxyReq.end();
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

/* ---------- 服务器 ---------- */
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  if (urlPath === '/api/proxy' || urlPath === '/proxy' || urlPath === '/api/health' || urlPath === '/health') {
    handleProxy(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLanIPs();
  const lines = [];
  lines.push('');
  lines.push('  🐤 小目标 · 一站式服务');
  lines.push('  ─────────────────────────────');
  lines.push(`  本机访问   http://localhost:${PORT}`);
  if (ips.length) {
    lines.push('  手机(同一 Wi-Fi):');
    ips.forEach(ip => lines.push(`             http://${ip}:${PORT}`));
  }
  lines.push('');
  lines.push('  API 保护状态:');
  lines.push(`    访问令牌   ${ACCESS_TOKEN ? '✅ 已开启' : '○ 未开启 (ACCESS_TOKEN)'}`);
  lines.push(`    域名白名单 ${ALLOWED_DOMAINS.length ? '✅ ' + ALLOWED_DOMAINS.join(',') : '○ 未限制 (ALLOWED_DOMAINS)'}`);
  lines.push(`    服务端持Key ${SERVER_KEY ? '✅ 已开启' : '○ 未开启 (AI_KEY)'}`);
  lines.push(`    限流       ${RATE_LIMIT} 次/分钟/IP`);
  lines.push('');
  lines.push('  公网访问(任选其一):');
  lines.push(`    cpolar      cpolar http ${PORT}`);
  lines.push(`    ngrok       ngrok http ${PORT}`);
  lines.push(`    cloudflared cloudflared tunnel --url http://localhost:${PORT}`);
  lines.push('');
  lines.push('  健康检查:');
  lines.push(`    curl http://localhost:${PORT}/api/health`);
  lines.push('');
  lines.push(`  Ctrl+C 停止  ·  端口 ${PORT} 监听 0.0.0.0`);
  lines.push('  ─────────────────────────────');
  lines.push('');
  console.log(lines.join('\n'));
});
