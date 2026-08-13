/* 晶流 LabFlow · 飞书集成层 mock 测试
 * 本地起一个模拟 open.feishu.cn 的 HTTP 服务，验证 feishu.js 的
 * token 换取 / 妙记转写 / 多维表格写入 / 消息推送 全链路真实请求正确。
 * 运行：node scripts/test-feishu-mock.mjs
 */
import http from 'node:http';
import assert from 'node:assert';

process.env.FEISHU_BASE_URL = 'http://127.0.0.1:18990';
process.env.FEISHU_APP_ID = 'cli_mock';
process.env.FEISHU_APP_SECRET = 'mock_secret_abc';

const seen = [];
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', () => {
    seen.push(`${req.method} ${req.url}`);
    res.setHeader('Content-Type', 'application/json');
    const auth = req.headers.authorization || '';
    const send = obj => { res.writeHead(200); res.end(JSON.stringify(obj)); };

    if (req.method === 'POST' && req.url === '/open-apis/auth/v3/tenant_access_token/internal') {
      const p = JSON.parse(body || '{}');
      assert.strictEqual(p.app_id, 'cli_mock', 'app_id 透传');
      assert.strictEqual(p.app_secret, 'mock_secret_abc', 'app_secret 透传');
      return send({ code: 0, msg: 'ok', tenant_access_token: 'mock-token-1', expire: 7200 });
    }
    if (req.method === 'GET' && req.url.startsWith('/open-apis/minutes/v1/minutes/mt-mock')) {
      assert.ok(auth === 'Bearer mock-token-1', '妙记请求携带 token');
      return send({ code: 0, msg: 'ok', data: { minute: { speech: { paragraphs: [
        { speaker: '林岚', sentences: [{ text: 'B-17-03 采用低温梯度方案进入小试，冷却速率 0.5 °C/min。' }] },
        { speaker: '陈默', sentences: [{ text: '溶剂比例接近历史失败案例临界值，需增加中间检测点。' }] }
      ] } } } });
    }
    if (req.method === 'POST' && req.url.startsWith('/open-apis/bitable/v1/apps/app-mock/tables/tbl-mock/records')) {
      const p = JSON.parse(body || '{}');
      assert.ok(p.fields && p.fields.标题, 'bitable fields 透传');
      return send({ code: 0, msg: 'ok', data: { record: { record_id: 'rec-1' } } });
    }
    if (req.method === 'POST' && req.url.startsWith('/open-apis/im/v1/messages')) {
      const p = JSON.parse(body || '{}');
      assert.strictEqual(p.receive_id, 'oc_mock_group', '消息接收人透传');
      assert.ok(p.content && p.content.includes('LabFlow'), '消息内容透传');
      return send({ code: 0, msg: 'ok', data: { message_id: 'msg-1' } });
    }
    res.writeHead(404); res.end(JSON.stringify({ code: 999999, msg: 'mock 未覆盖: ' + req.url }));
  });
});

await new Promise(r => server.listen(18990, '127.0.0.1', r));

try {
  const feishu = await import('../feishu.js');

  const probe = await feishu.probeStatus();
  assert.strictEqual(probe.status, 'connected', 'probe connected');
  console.log('✓ probeStatus ->', probe.status, '|', probe.detail);

  const t = await feishu.getMinuteTranscriptText('mt-mock');
  assert.strictEqual(t.ok, true, 'minutes ok');
  assert.ok(t.text.includes('B-17-03') && t.text.includes('陈默'), '转写文本提取');
  console.log('✓ getMinuteTranscriptText ->', t.text.split('\n').length, '行');

  const bit = await feishu.createBitableRecord('app-mock', 'tbl-mock', { 标题: 'B-17-03 低温梯度方案', 类型: '最优参数', 置信度: 0.96, 状态: 'approved' });
  assert.strictEqual(bit.ok, true, 'bitable ok');
  console.log('✓ createBitableRecord ->', bit.payload.data.record.record_id);

  const msg = await feishu.sendTextMessage('oc_mock_group', '[LabFlow] 知识已通过：B-17-03 低温梯度方案');
  assert.strictEqual(msg.ok, true, 'message ok');
  console.log('✓ sendTextMessage ->', msg.payload.data.message_id);

  // token 缓存命中
  const again = await feishu.getTenantAccessToken();
  assert.strictEqual(again.cached, true, 'token 缓存');
  console.log('✓ getTenantAccessToken cached =', again.cached);

  // 未配置路径（fresh module instance）
  delete process.env.FEISHU_APP_ID;
  delete process.env.FEISHU_APP_SECRET;
  const bare = await import('../feishu.js?nc=' + Date.now());
  const p2 = await bare.probeStatus();
  assert.strictEqual(p2.status, 'not-configured', '未配置 -> not-configured');
  console.log('✓ 未配置时 probeStatus ->', p2.status);

  console.log('\n全部断言通过。请求序列：');
  seen.forEach(s => console.log('  ', s));
} catch (e) {
  console.error('✗ 测试失败:', e.message);
  process.exitCode = 1;
} finally {
  server.close();
}
