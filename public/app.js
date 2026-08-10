/* 晶流 LabFlow v2.0 — Frontend Controller */
/* Master-Level B2B Design System */

const state = { overview: null, activeView: 'overview' };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

/* ── API ── */
// All JSON APIs return a unified envelope { data, meta, error }. Unwrap to `data`.
async function api(path, options = {}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  let payload;
  try { payload = await response.json(); } catch { throw new Error('服务返回了无法解析的响应'); }
  const { data, error } = payload;
  if (!response.ok || error) throw new Error(error?.message || payload.error || '请求失败');
  return data;
}

/* ── Toast ── */
function toast(message) {
  const container = $('.toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span class="toast-icon">✓</span><span>${esc(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('toast-hide'); setTimeout(() => el.remove(), 300); }, 3000);
}

/* ── Modal ── */
function openModal(html) {
  const backdrop = $('#modalBackdrop');
  const titleMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/);
  if (titleMatch) {
    $('#modalTitle').textContent = titleMatch[1].replace(/<[^>]*>/g, '');
    html = html.replace(/<h2[^>]*>.*?<\/h2>/, '');
  }
  $('#modalContent').innerHTML = html;
  backdrop.classList.add('active');
  backdrop.setAttribute('aria-hidden', 'false');
}
function closeModal() {
  const backdrop = $('#modalBackdrop');
  backdrop.classList.remove('active');
  backdrop.setAttribute('aria-hidden', 'true');
}

/* ── Navigation ── */
function setView(name) {
  state.activeView = name;
  $$('.page-view').forEach(node => node.classList.toggle('is-visible', node.dataset.page === name));
  $$('.nav-item[data-view]').forEach(node => node.classList.toggle('active', node.dataset.view === name));
  const labels = { overview: '研发总览', experiments: '实验流转', risks: '风险守门', knowledge: '知识湖', agents: 'AI 助理', integrations: '连接器', settings: '偏好设置' };
  const bc = $('.breadcrumb-current');
  if (bc) bc.textContent = labels[name] || '晶流';
  $('#sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'knowledge') setTimeout(initKnowledgeGraph, 50);
  if (name === 'risks' && state.overview && state.overview.risks) renderRisks(state.overview.risks);
}

/* ── Sparkline Generator ── */
let sparklineId = 0;
function sparkline(data, isCurrent = false, w = 180, h = 32) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((value, index) => [index * step, h - 3 - ((value - min) / range) * (h - 8)]);
  const line = pts.map(point => point.join(',')).join(' ');
  const area = `${line} ${w},${h} 0,${h}`;
  const last = pts[pts.length - 1];
  const gid = `spark_${sparklineId++}`;
  // Build 5-point grid baseline: y=10% / 30% / 50% / 70% / 90% of usable height
  const gridLines = [0.15, 0.4, 0.65, 0.9].map(r => {
    const y = h - 3 - r * (h - 8);
    return `<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-opacity="0.06" stroke-width="1" stroke-dasharray="2 3"/>`;
  }).join('');
  return `<svg class="metric-sparkline${isCurrent ? ' is-current' : ''}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="趋势图" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity="0.22"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
    ${gridLines}
    <polygon class="spark-area" points="${area}" fill="url(#${gid})"/>
    <polyline points="${line}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3" fill="currentColor" stroke="var(--surface)" stroke-width="1.5"/>
  </svg>`;
}

