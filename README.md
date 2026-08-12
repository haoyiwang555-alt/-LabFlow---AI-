<div align="center">

<img src="public/favicon.svg" width="64" height="64" alt="LabFlow Logo" />

# 晶流 LabFlow · AI 实验研发加速器
### Autonomous Lab AI R&D Accelerator

**让一次讨论，在 24 小时内成为下一次实验的起点。**

---

[![Build Status](https://img.shields.io/badge/Build-Passing-2ee6d6?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D%2020.0-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Event--Driven-8a2be2?style=for-the-badge&logo=diagramsdotnet&logoColor=white)](#-系统架构设计)
[![RAG Pipeline](https://img.shields.io/badge/RAG-pgvector%20%2B%20Neo4j-0078D4?style=for-the-badge&logo=postgresql&logoColor=white)](#-核心技术栈)
[![Playwright Verified](https://img.shields.io/badge/Playwright-v1.61-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

[🖥️ 系统演示](#-产品视觉展示) · [🏗️ 架构设计](#-系统架构设计) · [⚡ 核心功能](#-核心功能亮点) · [🚀 快速开始](#-快速开始与本地运行)

</div>

---

## 📖 项目简介

在智能自主实验室中，真正昂贵的不是单次会议或单次实验，而是**同一个问题被第二次讨论、同一个失败错误被第二次重复**。传统研讨会后，关键实验参数、争议焦点与避坑策略散落在转写文本、个人文档与临时表格中，导致研发经验无法围绕“实验对象”高效流动与沉淀。

**晶流 LabFlow** 是专为高频实验研发团队打造的 **AI 上下文操作系统**。系统以“实验编号”为主线，贯穿「方案研讨 — 参数评审 — 实验执行 — 结果复盘 — 经验复用」全生命周期。通过提出 **24h 知识 SLA** 指标，确保会议结束 24 小时内，经过确认的关键决策均附带秒级原文证据时间戳，写入研发知识图谱，并在下一次相似实验开启前自动进行**风险拦截预警**。

---

## 🖼️ 产品视觉展示

### 🖥️ 研发总览看板 (R&D Dashboard)
> 实时监控 24h 知识 SLA 达标率、累计节省研发人时及多阶段实验闭环图谱。
<div align="center">
  <img src="output/screenshots/live/r12/overview-light-desktop.png" width="96%" alt="研发总览看板" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
</div>

<br />

<table width="100%">
  <tr>
    <td width="50%" align="center">
      <b>💬 AI 会议结构化解析器 (SSE 流式)</b><br />
      <small>多 Agent 流水线实时可视，提炼决策并带秒级证据时间戳</small><br /><br />
      <img src="output/screenshots/live/r12/agents-light-desktop.png" width="100%" alt="AI 会议解析器" />
    </td>
    <td width="50%" align="center">
      <b>🕸️ 动态研发知识图谱 (Canvas)</b><br />
      <small>力导向布局 + 拖拽交互 + 悬停高亮关联</small><br /><br />
      <img src="output/screenshots/live/r12/knowledge-light-desktop.png" width="100%" alt="研发知识湖" />
    </td>
  </tr>
</table>

<br />

<table width="100%">
  <tr>
    <td width="50%" align="center">
      <b>🛡️ 风险守门员面板 (Risk Guard)</b><br />
      <small>P0-P3 分级、AI 建议、触发参数与一键关闭</small><br /><br />
      <img src="output/screenshots/live/r12/risks-light-desktop.png" width="100%" alt="风险守门员" />
    </td>
    <td width="50%" align="center">
      <b>🤖 AI 助理工作台 (Agents)</b><br />
      <small>三大专用 Agent 协同：解析、检索、守门</small><br /><br />
      <img src="output/screenshots/live/r12/integrations-light-desktop.png" width="100%" alt="AI 助理" />
    </td>
  </tr>
</table>

<br />

<div align="center">
  <b>📱 移动端响应式工作台 (Mobile Workbench)</b><br />
  <small>适配移动端体验，方便实验室现场随时查阅风控预警与实验流转</small><br /><br />
  <img src="output/screenshots/live/r12/overview-light-mobile.png" width="36%" alt="移动端适配界面" />
</div>

---

🎬 **系统演示视频**：`output/晶流LabFlow-系统演示视频.mp4`（注：8/16 前将重制为当前 UI 的 3 分钟 1080p 版本）

---

## ✨ 核心功能亮点

- ⚡ **24h 知识 SLA 闭环**：设定可量化的研发效能指标，会议结束 24 小时内自动提炼结构化知识单元并完成团队沉淀。
- 🎯 **带证据时间戳的结构化解析**：基于 Structured Output 识别方案决策、核心参数调整与技术风险，**每一条结论附带精确到秒的原文转写时间戳与置信度**，拒绝生成不可追溯的正确废话。
- 🔄 **任务自动分派与多维表闭环**：自动提取会议行动项（Action Items），智能分派负责人与截止时间，无缝同步至飞书多维表格与待办中心。
- 🛡️ **失败经验标准化建模与风险守门员**：将历史失败案例按 `触发参数 — 异常症状 — 可能根因 — 规避策略` 单独建模，下一次相似实验启动前主动触发风险警报。
- 🔍 **图谱 + 向量混合检索 (Hybrid RAG)**：结合 `pgvector` 语义召回与 `Neo4j` 知识图谱推演，兼顾参数重叠度、实验阶段与证据溯源。

### 🆕 v0.2 新增功能（40 强赛版）

- 🌊 **SSE 流式解析体验**：AI 会议解析器升级为 Server-Sent Events 流式输出，实时可视多 Agent 流水线执行过程（MeetingParser → QualityCheck → GraphLinker → Orchestrator），增强用户对 AI 决策的信任感。
- 🕸️ **Canvas 动态知识图谱**：基于原生 Canvas 实现的力导向布局图，支持节点拖拽、悬停高亮关联边、点击查看详情弹窗，11 个节点 12 条关系边，深色科技风格渲染。
- 🛡️ **风险守门员独立面板**：P0-P3 风险分级看板，5 条风险数据覆盖数据缺口、参数漂移、权限冲突、物料延迟、模型降级场景，支持风险详情弹窗与一键标记已处理。
- 📋 **实验详情弹窗**：点击实验卡片弹出详情，展示 5 阶段时间线、关联会议、关联知识资产、关联风险，形成完整的实验上下文视图。
- ✨ **微交互动画**：卡片悬停浮起、按钮点击缩放、页面切换淡入、进度条填充动画等细节打磨。

---

## 🏗️ 系统架构设计

```mermaid
flowchart TD
    subgraph FS["协同与接入层 (Lark/Feishu Platform)"]
        A1["飞书会议转写 / 妙记 AI"]
        A2["飞书云文档 / 团队知识库"]
        A3["飞书多维表格 / 任务中心"]
    end

    subgraph GW["接入与网关编排层 (Gateway & Orchestration)"]
        B1["Spring Cloud Gateway / Webhook"]
        B2["Workflow Orchestrator (状态机/Checkpoint)"]
        B3["Event Bus (RabbitMQ / 幂等去重)"]
    end

    subgraph AG["Agent 多智能体层 (Multi-Agent Swarm)"]
        C1["MeetingParser Agent (结构化提取)"]
        C2["QualityCheck Agent (领域 Schema 质检)"]
        C3["GraphLinker Agent (图谱与向量关联)"]
        C4["RiskGuard Agent (风险守门员)"]
        C5["Human-in-the-Loop (专家二审确认)"]
    end

    subgraph DB["存储与可信数据层 (Data & Storage)"]
        D1["PostgreSQL + pgvector (语义向量库)"]
        D2["Neo4j Graph DB (研发知识图谱/证据链)"]
        D3["Redis (状态机 Checkpoint / 分布式锁)"]
        D4["Audit Engine (不可变安全审计日志)"]
    end

    A1 --> B1 --> B2 --> B3
    B3 --> C1 --> C2 --> C3 --> C4 --> C5
    C5 --> A2 & A3
    C1 --> D1
    C3 <--> D1 & D2
    B2 <--> D3
    B2 --> D4
```

---

## 🛠️ 核心技术栈

| 层级 | 技术选型 | 场景说明 |
| :--- | :--- | :--- |
| **前端展现** | Vanilla HTML5 / CSS3 / ES Modules JS | 零第三方包依赖，纯原生高性能，暗黑微拟态科技视觉 |
| **后端 API** | Node.js Server / Spring Boot 模块化 | 原生 HTTP / RESTful API / SSE 流式推送响应 |
| **Agent 编排** | DeepSeek-V3 / Doubao-Pro / Spring AI | 执行 Structured Output 结构化提炼与领域 Schema 校验 |
| **数据存储** | PostgreSQL + pgvector / Neo4j / Redis | 提供高维矢量语义检索、图关系推演与分布式幂等锁 |
| **测试与媒体** | Playwright (v1.61) / FFmpeg / SAPI TTS | 无头浏览器自动演示脚本录制、语音合成与 MP4 音视频压制 |

---

## 🚀 在线 Demo 与部署

- **在线 Demo**：`<!-- DEMO_URL -->`（待部署，见 `DEPLOYMENT.md` 约 15 分钟上线 Render 免费版）
- **一键部署配置**：`render.yaml` + `Dockerfile`（Node 22 Alpine，零第三方运行时依赖）
- 详细步骤：见 `DEPLOYMENT.md`

## 🚀 快速开始与本地运行

### 环境要求
* **Node.js**: `>= 20.0`
* **PowerShell** (Windows 环境推荐)

### 1. 初始化环境
在项目根目录运行初始化脚本（自动自检并校验环境变量）：
```powershell
.\setup.ps1
```

### 2. 启动本地服务
运行语法静态检查并启动开发服务器：
```powershell
npm run check
npm start
```
启动成功后，在浏览器访问：**`http://localhost:4173`** 即可体验完整的交互功能。

### 3. 常用 REST API
```text
GET  /api/health                  # 服务健康度检查
GET  /api/overview                # 研发总览与看板指标获取（含风险数据）
GET  /api/experiments             # 实验流转列表查询
GET  /api/experiments/:id         # 实验详情（含时间线、关联会议、关联知识、关联风险）
GET  /api/knowledge               # 知识资产列表（支持 ?status= 过滤）
GET  /api/risks                   # 风险列表查询（支持 P0-P3 分级）
GET  /api/infra/status            # 各组件真实连接状态（json/redis/neo4j/llm/feishu）
GET  /api/meetings/:id            # 会议详情 + 解析状态 + 关联实验/风险
GET  /api/meetings/:id/evidence   # 会议证据片段列表（精确到秒的原文时间戳）
GET  /api/graph                   # 知识图谱节点/边（支持 ?experimentId= 过滤）
GET  /api/audit                   # 审计记录（任务/风险/知识审批/会议解析，支持 ?entityId=）
GET  /api/metrics/sla             # 24h 知识 SLA 指标（达标率、平均时长、按日分布）
POST /api/meetings/:id/analyze    # 触发 AI 会议结构化解析（即时响应）
POST /api/meetings/:id/analyze-stream  # SSE 流式解析（实时推送 Agent 执行过程，幂等/断线恢复）
POST /api/risks/:id/resolve       # 标记风险为已处理
POST /api/knowledge/:id/approve   # 知识审批：通过并进入知识湖
POST /api/knowledge/:id/reject    # 知识审批：驳回（body 可带 reason）
POST /api/search                  # 研发知识湖统一语义搜索
POST /api/tasks                   # 创建新行动项任务
PUT  /api/tasks/:id               # 更新标题、负责人、截止时间或状态
DELETE /api/tasks/:id             # 删除任务并写入活动日志
OPTIONS /api/*                    # CORS 预检
```

> 除健康检查与 SSE 外，所有 JSON API 统一返回 `{ data, meta: { requestId, mode, generatedAt }, error }` envelope；出错时 `error` 为 `{ code, message }`，HTTP 状态码保持语义。详细契约见 `API_DOCUMENTATION.md`。

### 5. Docker 一键演示环境

项目提供独立的 `labflow-net` 网络，不会修改其他项目的容器、网络或端口。应用使用 `4173`，Neo4j 映射到 `7475/7688`，Redis 映射到 `6380`；容器内通过 `labflow-neo4j` 与 `labflow-redis` 服务名通信。

```bash
# 可选：复制并填写 LLM_API_KEY；未配置时自动使用脱敏确定性适配器
cp .env.example .env
docker compose up -d --build
# 浏览器打开 http://localhost:4173

docker compose logs -f labflow-app
docker compose down
```

Neo4j Browser 地址为 `http://localhost:7475`，演示账号为 `neo4j`，密码为 compose 文件中的演示密码。Neo4j 与 Redis 为可选基础设施，当前 JSON 适配器仍是默认数据源。`data/runtime.json` 会通过项目目录挂载持久化。

> **演示边界**：当前飞书连接器采用“正式契约 + 脱敏适配器”模式；LLM、飞书 API、Neo4j 与 Redis 均可替换为真实生产服务，但本仓库不包含任何真实企业凭证或企业数据。


### 4. 恢复初始演示数据
在现场演示或测试后，如需还原初始种子数据，请执行：
```powershell
.\scripts\reset-demo.ps1
```

---

## 🛡️ 可信 AI 与安全设计

1. **证据强关联 (Evidence Timestamping)**：每条结论强制映射原文时间戳，杜绝生成式 AI 的无根据“幻觉”。
2. **专家二审机制 (Human-in-the-Loop)**：高风险参数调整与置信度低于 `0.85` 的结论需经过专家确认后方可写入正式知识库。
3. **Prompt 注入防护**：转写文本视为不可信输入，工具调用严格限制于白名单与类型校验。
4. **ACL 权限继承**：继承团队既有协同权限，向量与图谱检索自动执行二次过滤。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 许可协议开源。
