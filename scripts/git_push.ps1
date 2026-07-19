# ==============================================================================
# 晶流 LabFlow - 安全 Git 推送脚本 (git_push.ps1)
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "正在初始化本地 Git 仓库..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $PSScriptRoot "..\.git"))) {
    git init
}

# 配置本地提交信息，防止全局未配置导致 commit 报错
git config user.name "haoyiwang555-alt"
git config user.email "1202510790@cug.edu.cn"

Write-Host "正在添加文件到暂存区..." -ForegroundColor Cyan
# 确保在项目根目录下执行
$currentDir = Get-Location
Set-Location (Join-Path $PSScriptRoot "..")

try {
    git add .
    
    Write-Host "正在提交更改..." -ForegroundColor Cyan
    $status = git status --porcelain
    if ($status) {
        git commit -m "feat: init LabFlow AI demo project for challenge"
    } else {
        Write-Host "未检测到新的更改，继续执行推送..." -ForegroundColor Yellow
    }

    # 切换到 main 分支
    git branch -M main

    Write-Host "正在读取本地凭证 (GITHUB_TOKENS)..." -ForegroundColor Cyan
    $token = [Environment]::GetEnvironmentVariable('GITHUB_TOKENS', 'User')
    if (-not $token) {
        Write-Error "错误: 未在 User 环境中检测到 GITHUB_TOKENS，请确认密钥已正确配置到本系统！"
        Exit
    }

    # 构建安全 URL
    $remoteUrlWithToken = "https://$($token)@github.com/haoyiwang555-alt/-LabFlow---AI-.git"
    $publicRemoteUrl = "https://github.com/haoyiwang555-alt/-LabFlow---AI-.git"

    Write-Host "正在安全建立远程关联并推送..." -ForegroundColor Cyan
    
    # 移除现有 origin 关联
    git remote remove origin 2>$null
    
    # 使用带 Token 的安全 URL 关联
    git remote add origin $remoteUrlWithToken

    # 执行推送并隐藏 Token 打印
    Write-Host "正在进行 Git 推送，请稍候..." -ForegroundColor Yellow
    git push -u origin main

    Write-Host "推送成功！项目已成功提交到 GitHub。" -ForegroundColor Green

} finally {
    # 无论成功还是失败，均从本地 .git/config 中擦除 Token，替换为公共 HTTPS URL
    git remote set-url origin $publicRemoteUrl
    Write-Host "安全防线配置：已自动从本地 Git 配置文件中擦除 Token，重置为公共 HTTPS 远程链接。" -ForegroundColor Green
    Set-Location $currentDir
}
