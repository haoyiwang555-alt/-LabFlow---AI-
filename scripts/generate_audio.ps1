# ==============================================================================
# 晶流 LabFlow - 语音合成脚本 (generate_audio.ps1)
# ==============================================================================

# 确保输出目录存在
$outputDir = "M:\项目\比赛\AI先锋未来人才大赛\output\video_temp"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# 注册 Speech 库
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# 定义旁白分段
$segments = @(
    @{
        name = "intro"
        text = "大家好，我们是知识催化剂团队。为您演示晶流 LabFlow——面向智能自主实验室的 AI 实验研发加速器。我们的核心目标是 24小时知识 SLA：确保实验会议结束 24小时内，关键决策与风险被沉淀为可复用的研发知识资产。"
    },
    @{
        name = "meeting"
        text = "现在，我们进入 AI 会议解析器。选择 B-17 晶型筛选参数评审会，点击开始解析。系统在数秒内基于飞书会议 AI 转写，智能提炼出结构化的方案决策和行动项，并且每一条结论都带有精确到秒的原文证据时间戳，保证结论百分之百可追溯。"
    },
    @{
        name = "lake"
        text = "接着，我们切入研发知识湖。晶流以实验对象为中心，自动将本次实验关联到历史成功方案 B-11 与失败案例 A-09，为本次实验预防了湿度波动带来的结晶风险。"
    },
    @{
        name = "search"
        text = "在知识湖中，我们检索关键字『湿度』。系统对失败经验进行了标准化建模，包含触发参数、可能根因与规避策略，让历史经验在下一次实验前主动召回。"
    },
    @{
        name = "outro"
        text = "晶流 LabFlow 目前已完成本地可运行的完整产品验证版。让每一次判断留下证据，让每一次失败成为发现的捷径。谢谢大家！"
    }
)

Write-Host "正在开始语音合成..." -ForegroundColor Cyan

$durationInfo = @{}

foreach ($seg in $segments) {
    $wavPath = Join-Path $outputDir ($seg.name + ".wav")
    
    # 设置输出到 WAV 文件
    $synth.SetOutputToWaveFile($wavPath)
    
    # 记录说话前的时间
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $synth.Speak($seg.text)
    $sw.Stop()
    
    # 释放当前文件占用
    $synth.SetOutputToNull()
    
    # 记录时长 (加上 1.5 秒的静音缓冲，以保证画面转场自然)
    $durationMs = $sw.ElapsedMilliseconds + 1500
    $durationInfo[$seg.name] = $durationMs
    
    Write-Host ("合成段 [{0}] 完成 -> {1} ms, 文本长度: {2}" -f $seg.name, $durationMs, $seg.text.Length) -ForegroundColor Green
}

$synth.Dispose()

# 保存时长信息到 JSON 供 Node 脚本读取
$jsonPath = Join-Path $outputDir "durations.json"
$durationInfo | ConvertTo-Json | Out-File $jsonPath -Encoding utf8

Write-Host "语音合成全部完成！时长已保存至: $jsonPath" -ForegroundColor Cyan
