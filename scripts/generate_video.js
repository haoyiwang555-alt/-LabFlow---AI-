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
    console.log('=== 1/7: 开始生成旁白音频 (Edge TTS) ===');
    
    const segments = [
      { name: "intro", text: "大家好，我们是“知识催化剂”团队。今天为您演示的产品是“晶流 LabFlow——AI 实验研发加速器”。在日常的实验里，很多宝贵的失败经验和研发决策往往不知不觉就流失了。为此，晶流提出了“24小时知识 SLA”的概念，目前的达标率已经达到了 87%，让您的每一次讨论，都能在24小时内转化为真正可以复用的核心资产。" },
      { name: "meeting", text: "首先，我们进入 AI 会议解析器，选择 B-17 评审会，开启流式解析功能。在这个过程中，多 Agent 相互协作，短短几秒钟就能为您提炼出结构化的决策内容。不仅包含清晰的行动项，而且每一条结论都附带精确到秒的原文证据时间戳，真正做到百分之百可追溯。" },
      { name: "lake", text: "接下来看看研发知识湖。在这里，动态图谱会自动把 B-17 评审会和历史实验关联起来，并且精准命中了“失败案例 A-09”中的“湿度波动风险”。我们的系统支持统一的语义搜索，能够把那些无形的失败经验，标准化建模为具体的触发参数和规避策略。" },
      { name: "approval", text: "另外，为了绝对保障企业的核心数据安全，晶流特别引入了“Human-in-the-Loop”，也就是人工参与的知识审批闭环。所有由 AI 提取出来的结论，都必须经过人工审核，不管是通过还是驳回，确认无误后才能正式进入知识湖，从根本上杜绝了 AI 幻觉带来的数据污染。" },
      { name: "integrations", text: "在连接器页面中，您可以直观地看到各项基础设施真实的探测状态。比如当前的演示环境中，飞书连接器就处于“契约就绪”和“演示适配器”的状态。这种真实透明的服务状态，意味着我们随时都准备好，以完全合规的方式接入到真实的企业环境中。" },
      { name: "outro", text: "目前，晶流 LabFlow 已经顺利完成了本地验证，您现在看到的是 6 个实验以及 4 个待处理的风险项。我们的初衷并不是去替代科研人员的专业判断，而是要让每一次判断都有迹可循，让以往的失败，成为您下一次科学发现的最短捷径。感谢大家的聆听！" }
    ];

    console.log('正在调用 edge-tts 生成语音...');
    const durations = {};
    for (const seg of segments) {
      const mp3Path = path.join(TEMP_DIR, `${seg.name}.mp3`);
      execSync(`edge-tts --voice zh-CN-XiaoxiaoNeural --text "${seg.text}" --write-media "${mp3Path}"`, { stdio: 'inherit' });
      console.log(`合成段 [${seg.name}] 完成`);
      
      if (fs.existsSync(mp3Path)) {
        try {
          const ffprobeOut = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${mp3Path}"`).toString();
          const durationSec = parseFloat(ffprobeOut.trim());
          const durationMs = Math.round(durationSec * 1000) + 1500; // 额外增加 1.5 秒余量确保画面流畅
          durations[seg.name] = durationMs;
          console.log(`[${seg.name}] 精确时长: ${durationMs} ms`);
        } catch (e) {
          console.warn(`无法读取 ${seg.name}.mp3 时长，使用默认 5000ms`);
          durations[seg.name] = 5000;
        }
      } else {
        durations[seg.name] = 5000; // 兜底
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
    // 使用 FFmpeg 拼接 MP3 段
    const rawFileList = path.join(TEMP_DIR, 'audio_list.txt');
    const concatContent = [
      `file 'intro.mp3'`,
      `file 'meeting.mp3'`,
      `file 'lake.mp3'`,
      `file 'approval.mp3'`,
      `file 'integrations.mp3'`,
      `file 'outro.mp3'`
    ].join('\n');
    
    fs.writeFileSync(rawFileList, concatContent, 'utf8');
    
    const combinedAudio = path.join(TEMP_DIR, 'voiceover.mp3');
    console.log('合并分段音频中...');
    execSync(`ffmpeg -y -f concat -safe 0 -i "${rawFileList}" -c copy "${combinedAudio}"`, { stdio: 'inherit' });

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
    execSync(`ffmpeg -y -i "${rawWebmPath}" -i "${combinedAudio}" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${finalMp4Path}"`, { stdio: 'inherit' });
    
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
