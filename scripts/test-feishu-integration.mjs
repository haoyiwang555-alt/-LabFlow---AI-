/* 集成验证：真实 server.js + mock 飞书
 * 1) 未配置凭证：infra.feishu=not-configured，解析 mode=demo-adapter
 * 2) 配置凭证(mock)：infra.feishu=connected；审批知识触发 bitable+message 写回并落 audit
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert';

const PORT = 4180;
const BASE = `http://127.0.0.1:${PORT}`;

const mock = http.createServer((req, res) => {
  let body = ''; req.on('data', c => (body += c));
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'POST' && req.url === '/open-apis/auth/v3/tenant_access_token/internal') {
      return res.end(JSON.stringify({ code: 0, tenant_access_token: 'mock-token-x', expire: 7200 }));
    }
    if (req.method === 'POST' && req.url.startsWith('/open-apis/bitable/v1/apps/')) return res.end(JSON.stringify({ code: 0, data: { record: { record_id: 'rec-x' } } }));
    if (req.method === 'POST' && req.url.startsWith('/open-apis/im/v1/messages')) return res.end(JSON.stringify({ code: 0, data: { message_id: 'msg-x' } }));
    if (req.method === 'GET' && req.url.startsWith('/open-apis/minutes/v1/minutes/mt-mock')) return res.end(JSON.stringify({ code: 0, data: { minute: { speech: { paragraphs: [{ speaker: '林岚', sentences: [{ text: 'B-17-03 低温梯度方案进入小试。' }] }] } } } }));
    res.writeHead(404); res.end(JSON.stringify({ code: 1, msg: 'unmocked' }));
  });
});
await new Promise(r => mock.listen(18990, '127.0.0.1', r));

const j = async (path, method = 'GET', body) => {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
};
const waitHealth = async (tries = 40) => {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('server 未就绪');
};

// ── Case 1: no feishu creds ──
const s1 = spawn(process.execPath, ['server.js'], { cwd: 'K:/项目/比赛/AI先锋未来人才大赛', env: { ...process.env, PORT: String(PORT), FEISHU_APP_ID: '', FEISHU_APP_SECRET: '' }, stdio: 'ignore' });
try {
  await waitHealth();
  const infra1 = await j('/api/infra/status');
  assert.strictEqual(infra1.data.items.feishu.status, 'not-configured', '无凭证 -> not-configured');
  console.log('✓ 未配置：infra.feishu =', infra1.data.items.feishu.status);
  const ana = await j('/api/meetings/mt-2407/analyze', 'POST', {});
  assert.strictEqual(ana.data.analysis.mode, 'demo-adapter', '未配置 -> demo-adapter');
  console.log('✓ 未配置：analyze.mode =', ana.data.analysis.mode);
} finally { s1.kill(); await new Promise(r => setTimeout(r, 300)); }

// ── Case 2: feishu creds (mock) ──
const s2 = spawn(process.execPath, ['server.js'], {
  cwd: 'K:/项目/比赛/AI先锋未来人才大赛',
  env: { ...process.env, PORT: String(PORT), FEISHU_BASE_URL: 'http://127.0.0.1:18990', FEISHU_APP_ID: 'cli_mock', FEISHU_APP_SECRET: 'mock_secret', FEISHU_GROUP_CHAT_ID: 'oc_mock_group', BITABLE_APP_TOKEN: 'app_mock', BITABLE_TABLE_ID: 'tbl_mock' },
  stdio: 'ignore'
});
try {
  await waitHealth();
  const infra2 = await j('/api/infra/status');
  assert.strictEqual(infra2.data.items.feishu.status, 'connected', '有凭证(mock) -> connected');
  console.log('✓ 配置(mock)：infra.feishu =', infra2.data.items.feishu.status, '|', infra2.data.items.feishu.detail);

  // SSE step copy reflects real connector
  const sse = await fetch(BASE + '/api/meetings/mt-2407/analyze-stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const text = await sse.text();
  assert.ok(text.includes('真实转写'), 'SSE 文案反映真实连接');
  console.log('✓ SSE 第 1 步文案：' + (text.split('\n').find(l => l.includes('真实转写')) || '').slice(0, 80));

  // knowledge approve triggers feishu sync
  const appr = await j('/api/knowledge/k-05/approve', 'POST', {});
  assert.strictEqual(appr.data.item.status, 'approved');
  await new Promise(r => setTimeout(r, 1200)); // 等待异步 feishuSync 完成
  const audit = await j('/api/audit');
  const synced = audit.data.items.filter(x => x.action === 'feishu-synced');
  assert.ok(synced.length >= 2, 'audit 出现 feishu-synced');
  console.log('✓ 审批触发飞书写回，audit feishu-synced =', synced.length, '条');
  synced.slice(0, 3).forEach(x => console.log('   -', x.detail));
} finally { s2.kill(); mock.close(); }
console.log('\n集成验证全部通过');
