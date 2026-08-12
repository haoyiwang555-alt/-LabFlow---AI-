# 晶流 LabFlow · 部署指南（Render 免费版，约 15 分钟）

> 复赛硬指标要求 Demo 链接**公开可访问**。本仓库已内置 `render.yaml` Blueprint 与 `Dockerfile`（node:22-alpine，零第三方运行时依赖），推荐用 Render 免费 Web Service 一键部署。

## 方式 A：Render Blueprint（推荐，约 15 分钟）

1. 打开 https://dashboard.render.com/select-repo （GitHub 登录）。
2. 选择仓库 `haoyiwang555-alt/-LabFlow---AI-`（确保 GitHub 上已推送最新代码）。
3. Render 检测到 `render.yaml` 后显示 `labflow-demo` 服务 → 点击 **Apply / Create Resources**。
4. 等待构建完成（首次约 3-5 分钟），服务启动后显示 `https://labflow-demo.onrender.com`（URL 以实际为准）。
5. 验证：
   ```powershell
   Invoke-RestMethod https://<你的URL>/api/health
   Invoke-RestMethod https://<你的URL>/api/infra/status
   ```
   `/api/infra/status` 应返回：json=connected、redis=disabled、neo4j=disabled、llm=fallback、feishu=contract-ready（诚实降级，不伪造连接）。

## 方式 B：Render 手动 Web Service（无 Blueprint）

1. New → **Web Service** → 连接 GitHub 仓库。
2. Runtime 选择 **Docker**（自动使用 `Dockerfile`）。
3. 环境变量：`PORT=10000`、`NODE_ENV=production`（可选 `LLM_API_KEY` 等）。
4. Health Check Path：`/api/health`。
5. 创建后等待部署完成，访问生成的 HTTPS URL。

## 说明

- **数据持久化**：演示数据以 `data/seed.json` 为准；`data/runtime.json` 在无持久盘时每次部署重建（由 `scripts/reset-demo.ps1` 复位逻辑等价）。如需保留运行时交互状态，可在 Render 上挂载磁盘（付费功能，非必需）。
- **密钥安全**：任何 token / API key 只通过 Render 环境变量配置，**绝不写入仓库**；`.env` 已在 `.gitignore` 忽略。
- **免费额度**：Render 免费实例 15 分钟无请求会休眠，首次访问稍慢；复赛评委访问前建议先打开一次预热，或在 README 注明。
- **可选接入**：配置 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` 后，解析接口自动切换 `mode=llm-api`；未配置时使用确定性适配器（`demo-adapter`）。
