/* 晶流 LabFlow — 静态演示模式数据层
 * 魔搭创空间 Static 托管下无后端服务，本文件内嵌演示数据并模拟后端 API，
 * 使前端在离线/静态环境下仍可完整体验。后端可用时不会命中本层。
 */
(function () {
  'use strict';

  /* ── 内嵌演示数据（源自 data/seed.json，已去掉服务端运行时字段） ── */
  const SEED = {
    meta: {
      project: '晶流 LabFlow',
      challenge: '晶泰科技：AI 实验研发加速器',
      lastSync: '2026-07-19T08:30:00+08:00'
    },
    metrics: {
      knowledgeSla: 87,
      avgReuseHours: 6.4,
      activeExperiments: 6,
      savedHours: 42,
      pendingRisks: 4
    },
    pipeline: [
      { key: 'brief', label: '方案研讨', count: 18, state: 'done' },
      { key: 'review', label: '参数评审', count: 7, state: 'active' },
      { key: 'run', label: '实验执行', count: 12, state: 'active' },
      { key: 'retro', label: '结果复盘', count: 4, state: 'watch' },
      { key: 'reuse', label: '知识复用', count: 29, state: 'done' }
    ],
    meetings: [
      { id: 'mt-2407', title: 'B-17 晶型筛选参数评审', type: '参数评审', date: '今天 09:40', duration: '38 min', participants: 6, status: 'ready', summary: '围绕溶剂比例、搅拌速率和冷却梯度的三组方案进行取舍，最终确定 B-17-03 进入小试。', tags: ['B-17', '晶型筛选', '参数决策'], segments: [
        { id: 'ev-mt-2407-1', start: '00:21:06', end: '00:23:40', transcriptRef: 'B-17 参数评审 / 转写片段 #1', content: '林岚提出 B-17-03 采用低温梯度方案进入小试，冷却速率 0.5 °C/min，预计较 B-11 减少 1.5 天试错。', confidence: 0.96 },
        { id: 'ev-mt-2407-2', start: '00:27:12', end: '00:29:04', transcriptRef: 'B-17 参数评审 / 转写片段 #2', content: '陈默提醒溶剂比例接近历史失败案例临界值，高风险场景应增加中间检测点。', confidence: 0.88 },
        { id: 'ev-mt-2407-3', start: '00:32:10', end: '00:35:36', transcriptRef: 'B-17 参数评审 / 转写片段 #3', content: 'AI 命中 B-11 历史方案参数结构高度相似（相似度 0.94），建议复用低温梯度排程。', confidence: 0.94 }
      ] },
      { id: 'mt-2406', title: 'A-09 失败样本复盘会', type: '结果复盘', date: '昨天 16:20', duration: '52 min', participants: 8, status: 'analyzed', summary: '发现失败主因与预热时间和湿度波动有关，建议将环境传感器数据纳入下一轮实验上下文。', tags: ['A-09', '失败经验', '环境变量'], segments: [
        { id: 'ev-mt-2406-1', start: '00:18:22', end: '00:23:10', transcriptRef: 'A-09 复盘 / 转写片段 #1', content: '周启明指出预热阶段湿度记录仪故障，湿度波动超过 15%，与结晶异常相关性 0.78。', confidence: 0.93 },
        { id: 'ev-mt-2406-2', start: '00:31:08', end: '00:34:42', transcriptRef: 'A-09 复盘 / 转写片段 #2', content: '调整策略：下一轮将环境传感器数据绑定至实验上下文。', confidence: 0.9 },
        { id: 'ev-mt-2406-3', start: '00:45:02', end: '00:49:18', transcriptRef: 'A-09 复盘 / 转写片段 #3', content: '复用结论：同步至失败案例库，作为 A-09 风险规则样本。', confidence: 0.88 }
      ] },
      { id: 'mt-2405', title: 'Q3 自动化实验室周例会', type: '研发例会', date: '07 月 17 日', duration: '64 min', participants: 11, status: 'analyzed', summary: '确认本周 12 个实验批次的优先级和物料风险，新增 5 个跨角色行动项。', tags: ['Q3', '协同', '物料风险'], segments: [] },
      { id: 'mt-2408', title: 'E-15 酶催化动力学参数评审', type: '参数评审', date: '今天 08:10', duration: '45 min', participants: 5, status: 'ready', summary: '围绕酶浓度、底物进料速率与温度区间讨论动力学拟合方案。', tags: ['E-15', '酶催化', '参数决策'], segments: [
        { id: 'ev-mt-2408-1', start: '00:12:40', end: '00:15:22', transcriptRef: 'E-15 参数评审 / 转写片段 #1', content: '谢宁提出以 0.02 U/mL 酶浓度与 35°C 恒温区间作为基线。', confidence: 0.95 },
        { id: 'ev-mt-2408-2', start: '00:24:05', end: '00:27:31', transcriptRef: 'E-15 参数评审 / 转写片段 #2', content: '林岚提示算法组历史数据权限仍为待审批状态。', confidence: 0.92 },
        { id: 'ev-mt-2408-3', start: '00:33:18', end: '00:36:02', transcriptRef: 'E-15 参数评审 / 转写片段 #3', content: 'AI 关联到 B-17 参数评审的权限冲突案例。', confidence: 0.89 }
      ] },
      { id: 'mt-2388', title: 'B-11 低温梯度方案历史评审', type: '参数评审', date: '07 月 11 日', duration: '41 min', participants: 7, status: 'analyzed', summary: '确认低温梯度 0.5 °C/min 在 B-11 体系下的可行性。', tags: ['B-11', '低温梯度', '最优参数'], segments: [
        { id: 'ev-mt-2388-1', start: '00:09:15', end: '00:12:48', transcriptRef: 'B-11 历史评审 / 转写片段 #1', content: '周启明确认 B-11 低温梯度方案在 0.5 °C/min 下降速率下结晶稳定。', confidence: 0.94 },
        { id: 'ev-mt-2388-2', start: '00:20:33', end: '00:23:10', transcriptRef: 'B-11 历史评审 / 转写片段 #2', content: '结论写入知识库 k-01，作为 B-17 后续复用的最优参数基线。', confidence: 0.93 }
      ] },
      { id: 'mt-2404', title: 'F-08 连续流工艺方案研讨', type: '方案研讨', date: '07 月 15 日', duration: '36 min', participants: 6, status: 'analyzed', summary: '识别温度梯度敏感问题，确定在方案研讨阶段绑定环境传感器变量。', tags: ['F-08', '连续流', '环境变量'], segments: [
        { id: 'ev-mt-2404-1', start: '00:07:22', end: '00:10:05', transcriptRef: 'F-08 方案研讨 / 转写片段 #1', content: '陈默指出 F 系列批次对温度梯度敏感。', confidence: 0.9 },
        { id: 'ev-mt-2404-2', start: '00:28:44', end: '00:31:20', transcriptRef: 'F-08 方案研讨 / 转写片段 #2', content: '团队决定将温度波动阈值写入方案评审检查清单。', confidence: 0.88 }
      ] }
    ],
    experiments: [
      { id: 'exp-b17', code: 'B-17', name: '候选化合物晶型筛选', stage: '参数评审', owner: '林岚', team: '实验工程', progress: 72, risk: 'low', updated: '12 分钟前', image: '/assets/lab-vials.jpg', next: '确认 B-17-03 小试排程', insight: '相似实验 B-11 的低温梯度方案可复用，预计减少 1.5 天试错。' },
      { id: 'exp-a09', code: 'A-09', name: '高通量合成稳定性复测', stage: '结果复盘', owner: '周启明', team: '算法组', progress: 46, risk: 'high', updated: '昨天', image: '/assets/cleanroom.jpg', next: '补录环境传感器数据', insight: '异常批次与湿度波动的相关性为 0.78。' },
      { id: 'exp-c04', code: 'C-04', name: '药效测试样本队列优化', stage: '实验执行', owner: '陈默', team: '自动化工作站', progress: 63, risk: 'watch', updated: '2 小时前', image: '/assets/researcher.jpg', next: '等待下一批物料入库', insight: '物料到货 ETA 与任务队列已自动对齐。' },
      { id: 'exp-d22', code: 'D-22', name: '溶剂体系迁移验证', stage: '知识复用', owner: '谢宁', team: '研发管理', progress: 91, risk: 'low', updated: '昨天', image: '/assets/chemical.jpg', next: '同步结论至团队知识库', insight: '已命中 4 条历史实验结论。' },
      { id: 'exp-e15', code: 'E-15', name: '酶催化反应动力学实验', stage: '参数评审', owner: '谢宁', team: '研发管理', progress: 38, risk: 'high', updated: '今天 07:50', image: '/assets/lab-atmosphere.jpg', next: '确认跨团队数据访问权限', insight: '需访问算法组历史数据完成动力学参数拟合。' },
      { id: 'exp-f08', code: 'F-08', name: '连续流工艺稳定性验证', stage: '方案研讨', owner: '陈默', team: '自动化工作站', progress: 22, risk: 'watch', updated: '2 天前', image: '/assets/robotics.jpg', next: '完成工艺参数边界评审', insight: '历史 F 系列批次暴露温度梯度敏感问题。' }
    ],
    knowledge: [
      { id: 'k-01', title: 'B-11 低温梯度晶型筛选最优参数', kind: '最优参数', score: 0.94, source: '会议 mt-2388 / 结论 #3', freshness: '2 天前', image: '/assets/microscope.jpg', status: 'approved' },
      { id: 'k-02', title: 'A-09 失败案例：湿度波动导致结晶异常', kind: '失败经验', score: 0.91, source: '复盘会 mt-2406 / 风险 #2', freshness: '昨天', image: '/assets/lab-team.jpg', status: 'approved' },
      { id: 'k-03', title: '自动化工作站换液顺序与污染控制 SOP', kind: '流程规范', score: 0.87, source: '文档 SOP-17', freshness: '5 天前', image: '/assets/robotics.jpg', status: 'approved' },
      { id: 'k-04', title: 'B-17-03 方案争议：溶剂比例对晶型稳定性的影响', kind: '方案争议', score: 0.84, source: '会议 mt-2407 / 议题 #2', freshness: '12 分钟前', image: '/assets/data-room.jpg', status: 'pending' },
      { id: 'k-05', title: '高通量实验数据字段字典 v2.3', kind: '数据资产', score: 0.79, source: '知识库 / 数据治理', freshness: '1 周前', image: '/assets/analytics.jpg', status: 'pending' },
      { id: 'k-06', title: '实验异常上报与责任分派规则', kind: '协作规则', score: 0.75, source: '多维表 / R&D-OPS', freshness: '2 周前', image: '/assets/office.jpg', status: 'pending' },
      { id: 'k-07', title: 'E-15 酶催化动力学基线参数（0.02 U/mL · 35°C）', kind: '最优参数', score: 0.92, source: '会议 mt-2408 / 结论 #1', freshness: '今天 08:10', image: '/assets/lab-vials.jpg', status: 'approved' },
      { id: 'k-08', title: 'F-08 连续流温度梯度敏感失败经验', kind: '失败经验', score: 0.88, source: '复盘会 mt-2404 / 风险 #1', freshness: '3 天前', image: '/assets/cleanroom.jpg', status: 'approved' },
      { id: 'k-09', title: '跨团队数据访问权限审批 SOP', kind: '流程规范', score: 0.86, source: '文档 SOP-19 / 权限治理', freshness: '1 周前', image: '/assets/office.jpg', status: 'approved' },
      { id: 'k-10', title: '实验环境传感器数据质量规范 v1.2', kind: '数据资产', score: 0.83, source: '知识库 / 数据治理', freshness: '2 周前', image: '/assets/analytics.jpg', status: 'approved' }
    ],
    tasks: [
      { id: 'task-01', title: '补录 A-09 批次环境湿度曲线', owner: '周启明', due: '今天 18:00', priority: 'high', status: 'todo', source: 'mt-2406' },
      { id: 'task-02', title: '确认 B-17-03 小试排程', owner: '林岚', due: '明天 10:00', priority: 'high', status: 'doing', source: 'mt-2407' },
      { id: 'task-03', title: '同步溶剂迁移结论至知识库', owner: '谢宁', due: '明天 17:00', priority: 'normal', status: 'todo', source: 'exp-d22' },
      { id: 'task-04', title: '核对下一批物料到货 ETA', owner: '陈默', due: '07 月 22 日', priority: 'normal', status: 'doing', source: 'exp-c04' },
      { id: 'task-05', title: '确认 E-15 跨团队数据访问权限', owner: '林岚', due: '今天 17:00', priority: 'high', status: 'todo', source: 'mt-2408' },
      { id: 'task-06', title: '提交 F-08 环境变量检查清单', owner: '陈默', due: '明天 12:00', priority: 'normal', status: 'todo', source: 'mt-2404' },
      { id: 'task-07', title: '同步 E-15 基线参数至知识库', owner: '谢宁', due: '明天 18:00', priority: 'normal', status: 'doing', source: 'exp-e15' },
      { id: 'task-08', title: '复核 B-11 低温梯度复用边界', owner: '周启明', due: '07 月 25 日', priority: 'normal', status: 'todo', source: 'k-01' }
    ],
    activity: [
      { time: '09:52', title: 'AI 解析完成', detail: 'B-17 参数评审已提炼 3 条决策与 2 个行动项', tone: 'mint' },
      { time: '09:41', title: '知识命中', detail: '为 B-17 关联 B-11 历史方案，证据相似度 0.94', tone: 'violet' },
      { time: '09:27', title: '风险升级', detail: 'A-09 湿度数据缺口标记为高优先级任务', tone: 'coral' },
      { time: '08:55', title: '协同同步', detail: '自动化工作站已确认 C-04 物料排程', tone: 'blue' },
      { time: '08:30', title: '知识写入', detail: 'D-22 溶剂迁移结论已同步至团队知识库', tone: 'mint' },
      { time: '08:15', title: '风险关闭', detail: 'C-04 物料延迟风险已解除，ETA 已更新', tone: 'violet' },
      { time: '07:50', title: '实验启动', detail: 'E-15 酶催化反应动力学实验进入参数评审阶段', tone: 'blue' },
      { time: '07:20', title: 'AI 解析完成', detail: 'Q3 周例会已提炼 5 条决策与 3 个行动项', tone: 'mint' }
    ],
    risks: [
      { id: 'risk-01', experimentId: 'exp-a09', experimentCode: 'A-09', level: 'P1', category: '数据缺口', title: '环境湿度数据缺失', description: 'A-09 实验批次缺少环境传感器数据。', triggerParams: ['温度 ≥ 28°C', '湿度波动 > 15%'], evidence: '会议 mt-2406 中周启明提到预热阶段湿度记录仪故障', aiSuggestion: '建议补录72小时环境数据后重新运行相关性分析', status: 'open', owner: '周启明', createdAt: '2026-07-18T16:45:00+08:00', relatedKnowledge: ['k-02'] },
      { id: 'risk-02', experimentId: 'exp-b17', experimentCode: 'B-17', level: 'P2', category: '参数漂移', title: '溶剂比例临界值风险', description: 'B-17-03 方案中溶剂比例接近历史失败案例的临界值。', triggerParams: ['溶剂比例 > 65%', '搅拌速率 < 200 rpm'], evidence: '会议 mt-2407 中林岚提到高浓度溶剂可能导致晶型不稳定', aiSuggestion: '建议增加中间检测点，每2小时取样验证晶型稳定性', status: 'open', owner: '林岚', createdAt: '2026-07-19T09:30:00+08:00', relatedKnowledge: ['k-04'] },
      { id: 'risk-03', experimentId: 'exp-c04', experimentCode: 'C-04', level: 'P3', category: '物料延迟', title: '关键物料到货延迟', description: 'C-04 实验所需的高纯度试剂供应商发货延迟。', triggerParams: ['物料 ETA > 当前日期 + 3天'], evidence: '自动化工作站物料跟踪系统检测到供应商物流异常', aiSuggestion: '建议启动备选供应商采购流程，或调整实验优先级', status: 'resolved', owner: '陈默', createdAt: '2026-07-17T14:20:00+08:00', resolvedAt: '2026-07-18T10:15:00+08:00', relatedKnowledge: ['k-06'] },
      { id: 'risk-04', experimentId: 'exp-e15', experimentCode: 'E-15', level: 'P1', category: '权限冲突', title: '跨团队数据访问权限未确认', description: 'E-15 实验需要访问算法组的历史数据。', triggerParams: ['跨团队数据请求', '权限审批状态 = pending'], evidence: '权限管理系统显示算法组数据访问申请待审批', aiSuggestion: '建议联系算法组负责人加速审批，或申请临时只读权限', status: 'open', owner: '林岚', createdAt: '2026-07-19T08:00:00+08:00', relatedKnowledge: ['k-06'] },
      { id: 'risk-05', experimentId: 'exp-b17', experimentCode: 'B-17', level: 'P2', category: '模型降级', title: 'LLM API 响应延迟', description: '近期 LLM API 响应时间不稳定。', triggerParams: ['API 响应时间 > 5s', '连续失败 > 3次'], evidence: '系统监控显示过去24小时内 LLM API P95 延迟达到 8.2s', aiSuggestion: '建议启用本地缓存模型作为降级方案，或切换到备用 API', status: 'open', owner: 'AI 研发助理', createdAt: '2026-07-19T07:45:00+08:00', relatedKnowledge: ['k-05'] }
    ],
    audit: []
  };

  /* ── 可变副本（模拟后端写操作） ── */
  const state = JSON.parse(JSON.stringify(SEED));

  /* ── 工具 ── */
  const ok = data => ({ data });
  const now = () => new Date().toISOString();

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
      relatedMeetings: (state.meetings || []).filter(m => (m.tags || []).includes(experiment.code)).map(m => ({ ...m, evidenceCount: (m.segments || []).length })),
      relatedKnowledge: (state.knowledge || []).filter(k => k.title?.includes(experiment.code) || k.source?.includes(experiment.code)),
      relatedRisks: (state.risks || []).filter(r => r.experimentId === experiment.id),
      relatedTasks: (state.tasks || []).filter(t => t.source === experiment.id || t.source === experiment.code)
    };
  }

  function buildOverview() {
    return {
      meta: state.meta, metrics: state.metrics, pipeline: state.pipeline, meetings: state.meetings,
      experiments: state.experiments || [], knowledge: state.knowledge || [], tasks: state.tasks || [],
      activity: state.activity || [], risks: state.risks || [], generatedAt: now()
    };
  }

  function infraStatus() {
    const items = {
      json: { status: 'connected', detail: 'JSON 持久化已生效（演示数据）', latencyMs: 8 },
      redis: { status: 'fallback', detail: '演示模式：确定性缓存', latencyMs: 12 },
      neo4j: { status: 'fallback', detail: '演示模式：确定性图谱派生', latencyMs: 12 },
      llm: { status: 'fallback', detail: '演示模式：确定性适配器', latencyMs: 6 },
      feishu: { status: 'not-configured', detail: '静态演示模式 · 未配置飞书凭证（FEISHU_APP_ID / FEISHU_APP_SECRET）', latencyMs: 0 }
    };
    return { items };
  }

  function sla() {
    const slaRate = state.metrics.knowledgeSla ?? 87;
    return {
      targetHours: 24, total: 28, met: Math.round(28 * slaRate / 100), slaRate, source: 'seed'
    };
  }

  function meetingEvidence(meetingId) {
    const meeting = state.meetings.find(m => m.id === meetingId);
    return ok({ items: (meeting && meeting.segments) || [] });
  }

  function search(query) {
    const q = (query || '').toLowerCase();
    const hay = ['title', 'kind', 'source'];
    const items = (state.knowledge || []).filter(k => !q || hay.some(f => String(k[f] || '').toLowerCase().includes(q))).map(k => ({ ...k, relevanceScore: k.score }));
    return { items };
  }

  function graph(experimentId) {
    const hub = state.experiments.find(e => e.id === experimentId || e.code === experimentId) || state.experiments[0];
    const hubCode = hub ? hub.code : 'B-17';
    const nodes = [{ id: hubCode, label: hub.name, type: 'experiment', meta: { detail: `${hub.code} · ${hub.stage} · 进度 ${hub.progress}%` } }];
    const edges = [];
    (state.knowledge || []).slice(0, 6).forEach(k => {
      nodes.push({ id: k.id, label: k.title.slice(0, 8), type: k.kind === '失败经验' ? 'risk' : 'conclusion', meta: { detail: `${k.title} · 置信度 ${Math.round(k.score * 100)}%` } });
      edges.push({ source: hubCode, target: k.id, relation: '关联' });
    });
    return { nodes, edges };
  }

  /* ── 路由：模拟后端各 API 端点 ── */
  function request(path, options = {}) {
    const url = new URL(path, location.origin);
    const p = url.pathname;
    const method = (options.method || 'GET').toUpperCase();
    let body = {};
    try { body = options.body ? JSON.parse(options.body) : {}; } catch (e) { /* ignore */ }

    if (method === 'GET' && p === '/api/overview') return ok(buildOverview());
    if (method === 'GET' && p === '/api/experiments') return ok({ items: state.experiments });
    if (method === 'GET' && p === '/api/infra/status') return ok(infraStatus());
    if (method === 'GET' && p === '/api/metrics/sla') return ok(sla());
    if (method === 'GET' && p === '/api/knowledge') return ok({ items: state.knowledge });
    if (method === 'GET' && p === '/api/graph') return ok(graph(url.searchParams.get('experimentId')));
    if (method === 'POST' && p === '/api/search') return ok(search(body.query));
    if (method === 'POST' && p === '/api/experiments') {
      const code = String(body.code || '').trim().toUpperCase();
      const name = String(body.name || '').trim();
      const stage = String(body.stage || '方案研讨');
      if (!code) throw new Error('实验编号不能为空');
      if (!/^[A-Z]-\d{2}$/.test(code)) throw new Error('实验编号格式应为 字母-两位数字（如 B-18）');
      if (state.experiments.some(e => String(e.code).toUpperCase() === code)) throw new Error('实验编号 ' + code + ' 已存在');
      if (!name) throw new Error('实验名称不能为空');
      const ranges = { temperature: { min: 15, max: 40, label: '温度', unit: '°C' }, humidity: { min: 30, max: 80, label: '湿度', unit: '%RH' }, concentration: { min: 0, max: 5, label: '浓度', unit: 'mol/L' } };
      const params = {};
      const warnings = [];
      for (const key of Object.keys(ranges)) {
        const raw = body.params && body.params[key];
        if (raw === undefined || raw === null || raw === '') continue;
        const num = Number(raw);
        if (Number.isNaN(num)) { warnings.push(ranges[key].label + '必须是数字'); continue; }
        params[key] = num;
        if (num < ranges[key].min || num > ranges[key].max) throw new Error(ranges[key].label + ' ' + num + ranges[key].unit + ' 超出安全范围（' + ranges[key].min + '–' + ranges[key].max + ranges[key].unit + '）');
      }
      const prefix = code.split('-')[0];
      const similar = state.experiments.filter(e => String(e.code).startsWith(prefix) && String(e.code) !== code);
      if (similar.length) warnings.push('存在 ' + similar.length + ' 个同前缀实验（' + similar.map(e => e.code).join('、') + '），已自动挂接相似经验检索');
      const failureKnowledge = state.knowledge.filter(k => (k.kind === '失败经验' || k.kind === '方案争议') && k.status !== 'rejected');
      if (failureKnowledge.length) warnings.push('知识湖含 ' + failureKnowledge.length + ' 条失败经验/方案争议，参数评审阶段将自动风险拦截');
      const id = 'exp-' + code.toLowerCase().replace('-', '');
      const item = { id, code, name, owner: body.owner || '林岚', team: body.team || '晶型筛选组', stage, progress: 0, risk: 'low', insight: '新登记实验，等待参数评审与相似经验召回', updated: '刚刚', image: null, params };
      state.experiments = [item, ...(state.experiments || [])];
      return ok({ item, warnings });
    }
    if (method === 'POST' && p === '/api/tasks') {
      const item = { id: `task-demo-${Date.now()}`, status: 'todo', source: 'demo', ...body };
      state.tasks = [item, ...(state.tasks || [])];
      return ok({ item });
    }

    const riskResolve = p.match(/^\/api\/risks\/([^/]+)\/resolve$/);
    if (method === 'POST' && riskResolve) {
      const risk = state.risks.find(r => r.id === decodeURIComponent(riskResolve[1]));
      if (risk) { risk.status = 'resolved'; risk.resolvedAt = now(); }
      return ok({ item: risk || {} });
    }

    const expDetail = p.match(/^\/api\/experiments\/([^/]+)$/);
    if (method === 'GET' && expDetail) {
      const exp = state.experiments.find(e => e.id === decodeURIComponent(expDetail[1]));
      return ok({ item: exp ? enrichExperiment(exp) : {} });
    }

    const evidence = p.match(/^\/api\/meetings\/([^/]+)\/evidence$/);
    if (method === 'GET' && evidence) return meetingEvidence(decodeURIComponent(evidence[1]));

    const approve = p.match(/^\/api\/knowledge\/([^/]+)\/approve$/);
    if (method === 'POST' && approve) {
      const k = state.knowledge.find(x => x.id === decodeURIComponent(approve[1]));
      if (k) { k.status = 'approved'; }
      return ok({ item: k || {} });
    }

    const reject = p.match(/^\/api\/knowledge\/([^/]+)\/reject$/);
    if (method === 'POST' && reject) {
      const k = state.knowledge.find(x => x.id === decodeURIComponent(reject[1]));
      if (k) { k.status = 'rejected'; k.rejectReason = body.reason || ''; }
      return ok({ item: k || {} });
    }

    // 未匹配端点：抛出，让上层按真实失败处理
    throw new Error('演示模式暂不支持该接口：' + p);
  }

  /* ── 模拟流式解析（替代 SSE /analyze-stream） ── */
  function analyzeStream(meetingId, onStep, onDone) {
    const meeting = state.meetings.find(m => m.id === meetingId) || state.meetings[0];
    const isFailure = meeting.type === '结果复盘';
    const steps = [
      { agent: 'INGEST', message: '读取会议转写 · 识别 3 位发言人' },
      { agent: 'KNOWLEDGE', message: '检索知识湖 · 命中 B-11 相似方案 0.94' },
      { agent: 'DECISION', message: '提炼决策与风险 · 绑定证据时间戳' },
      { agent: 'ACTION', message: '拆解行动项 · 关联实验上下文' }
    ];
    const analysis = {
      meetingId: meeting.id,
      title: meeting.title,
      mode: 'demo-adapter',
      connector: 'Feishu Meeting AI / static-demo',
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
      suggestedKnowledge: []
    };

    let i = 0;
    const timer = setInterval(() => {
      if (i < steps.length) {
        onStep(steps[i]);
        i++;
      } else {
        clearInterval(timer);
        onDone(analysis);
      }
    }, 350);
    return { cancel: () => clearInterval(timer) };
  }

  /* ── 暴露 ── */
  window.LabFlowDemo = {
    enabled: false,
    request,
    analyzeStream,
    _state: state
  };
})();