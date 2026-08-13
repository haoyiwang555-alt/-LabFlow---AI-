/* 部署自检脚本：验证线上 Demo 后端真实可用
 * 用法：node scripts/verify-deploy.mjs https://your-demo-url
 * 通过 = /api/health 200、/api/infra/status 诚实、/api/overview 返回真实数据
 */
const url = process.argv[2];
if (!url) { console.error('用法：node scripts/verify-deploy.mjs <公网URL>'); process.exit(2); }
const base = url.replace(/\/$/, '');
const j = async (p) => {
  const r = await fetch(base + p, { timeout: 15000 });
  const body = await r.json().catch(() => null);
  return { status: r.status, body };
};
const health = await j('/api/health');
const ok = health.status === 200 && health.body?.data?.ok === true;
console.log(`/api/health        -> ${health.status} ok=${health.body?.data?.ok} ${ok ? '✅' : '❌'}`);
if (!ok) { console.error('后端未运行或路径不对：请确认部署的是 Node 服务（server.js），而非纯静态文件。'); process.exit(1); }
const infra = await j('/api/infra/status');
const items = infra.body?.data?.items || {};
console.log('/api/infra/status  ->', ['json','redis','neo4j','llm','feishu'].map(k => `${k}=${items[k]?.status}`).join(' '));
const ov = await j('/api/overview');
const exp = ov.body?.data?.experiments?.length;
console.log(`/api/overview      -> experiments=${exp} sla=${ov.body?.data?.metrics?.knowledgeSla}% ${exp === 6 ? '✅' : '⚠️'}`);
console.log(ok && exp === 6 ? '\n部署自检通过 ✅' : '\n部署自检未完全通过，请按 DEPLOYMENT.md 排查');
