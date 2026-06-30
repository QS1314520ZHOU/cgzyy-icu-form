// ★ 探针：在所有逻辑之前注册，捕获所有 postMessage
window.addEventListener('message', function probeHandler(e) {
  try {
    var d = e.data;
    var type = d && typeof d === 'object' ? d.type : typeof d;
    var hasAccount = !!(d && d.account);
    var hasPatient = !!(d && d.patient);
    var payloadHasAccount = !!(d && d.payload && d.payload.account);
    var payloadHasPatient = !!(d && d.payload && d.payload.patient);
    console.log('[probe-print] origin=' + e.origin + ' type=' + type +
      ' hasAccount=' + hasAccount + ' hasPatient=' + hasPatient +
      ' payloadHasAccount=' + payloadHasAccount + ' payloadHasPatient=' + payloadHasPatient,
      'data=', d);
  } catch (err) {
    console.log('[probe-print] origin=' + e.origin + ' parseError=' + err.message);
  }
}, false);

// ── DOM 元素 ──────────────────────────────────────────────
const els = {
  pageTitle: document.getElementById('pageTitle'),
  pageDesc: document.getElementById('pageDesc'),
  messageState: document.getElementById('messageState'),
  rawMessage: document.getElementById('rawMessage'),
  updatedAt: document.getElementById('updatedAt'),
  emptyState: document.getElementById('emptyState'),
  contentArea: document.getElementById('contentArea'),
  fieldBody: document.getElementById('fieldBody'),
  jsonContent: document.getElementById('jsonContent'),
  btnClear: document.getElementById('btnClear'),
  logContent: document.getElementById('logContent'),
  btnClearLog: document.getElementById('btnClearLog'),
};

// ── 常量 ──────────────────────────────────────────────────
const STORAGE_KEY = 'ICU_PRINT_DATA';
const STORAGE_TIME_KEY = 'ICU_PRINT_DATA_UPDATED_AT';
const DEFAULT_TITLE = '数据预览';
const DEFAULT_DESC = '等待宿主通过 postMessage 发送数据。';

// ── 状态 ──────────────────────────────────────────────────
let currentPatientKey = '';
let isPlaceholder = false;

// ── 初始化 ────────────────────────────────────────────────
bindEvents();
init();

function bindEvents() {
  els.btnClear.addEventListener('click', clearAllData);
  els.btnClearLog.addEventListener('click', clearLog);

  // ★ 监听常驻：初始化即注册，全程保留
  window.addEventListener('message', handleMessage);

  // 页面卸载时清缓存
  window.addEventListener('pagehide', clearStorageOnly);
  window.addEventListener('beforeunload', clearStorageOnly);

  // 可见性变化时请求数据
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      addLog('[触发] visibilitychange → visible', 'info');
      requestData('visibilitychange');
    }
  });

  // pageshow 事件
  window.addEventListener('pageshow', event => {
    addLog(`[触发] pageshow, persisted=${event.persisted}`, 'info');
    requestData('pageshow');
  });

  // window focus 事件
  window.addEventListener('focus', () => {
    addLog('[触发] window focus', 'info');
    requestData('focus');
  });
}

function init() {
  resetView();
  restoreFromStorage();
  addLog('[初始化] 页面加载', 'info');
  requestData('init');
}

// ── 核心消息处理：无条件消费 ─────────────────────────────
function handleMessage(event) {
  try {
    // ★ 忽略自己发出的消息（避免自循环）
    if (event.source === window) {
      return;
    }

    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // ★ 忽略请求类消息（避免自循环）
    if (data.type === 'REQUEST_HOST_DATA' || data.type === 'HOST_PAGE_READY' || data.type === 'PRINT_PAGE_REQUEST_DATA') {
      return;
    }

    // ★ 从 event.data 顶层取 type/account/patient/token
    const type = data.type;
    const account = data.account || (data.payload && data.payload.account);
    const patient = data.patient || (data.payload && data.payload.patient);
    const token = data.token || (data.payload && data.payload.token);

    // ★ "无病人"消息处理
    if (type === 'SmartCare' && !patient) {
      addLog('[收到] SmartCare 消息，但无 patient 数据，请选中病人', 'warning');
      setState('请选中病人', 'error');
      return;
    }

    // ★ 只处理有 patient 的 SmartCare 消息
    if (type === 'SmartCare' && patient) {
      const patientKey = getPatientKey(patient);
      addLog(`[收到] SmartCare 消息, patientKey=${patientKey}`, 'success');

      // 无条件重渲
      processData({ account, patient, token });
      return;
    }

    // 其他消息记录但不处理
    addLog(`[收到] 非 SmartCare 消息: type=${type}`, 'info');

  } catch (error) {
    addLog(`[错误] 消息处理失败: ${error.message}`, 'error');
  }
}

// ── 数据处理：无条件消费 ─────────────────────────────────
function processData(data) {
  const patientKey = getPatientKey(data.patient);

  addLog(`[处理] patientKey=${patientKey}, currentKey=${currentPatientKey || '(空)'}, isPlaceholder=${isPlaceholder}`, 'info');

  // ★ 唯一键变化：强制刷新
  if (patientKey && currentPatientKey && patientKey !== currentPatientKey) {
    addLog(`[切换] 患者切换: ${currentPatientKey} → ${patientKey}`, 'warning');
  }

  // ★ 无条件更新状态
  currentPatientKey = patientKey;
  isPlaceholder = false;

  // 持久化
  persistPayload(data);

  // 无条件重渲
  renderPayload(data);
}

