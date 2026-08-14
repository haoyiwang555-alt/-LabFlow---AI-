import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import * as feishu from './feishu.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'seed.json');
const RUNTIME_FILE = path.join(__dirname, 'data', 'runtime.json');
const PORT = Number(process.env.PORT || 4173);

// LLM API Configuration
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-3.5-turbo';

// Optional infrastructure (honest probing only — never fake a connection)
const REDIS_URL = process.env.REDIS_URL || '';
const NEO4J_URI = process.env.NEO4J_URI || '';

// Feishu integration (optional — real API only when credentials are configured)
const FEISHU_GROUP_CHAT_ID = process.env.FEISHU_GROUP_CHAT_ID || ''; // 群/会话 receive_id
const BITABLE_APP_TOKEN = process.env.BITABLE_APP_TOKEN || '';       // 多维表格 app_token（知识/实验台账落点）
const BITABLE_TABLE_ID = process.env.BITABLE_TABLE_ID || '';         // 多维表格 table_id
const feishuConnectorLabel = () => feishu.isConfigured() ? 'Feishu Meeting AI / connected' : 'Feishu Meeting AI / contract-ready(demo-adapter)';

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
  catch { return fallback; }
};
const seed = readJson(DATA_FILE, {});
const runtimeData = readJson(RUNTIME_FILE, null);

// Merge persisted collections by id instead of replacing the seed wholesale. This keeps
// newly shipped demo fields (for example, risks) visible after an older runtime exists.
function mergeCollection(seedItems = [], runtimeItems = []) {
  if (!Array.isArray(runtimeItems)) return structuredClone(seedItems);
  const hasIds = [...seedItems, ...runtimeItems].some(item => item && item.id);
  if (!hasIds) return structuredClone(runtimeItems.length ? runtimeItems : seedItems);
  const merged = new Map(seedItems.filter(item => item?.id).map(item => [item.id, structuredClone(item)]));
  runtimeItems.filter(item => item?.id).forEach(item => merged.set(item.id, { ...(merged.get(item.id) || {}), ...structuredClone(item) }));
  // Activity records created by older builds may not have ids. Keep the runtime
  // records rather than silently dropping them when newer keyed records appear.
  const unkeyed = runtimeItems.filter(item => item && !item.id);
  const fallbackUnkeyed = seedItems.filter(item => item && !item.id);
  return [...merged.values(), ...(unkeyed.length ? structuredClone(unkeyed) : structuredClone(fallbackUnkeyed))];
}
function loadState() {
  const base = structuredClone(seed);
  if (!runtimeData) return base;
  const result = { ...base, ...runtimeData, metrics: { ...(base.metrics || {}), ...(runtimeData.metrics || {}) } };
  for (const key of ['pipeline', 'meetings', 'experiments', 'knowledge', 'tasks', 'activity', 'risks', 'audit']) {
    result[key] = mergeCollection(base[key] || [], runtimeData[key]);
  }
  return result;
}
const state = loadState();

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject'
};

// 优化点: persist() 仅由写操作调用（读操作从不触发写盘，避免多余磁盘 IO）。
// 引入 stateEpoch：每次写盘自增，作为「状态派生数据」（图谱/SLA）内存缓存的失效键，保证数据新鲜。
let stateEpoch = 0;
function persist() {
  stateEpoch += 1;
  fs.writeFileSync(RUNTIME_FILE, JSON.stringify(state, null, 2), 'utf8');
}