/* ── Spine helpers ── */
function toHHMM(value) {
  if (!value) return '';
  const str = String(value);
  let m = str.match(/T(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (m) return m[1].padStart(2, '0') + ':' + m[2];
  m = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP])\.?M\.?/i);
  if (m) {
    let hour = +m[1];
    const ap = m[3].toUpperCase();
    if (ap === 'P' && hour < 12) hour += 12;
    if (ap === 'A' && hour === 12) hour = 0;
    return String(hour).padStart(2, '0') + ':' + m[2];
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return str;
}
function decisionTime(item) {
  const m = String(item.evidence || '').match(/(\d{2}:\d{2}(?::\d{2})?)/);
  return m ? m[1] : '';
}
function decisionDone(item) {
  return /^\s*\d{2}:\d{2}/.test(String(item.evidence || ''));
}
/* ── Render: Overview ── */
function renderOverview(data) {
  // Metrics with Sparkline data
  const sparkData = {
    sla: [72, 75, 78, 80, 83, 85, 87],
    hours: [9.2, 8.8, 8.5, 7.9, 7.2, 6.8, 6.4],
    experiments: [8, 9, 10, 11, 11, 12, 12],
    risks: [5, 4, 5, 3, 4, 3, 3]
  };
  const metricDefs = [
    { label: '24H 知识 SLA', value: data.metrics.knowledgeSla, unit: '%', target: '目标 ≥90%', trend: '12.4% 较上周', delta: '+12.4%', dir: 'up', tone: 'is-primary', sparkTone: 'is-current', spark: sparkline(sparkData.sla, true, 240, 36), footKey: '本周样本', footVal: '28 场会议' },
    { label: '平均复用耗时', value: data.metrics.avgReuseHours, unit: '小时', target: '目标 ≤6h', trend: '2.1h 较上周', delta: '−2.1h', dir: 'up', tone: '', sparkTone: '', spark: sparkline(sparkData.hours, false, 240, 36), footKey: '基线', footVal: '8.5 小时' },
    { label: '进行中实验', value: data.metrics.activeExperiments, unit: '项', target: '目标 ≥12 项', trend: '3 项今日有更新', delta: '+3 今日', dir: 'up', tone: '', sparkTone: '', spark: sparkline(sparkData.experiments, false, 240, 36), footKey: '本周闭环', footVal: '9 项完成' },
    { label: '待处理风险', value: data.metrics.pendingRisks, unit: '项', target: '目标 ≤2 项', trend: '1 项 P1 优先级', delta: '−1 较昨日', dir: 'up', tone: 'is-risk', sparkTone: 'is-risk', spark: sparkline(sparkData.risks, false, 240, 36), footKey: 'P0 / P1', footVal: '1 / 2' }
  ];
  $('#metricGrid').innerHTML = metricDefs.map(m => `
    <div class="metric-card ${m.tone}">
      <div class="metric-head">
        <span class="metric-label"><span class="metric-label-glyph" aria-hidden="true"></span>${m.label}</span>
        <span class="metric-delta ${m.dir}"><span class="metric-delta-arrow" aria-hidden="true">${m.dir === 'up' ? '↑' : m.dir === 'down' ? '↓' : '·'}</span>${m.delta}</span>
      </div>
      <div class="metric-value-row">
        <span class="metric-value">${m.value}</span>
        <small class="metric-unit">${m.unit}</small>
      </div>
      ${m.spark.replace('metric-sparkline', 'metric-sparkline ' + (m.sparkTone || ''))}
      <div class="metric-foot">
        <span class="metric-foot-key">${m.footKey}</span>
        <span class="metric-trend ${m.dir}">${m.trend}</span>
        <span class="metric-foot-key">${m.footVal}</span>
      </div>
    </div>
  `).join('');

  // Pipeline
  $('#pipeline').innerHTML = data.pipeline.map((item, i) => `
    <div class="pipeline-step ${item.state === 'done' ? 'completed' : item.state === 'active' ? 'active' : item.state === 'watch' ? 'watch' : ''}">
      <div class="pipeline-icon">${item.state === 'done' ? '✓' : i + 1}</div>
      <span class="pipeline-label">${esc(item.label)}</span>
      <span class="pipeline-count">${item.count} 项</span>
    </div>
  `).join('');

  // Meetings
  $('#meetingList').innerHTML = data.meetings.map((item, i) => `
    <div class="list-item" data-action="analyze" data-id="${esc(item.id)}">
      <div class="list-item-icon ${item.status === 'analyzed' ? 'success' : ''}">
        ${String(i + 1).padStart(2, '0')}
      </div>
      <div class="list-item-content">
        <div class="list-item-title">${esc(item.title)}</div>
        <div class="list-item-description">${esc(item.date)} · ${esc(item.duration)} · ${item.participants} 人</div>
      </div>
      <span class="badge ${item.status === 'analyzed' ? 'badge-success' : 'badge-primary'}">${item.status === 'analyzed' ? '已解析' : '待解析'}</span>
    </div>
  `).join('');

  // Action items (今日行动项) — fills the left column whitespace under the meetings list
  const tasks = (data.tasks || []).slice(0, 4);
  const taskEl = $('#taskListOverview');
  if (taskEl) {
    const priorityMeta = {
      high:   { label: '紧急', cls: 'tone-bad' },
      normal: { label: '常规', cls: 'tone-good' },
      low:    { label: '低优', cls: 'tone-soft' }
    };
    const statusMeta = {
      todo:  { label: '待办', cls: 'badge-warning' },
      doing: { label: '进行', cls: 'badge-primary' },
      done:  { label: '完成', cls: 'badge-success' }
    };
    taskEl.innerHTML = tasks.map(t => {
      const p = priorityMeta[t.priority] || priorityMeta.normal;
      const s = statusMeta[t.status] || statusMeta.todo;
      return `
        <div class="list-item task-row">
          <div class="task-check ${t.status === 'done' ? 'is-done' : ''}" aria-hidden="true">
            ${t.status === 'done' ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </div>
          <div class="list-item-content">
            <div class="list-item-title">${esc(t.title)}</div>
            <div class="list-item-description">${esc(t.owner)} · ${esc(t.due)} · 来源 ${esc(t.source)}</div>
          </div>
          <div class="task-meta">
            <span class="task-priority ${p.cls}">${p.label}</span>
            <span class="badge ${s.cls}">${s.label}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Activity
  $('#activityList').innerHTML = `
    <ol class="spine spine--done">
      ${data.activity.map(item => `
        <li class="spine-item" data-state="done">
          <time class="spine-time">${esc(item.time)}</time>
          <div class="spine-body">
            <div class="list-item-title">${esc(item.title)}</div>
            <div class="list-item-description">${esc(item.detail)}</div>
          </div>
        </li>
      `).join('')}
    </ol>
  `;

  renderExperiments(data.experiments);
  renderKnowledge(data.knowledge);
}

/* ── Render: Experiments ── */
function renderExperiments(items) {
  const riskLabels = { high: '高风险', watch: '需关注', low: '运行正常' };
  const riskBadges = { high: 'badge-error', watch: 'badge-warning', low: 'badge-success' };
  // 类型色板：4 种实验类型 = 4 种晶流主题色，对应不同微观意象
  const kindPalette = {
    'screening':  { tone: 'mint',   label: '晶型', glyph: '◇' },
    'stability':  { tone: 'coral',  label: '稳定', glyph: '⬡' },
    'efficacy':   { tone: 'aqua',   label: '药效', glyph: '○' },
    'migration':  { tone: 'amber',  label: '迁移', glyph: '▣' }
  };
  // 根据实验 id 推断类型
  function paletteFor(item) {
    const code = (item.code || '').toLowerCase();
    if (code.startsWith('b-')) return kindPalette.screening;
    if (code.startsWith('a-')) return kindPalette.stability;
    if (code.startsWith('c-')) return kindPalette.efficacy;
    if (code.startsWith('d-')) return kindPalette.migration;
    return kindPalette.screening;
  }

  $('#experimentGrid').innerHTML = items.map(item => {
    const tone = item.risk === 'high' ? 'tone-danger' : item.risk === 'watch' ? 'tone-warning' : 'tone-success';
    const fillTone = item.risk === 'high' ? 'fill-danger' : item.risk === 'watch' ? 'fill-warning' : 'fill-action';
    const palette = paletteFor(item);
    return `
    <div class="card exp-card" data-action="experiment-detail" data-id="${esc(item.id)}">
      <div class="exp-status-bar ${tone}"></div>
      <div class="exp-head">
        <div class="exp-thumb exp-thumb--${palette.tone}" aria-hidden="true">
          ${item.image ? `<img class="exp-thumb-img" src="${esc(item.image)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}
          <span class="exp-thumb-glyph">${palette.glyph}</span>
          <svg class="exp-thumb-rings" viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="1"><circle cx="28" cy="28" r="10"/><circle cx="28" cy="28" r="18" stroke-opacity="0.45"/><circle cx="28" cy="28" r="26" stroke-opacity="0.22"/></svg>
        </div>
        <div class="exp-head-text">
          <span class="exp-code">${esc(item.code)} · ${palette.label}</span>
          <h3 class="exp-name">${esc(item.name)}</h3>
        </div>
        <span class="exp-arrow">→</span>
      </div>
      <div class="exp-meta">${esc(item.team)} · ${esc(item.owner)} · 更新于 ${esc(item.updated)}</div>
      <div class="exp-tags">
        <span class="badge badge-neutral">${esc(item.stage)}</span>
        <span class="badge ${riskBadges[item.risk] || 'badge-neutral'}">${riskLabels[item.risk] || '正常'}</span>
      </div>
      <div class="exp-insight"><span class="exp-insight-label">AI 洞察：</span>${esc(item.insight)}</div>
      <div class="exp-progress-row">
        <div class="exp-progress-track"><span class="exp-progress-fill ${fillTone}" style="width:${item.progress}%;"></span></div>
        <span class="exp-progress-label">${item.progress}<small>%</small></span>
      </div>
      <div class="exp-foot">
        <span class="mono-time">BATCH ${esc(item.code)}</span>
        <span class="exp-progress-meta">完成度</span>
      </div>
    </div>
  `;}).join('');
}

/* ── Render: Loading state (injected before first fetch) ── */
function renderLoadingState() {
  const fill = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };
  const cardSkeletons = count => Array.from({ length: count }, () => '<div class="skeleton--card skeleton" aria-hidden="true"></div>').join('');
  const listSkeleton = count => `
    <div class="skeleton--list" aria-hidden="true">
      ${Array.from({ length: count }, () => '<div class="skeleton--row"><span class="skeleton-avatar skeleton"></span><div class="skeleton-line skeleton"></div></div>').join('')}
    </div>
  `;

  fill('#metricGrid', cardSkeletons(4));
  fill('#riskOverview', cardSkeletons(4));
  fill('#experimentGrid', cardSkeletons(3));
  fill('#riskGrid', cardSkeletons(2));
  fill('#meetingList', listSkeleton(3));
  fill('#activityList', listSkeleton(3));

  // Knowledge lake: #knowledgeList is already .knowledge-balance — inject only its children
  fill('#knowledgeList', `
    <div class="balance-column balance-column--left" aria-hidden="true">
      <article class="balance-card skeleton" aria-hidden="true"></article>
    </div>
    <div class="balance-axis" aria-hidden="true"></div>
    <div class="balance-column balance-column--right" aria-hidden="true">
      <article class="balance-card skeleton" aria-hidden="true"></article>
    </div>
  `);
}

/* ── Render: Knowledge (success / failure balance) ── */
function renderKnowledge(items) {
  const kindLabel = { '最优参数': 'PARAM', '失败经验': 'RISK', '流程规范': 'SOP', '方案争议': 'DEBATE', '数据资产': 'DATA', '协作规则': 'OPS' };
  const kindMarkClass = { '最优参数': 'param', '失败经验': 'risk', '流程规范': 'sop', '方案争议': 'debate', '数据资产': 'data', '协作规则': 'collab' };
  const successKinds = ['最优参数', '流程规范', '数据资产', '协作规则'];
  const failureKinds = ['失败经验', '方案争议'];
  const success = items.filter(item => successKinds.includes(item.kind));
  const failure = items.filter(item => failureKinds.includes(item.kind));
  const asset = item => {
    const score = Math.round((item.score || 0) * 100);
    const mark = kindMarkClass[item.kind] || 'param';
    return `
    <article class="balance-card js-knowledge-card" aria-label="${esc(item.title)}" data-id="${esc(item.id)}" data-status="${esc(item.status || 'approved')}" data-kind="${esc(item.kind)}">
      <div class="balance-card-mark balance-card-mark--${mark}">
        <span class="balance-card-mark-text">${kindLabel[item.kind] || 'ASSET'}</span>
        <span class="balance-card-mark-score">${score}<small>%</small></span>
      </div>
      <div class="balance-card-body">
        <h4 class="balance-card-title list-item-title">${esc(item.title)}</h4>
        <p class="balance-card-desc text-sm text-secondary">${esc(item.source || '')}</p>
        <div class="balance-card-meta">
          <span>${esc(item.freshness || '')}</span>
          <span class="balance-card-dot">·</span>
          <span class="balance-card-score">相关度 ${score}%</span>
        </div>
        <div class="knowledge-status-row">
          ${item.status === 'pending'
            ? `<span class="badge badge-warning badge-dot">待人工确认</span>
               <div class="knowledge-actions">
                 <button class="button button-xs button-success" data-action="approve-knowledge" data-id="${esc(item.id)}">通过</button>
                 <button class="button button-xs button-secondary" data-action="reject-knowledge" data-id="${esc(item.id)}">驳回</button>
               </div>`
            : item.status === 'rejected'
              ? `<span class="badge badge-error badge-dot">已驳回${item.rejectReason ? ' · ' + esc(item.rejectReason.slice(0, 18)) : ''}</span>`
              : `<span class="badge badge-success badge-dot">已确认</span>`}
        </div>
      </div>
    </article>
  `;
  };
  const column = (modifier, title, caption, list) => `
    <div class="balance-column ${modifier}" aria-label="${esc(title)}">
      <div class="balance-column-head">
        <h3 class="balance-column-title card-title">${esc(title)}</h3>
        <p class="balance-column-caption text-sm text-secondary">${esc(caption)}</p>
      </div>
      ${list.map(asset).join('')}
    </div>
  `;
  const root = $('#knowledgeList');
  if (root) root.setAttribute('role', 'region');
  $('#knowledgeList').innerHTML = `
    ${column('balance-column--left', '成功经验', '最优参数 · 流程规范 · 数据资产 · 协作规则', success)}
    <div class="balance-axis" aria-hidden="true"></div>
    ${column('balance-column--right', '失败经验', '失败经验 · 方案争议', failure)}
  `;
}

/* ── Render: Risks ── */
function renderRisks(items) {
  const riskGrid = $('#riskGrid');
  if (!riskGrid) return;
  const p0 = items.filter(r => r.level === 'P0').length;
  const p1 = items.filter(r => r.level === 'P1').length;
  const p2 = items.filter(r => r.level === 'P2').length;
  const open = items.filter(r => r.status === 'open').length;

  // KPI color semantics: P0=red(阻断) / P1=amber(高优) / P2=neutral-blue(中低优) / 未关闭=ink(累计)
  const statDefs = [
    { label: 'P0 紧急', value: p0, tone: 'tone-danger', foot: '立刻阻断', tone2: 'danger' },
    { label: 'P1 高', value: p1, tone: 'tone-warning', foot: '24h 内响应', tone2: 'warning' },
    { label: 'P2 中', value: p2, tone: 'tone-info', foot: '72h 内跟进', tone2: 'info' },
    { label: '未关闭', value: open, tone: 'tone-ink', foot: '合计待处理', tone2: 'ink' }
  ];
  $('#riskOverview').innerHTML = statDefs.map(s => `
    <div class="metric-card risk-kpi risk-kpi--${s.tone2}">
      <div class="risk-kpi-head">
        <span class="metric-label">${s.label}</span>
        <span class="risk-kpi-dot" aria-hidden="true"></span>
      </div>
      <span class="metric-value ${s.tone}">${s.value}</span>
      <span class="risk-kpi-foot">${s.foot}</span>
    </div>
  `).join('');

  const levelClass = { P0: 'p0', P1: 'p1', P2: 'p2' };
  const levelTone = { P0: 'tone-danger', P1: 'tone-warning', P2: 'tone-action' };
  const levelGlyph = { P0: '◉', P1: '◐', P2: '◌' };
  const levelCopy = { P0: '立刻阻断', P1: '24 小时内响应', P2: '72 小时内跟进' };
  riskGrid.innerHTML = items.map(item => {
    const lvl = item.level || 'P2';
    return `
    <div class="card risk-card ${levelClass[lvl] || ''} ${item.status === 'resolved' ? 'is-resolved' : ''}" data-action="risk-detail" data-id="${esc(item.id)}">
      <div class="risk-banner">
        <span class="risk-banner-glyph ${levelTone[lvl] || ''}" aria-hidden="true">${levelGlyph[lvl] || '◌'}</span>
        <div class="risk-banner-text">
          <div class="risk-banner-level">${esc(lvl)} <span class="risk-banner-divider">·</span> <span class="risk-banner-name">${levelCopy[lvl] || ''}</span></div>
          <div class="risk-banner-category">${esc(item.category || '通用风险')}</div>
        </div>
        <span class="risk-banner-status ${item.status === 'resolved' ? 'is-resolved' : 'is-open'}">${item.status === 'resolved' ? '已闭环' : '待处理'}</span>
      </div>
      <h3 class="risk-title">${esc(item.title)}</h3>
      <p class="risk-desc">${esc(item.description)}</p>
      <ol class="spine">
        <li class="spine-item ${item.status === 'resolved' ? 'spine--done' : ''}" data-state="${item.status === 'resolved' ? 'done' : 'pending'}">
          <time class="spine-time">${esc(toHHMM(item.createdAt))}</time>
          <div class="spine-body"><span class="text-xs text-tertiary">${esc(item.evidence)}</span></div>
        </li>
      </ol>
      <div class="risk-foot">
        <span class="risk-foot-chip"><span class="risk-foot-chip-key">实验</span><span class="risk-foot-chip-val">${esc(item.experimentCode)}</span></span>
        <span class="risk-foot-chip"><span class="risk-foot-chip-key">负责人</span><span class="risk-foot-chip-val">${esc(item.owner)}</span></span>
      </div>
    </div>
  `;}).join('');
}

/* ── Modal: Risk Detail ── */
async function riskDetail(id) {
  const risks = state.overview.risks || [];
  const risk = risks.find(r => r.id === id);
  if (!risk) return;
  const levelBadges = { P0: 'risk-level-badge', P1: 'risk-level-badge', P2: 'risk-level-badge' };
  const html = `
    <div class="modal-badge-row">
      <span class="badge ${levelBadges[risk.level] || 'badge-neutral'}">${esc(risk.level)}</span>
      <span class="badge badge-neutral">${esc(risk.category)}</span>
      <span class="badge ${risk.status === 'resolved' ? 'badge-success' : 'badge-error'}">${risk.status === 'resolved' ? '已关闭' : '待处理'}</span>
    </div>
    <h3 class="detail-title">${esc(risk.title)}</h3>
    <p class="detail-desc">${esc(risk.description)}</p>
    ${(risk.triggerParams || []).length ? `
      <div class="mb-4">
        <span class="section-label">触发参数</span>
        <div class="param-chips">${risk.triggerParams.map(p => `<span class="badge badge-primary">${esc(p)}</span>`).join('')}</div>
      </div>
    ` : ''}
    <div class="mb-4">
      <span class="section-label">证据来源</span>
      <div class="evidence-box">${esc(risk.evidence)}</div>
    </div>
    <div class="mb-6">
      <span class="section-label">AI 建议</span>
      <div class="ai-box">${esc(risk.aiSuggestion)}</div>
    </div>
    <div class="detail-meta-row">
      <span>负责人：${esc(risk.owner)}</span>
      <span>实验：${esc(risk.experimentCode)}</span>
    </div>
    ${risk.status !== 'resolved' ? `<button class="button button-success button-full-width" data-action="resolve-risk" data-id="${esc(risk.id)}">标记为已处理</button>` : ''}
  `;
  openModal(`<h2 id="modalTitle">风险详情</h2>${html}`);
}

async function resolveRisk(id) {
  try {
    await api(`/api/risks/${encodeURIComponent(id)}/resolve`, { method: 'POST', body: '{}' });
    closeModal();
    const fresh = await api('/api/overview'); state.overview = fresh;
    if (state.activeView === 'risks') {
      const card = $(`#riskGrid .risk-card[data-id="${CSS.escape(id)}"]`);
      if (card) {
        const spine = $('.spine', card);
        if (spine) spine.classList.add('spine--done');
      }
      setTimeout(() => renderRisks(fresh.risks || []), 260);
    }
    renderOverview(fresh);
    toast('风险已标记为已处理');
  } catch (error) { toast('操作失败：' + error.message); }
}

/* ── Infra / Connector real status (B1) ── */
const INFRA_LABEL = {
  connected: '已连接', degraded: '降级', disabled: '未配置',
  configured: '已配置', fallback: '确定性适配器', 'contract-ready': '契约就绪 · 演示适配器'
};
const INFRA_TONE = {
  connected: 'success', degraded: 'warning', disabled: 'neutral',
  configured: 'success', fallback: 'warning', 'contract-ready': 'success'
};
const INFRA_NAMES = { json: 'JSON 持久化', redis: 'Redis 缓存', neo4j: 'Neo4j 图谱', llm: 'LLM 解析', feishu: '飞书连接' };
async function renderInfra() {
  const strip = $('#infraStrip');
  const refreshBtn = $('#refreshInfra');
  if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.classList.add('is-loading'); }
  try {
    const { items } = await api('/api/infra/status');
    if (strip) {
      strip.innerHTML = ['json', 'redis', 'neo4j', 'llm', 'feishu'].map(key => {
        const it = items[key] || {};
        const tone = INFRA_TONE[it.status] || 'neutral';
        return `<span class="infra-chip" title="${esc(it.detail || '')}"><span class="infra-dot is-${tone}"></span><span class="infra-chip-name">${INFRA_NAMES[key]}</span><span class="infra-chip-state">${INFRA_LABEL[it.status] || esc(it.status)}</span></span>`;
      }).join('');
    }
    $$('.connector-card').forEach(card => {
      const key = card.dataset.connector;
      const it = items[key];
      const badge = card.querySelector('[data-connector-badge]');
      if (badge && it) {
        const tone = INFRA_TONE[it.status] || 'neutral';
        badge.className = `badge badge-${tone === 'neutral' ? 'neutral' : tone} badge-dot`;
        badge.textContent = INFRA_LABEL[it.status] || it.status;
        badge.title = it.detail || '';
        card.classList.toggle('is-locked', it.status === 'disabled' || it.status === 'degraded');
      }
    });
  } catch (error) {
    if (strip) strip.innerHTML = `<span class="infra-chip"><span class="infra-dot is-danger"></span><span class="infra-chip-name">状态查询失败</span><span class="infra-chip-state">${esc(error.message)}</span></span>`;
    toast('连接器状态获取失败：' + error.message);
  } finally {
    if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.classList.remove('is-loading'); }
  }
}

