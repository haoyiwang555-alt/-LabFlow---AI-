/* 晶流 LabFlow · 飞书开放平台集成层（零第三方依赖，Node >= 20 global fetch）
 *
 * 边界（诚实状态，绝不伪造连接）：
 *  - 未配置 FEISHU_APP_ID / FEISHU_APP_SECRET → 所有能力返回 { ok:false, status:'not-configured' }
 *  - 配置错误 / 网络失败 → { ok:false, status:'error', detail }
 *  - 只有真实换取 tenant_access_token 成功才返回 connected
 *
 * 能力：
 *  - getTenantAccessToken()   企业自建应用 token（自动缓存 ~2h，401 自动刷新）
 *  - probeStatus()            /api/infra/status 的 feishu 项
 *  - getMinute(minuteToken)   妙记信息（会议转写）
 *  - getMinuteTranscriptText() 提取转写纯文本（结构自适应）
 *  - listBitableRecords()     多维表格读
 *  - createBitableRecord()    多维表格写（知识/实验台账落点）
 *  - sendTextMessage()        消息推送（群/单聊）
 *
 * FEISHU_BASE_URL 仅用于测试注入（默认 https://open.feishu.cn）。
 */

const FEISHU_BASE = process.env.FEISHU_BASE_URL || 'https://open.feishu.cn';
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';

const REQUEST_TIMEOUT_MS = 8000;

let tokenCache = null; // { token, expiresAt }

export function isConfigured() {
  return Boolean(FEISHU_APP_ID && FEISHU_APP_SECRET);
}

async function request(path, { method = 'GET', query = '', body = null, token = '' } = {}) {
  const url = `${FEISHU_BASE}${path}${query ? (path.includes('?') ? '&' : '?') + query : ''}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.code !== 0) {
      const err = payload && (payload.msg || payload.message) ? `${payload.code || response.status} ${payload.msg || payload.message}` : `HTTP ${response.status}`;
      return { ok: false, status: 'error', code: payload?.code ?? response.status, detail: err, payload };
    }
    return { ok: true, status: 'connected', payload };
  } catch (error) {
    const detail = error.name === 'AbortError' ? `请求超时（${REQUEST_TIMEOUT_MS}ms）` : (error.message || '网络错误');
    return { ok: false, status: 'error', detail };
  } finally {
    clearTimeout(timer);
  }
}

/** 企业自建应用 token：POST /open-apis/auth/v3/tenant_access_token/internal */
export async function getTenantAccessToken({ force = false } = {}) {
  if (!isConfigured()) return { ok: false, status: 'not-configured', detail: '未配置 FEISHU_APP_ID / FEISHU_APP_SECRET' };
  if (!force && tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return { ok: true, status: 'connected', token: tokenCache.token, cached: true };
  }
  const res = await request('/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    body: { app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET },
  });
  if (!res.ok) return res;
  const token = res.payload.tenant_access_token;
  const expire = Number(res.payload.expire || 7200);
  tokenCache = { token, expiresAt: Date.now() + expire * 1000 };
  return { ok: true, status: 'connected', token, cached: false };
}

async function authedRequest(path, options = {}) {
  if (!isConfigured()) return { ok: false, status: 'not-configured', detail: '未配置 FEISHU_APP_ID / FEISHU_APP_SECRET' };
  let auth = await getTenantAccessToken();
  if (!auth.ok) return auth;
  let res = await request(path, { ...options, token: auth.token });
  if (!res.ok && (res.code === 99991663 || res.code === 99991664 || /token|auth/i.test(res.detail || ''))) {
    // token 过期/失效：强制刷新后重试一次
    auth = await getTenantAccessToken({ force: true });
    if (!auth.ok) return auth;
    res = await request(path, { ...options, token: auth.token });
  }
  return res;
}

/** 探测飞书连通状态（供 /api/infra/status 使用） */
export async function probeStatus() {
  const started = Date.now();
  if (!isConfigured()) {
    return { status: 'not-configured', detail: '未配置 FEISHU_APP_ID / FEISHU_APP_SECRET，未接入真实飞书', latencyMs: 0, mode: 'feishu-api' };
  }
  const auth = await getTenantAccessToken();
  return {
    status: auth.ok ? 'connected' : 'error',
    detail: auth.ok ? '飞书 tenant_access_token 获取成功（企业自建应用）' : auth.detail,
    latencyMs: Date.now() - started,
    mode: 'feishu-api',
  };
}

/** 妙记信息：GET /open-apis/minutes/v1/minutes/:minute_token */
export async function getMinute(minuteToken) {
  return authedRequest(`/open-apis/minutes/v1/minutes/${encodeURIComponent(minuteToken)}`);
}

/** 从妙记响应中提取转写纯文本（结构自适应：speech 字符串 / speech.paragraphs 数组 / 兜底原始 JSON） */
export function extractTranscriptText(payload) {
  if (!payload || !payload.data || !payload.data.minute) return '';
  const minute = payload.data.minute;
  const speech = minute.speech;
  if (typeof speech === 'string') return speech;
  if (speech && Array.isArray(speech.paragraphs)) {
    return speech.paragraphs
      .map(p => {
        const sentences = Array.isArray(p.sentences) ? p.sentences.map(s => s.text || '').join('') : (p.text || '');
        return `${p.speaker ? p.speaker + '：' : ''}${sentences}`;
      })
      .filter(Boolean)
      .join('\n');
  }
  if (minute.summary) return String(minute.summary);
  return '';
}

/** 会议转写纯文本（供 AI 解析） */
export async function getMinuteTranscriptText(minuteToken) {
  const res = await getMinute(minuteToken);
  if (!res.ok) return { ...res, text: '' };
  const text = extractTranscriptText(res.payload);
  if (!text) return { ok: false, status: 'error', detail: '妙记返回成功但未提取到转写文本', text: '' };
  return { ok: true, status: 'connected', text, minuteToken };
}

/** 多维表格读：GET /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records */
export async function listBitableRecords(appToken, tableId, pageSize = 20) {
  return authedRequest(`/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records`, {
    query: `page_size=${pageSize}`,
  });
}

/** 多维表格写：POST /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records */
export async function createBitableRecord(appToken, tableId, fields) {
  return authedRequest(`/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records`, {
    method: 'POST',
    body: { fields },
  });
}

/** 消息推送：POST /open-apis/im/v1/messages?receive_id_type=chat_id|open_id|user_id */
export async function sendTextMessage(receiveId, text, receiveIdType = 'chat_id') {
  return authedRequest(`/open-apis/im/v1/messages`, {
    method: 'POST',
    query: `receive_id_type=${receiveIdType}`,
    body: { receive_id: receiveId, msg_type: 'text', content: JSON.stringify({ text }) },
  });
}

export default { isConfigured, probeStatus, getTenantAccessToken, getMinute, getMinuteTranscriptText, listBitableRecords, createBitableRecord, sendTextMessage, extractTranscriptText };