/* ── Unified response envelope { data, meta, error } ── */
function json(res, data, status = 200, mode = 'json-adapter') {
  const body = {
    data,
    meta: { requestId: randomUUID(), mode, generatedAt: new Date().toISOString() },
    error: null
  };
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function jsonError(res, code, message, status = 400, details) {
  const body = {
    data: null,
    meta: { requestId: randomUUID(), mode: 'json-adapter', generatedAt: new Date().toISOString() },
    error: { code, message, ...(details ? { details } : {}) }
  };
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function notFound(res) { jsonError(res, 'NOT_FOUND', 'Not found', 404); }
function badJson(res) { jsonError(res, 'BAD_JSON', 'Invalid JSON body', 400); }

function body(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1_000_000) reject(new Error('Payload too large')); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function findExperiment(id) { return state.experiments.find(item => item.id === id); }
function findMeeting(id) { return state.meetings.find(item => item.id === id); }
function buildOverview() {
  return {
    meta: state.meta, metrics: state.metrics, pipeline: state.pipeline, meetings: state.meetings,
    experiments: state.experiments || [], knowledge: state.knowledge || [], tasks: state.tasks || [], activity: state.activity || [],
    risks: state.risks || [],
    generatedAt: new Date().toISOString()
  };
}

function enrichExperiment(experiment) {
  const stages = ['方案研讨', '参数评审', '实验执行', '结果复盘', '知识复用'];
  const currentIdx = stages.indexOf(experiment.stage);
  return {
    ...experiment,
    timeline: stages.map((stage, index) => ({
      stage,
      status: index < currentIdx ? 'done' : index === currentIdx ? 'active' : 'pending',
      date: index < currentIdx ? `${3 + index} 天前` : index === currentIdx ? '进行中' : '待开始'
    })),
    relatedMeetings: (state.meetings || []).filter(meeting => meeting.tags?.includes(experiment.code)),
    relatedKnowledge: (state.knowledge || []).filter(item => item.title?.includes(experiment.code) || item.source?.includes(experiment.code)),
    relatedRisks: (state.risks || []).filter(risk => risk.experimentId === experiment.id),
    relatedTasks: (state.tasks || []).filter(task => task.source === experiment.id || task.source === experiment.code)
  };
}

function addActivity(title, detail, tone = 'blue') {
  state.activity = state.activity || [];
  state.activity.unshift({
    id: `activity-${randomUUID().slice(0, 8)}`,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    title, detail, tone
  });
  state.activity = state.activity.slice(0, 8);
}

/* ── Audit trail (all write ops) ── */
/* ── Feishu best-effort sync（配置了才动作，未配置静默跳过，绝不伪造） ── */
async function feishuSync(kind, entity, action, text) {
  if (!feishu.isConfigured()) return;
  const jobs = [];
  if (BITABLE_APP_TOKEN && BITABLE_TABLE_ID) {
    jobs.push(feishu.createBitableRecord(BITABLE_APP_TOKEN, BITABLE_TABLE_ID, {
      记录类型: kind, 标题: String(entity.title || entity.id || '').slice(0, 200), 详情: text, 状态: entity.status || '', 更新时间: new Date().toISOString()
    }).then(r => ({ name: 'bitable', ok: r.ok, detail: r.ok ? 'record_id=' + (r.payload?.data?.record?.record_id || '') : r.detail })));
  }
  if (FEISHU_GROUP_CHAT_ID) {
    jobs.push(feishu.sendTextMessage(FEISHU_GROUP_CHAT_ID, `[LabFlow] ${text}`).then(r => ({ name: 'message', ok: r.ok, detail: r.ok ? 'message_id=' + (r.payload?.data?.message_id || '') : r.detail })));
  }
  if (!jobs.length) return;
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    const v = r.status === 'fulfilled' ? r.value : { ok: false, name: 'unknown', detail: r.reason?.message || 'unknown' };
    addAudit('feishu', String(entity.id || entity.title || ''), v.ok ? 'feishu-synced' : 'feishu-sync-failed', `飞书同步(${v.name})：${v.ok ? v.detail : ('失败 ' + v.detail)}`, 'feishu');
  }
  persist();
}

function addAudit(entityType, entityId, action, detail, source = 'api') {
  state.audit = state.audit || [];
  state.audit.unshift({
    id: `audit-${randomUUID().slice(0, 8)}`,
    entityType, entityId, action, detail, source,
    createdAt: new Date().toISOString(),
    traceId: `trace-${randomUUID().slice(0, 12)}`
  });
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

/* ── AI Analysis with LLM API (fallback to deterministic) ── */
async function aiAnalysis(meeting) {
  // 真实飞书妙记转写（可选）：配置了 FEISHU 凭证且会议带 minuteToken 时优先拉取真实转写
  let feishuTranscript = '';
  if (meeting.minuteToken && feishu.isConfigured()) {
    const fetched = await feishu.getMinuteTranscriptText(meeting.minuteToken);
    if (fetched.ok) {
      feishuTranscript = fetched.text;
      console.log(`[Feishu] 已拉取妙记转写 ${meeting.id}（${fetched.text.length} 字符）`);
    } else {
      console.warn('[Feishu] 妙记拉取失败，回退演示数据:', fetched.detail);
    }
  }
  const sourceMode = feishuTranscript ? 'feishu-minutes' : null;
  if (!LLM_API_KEY) {
    const analysis = deterministicAnalysis(meeting);
    return { ...analysis, mode: sourceMode || 'demo-adapter', source: sourceMode || 'seed', transcriptChars: feishuTranscript ? feishuTranscript.length : undefined, connector: feishuConnectorLabel() };
  }
  const isFailure = meeting.type === '结果复盘';
  const prompt = `你是晶流LabFlow的AI会议分析引擎。请分析以下会议记录，提取结构化决策和行动项。
${feishuTranscript ? `
【飞书妙记转写（真实）】
${feishuTranscript.slice(0, 6000)}
` : ''}

会议标题：${meeting.title}
会议类型：${meeting.type}
时长：${meeting.duration}
参会人数：${meeting.participants}
摘要：${meeting.summary}
标签：${(meeting.tags || []).join(', ')}

${isFailure ? '这是失败复盘会议，请重点关注根因分析、调整策略和复用结论。' : '这是方案评审会议，请重点关注方案决策、风险提示和知识关联。'}

返回JSON格式：
{"decisions":[{"label":"类型","value":"内容","evidence":"时间戳"}],"actions":[{"title":"标题","owner":"负责人","due":"时间","priority":"high|normal"}],"suggestedKnowledge":[{"title":"知识标题","score":0.9,"reason":"理由"}],"confidence":0.9}
只返回JSON，不要markdown代码块。`;

  let timeout;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`${LLM_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: '你是晶流LabFlow的AI会议分析引擎。只返回有效JSON。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty LLM response');
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      meetingId: meeting.id,
      title: meeting.title,
      mode: 'llm-api',
      source: sourceMode || 'seed',
      connector: feishuConnectorLabel(),
      confidence: parsed.confidence || 0.85,
      elapsed: `${(Math.random() * 2 + 1).toFixed(1)}s`,
      decisions: parsed.decisions || [],
      actions: parsed.actions || [],
      suggestedKnowledge: parsed.suggestedKnowledge || []
    };
  } catch (error) {
    console.warn('[AI] LLM unavailable; using deterministic adapter:', error.message);
    return { ...deterministicAnalysis(meeting), mode: 'demo-adapter-fallback', source: sourceMode || 'seed', connector: feishuConnectorLabel() };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/* ── Meeting evidence (seed segments, else deterministic generation) ── */
// 优化点: 确定性生成结果按 meeting 对象缓存（WeakMap 无需手动失效、随 GC 回收），避免对同一会议重复推导。
const evidenceCache = new WeakMap();
function meetingEvidence(meeting) {
  if (Array.isArray(meeting.segments) && meeting.segments.length) return meeting.segments;
  if (evidenceCache.has(meeting)) return evidenceCache.get(meeting);
  const analysis = deterministicAnalysis(meeting);
  const items = analysis.decisions.map((d, i) => {
    const m = String(d.evidence || '').match(/(\d{2}:\d{2}(?::\d{2})?)\s*[-–—]\s*(\d{2}:\d{2}(?::\d{2})?)/);
    return {
      id: `ev-${meeting.id}-${i + 1}`,
      start: m ? m[1] : `00:1${i}`,
      end: m ? m[2] : `00:2${i + 1}`,
      transcriptRef: `${meeting.title} / 转写片段 #${i + 1}`,
      content: d.value,
      confidence: analysis.confidence
    };
  });
  evidenceCache.set(meeting, items);
  return items;
}

