import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TEMP_DIR = path.join(ROOT, 'output', 'video_temp');
const FINAL_OUTPUT_DIR = path.join(ROOT, 'output');

// 确保临时目录和输出目录存在
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(FINAL_OUTPUT_DIR)) fs.mkdirSync(FINAL_OUTPUT_DIR, { recursive: true });

async function run() {
  try {
    console.log('=== 1/7: 开始生成旁白音频 (SAPI Speech Synthesis) ===');
    
    // 写入具有 UTF-8 BOM 编码的 PowerShell 语音合成脚本，以防止中文乱码错误
    const ps1Path = path.join(TEMP_DIR, 'generate_audio.ps1');
    const ps1Content = `# ==============================================================================
# 晶流 LabFlow - 语音合成脚本 (generate_audio.ps1)
# ==============================================================================

$outputDir = "${TEMP_DIR.replace(/\\/g, '\\\\')}"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Huihui Desktop")

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

foreach ($seg in $segments) {
    $wavPath = Join-Path $outputDir ($seg.name + ".wav")
    $synth.SetOutputToWaveFile($wavPath)
    $synth.Speak($seg.text)
    $synth.SetOutputToNull()
    Write-Host "合成段 [$($seg.name)] 完成" -ForegroundColor Green
}

$synth.Dispose()
Write-Host "语音合成脚本执行结束。"
`;

    fs.writeFileSync(ps1Path, '\ufeff' + ps1Content, 'utf16le');
    
    // 执行 PowerShell 脚本生成语音
    console.log('执行 PowerShell 语音生成...');
    execSync(`powershell -ExecutionPolicy Bypass -File "${ps1Path}"`, { stdio: 'inherit', cwd: ROOT });

    // 从 Node.js 读取 WAV 文件大小，计算精确的音频时长
    console.log('正在计算精确的语音时长...');
    const segmentNames = ['intro', 'meeting', 'lake', 'search', 'outro'];
    const durations = {};
    for (const name of segmentNames) {
      const wavPath = path.join(TEMP_DIR, `${name}.wav`);
      if (fs.existsSync(wavPath)) {
        const stats = fs.statSync(wavPath);
        // SAPI 默认音频参数: 22050 Hz, 16-bit (2 bytes), mono (1 channel) -> 44100 bytes/sec
        // PCM WAV 文件头部为 44 字节
        const durationMs = Math.round(((stats.size - 44) / 44100) * 1000) + 1500; // 额外增加 1.5 秒余量确保画面流畅
        durations[name] = durationMs;
        console.log(`合成段 [${name}] 精确时长: ${durationMs} ms (音频大小: ${stats.size} 字节)`);
      } else {
        durations[name] = 3000; // 兜底
      }
    }
    const jsonPath = path.join(TEMP_DIR, 'durations.json');
    fs.writeFileSync(jsonPath, JSON.stringify(durations, null, 2), 'utf8');
    console.log('精确时长已写入 durations.json:', durations);

    console.log('\n=== 2/7: 复位本地演示数据 ===');
    const resetScript = path.join(ROOT, 'scripts', 'reset-demo.ps1');
    if (fs.existsSync(resetScript)) {
      execSync(`powershell -ExecutionPolicy Bypass -File "${resetScript}"`, { stdio: 'inherit', cwd: ROOT });
    }

    console.log('\n=== 3/7: 启动本地 Node API 服务器 ===');
    const serverProcess = spawn('node', ['server.js'], { stdio: 'inherit', cwd: ROOT });
    
    // 等待 2 秒让服务器完全启动
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== 4/7: 启动 Playwright 录屏浏览器自动化 ===');
    try {
      execSync('npx playwright test scripts/record_demo.spec.js', { stdio: 'inherit', cwd: ROOT });
    } catch (e) {
      console.error('Playwright 自动化录制失败，请检查报错:', e);
      serverProcess.kill();
      process.exit(1);
    }

    console.log('\n=== 5/7: 关闭 Node API 服务器 ===');
    console.log('正在等待录屏文件完成磁盘写入与重命名...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    serverProcess.kill();

    console.log('\n=== 6/7: 合并与处理音频文件 ===');
    // 使用 FFmpeg 拼接 WAV 段
    const rawFileList = path.join(TEMP_DIR, 'audio_list.txt');
    const concatContent = [
      `file 'intro.wav'`,
      `file 'meeting.wav'`,
      `file 'lake.wav'`,
      `file 'search.wav'`,
      `file 'outro.wav'`
    ].join('\n');
    
    fs.writeFileSync(rawFileList, concatContent, 'utf8');
    
    const combinedWav = path.join(TEMP_DIR, 'voiceover.wav');
    console.log('合并分段音频中...');
    execSync(`ffmpeg -y -f concat -safe 0 -i "${rawFileList}" -c copy "${combinedWav}"`, { stdio: 'inherit' });

    console.log('\n=== 7/7: 合并音视频并输出 MP4 ===');
    
    // 寻找 Playwright 录制下来的 WebM 原始视频文件
    const rawVideoDir = path.join(TEMP_DIR, 'raw_video');
    const files = fs.readdirSync(rawVideoDir);
    const webmFile = files.find(file => file.endsWith('.webm'));
    
    if (!webmFile) {
      throw new Error('未在录屏目录找到 Playwright 生成的 .webm 视频文件！');
    }
    
    const rawWebmPath = path.join(rawVideoDir, webmFile);
    const finalMp4Path = path.join(FINAL_OUTPUT_DIR, '晶流LabFlow-系统演示视频.mp4');
    
    // 合并视频与音频，转换成通用的 H.264/AAC MP4 格式，截取最短流以防止超出时长
    console.log(`正在合成最终视频 -> ${finalMp4Path}`);
    execSync(`ffmpeg -y -i "${rawWebmPath}" -i "${combinedWav}" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${finalMp4Path}"`, { stdio: 'inherit' });
    
    console.log('\n==================================================');
    console.log('🎉 演示视频生成成功！');
    console.log(`最终视频保存在: ${finalMp4Path}`);
    console.log('==================================================');

    // 自动清理临时文件夹
    console.log('跳过清理临时文件以供检查...');
    // fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    
  } catch (error) {
    console.error('录制视频脚本执行发生错误:', error);
    process.exit(1);
  }
}

run();