/* ── SLA metrics ring (B5) ── */
async function renderSla() {
  const valueEl = $('#slaRingValue');
  const subEl = $('#slaRingSub');
  const barEl = $('#slaRingBar');
  if (!valueEl) return;
  try {
    const sla = await api('/api/metrics/sla');
    const rate = Number(sla.slaRate) || 0;
    valueEl.innerHTML = `${Math.round(rate)}<small>%</small>`;
    const met = sla.met ?? '-', total = sla.total ?? '-';
    if (subEl) subEl.innerHTML = `目标 ≤${sla.targetHours}h · 达标 ${met}/${total} · ${sla.source === 'seed' ? '演示数据' : '实时计算'}`;
    if (barEl) {
      // Circumference of r=42 ≈ 263.9; offset = C * (1 - rate)
      const C = 2 * Math.PI * 42;
      barEl.setAttribute('stroke-dasharray', C.toFixed(2));
      // Defer one frame so the CSS transition runs from 0% to current value
      requestAnimationFrame(() => { barEl.setAttribute('stroke-dashoffset', (C * (1 - Math.max(0, Math.min(100, rate)) / 100)).toFixed(2)); });
      // Color the bar by tier: ≥90 primary, 70-89 amber, <70 error
      const tone = rate >= 90 ? 'var(--color-success)' : rate >= 70 ? 'var(--color-warning)' : 'var(--color-error)';
      barEl.setAttribute('stroke', tone);
    }
  } catch (error) {
    if (subEl) subEl.innerHTML = `目标 ≤24h · 演示数据（接口暂不可用）`;
  }
}

