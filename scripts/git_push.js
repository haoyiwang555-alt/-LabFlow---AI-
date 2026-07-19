import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

async function run() {
  try {
    if (!fs.existsSync(path.join(ROOT, '.git'))) {
      console.log('正在初始化 Git 仓库...');
      execSync('git init', { cwd: ROOT });
    }

    console.log('正在配置 Git 提交用户信息...');
    execSync('git config user.name "haoyiwang555-alt"', { cwd: ROOT });
    execSync('git config user.email "1202510790@cug.edu.cn"', { cwd: ROOT });

    console.log('正在添加文件到暂存区...');
    execSync('git add .', { cwd: ROOT });

    console.log('正在提交更改...');
    const status = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
    if (status) {
      execSync('git commit -m "feat: init LabFlow AI demo project for challenge"', { cwd: ROOT, stdio: 'inherit' });
    } else {
      console.log('没有检测到更改，继续执行推送...');
    }

    console.log('正在设置分支为 main...');
    execSync('git branch -M main', { cwd: ROOT });

    console.log('正在从系统环境变量中获取 GITHUB_TOKENS...');
    // 获取 Windows 用户注册表中的环境变量
    const token = execSync('powershell -Command "[Environment]::GetEnvironmentVariable(\'GITHUB_TOKENS\', \'User\')"', { cwd: ROOT }).toString().trim();
    
    if (!token) {
      throw new Error('未能在系统 User 环境变量中获取到 GITHUB_TOKENS！');
    }

    const remoteUrlWithToken = `https://${token}@github.com/haoyiwang555-alt/-LabFlow---AI-.git`;
    const publicRemoteUrl = 'https://github.com/haoyiwang555-alt/-LabFlow---AI-.git';

    console.log('正在配置远程仓库并推送...');
    // 移除现有 origin 关联
    try {
      execSync('git remote remove origin', { cwd: ROOT });
    } catch {}

    // 关联带 Token 的 URL
    execSync(`git remote add origin "${remoteUrlWithToken}"`, { cwd: ROOT });

    // 执行推送
    console.log('正在推送至 GitHub...');
    execSync('git push -u origin main', { cwd: ROOT, stdio: 'inherit' });

    console.log('推送成功！项目已成功提交到 GitHub。');

    // 重置远程 URL 为公共地址
    execSync(`git remote set-url origin "${publicRemoteUrl}"`, { cwd: ROOT });
    console.log('安全防护：已从本地 Git 配置文件中擦除 Token，重置为公共 HTTPS 链接。');

  } catch (error) {
    console.error('Git 操作失败:', error.message);
    // 确保兜底擦除 Token
    try {
      execSync('git remote set-url origin "https://github.com/haoyiwang555-alt/-LabFlow---AI-.git"', { cwd: ROOT });
    } catch {}
    process.exit(1);
  }
}

run();
