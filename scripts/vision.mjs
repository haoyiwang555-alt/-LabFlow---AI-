import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const API = 'https://integrate.api.nvidia.com/v1/chat/completions';
const KEY = process.env.NVIDIA_API_KEY;
if (!KEY) {
  console.error('ERROR: NVIDIA_API_KEY 环境变量未设置。请先设置后重试。');
  if (process.argv.includes('--batch') || process.argv[2]) process.exit(1);
}
const MODELS = ['minimaxai/minimax-m3', 'meta/llama-3.2-11b-vision-instruct'];

// args: node vision.mjs <image> [question] ; or --batch for a preset set
const root = process.cwd();
const tmpDir = path.join(root, 'output', '.vision-tmp');
mkdirSync(tmpDir, { recursive: true });
const workDir = path.join(root, 'output', 'screenshots', 'live');

function resizeToJpg(srcPng) {
  const base = path.basename(srcPng, '.png');
  if (base === srcPng) return srcPng; // already extracted
  const out = path.join(tmpDir, `${base}.jpg`);
  const ps1 = path.join(root, 'scripts', 'resize-img.ps1');
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1, '-Src', srcPng, '-Out', out, '-MaxW', '800'], { stdio: 'pipe' });
  return out;
}

async function callVision(jpgPath, question) {
  const b64 = readFileSync(jpgPath).toString('base64');
  const dataUrl = `data:image/jpeg;base64,${b64}`;
  const payload = {
    model: MODELS[0],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: question }
        ]
      }
    ],
    max_tokens: 1024
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
        if (json.choices && json.choices[0]) {
          return { model, text: json.choices[0].message.content };
        }
        lastErr = json.error || out;
      } catch (e) {
        lastErr = e.message || e;
        if (e.signal) lastErr = 'SIG:' + e.signal;
      }
    }
  }
  return { model: 'FAILED', text: String(lastErr) };
}

const args = process.argv.slice(2);
if (args[0] === '--batch') {
  const files = args.filter(a => a.endsWith('.png')).map(f => path.join(workDir, f));
  const question = args.find(a => a.startsWith('--q='))?.slice(4) || '分析此页面的视觉设计问题';
  for (const f of files) {
    const jpg = resizeToJpg(f);
    const res = await callVision(jpg, question);
    console.log(`\n===== ${path.basename(f)} =====`);
    console.log(`model: ${res.model}`);
    console.log(res.text);
  }
} else if (args[0]) {
  const src = args[0];
  const question = args.slice(1).join(' ') || '分析此页面的视觉设计问题';
  const jpg = src.endsWith('.png') ? resizeToJpg(path.isAbsolute(src) ? src : path.join(root, src)) : src;
  const res = await callVision(jpg, question);
  console.log(`model: ${res.model}`);
  console.log(res.text);
} else {
  console.log('usage: node vision.mjs <image.png|jpg> [question] | node vision.mjs --batch a.png b.png --q="..."');
}