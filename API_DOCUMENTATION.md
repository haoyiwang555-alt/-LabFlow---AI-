# LabFlow API

默认地址：`http://localhost:4173`。所有 `/api/*` 响应均为 JSON（SSE 接口与健康检查可保留简版），启用 `Access-Control-Allow-Origin: *`，并支持 `OPTIONS` 预检。

## 统一响应格式

除 SSE 与 `GET /api/health` 外，所有 JSON API 统一返回 envelope：

```json
{
  "data": { },
  "meta": { "requestId": "…", "mode": "json-adapter|demo-adapter|llm-api", "generatedAt": "ISO 时间" },
  "error": null
}
```

出错时 `error` 为 `{ "code", "message", "details?" }`，HTTP 状态码保持语义（400/404/409/422/500）。

## Read APIs

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/health` | 服务健康检查（保留简版） |
| GET | `/api/overview` | 看板、实验、会议、知识、任务、活动与风险 |
| GET | `/api/experiments` | 实验列表 |
| GET | `/api/experiments/:id` | 实验详情、五阶段时间线、关联会议/知识/风险 |
| GET | `/api/knowledge` | 知识资产列表，支持 `?status=approved|pending|rejected` 过滤 |
| GET | `/api/risks` | 风险列表 |
| GET | `/api/tasks` | 任务列表 |

## 基础设施状态

```text
GET /api/infra/status   # 真实探测各组件连接状态
```

返回 `data.items`，字段：`json`、`redis`、`neo4j`、`llm`、`feishu`，每项含 `status`、`detail`、`latencyMs`。

状态语义（诚实降级，不伪造连接）：

- `json`：恒为 `connected`（JSON 持久化生效）
- `redis`：未配置 `REDIS_URL` → `disabled`；配置但不可达 → `degraded`
- `neo4j`：未配置 `NEO4J_URI` → `disabled`
- `llm`：未配置 `LLM_API_KEY` → `fallback`（确定性适配器）
- `feishu`：恒为 `contract-ready` + `demo-adapter`（演示适配器，非真实企业接入）

## 会议与证据

```text
GET /api/meetings/:id                 # 会议详情 + 解析状态 + 关联实验/风险
GET /api/meetings/:id/evidence        # 证据片段列表
```

`/evidence` 返回 `data.items`，每项含 `{ id, start, end, transcriptRef, content, confidence }`。

## 知识审批

```text
POST /api/knowledge/:id/approve       # 通过，进入知识湖
POST /api/knowledge/:id/reject        # 驳回，body 可带 { "reason": "…" }
```

知识项 `status` 取值 `approved | pending | rejected`（缺省视为 `approved`）。审批动作写入活动流、审计记录并持久化到 `runtime.json`，返回更新后的知识项 `data.item`。

## 图谱 API

```text
GET /api/graph                       # 全部图谱节点/边
GET /api/graph?experimentId=exp-xx   # 按实验过滤
```

返回 `data`：`{ nodes: [{id,label,type,meta}], edges: [{source,target,relation}] }`。节点类型配色语义：实验（蓝）、结论（紫）、风险（红）、规范（青）、会议（绿）。

## 审计 API

```text
GET /api/audit?entityId=...
```

返回 `data.items`：`[{ id, entityType, entityId, action, detail, source, createdAt, traceId }]`。任务/风险/知识审批/会议解析/实验阶段推进等写操作均写入审计。

## SLA 指标

```text
GET /api/metrics/sla?from=&to=
```

返回 `data`：`{ targetHours, total, met, slaRate, avgHours, daily: [{date, met, total}], source }`。`source` 为 `computed`（由审计记录实时计算）或 `seed`（数据不足时兜底）。

## AI analysis

```text
POST /api/meetings/:id/analyze
POST /api/meetings/:id/analyze-stream   # text/event-stream
```

解析优先调用 OpenAI-compatible `POST {LLM_BASE_URL}/chat/completions`，环境变量为 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`。请求超时为 15 秒，响应支持 JSON 或 markdown code fence 包裹的 JSON。

返回 `analysis.mode`：

- `llm-api`：真实兼容接口返回
- `demo-adapter`：未配置 key，使用脱敏确定性适配器
- `demo-adapter-fallback`：真实接口失败后降级

SSE 会依次推送 6 个 Agent 状态事件，最后以 `step: 7` 推送完整 `analysis` 并关闭连接。每个事件带 `id`（`run-<uuid>-stepN`），最终事件含 `runId` 与完整 `analysis`：

```text
id: run-xxx-step3
data: {"step":3,"agent":"MeetingParser","message":"...","runId":"run-xxx","done":false}

id: run-xxx-step7
data: {"step":7,"runId":"run-xxx","analysis":{...},"done":true}
```

SSE 硬化特性：

- **幂等**：同一 `meetingId` + 转写内容哈希重复提交时，直接重放内存缓存结果（相同 `runId`）。
- **断线恢复**：请求带 `Last-Event-ID` 时，从该事件之后继续重放剩余事件（`step: 7` 始终补发）。
- **keep-alive**：每 15s 发一条 `: keep-alive` 注释；客户端断开后停止定时器与写入并清理连接。

## Tasks

```http
POST /api/tasks
Content-Type: application/json

{"title":"补录环境曲线","owner":"周启明","due":"今天 18:00","priority":"high"}
```

```text
PUT    /api/tasks/:id   # title / owner / due / priority / status
DELETE /api/tasks/:id
```

允许的任务状态：`todo`、`doing`、`done`、`blocked`。创建、更新、删除都会写入 `activity` 并自动持久化到 `data/runtime.json`。

## Search

```http
POST /api/search
Content-Type: application/json

{"query":"B-17 湿度"}
```

搜索范围包括知识、实验、会议和任务。结果按 `relevanceScore` 降序排列：标题命中 `+0.5`、类型命中 `+0.3`、每个关键词命中 `+0.2`、来源命中 `+0.15`，知识自身的 `score` 提供额外加成。

## Risk operations

```text
POST /api/risks/:id/resolve
```

风险状态变更会写入 runtime JSON，并返回更新后的风险对象。当前数据和飞书连接器均为脱敏演示适配器，不代表真实企业生产接入。
