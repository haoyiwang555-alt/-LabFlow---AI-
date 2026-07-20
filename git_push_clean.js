import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

try {
  console.log('正在暂存文件与删除标记...');
  execSync('git add -A', { cwd: ROOT });
  
  console.log('正在提交更新...');
  execSync('git commit -m "refactor: remove internal docs/research & privacy files, update top-tier README"', { cwd: ROOT, stdio: 'inherit' });
  
  console.log('正在从系统环境变量安全读取凭证...');
  const token = execSync('powershell -Command "[Environment]::GetEnvironmentVariable(\'GITHUB_TOKENS\', \'User\')"', { cwd: ROOT }).toString().trim();
  
  if (!token) {
    throw new Error('未能在系统用户环境变量中获取到 GITHUB_TOKENS！');
  }

  const remoteUrlWithToken = `https://${token}@github.com/haoyiwang555-alt/-LabFlow---AI-.git`;
  const publicRemoteUrl = 'https://github.com/haoyiwang555-alt/-LabFlow---AI-.git';

  console.log('正在设置远程仓库并安全推送...');
  try { execSync('git remote remove origin', { cwd: ROOT }); } catch {}
  execSync(`git remote add origin "${remoteUrlWithToken}"`, { cwd: ROOT });

  console.log('正在推送主分支至 GitHub 远程仓库...');
  execSync('git push -u origin main', { cwd: ROOT, stdio: 'inherit' });

  // 恢复无敏感凭证的公共远程地址
  execSync(`git remote set-url origin "${publicRemoteUrl}"`, { cwd: ROOT });
  console.log('推送成功！本地凭证已被安全擦除。');

} catch (error) {
  console.error('Git 操作失败:', error.message);
  try {
    execSync('git remote set-url origin "https://github.com/haoyiwang555-alt/-LabFlow---AI-.git"', { cwd: ROOT });
  } catch {}
  process.exit(1);
}
