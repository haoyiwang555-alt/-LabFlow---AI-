const state = { overview: null, activeView: 'overview' };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || '请求失败');
  return payload;
}
function toast(message) {
  const node = $('#toast'); node.textContent = message; node.classList.add('is-visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('is-visible'), 2600);
}
function openModal(html) {
  $('#modalContent').innerHTML = html;
  $('#modalBackdrop').classList.add('is-visible');
  $('#modalBackdrop').setAttribute('aria-hidden', 'false');
}
function closeModal() {
  $('#modalBackdrop').classList.remove('is-visible');
  $('#modalBackdrop').setAttribute('aria-hidden', 'true');
}
function setView(name) {
  state.activeView = name;
  $$('.page-view').forEach(node => node.classList.toggle('is-visible', node.dataset.page === name));
  $$('.nav-item[data-view]').forEach(node => node.classList.toggle('is-active', node.dataset.view === name));
  $('.topbar-left strong').textContent = ({ overview: '研发总览', experiments: '实验流转', knowledge: '知识湖', agents: 'AI 助理', integrations: '连接器', settings: '偏好设置' })[name] || '晶流';
  $('#sidebar').classList.remove('is-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderOverview(data) {
  const metricDefs = [
    ['24h 知识 SLA', `${data.metrics.knowledgeSla}<small>%</small>`, '较上周 +12.4%', ''],
    ['平均复用耗时', `${data.metrics.avgReuseHours}<small>小时</small>`, '目标 ≤ 8 小时', ''],
    ['进行中实验', `${data.metrics.activeExperiments}<small>项</small>`, '3 项今天有更新', ''],
    ['待处理风险', `${data.metrics.pendingRisks}<small>项</small>`, '1 项 P1 优先级', 'coral']
  ];
  $('#metricGrid').innerHTML = metricDefs.map(([label, value, trend, tone]) => `<article class="metric-card"><span class="metric-mark"></span><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-trend ${tone}">${trend}</div></article>`).join('');
  $('#pipeline').innerHTML = data.pipeline.map((item, index) => `<div class="pipeline-step state-${esc(item.state)}"><span class="pipeline-node">${item.state === 'done' ? '✓' : index + 1}</span><b>${esc(item.label)}</b><small>${item.count} 项</small></div>`).join('');
  $('#meetingList').innerHTML = data.meetings.map((item, index) => `<article class="meeting-row"><span class="meeting-avatar">${String(index + 1).padStart(2, '0')}</span><div><div class="meeting-title">${esc(item.title)}</div><div class="meeting-meta">${esc(item.date)} · ${esc(item.duration)} · ${item.participants} 人</div></div><button class="meeting-action ${item.status === 'analyzed' ? 'is-done' : ''}" data-action="analyze" data-id="${esc(item.id)}">${item.status === 'analyzed' ? '查看结论' : '开始解析'}</button></article>`).join('');
  $('#activityList').innerHTML = data.activity.map(item => `<article class="activity-item"><span class="activity-icon ${esc(item.tone)}"></span><div><span class="activity-time">${esc(item.time)}</span><b>${esc(item.title)}</b><p>${esc(item.detail)}</p></div></article>`).join('');
  renderExperiments(data.experiments);
  renderKnowledge(data.knowledge);
}
function renderExperiments(items) {
  $('#experimentGrid').innerHTML = items.map(item => `<article class="experiment-card"><div class="experiment-image"><img src="${esc(item.image)}" alt="${esc(item.name)} 场景图" /><span class="experiment-code">${esc(item.code)}</span><span class="experiment-risk ${item.risk === 'high' ? 'high' : ''}">${item.risk === 'high' ? '高风险' : item.risk === 'watch' ? '需关注' : '运行正常'}</span></div><div class="experiment-content"><h3>${esc(item.name)}</h3><div class="experiment-team"><span>${esc(item.team)} · ${esc(item.owner)}</span><span>${esc(item.updated)}</span></div><div class="experiment-progress"><span style="width:${Number(item.progress)}%"></span></div><div class="experiment-bottom"><span class="stage-tag">${esc(item.stage)}</span><span>${item.progress}%</span></div><div class="experiment-insight"><strong>AI 洞察：</strong>${esc(item.insight)}</div></div></article>`).join('');
}
function renderKnowledge(items) {
  $('#knowledgeList').innerHTML = `<div>${items.map(item => `<article class="knowledge-item"><span class="knowledge-thumb"><img src="${esc(item.image)}" alt="${esc(item.kind)}素材" /></span><div><h4>${esc(item.title)}</h4><p>${esc(item.kind)} · ${esc(item.source)}</p></div><strong class="knowledge-score">${Math.round(item.score * 100)}%</strong></article>`).join('')}</div>`;
}
function analyzerModal(meetingId) {
  const meetings = state.overview.meetings;
  const selected = meetingId || meetings[0].id;
  openModal(`<h2 id="modalTitle">AI 会议解析器</h2><p class="modal-subtitle">将会议转写转化为带证据时间戳的实验参数、决策、风险与行动项。演示环境使用确定性 AI 适配器，生产环境可直连飞书会议 AI。</p><span class="modal-label">选择待解析会议</span><div class="analysis-block">${meetings.map(item => `<label style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid #e0e8e2"><input type="radio" name="meeting" value="${esc(item.id)}" ${item.id === selected ? 'checked' : ''}><span><b style="font-size:11px">${esc(item.title)}</b><small style="display:block;color:#929e97;margin-top:4px">${esc(item.type)} · ${esc(item.duration)}</small></span></label>`).join('')}</div><button class="button button-dark full-width" data-action="run-analysis">开始结构化解析</button><div id="analysisResult"></div>`);
}
async function runAnalysis() {
  const input = $('input[name="meeting"]:checked', $('#modalContent'));
  if (!input) return;
  const target = $('#analysisResult');
  target.innerHTML = '<div class="analysis-status"><span class="loader"></span>正在识别参数、争议、风险与行动项…</div>';
  try {
    const { analysis } = await api(`/api/meetings/${encodeURIComponent(input.value)}/analyze`, { method: 'POST', body: '{}' });
    target.innerHTML = `<span class="modal-label">解析结果 · 置信度 ${Math.round(analysis.confidence * 100)}% · ${esc(analysis.elapsed)}</span>${analysis.decisions.map((item, index) => `<article class="analysis-block"><div class="analysis-block-top"><span>${String(index + 1).padStart(2, '0')} / ${esc(item.label)}</span><span>有证据</span></div><p>${esc(item.value)}</p><span class="evidence">原文 ${esc(item.evidence)}</span></article>`).join('')}<span class="modal-label">自动拆解的行动项</span>${analysis.actions.map(item => `<div class="action-row"><div><b>${esc(item.title)}</b><small>${esc(item.owner)} · ${esc(item.due)}</small></div><span class="${item.priority === 'high' ? 'priority-high' : ''}" style="font-size:9px;font-weight:800">${item.priority === 'high' ? '高优先级' : '自动执行'}</span></div>`).join('')}<button class="button button-lime full-width" data-action="close-modal">写入知识湖并同步多维表</button>`;
    const fresh = await api('/api/overview'); state.overview = fresh; renderOverview(fresh); toast('解析完成：结论已进入 24h 知识闭环');
  } catch (error) { target.innerHTML = `<div class="analysis-status priority-high">${esc(error.message)}</div>`; }
}
function searchModal(initial = '') {
  openModal(`<h2 id="modalTitle">搜索研发知识湖</h2><p class="modal-subtitle">在会议结论、实验项目、失败经验与 SOP 中进行统一检索。</p><div class="modal-search"><input id="modalSearchInput" value="${esc(initial)}" placeholder="例如：B-17、湿度、晶型" /><button class="button button-dark" data-action="run-search">搜索</button></div><div class="search-results" id="searchResults"><p class="modal-subtitle">推荐搜索：B-17 / 湿度 / 参数 / SOP</p></div>`);
  setTimeout(() => $('#modalSearchInput')?.focus(), 60);
  if (initial) runSearch(initial);
}
async function runSearch(forced) {
  const query = forced || $('#modalSearchInput')?.value.trim();
  if (!query) return;
  const target = $('#searchResults'); target.innerHTML = '<div class="analysis-status"><span class="loader"></span>正在检索知识图谱与向量索引…</div>';
  const { items } = await api('/api/search', { method: 'POST', body: JSON.stringify({ query }) });
  target.innerHTML = items.length ? items.map(item => `<article class="result-item"><img src="${esc(item.image)}" alt="检索结果素材" /><div><h4>${esc(item.title)}</h4><p>${esc(item.kind)} · ${esc(item.source)}</p></div><strong>${Math.round((item.score || .68) * 100)}%</strong></article>`).join('') : '<p class="modal-subtitle">没有找到直接结果，请尝试“B-17”或“湿度”。</p>';
}
function taskModal() {
  openModal(`<h2 id="modalTitle">新建研发行动项</h2><p class="modal-subtitle">行动项将进入实验闭环，并与来源会议或实验保持关联。</p><form id="taskForm"><span class="modal-label">任务标题</span><div class="modal-search"><input name="title" required placeholder="例如：补录批次湿度曲线"></div><span class="modal-label">负责人</span><div class="modal-search"><input name="owner" required value="林岚"></div><span class="modal-label">截止时间</span><div class="modal-search"><input name="due" value="明天 18:00"></div><button class="button button-dark full-width" type="submit" style="margin-top:18px">创建行动项</button></form>`);
  $('#taskForm').addEventListener('submit', async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); await api('/api/tasks', { method: 'POST', body: JSON.stringify(data) }); closeModal(); toast('行动项已创建并进入研发闭环'); });
}

document.addEventListener('click', event => {
  const view = event.target.closest('[data-view]'); if (view) { setView(view.dataset.view); return; }
  const action = event.target.closest('[data-action]')?.dataset.action; if (!action) return;
  if (action === 'open-analyzer') analyzerModal();
  if (action === 'analyze') analyzerModal(event.target.closest('[data-id]').dataset.id);
  if (action === 'run-analysis') runAnalysis();
  if (action === 'open-search') searchModal();
  if (action === 'run-search') runSearch();
  if (action === 'new-task') taskModal();
  if (action === 'close-modal') closeModal();
});
$('#modalBackdrop').addEventListener('click', event => { if (event.target === event.currentTarget) closeModal(); });
$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('is-open'));
$('#globalSearch').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); searchModal(event.currentTarget.value); } });
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchModal(); } if (event.key === 'Escape') closeModal(); });
$$('.toggle').forEach(button => button.addEventListener('click', () => { button.classList.toggle('is-on'); toast('偏好已在当前演示会话中更新'); }));
$('#refreshActivity').addEventListener('click', async () => { const fresh = await api('/api/overview'); state.overview = fresh; renderOverview(fresh); toast('活动流已刷新'); });

(async function boot() {
  try { state.overview = await api('/api/overview'); renderOverview(state.overview); }
  catch (error) { document.body.innerHTML = `<main style="padding:40px;font-family:sans-serif"><h1>无法加载晶流</h1><p>${esc(error.message)}</p></main>`; }
})();