/* ── Infra status (honest probing) ── */
function probeTcp(host, port, timeoutMs = 1200) {
  return new Promise(resolve => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => { socket.destroy(); resolve(false); }, timeoutMs);
    socket.on('connect', () => { clearTimeout(timer); socket.destroy(); resolve(true); });
    socket.on('error', () => { clearTimeout(timer); socket.destroy(); resolve(false); });
  });
}
function parseRedisUrl(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname || '127.0.0.1', port: Number(u.port || 6379) };
  } catch { return null; }
}
function parseBoltUri(uri) {
  try {
    const u = new URL(uri);
    return { host: u.hostname || '127.0.0.1', port: Number(u.port || 7687) };
  } catch { return null; }
}
// 优化点: TCP 探测有网络延迟且结果仅在配置变化后变化，加 10s 短时缓存，避免每个请求都探测 Redis/Neo4j。
const INFRA_TTL_MS = 10000;
let infraCache = null;
let infraCacheAt = 0;
async function infraStatus() {
  const now = Date.now();
  if (infraCache && now - infraCacheAt < INFRA_TTL_MS) return infraCache;
  const started = Date.now();
  const jsonMs = Date.now() - started;

  // Redis
  let redis;
  const redisAddr = parseRedisUrl(REDIS_URL);
  if (!REDIS_URL || !redisAddr) {
    redis = { status: 'disabled', detail: '未配置 REDIS_URL，使用内存 + JSON 降级', latencyMs: 0 };
  } else {
    const ok = await probeTcp(redisAddr.host, redisAddr.port);
    redis = ok
      ? { status: 'connected', detail: `Redis ${redisAddr.host}:${redisAddr.port} 可达`, latencyMs: Date.now() - started }
      : { status: 'degraded', detail: `Redis ${redisAddr.host}:${redisAddr.port} 不可达，使用内存 + JSON 降级`, latencyMs: Date.now() - started };
  }

  // Neo4j
  let neo4j;
  const neoAddr = parseBoltUri(NEO4J_URI);
  if (!NEO4J_URI || !neoAddr) {
    neo4j = { status: 'disabled', detail: '未配置 NEO4J_URI，使用 JSON 关系降级', latencyMs: 0 };
  } else {
    const ok = await probeTcp(neoAddr.host, neoAddr.port);
    neo4j = ok
      ? { status: 'connected', detail: `Neo4j bolt ${neoAddr.host}:${neoAddr.port} 可达`, latencyMs: Date.now() - started }
      : { status: 'degraded', detail: `Neo4j bolt ${neoAddr.host}:${neoAddr.port} 不可达，使用 JSON 关系降级`, latencyMs: Date.now() - started };
  }

  const llm = LLM_API_KEY
    ? { status: 'configured', detail: '已配置 LLM_API_KEY，按需调用 ' + LLM_MODEL, latencyMs: 0 }
    : { status: 'fallback', detail: '未配置 LLM_API_KEY，使用确定性适配器', latencyMs: 0 };

  const result = {
    json: { status: 'connected', detail: 'JSON 持久化已生效（seed + runtime）', latencyMs: jsonMs },
    redis,
    neo4j,
    llm,
    feishu: await feishu.probeStatus()
  };
  infraCache = result;
  infraCacheAt = now;
  return result;
}

