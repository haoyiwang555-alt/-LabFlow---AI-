import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const KEY = process.env.NVIDIA_API_KEY;
if (!KEY) { console.error('NVIDIA_API_KEY not set'); process.exit(1); }

const srcPng = process.argv[2];
if (!srcPng) { console.error('usage: node analyze_one.mjs <png> <out.md>'); process.exit(1); }
const outFile = process.argv[3] || (srcPng.replace(/\.png$/, '') + '-vision.md');

const root = process.cwd();
const tmpDir = path.join(root, 'output', '.vision-tmp');
mkdirSync(tmpDir, { recursive: true });

const QUESTION = `请以资深UI/UX设计师视角分析该页面截图。这是"晶流 LabFlow"——面向智能自主实验室的AI实验研发加速器，参赛作品，目标是大厂级B2B产品质感。请逐条列出具体问题：1)布局/栅格 2)对齐 3)间距 4)对比度 5)视觉层级 6)一致性 7)品牌色使用 8)哪些地方显得不够高级/像demo。每条给出"问题描述 + 具体可执行改进建议"。请用中文，结构化分点，重质不重量。`;

// resize to jpg via the existing powershell helper
const base = path.basename(srcPng, '.png');
const jpg = path.join(tmpDir, `${base}.jpg`);
const ps1 = path.join(root, 'scripts', 'resize-img.ps1');
execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-Src', srcPng, '-Out', jpg, '-MaxW', '900'], { stdio: 'pipe' });
const b64 = readFileSync(jpg).toString('base64');
const dataUrl = `data:image/jpeg;base64,${b64}`;

const MODELS = ['minimaxai/minimax-m3', 'meta/llama-3.2-11b-vision-instruct', 'nvidia/nemotron-nano-12b-v2-vl'];
let lastErr = null;
for (const model of MODELS) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt));
      const payload = { model, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl } }, { type: 'text', text: QUESTION }] }], max_tokens: 1500 };
      const bodyFile = path.join(tmpDir, `req-${Date.now()}.json`);
      writeFileSync(bodyFile, JSON.stringify(payload));
      const out = execFileSync('curl.exe', ['-s', '-X', 'POST', API, '-H', `Authorization: Bearer ${KEY}`, '-H', 'Content-Type: application/json', '--data', `@${bodyFile}`], { stdio: 'pipe', timeout: 120000 }).toString('utf8');
      const json = JSON.parse(out);
      if (json.choices && json.choices[0]) {
        const text = json.choices[0].message.content;
        writeFileSync(outFile, `# 视觉分析：${base}\n\n> model: ${model}\n\n${text}\n`);
        console.log(`OK ${base} -> ${model} len=${text.length} saved=${outFile}`);
        process.exit(0);
      }
      lastErr = json.error || out;
    } catch (e) { lastErr = e.message || e; if (e.signal) lastErr = 'SIG:' + e.signal; }
  }
}
console.error(`FAILED ${base}: ${lastErr}`);
process.exit(1);