// ── 患者唯一键 ────────────────────────────────────────────
function getPatientKey(payload) {
  const p = payload?.patient;
  if (!p) return '';
  return String(p.id || p.mrn || p.hisPid || '');
}

// ── 渲染 ──────────────────────────────────────────────────
function renderPayload(payload) {
  const patientKey = getPatientKey(payload);
  els.pageTitle.textContent = DEFAULT_TITLE;
  els.pageDesc.textContent = `已收到宿主数据 [患者: ${patientKey || '-'}]`;
  els.updatedAt.textContent = `更新时间：${formatDateTime(new Date())}`;
  els.jsonContent.textContent = safeStringify(payload);
  setState('已接收消息', 'ready');

  renderFields(payload);

  els.emptyState.classList.add('hidden');
  els.contentArea.classList.remove('hidden');

  addLog(`[渲染] 完成, patientKey=${patientKey || '(空)'}`, 'success');
}

// 通用字段渲染
function renderFields(payload) {
  const account = payload.account || {};
  const patient = payload.patient || {};
  const rows = [];

  Object.keys(account).forEach(key => {
    rows.push([`account.${key}`, account[key]]);
  });

  Object.keys(patient).forEach(key => {
    rows.push([`patient.${key}`, patient[key]]);
  });

  Object.keys(payload).forEach(key => {
    if (key !== 'account' && key !== 'patient') {
      rows.push([key, payload[key]]);
    }
  });

  els.fieldBody.innerHTML = rows.map(([key, value]) => `
    <tr>
      <td>${escapeHtml(key)}</td>
      <td>${escapeHtml(formatValue(value))}</td>
    </tr>
  `).join('');
}

// ── 请求数据（向上发给宿主）──────────────────────────────
function requestData(reason) {
  addLog(`[请求] 向宿主请求数据, reason=${reason}`, 'info');
  try {
    // ★ 目标 = window.parent（若与 self 相同则用 window.top）
    const target = window.parent !== window ? window.parent : (window.top !== window ? window.top : null);
    if (target) {
      // ★ 类型恢复为宿主约定的 REQUEST_HOST_DATA，禁止用 PRINT_PAGE_REQUEST_DATA
      // ★ targetOrigin 用具体域名，不用 '*'
      target.postMessage({ type: 'REQUEST_HOST_DATA', payload: { reason } }, 'http://10.35.4.10:60000');
    }
  } catch (e) {
    addLog(`[错误] 请求失败: ${e.message}`, 'error');
  }
}

// ── 缓存（只作占位）──────────────────────────────────────
function persistPayload(payload) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    sessionStorage.setItem(STORAGE_TIME_KEY, String(Date.now()));
  } catch {
    void 0;
  }
}

function restoreFromStorage() {
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    const cachedTime = Number(sessionStorage.getItem(STORAGE_TIME_KEY) || 0);
    if (!cached) {
      addLog('[缓存] 无缓存数据', 'info');
      return;
    }

    const payload = JSON.parse(cached);
    const patientKey = getPatientKey(payload);
    currentPatientKey = patientKey;
    isPlaceholder = true; // 标记为占位

    renderPayload(payload);

    if (cachedTime) {
      els.updatedAt.textContent = `更新时间：${formatDateTime(new Date(cachedTime))}（缓存占位）`;
    }
    setState('已从缓存恢复（等待最新数据）', 'ready');
    addLog(`[缓存] 已恢复, patientKey=${patientKey}, 标记为占位`, 'warning');
  } catch {
    void 0;
  }
}

function hasStoredPayload() {
  try {
    return Boolean(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

function clearStorageOnly() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_TIME_KEY);
  } catch {
    void 0;
  }
}

function clearAllData() {
  clearStorageOnly();
  currentPatientKey = '';
  isPlaceholder = false;
  resetView();
  addLog('[清除] 数据已清空，回到等待态', 'warning');
}

// ── 视图重置 ──────────────────────────────────────────────
function resetView() {
  els.pageTitle.textContent = DEFAULT_TITLE;
  els.pageDesc.textContent = DEFAULT_DESC;
  els.updatedAt.textContent = '';
  els.jsonContent.textContent = '{}';
  els.fieldBody.innerHTML = '';
  els.emptyState.classList.remove('hidden');
  els.contentArea.classList.add('hidden');
  setState('等待消息');
}

// ── 状态指示 ──────────────────────────────────────────────
function setState(text, type = '') {
  els.messageState.textContent = text;
  els.messageState.classList.remove('ready', 'error');
  if (type) els.messageState.classList.add(type);
}

// ── 通信日志 ──────────────────────────────────────────────
function addLog(message, type = 'info') {
  if (!els.logContent) return;
  const time = formatTime(new Date());
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-time">[${time}]</span> ${escapeHtml(message)}`;
  els.logContent.appendChild(entry);
  els.logContent.scrollTop = els.logContent.scrollHeight;
}

function clearLog() {
  if (!els.logContent) return;
  els.logContent.innerHTML = '';
  addLog('日志已清空', 'info');
}

// ── 工具函数 ──────────────────────────────────────────────
function formatValue(value) {
  if (value == null) return '-';
  if (typeof value === 'object') return safeStringify(value);
  return String(value);
}

function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
