import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'seed.json');
const RUNTIME_FILE = path.join(__dirname, 'data', 'runtime.json');
const PORT = Number(process.env.PORT || 4173);

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch { return fallback; }
};
const seed = readJson(DATA_FILE, {});
const state = readJson(RUNTIME_FILE, structuredClone(seed));

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

function persist() {
  fs.writeFileSync(RUNTIME_FILE, JSON.stringify(state, null, 2), 'utf8');
}
function json(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function notFound(res) { json(res, { error: 'Not found' }, 404); }
function body(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function findExperiment(id) { return state.experiments.find(item => item.id === id); }
function findMeeting(id) { return state.meetings.find(item => item.id === id); }
function buildOverview() {
  return {
    meta: state.meta, metrics: state.metrics, pipeline: state.pipeline, meetings: state.meetings,
    experiments: state.experiments, knowledge: state.knowledge, tasks: state.tasks, activity: state.activity,
    generatedAt: new Date().toISOString()
  };
}

function deterministicAnalysis(meeting) {
  const isFailure = meeting.type === '结果复盘';
  return {
    meetingId: meeting.id,
    title: meeting.title,
    mode: 'demo-adapter',
    connector: 'Feishu Meeting AI / contract-ready',
    confidence: isFailure ? 0.93 : 0.96,
    elapsed: '1.8s',
    decisions: isFailure ? [
      { label: '根因判断', value: '预热时间与湿度波动共同导致结晶异常', evidence: '00:18:22 - 00:23:10' },
      { label: '调整策略', value: '下一轮将环境传感器数据绑定至实验上下文', evidence: '00:31:08 - 00:34:42' },
      { label: '复用结论', value: '同步至失败案例库，作为 A-09 风险规则样本', evidence: '00:45:02 - 00:49:18' }
    ] : [
      { label: '方案决策', value: 'B-17-03 进入小试，采用低温梯度方案', evidence: '00:21:06 - 00:23:40' },
      { label: '风险提示', value: '高浓度溶剂比例可能造成晶型漂移', evidence: '00:27:12 - 00:29:04' },
      { label: '知识关联', value: '命中 B-11 历史方案，预计减少 1.5 天试错', evidence: '00:32:10 - 00:35:36' }
    ],
    actions: [
      { title: isFailure ? '补录 A-09 环境湿度曲线' : '确认 B-17-03 小试排程', owner: isFailure ? '周启明' : '林岚', due: '今天 18:00', priority: 'high' },
      { title: '将会议结论写入知识库', owner: 'AI 研发助理', due: '自动执行', priority: 'normal' }
    ],
    suggestedKnowledge: [
      { title: 'B-11 低温梯度晶型筛选最优参数', score: 0.94, reason: '参数结构高度相似' },
      { title: '实验异常上报与责任分派规则', score: 0.75, reason: '可复用风险闭环' }
    ]
  };
}

async function api(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, { ok: true, service: 'labflow-api', timestamp: new Date().toISOString() });
  if (req.method === 'GET' && url.pathname === '/api/overview') return json(res, buildOverview());
  if (req.method === 'GET' && url.pathname === '/api/experiments') return json(res, { items: state.experiments });
  if (req.method === 'GET' && url.pathname === '/api/knowledge') return json(res, { items: state.knowledge });

  const expMatch = url.pathname.match(/^\/api\/experiments\/([^/]+)$/);
  if (req.method === 'GET' && expMatch) {
    const experiment = findExperiment(expMatch[1]);
    return experiment ? json(res, { item: experiment }) : notFound(res);
  }
  if (req.method === 'POST' && expMatch && url.pathname.endsWith('/status') === false) {
    const experiment = findExperiment(expMatch[1]);
    if (!experiment) return notFound(res);
    const payload = await body(req);
    const allowed = ['方案研讨', '参数评审', '实验执行', '结果复盘', '知识复用'];
    if (!allowed.includes(payload.stage)) return json(res, { error: 'Unsupported stage' }, 422);
    experiment.stage = payload.stage;
    experiment.updated = '刚刚';
    persist();
    return json(res, { item: experiment });
  }

  const meetingMatch = url.pathname.match(/^\/api\/meetings\/([^/]+)\/analyze$/);
  if (req.method === 'POST' && meetingMatch) {
    const meeting = findMeeting(meetingMatch[1]);
    if (!meeting) return notFound(res);
    const analysis = deterministicAnalysis(meeting);
    meeting.status = 'analyzed';
    state.activity.unshift({ time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), title: 'AI 解析完成', detail: `${meeting.title} 已提炼 ${analysis.decisions.length} 条决策与 ${analysis.actions.length} 个行动项`, tone: 'mint' });
    state.activity = state.activity.slice(0, 6);
    state.metrics.savedHours += 1;
    persist();
    return json(res, { analysis });
  }

  if (req.method === 'POST' && url.pathname === '/api/tasks') {
    const payload = await body(req);
    if (!payload.title || !payload.owner) return json(res, { error: 'title and owner are required' }, 422);
    const task = { id: `task-${randomUUID().slice(0, 8)}`, title: String(payload.title).slice(0, 120), owner: String(payload.owner).slice(0, 40), due: payload.due || '待排期', priority: payload.priority || 'normal', status: 'todo', source: payload.source || 'manual' };
    state.tasks.unshift(task);
    persist();
    return json(res, { item: task }, 201);
  }

  if (req.method === 'POST' && url.pathname === '/api/search') {
    const payload = await body(req);
    const query = String(payload.query || '').trim().toLowerCase();
    if (!query) return json(res, { query, items: [] });
    const pool = [
      ...state.knowledge.map(item => ({ ...item, sourceType: 'knowledge' })),
      ...state.experiments.map(item => ({ ...item, title: `${item.code} ${item.name}`, kind: 'experiment', score: 0.68, source: item.insight, freshness: item.updated, image: item.image }))
    ];
    const items = pool.filter(item => `${item.title} ${item.kind} ${item.source}`.toLowerCase().includes(query)).slice(0, 8);
    return json(res, { query, items });
  }
  return notFound(res);
}

function serveStatic(req, res, url) {
  let requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  if (requested.includes('..')) return notFound(res);
  const file = path.join(PUBLIC_DIR, requested);
  if (!file.startsWith(PUBLIC_DIR)) return notFound(res);
  fs.stat(file, (error, info) => {
    if (error || !info.isFile()) return notFound(res);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': requested.endsWith('.html') ? 'no-store' : 'public, max-age=3600' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    json(res, { error: 'Internal server error' }, 500);
  }
});
server.listen(PORT, () => console.log(`LabFlow running at http://localhost:${PORT}`));