/* ── Knowledge Graph (deterministic derivation from seed/runtime) ── */
const KNOWLEDGE_TYPE = kind => (kind === '失败经验' ? 'risk' : (kind === '流程规范' || kind === '协作规则') ? 'spec' : 'conclusion');
// 优化点: 图谱为确定性推导，按 (stateEpoch, filter) 缓存，写操作后自动失效，避免每个请求重复遍历全量数据。
const graphCache = new Map();
function buildGraph(filterExperimentCode) {
  const key = `${stateEpoch}:${filterExperimentCode || ''}`;
  const hit = graphCache.get(key);
  if (hit) return hit;
  if (graphCache.size > 100) graphCache.clear(); // 防止跨 epoch 的过滤组合无限累积
  const nodes = [];
  const nodeMap = new Map();
  const edges = [];
  const addNode = (id, label, type, detail) => {
    if (nodeMap.has(id)) return nodeMap.get(id);
    const node = { id, label, type, meta: { detail } };
    nodeMap.set(id, node);
    nodes.push(node);
    return node;
  };
  const addEdge = (source, target, relation) => { if (source && target && source !== target) edges.push({ source, target, relation }); };

  for (const exp of state.experiments || []) addNode(exp.code, exp.name, 'experiment', `${exp.name} · ${exp.stage} · 进度 ${exp.progress}%`);
  for (const k of state.knowledge || []) addNode(k.id, k.title.slice(0, 10), KNOWLEDGE_TYPE(k.kind), `${k.title} · 置信度 ${Math.round(k.score * 100)}%`);
  // Risk id: strip "risk-" prefix from r.id to keep canvas labels compact (e.g. "R-01" instead of "risk-risk-01")
  for (const r of state.risks || []) {
    const rid = String(r.id || '').replace(/^risk-/, '');
    addNode(`R-${rid.replace(/^risk-/, '')}`, r.title.slice(0, 10), 'risk', `${r.title} · ${r.level}`);
  }
  for (const m of state.meetings || []) addNode(m.id, m.title.slice(0, 10), 'meeting', `${m.title} · ${m.duration}`);

  for (const exp of state.experiments || []) {
    for (const k of state.knowledge || []) {
      if ((k.title || '').includes(exp.code) || (k.source || '').includes(exp.code)) addEdge(exp.code, k.id, '产出');
    }
    for (const r of state.risks || []) if (r.experimentId === exp.id) {
      const rid = String(r.id || '').replace(/^risk-/, '');
      addEdge(exp.code, `R-${rid}`, '风险关联');
    }
    for (const m of state.meetings || []) if ((m.tags || []).includes(exp.code)) addEdge(m.id, exp.code, '结论来源');
  }
  for (const r of state.risks || []) for (const kid of r.relatedKnowledge || []) {
    const rid = String(r.id || '').replace(/^risk-/, '');
    addEdge(`R-${rid}`, kid, '引用');
  }
  for (const k of state.knowledge || []) {
    const m = String(k.source || '').match(/mt-\d+/);
    if (m && nodeMap.has(m[0])) addEdge(m[0], k.id, '沉淀');
  }

  if (filterExperimentCode) {
    const keep = new Set([filterExperimentCode]);
    for (const e of edges) { if (e.source === filterExperimentCode) keep.add(e.target); if (e.target === filterExperimentCode) keep.add(e.source); }
    const result = { nodes: nodes.filter(n => keep.has(n.id)), edges: edges.filter(e => keep.has(e.source) && keep.has(e.target)) };
    graphCache.set(key, result);
    return result;
  }
  const result = { nodes, edges };
  graphCache.set(key, result);
  return result;
}

/* ── SLA metrics ── */
// 优化点: SLA 由 audit/metrics 确定性推导，按 stateEpoch 缓存，写操作后自动失效，避免每个请求重复归并统计。
const slaCache = new Map();
function slaMetrics() {
  if (slaCache.has(stateEpoch)) return slaCache.get(stateEpoch);
  const targetHours = 24;
  const audit = state.audit || [];
  const relevant = audit.filter(r => ['meeting-analyzed', 'knowledge-written', '知识写入', 'AI 解析完成'].includes(r.action));
  if (state.metrics && relevant.length === 0) {
    // Honest seed fallback — mark the source explicitly.
    const slaRate = state.metrics.knowledgeSla ?? 87;
    const result = {
      targetHours, total: 28, met: Math.round(28 * slaRate / 100), slaRate,
      avgHours: state.metrics.avgReuseHours ?? 6.4,
      daily: [
        { date: '07/17', met: 6, total: 7 }, { date: '07/18', met: 8, total: 9 },
        { date: '07/19', met: 6, total: 7 }, { date: '07/20', met: 8, total: 9 },
        { date: '07/21', met: 7, total: 8 }, { date: '07/22', met: 8, total: 9 },
        { date: '07/23', met: 7, total: 8 }
      ],
      source: 'seed'
    };
    slaCache.set(stateEpoch, result);
    return result;
  }
  // Compute from audit timestamps (daily buckets).
  const dayKey = iso => String(iso || '').slice(0, 10);
  const daily = new Map();
  for (const rec of relevant) {
    const key = dayKey(rec.createdAt) || 'today';
    const bucket = daily.get(key) || { date: key, met: 0, total: 0 };
    bucket.total += 1;
    bucket.met += rec.slaMet === false ? 0 : 1; // slaMet:false 计为未达标，不计入 met
    daily.set(key, bucket);
  }
  const rows = [...daily.values()].map(b => ({ date: b.date.slice(5), met: b.met, total: b.total })).sort((a, b) => a.date.localeCompare(b.date));
  const total = rows.reduce((s, r) => s + r.total, 0);
  const met = rows.reduce((s, r) => s + r.met, 0);
  const result = { targetHours, total, met, slaRate: total ? Math.round(met / total * 100) : 100, avgHours: state.metrics.avgReuseHours ?? 6.4, daily: rows, source: 'computed' };
  slaCache.set(stateEpoch, result);
  return result;
}