/* ── Knowledge approval (B2) ── */
async function approveKnowledge(id) {
  try {
    const { item } = await api(`/api/knowledge/${encodeURIComponent(id)}/approve`, { method: 'POST', body: '{}' });
    applyKnowledgeDecision(id, item);
    toast('知识已通过，进入知识湖');
  } catch (error) { toast('操作失败：' + error.message); }
}
function rejectKnowledgeModal(id) {
  openModal(`<h2 id="modalTitle">驳回知识结论</h2>
    <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4);">驳回后该结论将标记为「已驳回」，并写入审计记录。请填写驳回原因。</p>
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      <input id="rejectReason" class="form-input" placeholder="例如：置信度不足，需补充实验证据" />
      <button class="button button-danger button-full-width" data-action="confirm-reject" data-id="${esc(id)}">确认驳回</button>
    </div>
  `);
}
async function confirmReject(id) {
  const reason = $('#rejectReason')?.value?.trim() || '未填写原因';
  try {
    const { item } = await api(`/api/knowledge/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
    closeModal();
    applyKnowledgeDecision(id, item);
    toast('知识已驳回');
  } catch (error) { toast('操作失败：' + error.message); }
}
function applyKnowledgeDecision(id, item) {
  const card = $(`.js-knowledge-card[data-id="${CSS.escape(id)}"]`);
  if (card) {
    card.dataset.status = item.status;
    const statusRow = $('.knowledge-status-row', card);
    if (statusRow) {
      statusRow.innerHTML = item.status === 'approved'
        ? `<span class="badge badge-success badge-dot">已确认</span>`
        : `<span class="badge badge-error badge-dot">已驳回${item.rejectReason ? ' · ' + esc(item.rejectReason.slice(0, 18)) : ''}</span>`;
    }
    const spine = card.querySelector('.spine');
    if (spine) spine.classList.add('spine--done');
  }
  const fresh = state.overview;
  const target = fresh.knowledge?.find(k => k.id === id);
  if (target) Object.assign(target, item);
}

/* ── Meeting evidence (B3) ── */
async function meetingEvidenceModal(meetingId) {
  try {
    const { items } = await api(`/api/meetings/${encodeURIComponent(meetingId)}/evidence`);
    if (!items || !items.length) { toast('该会议暂无证据片段'); return; }
    openModal(`<h2 id="modalTitle">会议证据 · ${esc(meetingId.toUpperCase())}</h2>
      <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4);">每条结论都带精确到秒的原文证据时间戳。</p>
      <ol class="spine">
        ${items.map(ev => `
          <li class="spine-item" data-state="done">
            <time class="spine-time">${esc(ev.start)}</time>
            <div class="spine-body">
              <div class="list-item-title">${esc(ev.transcriptRef)}</div>
              <div class="list-item-description">${esc(ev.content)}</div>
              <div class="evidence-meta"><span>${esc(ev.start)} – ${esc(ev.end)}</span><span class="badge badge-success">置信度 ${Math.round((ev.confidence || 0) * 100)}%</span></div>
            </div>
          </li>
        `).join('')}
      </ol>
    `);
  } catch (error) { toast('无法加载证据：' + error.message); }
}

/* ── Modal: Experiment Detail ── */
async function experimentDetail(id) {
  try {
    const { item } = await api(`/api/experiments/${encodeURIComponent(id)}`);
    const html = `
      <div class="detail-stats">
        <div class="detail-stat">
          <span class="detail-stat-label">阶段</span>
          <span class="badge badge-primary">${esc(item.stage)}</span>
        </div>
        <div class="detail-stat">
          <span class="detail-stat-label">进度</span>
          <span class="detail-stat-value">${item.progress}%</span>
        </div>
        <div class="detail-stat">
          <span class="detail-stat-label">负责人</span>
          <span class="detail-stat-value">${esc(item.owner)}</span>
        </div>
        <div class="detail-stat">
          <span class="detail-stat-label">团队</span>
          <span class="detail-stat-value">${esc(item.team)}</span>
        </div>
      </div>
      ${(item.timeline || []).length ? `
        <div class="mb-6">
          <span class="section-label">实验时间线</span>
          <ol class="spine">
            ${item.timeline.map(t => `
              <li class="spine-item" data-state="${t.status === 'pending' ? 'pending' : 'done'}">
                <time class="spine-time">${esc(t.date)}</time>
                <div class="spine-body">
                  <div class="list-item-title">${esc(t.stage)}</div>
                </div>
              </li>
            `).join('')}
          </ol>
        </div>
      ` : ''}
      <div class="insight-box">
        <span class="insight-label">AI 洞察：</span> ${esc(item.insight)}
      </div>
      ${(item.relatedMeetings || []).length ? `
        <div class="mb-4">
          <span class="section-label">关联会议 <small class="text-tertiary">· Evidence</small></span>
          ${item.relatedMeetings.map(m => `<div class="related-item"><strong>${esc(m.title)}</strong><span>${esc(m.type)} · ${esc(m.duration)}</span><button class="evidence-entry" data-action="meeting-evidence" data-id="${esc(m.id)}">查看 ${m.evidenceCount || 0} 条证据</button></div>`).join('')}
        </div>
      ` : ''}
      ${(item.relatedKnowledge || []).length ? `
        <div class="mb-4">
          <span class="section-label">关联知识</span>
          ${item.relatedKnowledge.map(k => `<div class="related-item"><strong>${esc(k.title)}</strong><span>${esc(k.kind)}</span></div>`).join('')}
        </div>
      ` : ''}
      ${(item.relatedRisks || []).length ? `
        <div>
          <span class="section-label">关联风险</span>
          ${item.relatedRisks.map(r => `<div class="related-risk"><span class="badge badge-error">${esc(r.level)}</span><strong>${esc(r.title)}</strong></div>`).join('')}
        </div>
      ` : ''}
    `;
    openModal(`<h2 id="modalTitle">${esc(item.code)} · ${esc(item.name)}</h2>${html}`);
  } catch (error) { toast('无法加载实验详情：' + error.message); }
}

/* ── Modal: AI Analyzer (SSE Stream) ── */
function analyzerModal(meetingId) {
  const meetings = state.overview.meetings;
  const selected = meetingId || meetings[0].id;
  openModal(`<h2 id="modalTitle">AI 会议解析器</h2>
    <p style="font-size:var(--text-sm);color:var(--color-text-secondary);line-height:var(--leading-relaxed);margin-bottom:var(--space-6);">
      将会议转写转化为带证据时间戳的实验参数、决策、风险与行动项。未配置 LLM_API_KEY 时使用确定性适配器，生产环境可通过契约接入飞书会议 AI。
    </p>
    <span style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:var(--tracking-wide);display:block;margin-bottom:var(--space-3);">选择待解析会议</span>
    <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-6);">
      ${meetings.map(item => `
        <label style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);cursor:pointer;transition:all var(--transition-fast);" class="analyzer-radio-label">
          <input type="radio" name="meeting" value="${esc(item.id)}" ${item.id === selected ? 'checked' : ''} style="accent-color:var(--color-primary);" />
          <div>
            <div style="font-size:var(--text-sm);font-weight:600;">${esc(item.title)}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${esc(item.type)} · ${esc(item.duration)}</div>
          </div>
        </label>
      `).join('')}
    </div>
    <button class="button button-primary button-full-width button-lg" data-action="run-analysis">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/></svg>
      开始结构化解析
    </button>
    <div id="analysisResult" style="margin-top:var(--space-4);"></div>
  `);
}

async function runAnalysis() {
  const input = $('input[name="meeting"]:checked', $('#modalContent'));
  if (!input) return;
  const target = $('#analysisResult');
  target.innerHTML = '<div id="streamSteps" style="display:flex;flex-direction:column;gap:var(--space-2);padding:var(--space-4);background:var(--color-bg-inverse);border-radius:var(--radius-lg);max-height:200px;overflow-y:auto;"></div>';

  try {
    const response = await fetch(`/api/meetings/${encodeURIComponent(input.value)}/analyze-stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const stepsContainer = $('#streamSteps');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = JSON.parse(line.slice(6));
        if (data.done && data.analysis) {
          const a = data.analysis;
          target.innerHTML = `
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-4);">
              <span class="badge badge-success">置信度 ${Math.round(a.confidence * 100)}%</span>
              <span class="badge badge-neutral">${esc(a.mode === 'llm-api' ? 'LLM API' : a.mode === 'demo-adapter-fallback' ? '降级适配器' : '演示适配器')}</span>
              <span class="badge badge-neutral">${esc(a.elapsed)}</span>
            </div>
            ${(a.decisions || []).length ? `
              <ol class="spine">
                ${a.decisions.map(item => `
                  <li class="spine-item" data-state="${decisionDone(item) ? 'done' : 'pending'}">
                    <time class="spine-time">${esc(decisionTime(item))}</time>
                    <div class="spine-body">
                      <div class="list-item-title">${esc(item.label)}</div>
                      <div class="list-item-description">${esc(item.value)}</div>
                      ${item.evidence ? `<button class="evidence-entry" data-action="meeting-evidence" data-id="${esc(input.value)}">证据时间戳 · ${esc(item.evidence)} · 查看详情</button>` : ''}
                    </div>
                  </li>
                `).join('')}
              </ol>
            ` : ''}
            <div style="margin-top:var(--space-4);">
              <span style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:var(--tracking-wide);display:block;margin-bottom:var(--space-2);">自动拆解的行动项</span>
              ${a.actions.map(item => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) 0;border-top:1px solid var(--color-border);">
                  <div>
                    <div style="font-size:var(--text-sm);font-weight:600;">${esc(item.title)}</div>
                    <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${esc(item.owner)} · ${esc(item.due)}</div>
                  </div>
                  <span class="badge ${item.priority === 'high' ? 'badge-error' : 'badge-neutral'}">${item.priority === 'high' ? '高优先级' : '自动'}</span>
                </div>
              `).join('')}
            </div>
            <button class="button button-success button-full-width" data-action="close-modal" style="margin-top:var(--space-4);">写入知识湖并同步多维表</button>
          `;
          const fresh = await api('/api/overview'); state.overview = fresh; renderOverview(fresh);
          toast('解析完成：结论已进入 24h 知识闭环');
        } else if (stepsContainer) {
          const stepEl = document.createElement('div');
          stepEl.className = 'slide-up';
          stepEl.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;';
          stepEl.innerHTML = `
            <span style="font-size:10px;font-weight:800;color:#86efac;letter-spacing:0.08em;min-width:100px;">${esc(data.agent)}</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.7);">${esc(data.message)}</span>
            <span style="color:#86efac;margin-left:auto;">✓</span>
          `;
          stepsContainer.appendChild(stepEl);
          stepEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  } catch (error) {
    target.innerHTML = `<div style="padding:var(--space-3);background:var(--color-error-light);border-radius:var(--radius-md);color:var(--color-error);font-size:var(--text-sm);">${esc(error.message)}</div>`;
  }
}

/* ── Modal: Search ── */
function searchModal(initial = '') {
  openModal(`<h2 id="modalTitle">搜索研发知识湖</h2>
    <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4);">在会议结论、实验项目、失败经验与 SOP 中进行统一检索。</p>
    <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-4);">
      <input id="modalSearchInput" class="form-input" style="flex:1;" value="${esc(initial)}" placeholder="例如：B-17、湿度、晶型" />
      <button class="button button-primary" data-action="run-search">搜索</button>
    </div>
    <div id="searchResults"><p style="font-size:var(--text-sm);color:var(--color-text-tertiary);">推荐搜索：B-17 / 湿度 / 参数 / SOP</p></div>
  `);
  setTimeout(() => $('#modalSearchInput')?.focus(), 60);
  if (initial) runSearch(initial);
}

async function runSearch(forced) {
  const query = forced || $('#modalSearchInput')?.value.trim();
  if (!query) return;
  const target = $('#searchResults');
  target.innerHTML = '<div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3);color:var(--color-text-secondary);font-size:var(--text-sm);"><span class="spin" style="width:16px;height:16px;border:2px solid var(--color-border);border-top-color:var(--color-primary);border-radius:50%;display:inline-block;"></span>正在检索知识图谱与向量索引…</div>';
  try {
    const { items } = await api('/api/search', { method: 'POST', body: JSON.stringify({ query }) });
    target.innerHTML = items.length ? items.map(item => `
      <div class="list-item">
        ${item.image ? `<img src="${esc(item.image)}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:var(--radius-md);" />` : '<div class="list-item-icon primary" style="width:44px;height:44px;">⌕</div>'}
        <div class="list-item-content">
          <div class="list-item-title">${esc(item.title)}</div>
          <div class="list-item-description">${esc(item.kind)} · ${esc(item.source)}</div>
        </div>
        <span style="font-weight:700;color:var(--color-primary);font-variant-numeric:tabular-nums;">${Math.round((item.relevanceScore ?? item.score ?? .68) * 100)}%</span>
      </div>
    `).join('') : '<p style="font-size:var(--text-sm);color:var(--color-text-tertiary);">没有找到直接结果，请尝试 "B-17" 或 "湿度"。</p>';
  } catch (error) {
    target.innerHTML = `<p style="font-size:var(--text-sm);color:var(--color-error);">检索失败：${esc(error.message)}</p>`;
  }
}

/* ── Modal: New Task ── */
function taskModal() {
  openModal(`<h2 id="modalTitle">新建研发行动项</h2>
    <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-6);">行动项将进入实验闭环，并与来源会议或实验保持关联。</p>
    <form id="taskForm" style="display:flex;flex-direction:column;gap:var(--space-4);">
      <div class="form-group">
        <label class="form-label">任务标题</label>
        <input name="title" class="form-input" required placeholder="例如：补录批次湿度曲线" />
      </div>
      <div class="form-group">
        <label class="form-label">负责人</label>
        <input name="owner" class="form-input" required value="林岚" />
      </div>
      <div class="form-group">
        <label class="form-label">截止时间</label>
        <input name="due" class="form-input" value="明天 18:00" />
      </div>
      <button class="button button-primary button-full-width button-lg" type="submit" style="margin-top:var(--space-2);">创建行动项</button>
    </form>
  `);
  $('#taskForm').addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
      closeModal();
      toast('行动项已创建并进入研发闭环');
    } catch (error) {
      toast('创建失败：' + error.message);
    }
  });
}

/* ── Event Delegation ── */
document.addEventListener('click', event => {
  const view = event.target.closest('[data-view]');
  if (view) { setView(view.dataset.view); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'open-analyzer') analyzerModal();
  if (action === 'analyze') analyzerModal(event.target.closest('[data-id]').dataset.id);
  if (action === 'run-analysis') runAnalysis();
  if (action === 'open-search') searchModal();
  if (action === 'run-search') runSearch();
  if (action === 'new-task') taskModal();
  if (action === 'risk-detail') riskDetail(event.target.closest('[data-id]').dataset.id);
  if (action === 'resolve-risk') resolveRisk(event.target.closest('[data-id]').dataset.id);
  if (action === 'experiment-detail') experimentDetail(event.target.closest('[data-id]').dataset.id);
  if (action === 'close-modal') closeModal();
  if (action === 'refresh-infra') renderInfra();
  if (action === 'approve-knowledge') approveKnowledge(event.target.closest('[data-id]').dataset.id);
  if (action === 'reject-knowledge') rejectKnowledgeModal(event.target.closest('[data-id]').dataset.id);
  if (action === 'confirm-reject') confirmReject(event.target.closest('[data-id]').dataset.id);
  if (action === 'meeting-evidence') meetingEvidenceModal(event.target.closest('[data-id]').dataset.id);
});

$('#modalBackdrop').addEventListener('click', event => { if (event.target === event.currentTarget) closeModal(); });
$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
const searchBox = $('.search-box');
if (searchBox) {
  searchBox.addEventListener('click', event => {
    if (window.matchMedia('(max-width: 760px)').matches && !event.target.closest('input')) {
      event.preventDefault();
      openCommandMenu();
    }
  });
  searchBox.addEventListener('keydown', event => {
    if (window.matchMedia('(max-width: 760px)').matches && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openCommandMenu();
    }
  });
}
$('#globalSearch').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); searchModal(event.currentTarget.value); } });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !commandState.isOpen) closeModal();
});
$$('.toggle').forEach(button => button.addEventListener('click', () => {
  if (button.id === 'themeToggle') {
    toggleTheme();
  } else {
    button.classList.toggle('is-on');
    toast('偏好已在当前演示会话中更新');
  }
}));

/* Segmented control: single-select within each .segmented group */
$$('.segmented').forEach(group => {
  group.addEventListener('click', event => {
    const item = event.target.closest('.segmented-item');
    if (!item || !group.contains(item)) return;
    group.querySelectorAll('.segmented-item').forEach(el => el.classList.remove('is-active'));
    item.classList.add('is-active');
    const label = item.textContent.trim();
    const attr = item.dataset.density || item.dataset.size || '';
    toast(`已切换到 ${label}${attr ? ' (' + attr + ')' : ''}`);
  });
});

/* Range slider: live-update the value label and the track progress */
$$('.range').forEach(range => {
  const out = range.parentElement?.querySelector('.range-value');
  const update = () => {
    if (out) out.textContent = (range.value / 100).toFixed(2);
    const min = Number(range.min || 0), max = Number(range.max || 100);
    const pct = ((Number(range.value) - min) / Math.max(1, max - min)) * 100;
    range.style.setProperty('--range-progress', `${pct.toFixed(1)}%`);
  };
  range.addEventListener('input', update);
  update();
});

/* Select: confirm on change */
$$('.select').forEach(sel => sel.addEventListener('change', e => {
  toast(`已选择：${e.target.value}`);
}));
$('#refreshActivity').addEventListener('click', async () => {
  try {
    const fresh = await api('/api/overview');
    state.overview = fresh;
    renderOverview(fresh);
    toast('活动流已刷新');
  } catch (error) {
    toast('刷新失败：' + error.message);
  }
});

/* Knowledge Graph — Canvas Force-Directed */
class KnowledgeGraph {
  constructor(containerId, canvasId, tooltipId) {
    this.container = document.getElementById(containerId);
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.tooltip = document.getElementById(tooltipId);
    this.nodes = [];
    this.edges = [];
    this.dragNode = null;
    this.hoverNode = null;
    this.width = 0;
    this.height = 0;
    // Semantic graph palette: muted, desaturated tones — color carries meaning, not decoration.
    this.colors = { experiment: '#7aa7d9', conclusion: '#9d8ec7', risk: '#d98a8a', spec: '#6fb8c9', meeting: '#6fbf9f' };
    this.dashOffset = 0;
    this._resize();
    this._bindEvents();
    this._initData();
    this._animate();
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(rect.width, 280);
    this.height = Math.max(rect.height, 350);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _radiusFor(type) {
    return type === 'experiment' ? 26 : type === 'risk' ? 22 : type === 'meeting' ? 20 : type === 'spec' ? 18 : 20;
  }

  _fallbackGraph() {
    // Radial layout: hub dead-center, 4 inner satellites on the cardinals, 4 on the diagonals,
    // 2 on the far ring. Ring radii are generous so labels never collide with the hub or each other.
    const cx = this.width / 2, cy = this.height / 2;
    const r = Math.min(this.width, this.height);
    const ring1 = r * 0.28; // inner cardinals
    const ring2 = r * 0.42; // outer diagonals
    const ring3 = r * 0.50; // far satellites
    this.nodes = [
      // Hub
      { id: 'B-17', label: '晶型筛选', type: 'experiment', x: cx, y: cy, r: 30, vx: 0, vy: 0, detail: '候选化合物晶型筛选 · 参数评审 · 进度 72%' },
      // Inner ring — 4 cardinals
      { id: 'B-11', label: '历史方案', type: 'conclusion', x: cx, y: cy - ring1, r: 18, vx: 0, vy: 0, detail: '低温梯度晶型筛选最优参数 · 置信度 94%', labelDir: 'top' },
      { id: 'A-09', label: '失败案例', type: 'risk', x: cx + ring1, y: cy, r: 18, vx: 0, vy: 0, detail: '湿度波动导致结晶异常 · P1 风险', labelDir: 'right' },
      { id: 'SOP-17', label: '流程规范', type: 'spec', x: cx, y: cy + ring1, r: 18, vx: 0, vy: 0, detail: '自动化工作站换液顺序与污染控制 SOP', labelDir: 'bottom' },
      { id: 'mt-2407', label: '会议证据', type: 'meeting', x: cx - ring1, y: cy, r: 18, vx: 0, vy: 0, detail: 'B-17 参数评审会 · 38 min · 6 人参会', labelDir: 'left' },
      // Outer ring — 4 diagonals
      { id: 'k-01', label: '最优参数', type: 'conclusion', x: cx + ring2 * 0.72, y: cy - ring2 * 0.72, r: 14, vx: 0, vy: 0, detail: 'B-11 低温梯度方案 · 来源 mt-2388', labelDir: 'top-right' },
      { id: 'C-04', label: '药效测试', type: 'experiment', x: cx + ring2 * 0.72, y: cy + ring2 * 0.72, r: 14, vx: 0, vy: 0, detail: '药效测试样本队列优化 · 实验执行中', labelDir: 'bottom-right' },
      { id: 'D-22', label: '溶剂迁移', type: 'experiment', x: cx - ring2 * 0.72, y: cy + ring2 * 0.72, r: 14, vx: 0, vy: 0, detail: '溶剂体系迁移验证 · 知识复用阶段', labelDir: 'bottom-left' },
      { id: 'k-04', label: '方案争议', type: 'conclusion', x: cx - ring2 * 0.72, y: cy - ring2 * 0.72, r: 14, vx: 0, vy: 0, detail: '溶剂比例对晶型稳定性影响 · 置信度 84%', labelDir: 'top-left' },
      // Far satellites (outermost)
      { id: 'k-02', label: '失败经验', type: 'risk', x: cx + ring3, y: cy - ring3 * 0.55, r: 12, vx: 0, vy: 0, detail: 'A-09 湿度波动根因分析 · 来源 mt-2406', labelDir: 'right' },
      { id: 'k-03', label: '换液 SOP', type: 'spec', x: cx - ring3, y: cy + ring3 * 0.55, r: 12, vx: 0, vy: 0, detail: '污染控制标准操作流程 v2.1', labelDir: 'left' }
    ];
    this.edges = [
      { from: 'B-17', to: 'B-11', label: '相似方案' },
      { from: 'B-17', to: 'A-09', label: '风险关联' },
      { from: 'B-17', to: 'SOP-17', label: '遵循' },
      { from: 'B-17', to: 'mt-2407', label: '证据来源' },
      { from: 'B-11', to: 'k-01', label: '产出' },
      { from: 'A-09', to: 'k-02', label: '根因' },
      { from: 'SOP-17', to: 'k-03', label: '引用' },
      { from: 'B-17', to: 'k-04', label: '争议' },
      { from: 'C-04', to: 'B-17', label: '依赖' },
      { from: 'D-22', to: 'B-17', label: '参考' }
    ];
  }

  async _initData() {
    const cx = this.width / 2, cy = this.height / 2;
    try {
      // Default to a single-experiment view so the graph stays readable; full graph dumps
      // every knowledge asset and risk and becomes a hairball.
      const res = await fetch('/api/graph?experimentId=B-17');
      const payload = await res.json();
      const { nodes, edges } = payload.data || payload;
      if (!nodes || !nodes.length) { this._fallbackGraph(); return; }
      // Hub: the active experiment. Satellites: related knowledge on radial rings.
      const hub = nodes.find(n => n.type === 'experiment') || nodes[0];
      const r = Math.min(this.width, this.height);
      const ring1 = r * 0.28;
      const ring2 = r * 0.42;
      const ring3 = r * 0.50;
      const dirs = ['top', 'right', 'bottom', 'left', 'top-right', 'bottom-right', 'bottom-left', 'top-left', 'right', 'left'];
      this.nodes = nodes.map((n, i) => {
        if (n.id === hub.id) {
          return { id: n.id, label: n.label, type: n.type || 'conclusion', detail: n.meta?.detail || '', r: 30, x: cx, y: cy, vx: 0, vy: 0, labelDir: 'bottom' };
        }
        const idx = nodes.findIndex(x => x.id === n.id) - nodes.findIndex(x => x.id === hub.id);
        const satellites = nodes.length - 1;
        const angle = (idx / Math.max(1, satellites)) * Math.PI * 2 - Math.PI / 2;
        const ring = idx < 4 ? ring1 : idx < 8 ? ring2 : ring3;
        // Derive labelDir from the actual angle so a label is always on the *outward* side
        // of its node — never pointing back at the hub.
        let dir = dirs[(idx - 1) % dirs.length] || 'top';
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        if (Math.abs(cosA) > 0.6) dir = cosA > 0 ? 'right' : 'left';
        else if (Math.abs(sinA) > 0.6) dir = sinA > 0 ? 'bottom' : 'top';
        else if (cosA > 0 && sinA < 0) dir = 'top-right';
        else if (cosA > 0 && sinA > 0) dir = 'bottom-right';
        else if (cosA < 0 && sinA > 0) dir = 'bottom-left';
        else if (cosA < 0 && sinA < 0) dir = 'top-left';
        return {
          id: n.id, label: n.label, type: n.type || 'conclusion', detail: n.meta?.detail || '',
          r: this._radiusFor(n.type), x: cx + Math.cos(angle) * ring, y: cy + Math.sin(angle) * ring, vx: 0, vy: 0,
          labelDir: dir
        };
      });
      this.edges = (edges || []).map(e => ({ from: e.source, to: e.target, label: e.relation || '' }));
      const badge = $('#graphCount');
      if (badge) badge.textContent = `${this.nodes.length} 节点 · ${this.edges.length} 边`;
    } catch (error) {
      this._fallbackGraph();
      const badge = $('#graphCount');
      if (badge) badge.textContent = '离线图谱';
    }
  }

  _nodeById(id) { return this.nodes.find(n => n.id === id); }

  _tick() {
    if (this.dragNode) return; // dragging is a deliberate inspection mode; freeze the layout.
    // Static radial layout: keep nodes on their assigned ring. We only resolve *real*
    // collisions (nodes pushed by the browser into each other), never a soft center pull,
    // so cardinals stay at the cardinals and never migrate toward the hub.
    const damping = 0.78, separation = 2.2;
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      if (a === this.dragNode) continue;
      let fx = 0, fy = 0;
      // Hard separation: push apart only when nodes are *visibly* colliding
      for (let j = 0; j < this.nodes.length; j++) {
        if (i === j) continue;
        const b = this.nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = (a.r + b.r) * separation + 6;
        if (dist < minDist) {
          const push = (minDist - dist) / dist * 0.4;
          fx += dx * push;
          fy += dy * push;
        }
      }
      a.vx = (a.vx + fx) * damping;
      a.vy = (a.vy + fy) * damping;
    }
    for (const n of this.nodes) {
      if (n === this.dragNode) continue;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(n.r + 6, Math.min(this.width - n.r - 6, n.x));
      n.y = Math.max(n.r + 6, Math.min(this.height - n.r - 6, n.y));
    }
  }

  _draw() {
    const ctx = this.ctx;
    // The knowledge lake is a dedicated dark analytical surface in both themes.
    // It gives the graph a distinct identity instead of looking like a chart pasted
    // onto a light card, while the surrounding workspace still follows the theme.
    const dark = true;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#0c1722';
    ctx.fillRect(0, 0, this.width, this.height);
    // A quiet dot grid makes the graph feel spatial without competing with data.
    ctx.fillStyle = 'rgba(125, 211, 252, 0.07)';
    for (let x = 20; x < this.width; x += 40) for (let y = 20; y < this.height; y += 40) ctx.fillRect(x, y, 1, 1);
    const connectedToHover = new Set();
    if (this.hoverNode) {
      for (const e of this.edges) {
        if (e.from === this.hoverNode.id) connectedToHover.add(e.to);
        if (e.to === this.hoverNode.id) connectedToHover.add(e.from);
      }
    }

    // Draw edges
    for (const e of this.edges) {
      const a = this._nodeById(e.from), b = this._nodeById(e.to);
      if (!a || !b) continue;
      const isHL = this.hoverNode && (e.from === this.hoverNode.id || e.to === this.hoverNode.id);
      const dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const bend = Math.min(34, distance * 0.12) * (a.x <= b.x ? 1 : -1);
      const mx = (a.x + b.x) / 2 - (dy / distance) * bend;
      const my = (a.y + b.y) / 2 + (dx / distance) * bend;
      const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      gradient.addColorStop(0, isHL ? this.colors[a.type] : (dark ? 'rgba(255,255,255,0.30)' : 'rgba(120,113,108,0.28)'));
      gradient.addColorStop(1, isHL ? this.colors[b.type] : (dark ? 'rgba(255,255,255,0.13)' : 'rgba(120,113,108,0.14)'));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = isHL ? 1.8 : 1.2;
      ctx.setLineDash(isHL ? [5, 5] : []);
      ctx.lineDashOffset = -this.dashOffset;
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const arrowDist = b.r + 4;
      const ax2 = b.x - Math.cos(angle) * arrowDist, ay2 = b.y - Math.sin(angle) * arrowDist;
      ctx.beginPath();
      ctx.moveTo(ax2, ay2);
      ctx.lineTo(ax2 - 8 * Math.cos(angle - 0.35), ay2 - 8 * Math.sin(angle - 0.35));
      ctx.lineTo(ax2 - 8 * Math.cos(angle + 0.35), ay2 - 8 * Math.sin(angle + 0.35));
      ctx.closePath();
      ctx.fillStyle = isHL ? 'rgba(125, 211, 252, 0.85)' : 'rgba(143,166,184,0.28)';
      ctx.fill();

      if (isHL && e.label) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.font = '500 10px Inter, sans-serif';
        ctx.fillStyle = '#7dd3fc';
        ctx.textAlign = 'center';
        ctx.fillText(e.label, mx, my - 6);
      }
    }

    // Draw nodes
    for (const n of this.nodes) {
      const isHover = n === this.hoverNode;
      const isConnected = connectedToHover.has(n.id);
      const dimmed = this.hoverNode && !isHover && !isConnected;
      const color = this.colors[n.type] || '#1d4ed8';

      // Halo for breathing depth
      const grad = ctx.createRadialGradient(n.x, n.y, n.r * 0.3, n.x, n.y, n.r + 6);
      grad.addColorStop(0, isHover ? color : (dimmed ? 'rgba(26,43,61,0.45)' : '#1a2b3d'));
      grad.addColorStop(1, isHover ? color + 'aa' : 'rgba(12,23,34,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.globalAlpha = dimmed ? 0.35 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = isHover ? color : (dimmed ? 'rgba(26,43,61,0.6)' : '#1a2b3d');
      ctx.shadowBlur = isHover ? 18 : 6;
      ctx.shadowColor = dimmed ? 'transparent' : color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = isHover ? 2 : 1.2;
      ctx.strokeStyle = dimmed ? 'rgba(210,224,235,0.12)' : (isHover ? color : color + '99');
      ctx.stroke();

      if (isHover) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = color + '30';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // ID inside the bubble (centered, font shrinks for long IDs so it never clips)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const isLarge = n.r > 24;
      const idLen = (n.id || '').length;
      // Auto-fit: pick a font size that always fits inside the bubble diameter.
      const idMaxWidth = (n.r * 2) - 6; // 3px padding each side
      let idFontPx = isLarge ? 12 : 11;
      for (const tryPx of (isLarge ? [12, 11, 10, 9] : [11, 10, 9, 8])) {
        ctx.font = `700 ${tryPx}px Inter, sans-serif`;
        if (ctx.measureText(n.id || '').width <= idMaxWidth) { idFontPx = tryPx; break; }
        idFontPx = tryPx;
      }
      ctx.fillStyle = dimmed ? 'rgba(210,224,235,0.3)' : (isHover ? '#071019' : '#e6edf3');
      ctx.font = `700 ${idFontPx}px Inter, sans-serif`;
      ctx.fillText(n.id, n.x, n.y);

      // External label positioned per labelDir so labels never overlap nodes or each other.
      if (n.label) {
        const isLarge = n.r > 24;
        const labelFont = isLarge ? '600 12px' : '500 11px';
        const text = n.label;
        ctx.font = `${labelFont} Inter, -apple-system, "PingFang SC", sans-serif`;
        const metrics = ctx.measureText(text);
        const padX = 6, padY = 3;
        const w = metrics.width + padX * 2;
        const h = 11 + padY * 2;
        const dir = n.labelDir || 'top';
        const off = n.r + 9;
        let lx = n.x, ly = n.y, ta = 'center', tb = 'middle';
        if (dir === 'top') { ly = n.y - off; ta = 'center'; }
        else if (dir === 'bottom') { ly = n.y + off; ta = 'center'; }
        else if (dir === 'left') { lx = n.x - off; ta = 'right'; }
        else if (dir === 'right') { lx = n.x + off; ta = 'left'; }
        else if (dir === 'top-left') { lx = n.x - off * 0.85; ly = n.y - off * 0.85; ta = 'right'; }
        else if (dir === 'top-right') { lx = n.x + off * 0.85; ly = n.y - off * 0.85; ta = 'left'; }
        else if (dir === 'bottom-left') { lx = n.x - off * 0.85; ly = n.y + off * 0.85; ta = 'right'; }
        else if (dir === 'bottom-right') { lx = n.x + off * 0.85; ly = n.y + off * 0.85; ta = 'left'; }
        // Compute rect origin based on text alignment
        let rx = lx;
        if (ta === 'center') rx = lx - w / 2;
        else if (ta === 'right') rx = lx - w;
        const ry = ly - h / 2;
        // Pill background for readability against the dark canvas
        ctx.fillStyle = dimmed ? 'rgba(12, 23, 34, 0.45)' : 'rgba(8, 18, 26, 0.88)';
        if (isHover) ctx.fillStyle = 'rgba(31, 138, 109, 0.95)';
        const radius = h / 2;
        ctx.beginPath();
        ctx.moveTo(rx + radius, ry);
        ctx.lineTo(rx + w - radius, ry);
        ctx.arcTo(rx + w, ry, rx + w, ry + radius, radius);
        ctx.lineTo(rx + w, ry + h - radius);
        ctx.arcTo(rx + w, ry + h, rx + w - radius, ry + h, radius);
        ctx.lineTo(rx + radius, ry + h);
        ctx.arcTo(rx, ry + h, rx, ry + h - radius, radius);
        ctx.lineTo(rx, ry + radius);
        ctx.arcTo(rx, ry, rx + radius, ry, radius);
        ctx.closePath();
        // Drop shadow for separation from node bubbles
        ctx.shadowColor = isHover ? 'rgba(31, 138, 109, 0.35)' : 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = isHover ? 10 : 8;
        ctx.shadowOffsetY = 1;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        // 1.5px brighter hairline ring so the pill clearly separates from node circles
        ctx.strokeStyle = isHover ? 'rgba(94, 234, 212, 0.75)' : 'rgba(122, 219, 211, 0.40)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Text
        ctx.textAlign = ta;
        ctx.textBaseline = tb;
        ctx.fillStyle = isHover ? '#071019' : '#e6edf3';
        ctx.fillText(text, lx, ly);
      }
    }
  }

  _animate() {
    this._tick();
    this.dashOffset = (this.dashOffset + 0.35) % 100;
    this._draw();
    requestAnimationFrame(() => this._animate());
  }

  _getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _hitTest(pos) {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const dx = pos.x - n.x, dy = pos.y - n.y;
      if (dx * dx + dy * dy <= n.r * n.r) return n;
    }
    return null;
  }

  _showTooltip(node, pos) {
    if (!node) { this.tooltip.style.display = 'none'; return; }
    this.tooltip.innerHTML = `<strong style="color:#1d4ed8;">${esc(node.id)}</strong> <small style="color:#78716c;margin-left:4px;">${esc(node.label)}</small><p style="margin:4px 0 0;color:#57534e;">${esc(node.detail)}</p>`;
    this.tooltip.style.display = 'block';
    let tx = pos.x + 16, ty = pos.y - 10;
    if (tx + 220 > this.width) tx = pos.x - 230;
    if (ty + 80 > this.height) ty = pos.y - 80;
    this.tooltip.style.left = tx + 'px';
    this.tooltip.style.top = ty + 'px';
  }

  _bindEvents() {
    let dragging = false;
    let movedDuringDrag = false;
    // Pointer events keep the graph inspectable with a mouse, pen, or touch.
    this.canvas.addEventListener('pointerdown', e => {
      const pos = this._getMousePos(e);
      const node = this._hitTest(pos);
      if (node) {
        this.canvas.setPointerCapture?.(e.pointerId);
        this.dragNode = node;
        dragging = true;
        movedDuringDrag = false;
        this.canvas.style.cursor = 'grabbing';
      }
    });
    this.canvas.addEventListener('pointermove', e => {
      const pos = this._getMousePos(e);
      if (dragging && this.dragNode) {
        e.preventDefault();
        if (Math.hypot(pos.x - this.dragNode.x, pos.y - this.dragNode.y) > 3) movedDuringDrag = true;
        this.dragNode.x = Math.max(this.dragNode.r + 4, Math.min(this.width - this.dragNode.r - 4, pos.x));
        this.dragNode.y = Math.max(this.dragNode.r + 4, Math.min(this.height - this.dragNode.r - 4, pos.y));
        this.dragNode.vx = 0;
        this.dragNode.vy = 0;
      } else {
        const node = this._hitTest(pos);
        this.hoverNode = node;
        this.canvas.style.cursor = node ? 'pointer' : 'default';
        this._showTooltip(node, pos);
      }
    });
    const stopDragging = () => {
      dragging = false;
      this.dragNode = null;
      this.canvas.style.cursor = this.hoverNode ? 'pointer' : 'default';
    };
    this.canvas.addEventListener('pointerup', stopDragging);
    this.canvas.addEventListener('pointercancel', stopDragging);
    this.canvas.addEventListener('pointerleave', () => {
      if (!dragging) {
        this.hoverNode = null;
        this._showTooltip(null);
        this.canvas.style.cursor = 'default';
      }
    });
    this.canvas.addEventListener('click', e => {
      if (dragging || movedDuringDrag) return;
      const pos = this._getMousePos(e);
      const node = this._hitTest(pos);
      if (node) {
        const rels = this.edges.filter(ed => ed.from === node.id || ed.to === node.id);
        openModal(`<h2 id="modalTitle">${esc(node.id)} · ${esc(node.label)}</h2>
          <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4);">${esc(node.detail)}</p>
          <span style="font-size:var(--text-xs);font-weight:600;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:var(--tracking-wide);display:block;margin-bottom:var(--space-3);">关联关系</span>
          <div style="display:flex;flex-direction:column;gap:var(--space-2);">
            ${rels.map(ed => {
              const other = ed.from === node.id ? ed.to : ed.from;
              const dir = ed.from === node.id ? '→' : '←';
              return `<div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);font-size:var(--text-sm);">
                <span style="font-weight:600;color:var(--color-primary);">${dir} ${esc(other)}</span>
                <span class="badge badge-neutral">${esc(ed.label)}</span>
              </div>`;
            }).join('')}
          </div>
          <button class="button button-secondary button-full-width" data-action="close-modal" style="margin-top:var(--space-4);">关闭</button>
        `);
      }
    });
    window.addEventListener('resize', () => { this._resize(); this._initData(); });
  }
}

let knowledgeGraphInstance = null;
function initKnowledgeGraph() {
  if (knowledgeGraphInstance) return;
  const container = document.getElementById('graphContainer');
  if (container && container.offsetParent !== null) {
    knowledgeGraphInstance = new KnowledgeGraph('graphContainer', 'knowledgeCanvas', 'graphTooltip');
  }
}

/* ── Theme Toggle ── */
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  const toggle = $('#themeToggle');
  if (toggle) toggle.classList.toggle('is-on', newTheme === 'dark');
  toast(newTheme === 'dark' ? '已切换至深色模式' : '已切换至浅色模式');
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  const theme = saved || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = $('#themeToggle');
  if (toggle) toggle.classList.toggle('is-on', theme === 'dark');
}

/* ── Command Menu ── */
let commandState = { isOpen: false, commands: [], filtered: [], activeIndex: 0 };

function loadCommands() {
  const nav = [
    { id: 'overview', icon: '▣', text: '研发总览', desc: '查看全局指标', action: () => setView('overview') },
    { id: 'experiments', icon: '◱', text: '实验流转', desc: '管理实验流程', action: () => setView('experiments') },
    { id: 'risks', icon: '▲', text: '风险守门', desc: '处理风险预警', action: () => setView('risks') },
    { id: 'knowledge', icon: '◍', text: '知识湖', desc: '浏览知识图谱', action: () => setView('knowledge') },
    { id: 'agents', icon: '✦', text: 'AI 助理', desc: '查看 Agent 状态', action: () => setView('agents') },
    { id: 'integrations', icon: '⊞', text: '连接器', desc: '管理集成', action: () => setView('integrations') },
    { id: 'settings', icon: '⚙', text: '偏好设置', desc: '调整配置', action: () => setView('settings') }
  ];
  const actions = [
    { id: 'theme', icon: '◐', text: '切换主题', desc: '深色/浅色模式', action: toggleTheme },
    { id: 'search', icon: '⌕', text: '全局搜索', desc: '搜索实验、知识、会议', action: () => { const input = $('#globalSearch'); if (input) { input.focus(); input.select(); } } }
  ];
  commandState.commands = [
    { category: '导航', items: nav },
    { category: '操作', items: actions }
  ];
  commandState.filtered = commandState.commands;
}

function openCommandMenu() {
  if (commandState.isOpen) return;
  commandState.isOpen = true;
  commandState.activeIndex = 0;
  const menu = $('#commandMenu');
  const backdrop = $('#commandBackdrop');
  const input = $('#commandInput');
  const searchBox = $('.search-box');
  if (menu) { menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false'); }
  if (searchBox) searchBox.setAttribute('aria-expanded', 'true');
  if (backdrop) backdrop.classList.add('is-open');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
  initCommandMenu();
  renderCommandMenu();
}

function closeCommandMenu() {
  commandState.isOpen = false;
  const menu = $('#commandMenu');
  const backdrop = $('#commandBackdrop');
  const searchBox = $('.search-box');
  if (menu) { menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true'); }
  if (searchBox) searchBox.setAttribute('aria-expanded', 'false');
  if (backdrop) backdrop.classList.remove('is-open');
}

function filterCommands(query) {
  const q = query.toLowerCase().trim();
  if (!q) { commandState.filtered = commandState.commands; commandState.activeIndex = 0; renderCommandMenu(); return; }
  commandState.filtered = commandState.commands.map(cat => ({
    category: cat.category,
    items: cat.items.filter(item => item.text.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q))
  })).filter(cat => cat.items.length > 0);
  commandState.activeIndex = 0;
  renderCommandMenu();
}

function renderCommandMenu() {
  const list = $('#commandList');
  if (!list) return;
  if (commandState.filtered.length === 0 || commandState.filtered.every(cat => cat.items.length === 0)) {
    list.innerHTML = '<div class="command-menu-empty">没有找到匹配的命令</div>';
    return;
  }
  let html = '';
  let globalIndex = 0;
  commandState.filtered.forEach(cat => {
    html += `<div class="command-menu-category">${cat.category}</div>`;
    cat.items.forEach(item => {
      const isActive = globalIndex === commandState.activeIndex;
      html += `<div class="command-menu-item${isActive ? ' is-active' : ''}" data-command-id="${item.id}">
        <span class="command-menu-item-icon">${esc(item.icon)}</span>
        <span class="command-menu-item-text">${esc(item.text)}</span>
        <span class="command-menu-item-desc">${esc(item.desc)}</span>
      </div>`;
      globalIndex++;
    });
  });
  list.innerHTML = html;
  list.querySelectorAll('.command-menu-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-command-id');
      executeCommand(id);
    });
  });
}

function executeCommand(id) {
  let found = null;
  commandState.commands.forEach(cat => {
    cat.items.forEach(item => { if (item.id === id) found = item; });
  });
  if (found && found.action) {
    closeCommandMenu();
    found.action();
  }
}

function navigateCommandMenu(direction) {
  const total = commandState.filtered.reduce((sum, cat) => sum + cat.items.length, 0);
  if (total === 0) return;
  commandState.activeIndex = (commandState.activeIndex + direction + total) % total;
  renderCommandMenu();
  const active = $('.command-menu-item.is-active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

function initCommandMenu() {
  const navigation = [
    { id: 'overview', icon: '▣', text: '研发总览', desc: '查看全局指标', action: () => setView('overview') },
    { id: 'experiments', icon: '◱', text: '实验流转', desc: '管理实验流程', action: () => setView('experiments') },
    { id: 'risks', icon: '▲', text: '风险守门', desc: '处理风险预警', action: () => setView('risks') },
    { id: 'knowledge', icon: '◍', text: '知识湖', desc: '浏览知识图谱', action: () => setView('knowledge') },
    { id: 'agents', icon: '✦', text: 'AI 助理', desc: '查看 Agent 状态', action: () => setView('agents') },
    { id: 'integrations', icon: '⊞', text: '连接器', desc: '管理集成', action: () => setView('integrations') },
    { id: 'settings', icon: '⚙', text: '偏好设置', desc: '调整配置', action: () => setView('settings') }
  ];
  const actions = [
    { id: 'analyzer', icon: '✦', text: '解析一场会议', desc: '启动流式 AI 解析', action: () => analyzerModal() },
    { id: 'search', icon: '⌕', text: '全局搜索', desc: '搜索实验、知识、会议', action: () => { const input = $('#globalSearch'); if (input) { input.focus(); input.select(); } } },
    { id: 'theme', icon: '◐', text: '切换主题', desc: '深色 / 浅色模式', action: toggleTheme }
  ];
  const experiments = (state.overview?.experiments || []).map(exp => ({
    id: `experiment-${exp.id}`, icon: '⊕', text: `实验 ${exp.code}`, desc: exp.name,
    action: () => { setView('experiments'); setTimeout(() => experimentDetail(exp.id), 80); }
  }));
  const knowledge = (state.overview?.knowledge || []).slice(0, 8).map(item => ({
    id: `knowledge-${item.id}`, icon: '◈', text: item.title, desc: `${item.kind} · ${item.source}`,
    action: () => searchModal(item.title)
  }));
  commandState.commands = [
    { category: '导航', items: navigation },
    { category: '操作', items: actions },
    { category: '实验', items: experiments },
    { category: '知识', items: knowledge }
  ];
  commandState.filtered = commandState.commands;
  const input = $('#commandInput');
  if (input && !input.dataset.bound) {
    input.dataset.bound = 'true';
    input.addEventListener('input', event => filterCommands(event.target.value));
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeCommandMenu();
        input.blur();
      }
    });
  }
  const backdrop = $('#commandBackdrop');
  if (backdrop && !backdrop.dataset.bound) {
    backdrop.dataset.bound = 'true';
    backdrop.addEventListener('click', closeCommandMenu);
  }
}

/* ── Boot ── */
(async function boot() {
  try {
    // Initialize theme
    initTheme();
    
    // Initialize command menu
    initCommandMenu();
    
    // Load data
    renderLoadingState();
    state.overview = await api('/api/overview');
    renderOverview(state.overview);
    renderSla();
    renderInfra();
    // Rebuild the command index now that experiments and knowledge assets are loaded.
    initCommandMenu();
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Command menu: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandMenu();
      }
      
      // Command menu navigation
      if (commandState.isOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeCommandMenu();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateCommandMenu(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateCommandMenu(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const active = $('.command-menu-item.is-active');
          if (active) {
            const id = active.getAttribute('data-command-id');
            executeCommand(id);
          }
        }
      }
    });
  } catch (error) {
    document.body.innerHTML = `<main style="padding:40px;font-family:Inter,sans-serif;"><h1 style="font-size:24px;margin-bottom:12px;">无法加载晶流</h1><p style="color:#78716c;">${esc(error.message)}</p></main>`;
  }
})();
