# ==============================================================================
# 晶流 LabFlow - 本地开发环境一键配置脚本 (setup.ps1)
# ==============================================================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "    晶流 LabFlow - AI 实验研发加速器          " -ForegroundColor Cyan
Write-Host "       本地开发环境初始化与设置脚本           " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 Node.js 环境
Write-Host "[1/4] 正在检查 Node.js 运行环境..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = node -v
    Write-Host "发现 Node.js 版本: $nodeVer" -ForegroundColor Green
    
    # 提取主版本号
    if ($nodeVer -match "v(\d+)\.") {
        $majorVer = [int]$Matches[1]
        if ($majorVer -lt 20) {
            Write-Warning "警告: 当前 Node.js 版本低于 v20。本系统推荐使用 Node.js >= 20 以确保最佳性能与 API 兼容性。"
        }
    }
} else {
    Write-Error "错误: 未检测到 Node.js，请先安装 Node.js (推荐 v20 或以上版本: https://nodejs.org/)"
    Exit
}
Write-Host ""

# 2. 初始化 .env 配置文件
Write-Host "[2/4] 正在初始化配置文件 (.env)..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot ".env"
$envExamplePath = Join-Path $PSScriptRoot ".env.example"

if (Test-Path $envPath) {
    Write-Host "配置文件 .env 已存在，跳过初始化。若需重置，请手动删除 .env 后重新运行此脚本。" -ForegroundColor Green
} else {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "已基于 .env.example 成功创建 .env 配置文件！" -ForegroundColor Green
        Write-Host "提示: 请在提交或部署前，用文本编辑器打开 .env，填写你真实的大模型 API Key 与飞书 API 凭证。" -ForegroundColor Cyan
    } else {
        Write-Warning "未找到 .env.example 模板文件，无法自动创建 .env 配置文件。"
    }
}
Write-Host ""

# 3. 安装依赖包
Write-Host "[3/4] 正在准备依赖环境..." -ForegroundColor Yellow
Write-Host "由于当前版本为本地验证 Demo，使用纯原生 Node.js API，暂无外部依赖包。" -ForegroundColor Green
Write-Host "后续扩展生产版时，你可以运行 'npm install' 来安装新依赖。" -ForegroundColor Cyan
Write-Host ""

# 4. 执行项目语法健康检查
Write-Host "[4/4] 正在运行项目语法与健康检查..." -ForegroundColor Yellow
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm run check
    if ($LASTEXITCODE -eq 0) {
        Write-Host "检查通过！项目代码语法完整，无 Warning 和 Error。" -ForegroundColor Green
    } else {
        Write-Warning "项目语法检查发现问题，请检查 server.js 或 public/app.js。"
    }
} else {
    Write-Warning "未找到 npm 命令，跳过项目静态检查。"
}
Write-Host ""

# 5. 完成提示
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "         环境配置完成！                      " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "你可以通过以下命令启动系统开发服务器：" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "服务启动后，在浏览器访问：" -ForegroundColor White
Write-Host "  http://localhost:4173" -ForegroundColor Yellow
Write-Host ""
Write-Host "演示数据复位命令 (如需重置数据)：" -ForegroundColor White
Write-Host "  .\scripts\reset-demo.ps1" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