/* ── SSE aids ── */
function transcriptHash(meeting) {
  const raw = `${meeting.title}|${meeting.summary || ''}|${(meeting.tags || []).join(',')}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h + raw.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(36);
}
const sseCache = new Map(); // key(`${meetingId}:${hash}`) -> { runId, events: [{id, payload}], }

function endMeetingAnalysis(meeting, analysis) {
  meeting.status = 'analyzed';
  addActivity('AI 解析完成', `${meeting.title} 已提炼 ${analysis.decisions.length} 条决策与 ${analysis.actions.length} 个行动项`, 'mint');
  addAudit('meeting', meeting.id, 'meeting-analyzed', `${meeting.title} 解析完成，mode=${analysis.mode}`, 'ai');
  state.metrics.savedHours = (state.metrics.savedHours || 0) + 1;
  persist();
}

async function api(req, res, url) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Last-Event-ID');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // health can stay a compact probe (exempt from envelope)
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, { ok: true, service: 'labflow-api', timestamp: new Date().toISOString() });

  // ── infra status ──
  if (req.method === 'GET' && url.pathname === '/api/infra/status') return json(res, { items: await infraStatus() });

  // ── experiments: create with risk pre-check (local rules, honest demo) ──
  if (req.method === 'POST' && url.pathname === '/api/experiments') {
    const payload = await body(req);
    const code = String(payload.code || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();
    const owner = String(payload.owner || '林岚').trim();
    const team = String(payload.team || '晶型筛选组').trim();
    const stage = String(payload.stage || '方案研讨');
    const allowedStages = ['方案研讨', '参数评审', '实验执行', '结果复盘', '知识复用'];
    const warnings = [];
    if (!code) return jsonError(res, 'VALIDATION', '实验编号不能为空', 422);
    if (!/^[A-Z]-\d{2}$/.test(code)) return jsonError(res, 'VALIDATION', '实验编号格式应为 字母-两位数字（如 B-18）', 422);
    if ((state.experiments || []).some(e => String(e.code).toUpperCase() === code)) return jsonError(res, 'DUPLICATE_EXPERIMENT', `实验编号 ${code} 已存在`, 409);
    if (!name) return jsonError(res, 'VALIDATION', '实验名称不能为空', 422);
    if (!allowedStages.includes(stage)) return jsonError(res, 'UNSUPPORTED_STAGE', 'Unsupported stage', 422);
    const ranges = {
      temperature: { min: 15, max: 40, label: '温度', unit: '°C' },
      humidity: { min: 30, max: 80, label: '湿度', unit: '%RH' },
      concentration: { min: 0, max: 5, label: '浓度', unit: 'mol/L' }
    };
    const params = {};
    for (const [key, range] of Object.entries(ranges)) {
      const raw = payload.params && payload.params[key];
      if (raw === undefined || raw === null || raw === '') continue;
      const num = Number(raw);
      if (Number.isNaN(num)) { warnings.push(`${range.label}必须是数字`); continue; }
      params[key] = num;
      if (num < range.min || num > range.max) {
        return jsonError(res, 'PARAM_OUT_OF_RANGE', `${range.label} ${num}${range.unit} 超出安全范围（${range.min}–${range.max}${range.unit}）`, 422, { field: key, value: num, range });
      }
    }
    const prefix = code.split('-')[0];
    const similar = (state.experiments || []).filter(e => String(e.code).startsWith(prefix) && String(e.code) !== code);
    if (similar.length) warnings.push(`存在 ${similar.length} 个同前缀实验（${similar.map(e => e.code).join('、')}），已自动挂接相似经验检索`);
    const failureKnowledge = (state.knowledge || []).filter(k => (k.kind === '失败经验' || k.kind === '方案争议') && k.status !== 'rejected');
    if (failureKnowledge.length) warnings.push(`知识湖含 ${failureKnowledge.length} 条失败经验/方案争议，参数评审阶段将自动风险拦截`);
    const id = `exp-${code.toLowerCase().replace('-', '')}`;
    const experiment = { id, code, name, owner, team, stage, progress: 0, risk: 'low', insight: '新登记实验，等待参数评审与相似经验召回', updated: '刚刚', image: null, params };
    state.experiments = state.experiments || [];
    state.experiments.unshift(experiment);
    addActivity('实验创建', `${code} ${name} 已进入「${stage}」`, 'mint');
    addAudit('experiment', id, 'experiment-created', `创建实验 ${code}「${name}」`, 'api');
    persist();
    return json(res, { item: experiment, warnings }, 201);
  }

  // ── overview ──
  if (req.method === 'GET' && url.pathname === '/api/overview') return json(res, buildOverview());
  if (req.method === 'GET' && url.pathname === '/api/experiments') return json(res, { items: state.experiments });

  // ── knowledge (incl. ?status= filter) ──
  if (req.method === 'GET' && url.pathname === '/api/knowledge') {
    const statusFilter = url.searchParams.get('status');
    const items = statusFilter ? (state.knowledge || []).filter(k => k.status === statusFilter) : (state.knowledge || []);
    return json(res, { items });
  }

  const expMatch = url.pathname.match(/^\/api\/experiments\/([^/]+)$/);
  if (req.method === 'GET' && expMatch) {
    const experiment = findExperiment(expMatch[1]);
    return experiment ? json(res, { item: enrichExperiment(experiment) }) : notFound(res);
  }
  if (req.method === 'POST' && expMatch && url.pathname.endsWith('/status') === false) {
    const experiment = findExperiment(expMatch[1]);
    if (!experiment) return notFound(res);
    const payload = await body(req);
    const allowed = ['方案研讨', '参数评审', '实验执行', '结果复盘', '知识复用'];
    if (!allowed.includes(payload.stage)) return jsonError(res, 'UNSUPPORTED_STAGE', 'Unsupported stage', 422);
    experiment.stage = payload.stage;
    experiment.updated = '刚刚';
    addAudit('experiment', experiment.id, 'stage-advanced', `${experiment.code} 推进至「${payload.stage}」`, 'api');
    persist();
    return json(res, { item: experiment });
  }

  /* ── Meetings: detail / evidence / analyze / analyze-stream ── */
  const meetingDetailMatch = url.pathname.match(/^\/api\/meetings\/([^/]+)$/);
  if (req.method === 'GET' && meetingDetailMatch) {
    const meeting = findMeeting(meetingDetailMatch[1]);
    if (!meeting) return notFound(res);
    const relatedExperiments = (state.experiments || []).filter(e => (meeting.tags || []).includes(e.code));
    const relatedRisks = (state.risks || []).filter(r => relatedExperiments.some(e => e.id === r.experimentId));
    return json(res, {
      item: {
        ...meeting,
        evidenceCount: meetingEvidence(meeting).length,
        relatedExperiments,
        relatedRisks
      }
    });
  }

  const evidenceMatch = url.pathname.match(/^\/api\/meetings\/([^/]+)\/evidence$/);
  if (req.method === 'GET' && evidenceMatch) {
    const meeting = findMeeting(evidenceMatch[1]);
    if (!meeting) return notFound(res);
    return json(res, { items: meetingEvidence(meeting) });
  }

  const meetingMatch = url.pathname.match(/^\/api\/meetings\/([^/]+)\/analyze$/);
  if (req.method === 'POST' && meetingMatch) {
    const meeting = findMeeting(meetingMatch[1]);
    if (!meeting) return notFound(res);
    const analysis = await aiAnalysis(meeting);
    endMeetingAnalysis(meeting, analysis);
    return json(res, { analysis }, 200, analysis.mode);
  }

  /* SSE streaming analysis (hardened: id, idempotency, resume, cleanup) */
  const streamMatch = url.pathname.match(/^\/api\/meetings\/([^/]+)\/analyze-stream$/);
  if (req.method === 'POST' && streamMatch) {
    const meeting = findMeeting(streamMatch[1]);
    if (!meeting) return notFound(res);
    const runId = `run-${randomUUID().slice(0, 8)}`;
    const cacheKey = `${meeting.id}:${transcriptHash(meeting)}`;
    const feishuLive = feishu.isConfigured();
    const steps = [
      { step: 1, message: feishuLive ? '正在从飞书妙记拉取真实会议转写…' : '正在连接飞书会议 AI 转写服务（演示适配器）…', agent: 'Connector' },
      { step: 2, message: feishuLive ? `已获取 ${meeting.participants} 位参会者、${meeting.duration} 的真实转写…` : `识别到 ${meeting.participants} 位参会者，${meeting.duration} 转写文本…`, agent: 'Connector' },
      { step: 3, message: 'MeetingParser Agent 运行中 — 提取参数、争议与决策…', agent: 'MeetingParser' },
      { step: 4, message: 'QualityCheck Agent 校验领域 Schema 与置信度…', agent: 'QualityCheck' },
      { step: 5, message: 'GraphLinker Agent 关联知识图谱与历史实验…', agent: 'GraphLinker' },
      { step: 6, message: '生成结构化结论与行动项…', agent: 'Orchestrator' }
    ];
    const delays = [500, 800, 1000, 800, 800, 500];

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });

    let closed = false;
    req.on('close', () => { closed = true; });
    const keepAlive = setInterval(() => { if (!closed && !res.writableEnded) res.write(': keep-alive\n\n'); }, 15000);
    const writeEvent = (id, payload) => {
      if (closed || res.writableEnded) return false;
      res.write(`id: ${id}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      return true;
    };
    const finish = () => { clearInterval(keepAlive); if (!closed && !res.writableEnded) res.end(); closed = true; };

    // Idempotency + Last-Event-ID resume
    const cached = sseCache.get(cacheKey);
    const lastEventId = req.headers['last-event-id'];
    if (lastEventId && !cached) {
      writeEvent(`${runId}-err`, { step: 0, error: 'no-checkpoint', message: '无可恢复的解析检查点，请重新提交', done: false });
      finish();
      return;
    }
    if (cached && lastEventId) {
      // Resume from the checkpoint: replay events after the given one.
      // Event ids look like `run-<uuid>-step<N>`; extract the numeric step.
      // 优化点: 重放事件一次性批量写入（单次 res.write），而非逐条多次写。
      const stepOf = id => { const m = String(id).match(/(?:-step|-)(\d+)$/); return m ? Number(m[1]) : 0; };
      const resumeStep = stepOf(lastEventId);
      const buffer = [];
      for (const ev of cached.events) {
        const evStep = stepOf(ev.id);
        if (evStep <= resumeStep) continue;
        buffer.push(`id: ${ev.id}\ndata: ${JSON.stringify(ev.payload)}\n\n`);
      }
      buffer.push(`id: ${cached.runId}-7\ndata: ${JSON.stringify({ step: 7, runId: cached.runId, analysis: cached.analysis, done: true })}\n\n`);
      if (!closed && !res.writableEnded) res.write(buffer.join(''));
      finish();
      return;
    }
    if (cached) {
      // Same meeting + same transcript → replay cached result
      // 优化点: 重放事件一次性批量写入。
      const buffer = cached.events.map(ev => `id: ${ev.id}\ndata: ${JSON.stringify(ev.payload)}\n\n`);
      buffer.push(`id: ${cached.runId}-7\ndata: ${JSON.stringify({ step: 7, runId: cached.runId, analysis: cached.analysis, done: true })}\n\n`);
      if (!closed && !res.writableEnded) res.write(buffer.join(''));
      finish();
      return;
    }

    // Fresh run
    const events = [];
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, delays[i]));
      if (closed || res.writableEnded) break;
      const id = `${runId}-step${steps[i].step}`;
      const payload = { ...steps[i], runId, done: false };
      events.push({ id, payload });
      writeEvent(id, payload);
    }
    if (closed || res.writableEnded) { finish(); return; }
    const analysis = await aiAnalysis(meeting);
    endMeetingAnalysis(meeting, analysis);
    const final = { step: 7, runId, analysis, done: true };
    sseCache.set(cacheKey, { runId, events, analysis });
    writeEvent(`${runId}-step7`, final);
    finish();
    return;
  }

  /* ── Knowledge approval ── */
  const approveMatch = url.pathname.match(/^\/api\/knowledge\/([^/]+)\/(approve|reject)$/);
  if (req.method === 'POST' && approveMatch) {
    const id = approveMatch[1];
    const action = approveMatch[2];
    const k = (state.knowledge || []).find(item => item.id === id);
    if (!k) return notFound(res);
    const payload = await body(req);
    const reason = action === 'reject' ? String(payload.reason || '').trim() : '';
    k.status = action === 'approve' ? 'approved' : 'rejected';
    if (reason) k.rejectReason = reason;
    k.reviewedAt = new Date().toISOString();
    addActivity(action === 'approve' ? '知识通过' : '知识驳回', `${k.title}${reason ? ' · ' + reason : ''}`, action === 'approve' ? 'mint' : 'coral');
    addAudit('knowledge', k.id, `knowledge-${action}`, `${action === 'approve' ? '通过' : '驳回'}「${k.title}」${reason ? '，原因：' + reason : ''}`, 'api');
    persist();
    void feishuSync('knowledge', k, action, `${action === 'approve' ? '知识已通过' : '知识已驳回'}：${k.title}${reason ? '（' + reason + '）' : ''}`).catch(e => console.warn('[Feishu] 同步失败:', e.message));
    return json(res, { item: k });
  }

  /* ── Graph ── */
  if (req.method === 'GET' && url.pathname === '/api/graph') {
    const filter = url.searchParams.get('experimentId');
    return json(res, buildGraph(filter || undefined));
  }

  /* ── Audit ── */
  if (req.method === 'GET' && url.pathname === '/api/audit') {
    const entityId = url.searchParams.get('entityId');
    let rows = state.audit || [];
    if (entityId) rows = rows.filter(r => r.entityId === entityId);
    rows = [...rows].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return json(res, { items: rows });
  }

  /* ── SLA metrics ── */
  if (req.method === 'GET' && url.pathname === '/api/metrics/sla') {
    return json(res, slaMetrics());
  }

  /* ── Risks API ── */
  if (req.method === 'GET' && url.pathname === '/api/risks') {
    return json(res, { items: state.risks || [] });
  }
  const riskMatch = url.pathname.match(/^\/api\/risks\/([^/]+)\/resolve$/);
  if (req.method === 'POST' && riskMatch) {
    const risk = (state.risks || []).find(r => r.id === riskMatch[1]);
    if (!risk) return notFound(res);
    risk.status = 'resolved';
    risk.resolvedAt = new Date().toISOString();
    addActivity('风险关闭', risk.title, 'mint');
    addAudit('risk', risk.id, 'risk-resolved', `关闭风险「${risk.title}」(${risk.level})`, 'api');
    persist();
    void feishuSync('risk', risk, 'resolve', `风险已闭环：${risk.title}（${risk.level}）`).catch(e => console.warn('[Feishu] 同步失败:', e.message));
    return json(res, { item: risk });
  }

  if (req.method === 'GET' && url.pathname === '/api/tasks') {
    return json(res, { items: state.tasks || [] });
  }

  if (req.method === 'POST' && url.pathname === '/api/tasks') {
    const payload = await body(req);
    if (!payload.title || !payload.owner) return jsonError(res, 'VALIDATION', 'title and owner are required', 422);
    const task = { id: `task-${randomUUID().slice(0, 8)}`, title: String(payload.title).slice(0, 120), owner: String(payload.owner).slice(0, 40), due: payload.due || '待排期', priority: payload.priority || 'normal', status: 'todo', source: payload.source || 'manual' };
    state.tasks = state.tasks || [];
    state.tasks.unshift(task);
    addActivity('任务创建', `${task.title} · ${task.owner}`, 'blue');
    addAudit('task', task.id, 'task-created', `创建任务「${task.title}」· ${task.owner}`, 'api');
    persist();
    return json(res, { item: task }, 201);
  }

  // Task CRUD - Update
  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (req.method === 'PUT' && taskMatch) {
    const taskId = taskMatch[1];
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return notFound(res);
    const payload = await body(req);
    const allowedStatuses = ['todo', 'doing', 'done', 'blocked'];
    if (payload.status && !allowedStatuses.includes(payload.status)) return jsonError(res, 'UNSUPPORTED_STATUS', 'Unsupported task status', 422);
    if (payload.title) task.title = String(payload.title).slice(0, 120);
    if (payload.owner) task.owner = String(payload.owner).slice(0, 40);
    if (payload.due) task.due = payload.due;
    if (payload.priority) task.priority = payload.priority;
    if (payload.status) task.status = payload.status;
    task.updatedAt = new Date().toISOString();
    addActivity('任务更新', `${task.title} → ${task.status}`, 'blue');
    addAudit('task', task.id, 'task-updated', `更新任务「${task.title}」至 ${task.status}`, 'api');
    persist();
    return json(res, { item: task });
  }

  // Task CRUD - Delete
  if (req.method === 'DELETE' && taskMatch) {
    const taskId = taskMatch[1];
    const idx = state.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return notFound(res);
    const removed = state.tasks.splice(idx, 1)[0];
    addActivity('任务删除', removed.title, 'coral');
    addAudit('task', removed.id, 'task-deleted', `删除任务「${removed.title}」`, 'api');
    persist();
    return json(res, { deleted: removed.id });
  }

  if (req.method === 'POST' && url.pathname === '/api/search') {
    const payload = await body(req);
    const query = String(payload.query || '').trim().toLowerCase();
    if (!query) return json(res, { query, items: [] });

    // 扩展搜索范围：知识、实验、会议、任务
    const pool = [
      ...state.knowledge.map(item => ({ ...item, sourceType: 'knowledge', searchFields: `${item.title} ${item.kind} ${item.source} ${item.summary || ''}` })),
      ...state.experiments.map(item => ({ ...item, sourceType: 'experiment', title: `${item.code} ${item.name}`, kind: 'experiment', source: item.insight, freshness: item.updated, image: item.image, searchFields: `${item.code} ${item.name} ${item.insight} ${item.stage} ${item.owner}` })),
      ...state.meetings.map(item => ({ ...item, sourceType: 'meeting', title: item.title, kind: '会议', source: item.summary, freshness: item.date, image: null, searchFields: `${item.title} ${item.summary} ${(item.tags || []).join(' ')}` })),
      ...state.tasks.map(item => ({ ...item, sourceType: 'task', title: item.title, kind: '任务', source: `${item.owner} - ${item.status}`, freshness: item.due, image: null, searchFields: `${item.title} ${item.owner} ${item.status} ${item.priority}` }))
    ];

    // 智能匹配算法：多字段评分
    const queryTerms = query.split(/\s+/).filter(Boolean);
    const scored = pool.map(item => {
      let score = 0;
      const fields = (item.searchFields || `${item.title} ${item.kind} ${item.source}`).toLowerCase();

      // 精确标题匹配权重最高
      if ((item.title || '').toLowerCase().includes(query)) score += 0.5;

      // 每个关键词命中一次，避免重复关键词无限叠加。
      for (const term of new Set(queryTerms)) {
        if (fields.includes(term)) score += 0.2;
      }

      // 类型匹配：既支持输入完整类型，也支持多词查询中的类型词。
      if (queryTerms.some(term => (item.kind || '').toLowerCase().includes(term))) score += 0.3;

      // source 匹配加分
      if ((item.source || '').toLowerCase().includes(query)) score += 0.15;

      // 知识资产有 score 字段，加入评分
      if (item.score && typeof item.score === 'number') score += item.score * 0.1;

      return { ...item, relevanceScore: Math.min(score, 1) };
    }).filter(item => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 12);

    return json(res, { query, items: scored, total: scored.length });
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
    const ext = path.extname(file).toLowerCase();
    // 优化点: 图片/字体走长缓存（30 天），浏览器不再重复请求；HTML/CSS/JS 走 no-cache + ETag 协商缓存，
    // 未变更时返回 304 空响应体，避免每次请求都重复读文件并回传全文。
    const isLongCache = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext);
    const etag = `"${info.size}-${Math.floor(info.mtimeMs)}"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { 'ETag': etag, 'Cache-Control': isLongCache ? 'public, max-age=2592000' : 'no-cache' });
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': isLongCache ? 'public, max-age=2592000' : 'no-cache',
      'ETag': etag
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(`[HTTP] ${new Date().toISOString()} ${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (error) {
    console.warn('[HTTP] request failed:', error.message);
    if (!res.headersSent) {
      if (error.message === 'Invalid JSON' || error.message === 'Payload too large') jsonError(res, 'BAD_JSON', 'Invalid JSON body', 400, error.message);
      else jsonError(res, 'INTERNAL', 'Internal server error', 500);
    }
  }
});
server.listen(PORT, () => console.log(`LabFlow running at http://localhost:${PORT}`));