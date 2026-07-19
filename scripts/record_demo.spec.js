import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const durationsFile = path.join(__dirname, '..', 'output', 'video_temp', 'durations.json');
const rawVideoDir = path.join(__dirname, '..', 'output', 'video_temp', 'raw_video');

test('自动录制晶流演示视频', async ({ browser }) => {
  test.setTimeout(120000);
  // 1. 读取语音时长数据
  if (!fs.existsSync(durationsFile)) {
    throw new Error('未找到 durations.json 语音时长配置文件，请先执行语音合成！');
  }
  const durations = JSON.parse(fs.readFileSync(durationsFile, 'utf8').replace(/^\uFEFF/, ''));
  console.log('读取到各段旁白时长:', durations);

  // 创建输出视频目录
  if (!fs.existsSync(rawVideoDir)) {
    fs.mkdirSync(rawVideoDir, { recursive: true });
  }

  // 2. 创建带录屏功能的独立上下文
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: {
      dir: rawVideoDir,
      size: { width: 1280, height: 800 }
    }
  });

  const page = await context.newPage();

  // 3. 打开系统首页 (研发总览)
  await page.goto('http://localhost:4173');
  await page.waitForTimeout(2000);
  
  // 第一段旁白 (Intro)
  console.log('正在演示：首页研发总览与 SLA 指标...');
  await page.mouse.move(300, 300);
  await page.waitForTimeout(Math.max(1000, durations.intro - 2000));

  // 4. 进入 AI 会议解析器
  console.log('正在演示：打开会议解析器...');
  await page.click('button[data-action="open-analyzer"]');
  await page.waitForTimeout(1000);
  
  // 选择 B-17 并解析
  console.log('正在演示：选择 B-17 并进行结构化解析...');
  await page.click('input[name="meeting"][value="mt-2407"]');
  await page.waitForTimeout(1000);
  await page.click('button[data-action="run-analysis"]');
  
  // 等待解析完成
  await page.waitForTimeout(2500);
  
  // 停留等待第二段旁白 (Meeting)
  console.log('正在展示解析结果与行动项...');
  await page.mouse.move(600, 400);
  await page.waitForTimeout(Math.max(1000, durations.meeting - 4500));
  
  // 关闭解析器弹窗
  await page.click('button[data-action="close-modal"]');
  await page.waitForTimeout(1000);

  // 5. 切换到研发知识湖
  console.log('正在演示：研发知识湖网络图...');
  await page.click('button[data-view="knowledge"]');
  await page.waitForTimeout(2000);
  
  // 停留等待第三段旁白 (Lake)
  await page.mouse.move(700, 500);
  await page.waitForTimeout(Math.max(1000, durations.lake - 2000));

  // 6. 在知识湖进行统一检索
  console.log('正在演示：知识检索功能...');
  await page.fill('input#globalSearch', '湿度');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  
  // 停留等待第四段旁白 (Search)
  await page.mouse.move(500, 450);
  await page.waitForTimeout(Math.max(1000, durations.search - 2000));
  
  // 关闭搜索弹窗
  await page.click('button[data-action="close-modal"]');
  await page.waitForTimeout(1000);

  // 7. 切换其他板块快速浏览
  console.log('正在演示：其他工作台与收尾...');
  await page.click('button[data-view="experiments"]');
  await page.waitForTimeout(1500);
  await page.click('button[data-view="agents"]');
  await page.waitForTimeout(1500);
  await page.click('button[data-view="overview"]');
  await page.waitForTimeout(1000);
  
  // 停留等待第五段旁白 (Outro)
  await page.waitForTimeout(Math.max(1000, durations.outro - 5000));
  
  // 8. 必须关闭上下文以保存视频文件！
  console.log('正在关闭上下文以保存录屏文件...');
  await context.close();
  console.log('演示录制全部完成！');
});
