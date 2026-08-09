import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const KEY = process.env.NVIDIA_API_KEY;
if (!KEY) { console.error('NVIDIA_API_KEY 未设置'); process.exit(1); }
const MODELS = ['minimaxai/minimax-m3', 'meta/llama-3.2-11b-vision-instruct'];

const root = process.cwd();
const tmpDir = path.join(root, 'output', '.vision-tmp');
mkdirSync(tmpDir, { recursive: true });

const QUESTION = `请以资深UI/UX设计师视角分析该页面的视觉设计问题。逐条列出：布局/栅格、对齐、间距、对比度、视觉层级、一致性、品牌色使用的问题。指出哪些地方显得不够高级或像demo。给出具体可执行的改进建议（越具体越好）。请用中文回答。`;

function resizeToJpg(srcPng) {
  const base = path.basename(srcPng, '.png');
  const out = path.join(tmpDir, `${base}.jpg`);
  const ps1 = path.join(root, 'scripts', 'resize-img.ps1');
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-Src', srcPng, '-Out', out, '-MaxW', '900'], { stdio: 'pipe' });
  return out;
}

async function callVision(jpgPath) {
  const b64 = readFileSync(jpgPath).toString('base64');
  const dataUrl = `data:image/jpeg;base64,${b64}`;
  const payload = {
    model: MODELS[0],
    messages: [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: dataUrl } },
      { type: 'text', text: QUESTION }
    ]}],
    max_tokens: 1400
  };
  const bodyFile = path.join(tmpDir, `req-${Date.now()}.json`);
  writeFileSync(bodyFile, JSON.stringify(payload));
  let lastErr = null;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const p = JSON.parse(readFileSync(bodyFile, 'utf8'));
        p.model = model;
        writeFileSync(bodyFile, JSON.stringify(p));
        const out = execFileSync('curl.exe', ['-s', '-X', 'POST', API,
          '-H', `Authorization: Bearer ${KEY}`,
          '-H', 'Content-Type: application/json',
          '--data', `@${bodyFile}`], { stdio: 'pipe', timeout: 120000 }).toString('utf8');
        const json = JSON.parse(out);
        if (json.choices && json.choices[0]) return { model, text: json.choices[0].message.content };
        lastErr = json.error || out;
      } catch (e) { lastErr = e.message || e; if (e.signal) lastErr = 'SIG:' + e.signal; }
    }
  }
  return { model: 'FAILED', text: String(lastErr) };
}

const targets = process.argv.slice(2);
const report = {};
for (const f of targets) {
  const jpg = resizeToJpg(f);
  const res = await callVision(jpg);
  report[path.basename(f)] = res;
  console.log(`[done] ${path.basename(f)} -> model=${res.model} len=${res.text.length}`);
}
writeFileSync(path.join(tmpDir, 'vision-report.json'), JSON.stringify(report, null, 2));
console.log('REPORT_SAVED ' + path.join(tmpDir, 'vision-report.json'));