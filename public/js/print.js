const els = {
  pageTitle: document.getElementById('pageTitle'),
  pageDesc: document.getElementById('pageDesc'),
  messageState: document.getElementById('messageState'),
  rawMessage: document.getElementById('rawMessage'),
  updatedAt: document.getElementById('updatedAt'),
  emptyState: document.getElementById('emptyState'),
  contentArea: document.getElementById('contentArea'),
  summarySection: document.getElementById('summarySection'),
  fieldBody: document.getElementById('fieldBody'),
  jsonContent: document.getElementById('jsonContent'),
  btnSample: document.getElementById('btnSample'),
  btnClear: document.getElementById('btnClear'),
  btnPrint: document.getElementById('btnPrint'),
};

const STORAGE_KEY = 'ICU_PRINT_DATA';
const STORAGE_TIME_KEY = 'ICU_PRINT_DATA_UPDATED_AT';
const REQUEST_EVENT = 'PRINT_PAGE_REQUEST_DATA';
const READY_EVENT = 'PRINT_PAGE_READY';
const RECEIVED_EVENT = 'PRINT_DATA_RECEIVED';
const DEFAULT_TITLE = '打印数据预览';
const DEFAULT_DESC = '等待父页面通过 postMessage 发送打印数据。';

const sampleData = {
  type: 'SmartCare',
  account: {
    id: '6a323a1b9901235b28fcb5c1',
    username: 'admin',
    trueName: '工程师',
    departmentCode: '125011',
  },
  patient: {
    dept: '重症医学科',
    deptCode: '125011',
    hisBed: '10床',
    hisPid: '0000909733',
    id: '6a30b9c417e2ec06e618d50b',
    mrn: '0126060008',
    name: '张丹',
    clinicalDiagnosis: null,
  },
};

let lastMessageSignature = '';

bindEvents();
init();

function bindEvents() {
  els.btnPrint.addEventListener('click', () => window.print());
  els.btnClear.addEventListener('click', clearAllData);
  els.btnSample.addEventListener('click', () => {
    receiveMessage({
      type: 'PRINT_DATA',
      payload: sampleData,
    });
  });

  window.addEventListener('message', event => {
    try {
      const { type, payload } = event.data || {};

      // 处理父页面响应的数据
      if (type === 'RESPONSE_DATA' || type === 'PRINT_DATA') {
        receiveMessage(event.data);
        notifyParent(RECEIVED_EVENT, { ok: true });
        return;
      }

      // 处理清除数据消息
      if (type === 'CLEAR_DATA') {
        clearAllData();
        notifyParent(RECEIVED_EVENT, { ok: true, action: 'cleared' });
        return;
      }

      // 其他消息
      receiveMessage(event.data);
      notifyParent(RECEIVED_EVENT, { ok: true });
    } catch (error) {
      setState(`消息解析失败: ${error.message}`, 'error');
      els.rawMessage.textContent = safeStringify(event.data);
      notifyParent(RECEIVED_EVENT, { ok: false, error: error.message });
    }
  });

  window.addEventListener('pagehide', clearStorageOnly);
  window.addEventListener('beforeunload', clearStorageOnly);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !hasStoredPayload()) {
      requestDataFromParent();
    }
  });
}

function init() {
  resetView();
  restoreFromStorage();
  notifyParent(READY_EVENT, { ok: true });
  requestDataFromParent();
}

function receiveMessage(message) {
  const payload = normalizePayload(message);
  const signature = safeStringify(payload);
  if (signature === lastMessageSignature) return;
  lastMessageSignature = signature;
  persistPayload(payload);
  renderPayload(payload, message);
}

function renderPayload(payload, rawMessage) {
  const printData = buildPrintData(payload);
  const summaryItems = [
    { label: '科室', value: printData.dept || '-' },
    { label: '床位', value: printData.hisBed || '-' },
    { label: '患者姓名', value: printData.name || '-' },
    { label: '住院号', value: printData.mrn || '-' },
  ];

  els.pageTitle.textContent = DEFAULT_TITLE;
  els.pageDesc.textContent = '已收到父页面发送的打印数据。';
  els.updatedAt.textContent = `更新时间：${formatDateTime(new Date())}`;
  els.rawMessage.textContent = safeStringify(rawMessage);
  els.jsonContent.textContent = safeStringify(payload);
  setState('已接收消息', 'ready');

  renderSummary(summaryItems);
  renderFields(printData);

  els.emptyState.classList.add('hidden');
  els.contentArea.classList.remove('hidden');
}

function buildPrintData(payload) {
  const account = payload.account || {};
  const patient = payload.patient || {};

  return {
    accountId: account.id ?? '',
    username: account.username ?? '',
    trueName: decodeText(account.trueName),
    departmentCode: account.departmentCode ?? '',
    dept: decodeText(patient.dept),
    deptCode: patient.deptCode ?? '',
    hisBed: decodeText(patient.hisBed),
    hisPid: patient.hisPid ?? '',
    patientId: patient.id ?? '',
    mrn: patient.mrn ?? '',
    name: decodeText(patient.name),
    clinicalDiagnosis: decodeText(patient.clinicalDiagnosis),
  };
}

function renderSummary(items) {
  els.summarySection.innerHTML = items.map(item => `
    <article class="summary-card">
      <div class="summary-label">${escapeHtml(item.label)}</div>
      <div class="summary-value">${escapeHtml(item.value)}</div>
    </article>
  `).join('');
}

function renderFields(printData) {
  const rows = [
    ['accountId', printData.accountId],
    ['username', printData.username],
    ['trueName', printData.trueName],
    ['departmentCode', printData.departmentCode],
    ['dept', printData.dept],
    ['deptCode', printData.deptCode],
    ['hisBed', printData.hisBed],
    ['hisPid', printData.hisPid],
    ['patientId', printData.patientId],
    ['mrn', printData.mrn],
    ['name', printData.name],
    ['clinicalDiagnosis', printData.clinicalDiagnosis],
  ];

  els.fieldBody.innerHTML = rows.map(([key, value]) => `
    <tr>
      <td>${escapeHtml(key)}</td>
      <td>${escapeHtml(formatValue(value))}</td>
    </tr>
  `).join('');
}

function normalizePayload(message) {
  if (message == null) {
    throw new Error('消息为空');
  }

  if (typeof message === 'string') {
    try {
      return JSON.parse(message);
    } catch {
      return { content: message };
    }
  }

  if (typeof message !== 'object') {
    return { content: message };
  }

  if (message.type === 'PRINT_DATA') {
    return message.payload || {};
  }

  if (isPlainObject(message.payload)) {
    return message.payload;
  }

  return message;
}

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
    if (!cached) return;

    const payload = JSON.parse(cached);
    lastMessageSignature = safeStringify(payload);
    renderPayload(payload, payload);

    if (cachedTime) {
      els.updatedAt.textContent = `更新时间：${formatDateTime(new Date(cachedTime))}`;
    }
    setState('已从临时缓存恢复数据', 'ready');
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
  lastMessageSignature = '';
  resetView();
  notifyParent(REQUEST_EVENT, { reason: 'cleared' });
}

function requestDataFromParent() {
  // 请求父页面提供通用数据
  notifyParent(REQUEST_EVENT, {
    reason: 'init',
    requiredFields: [
      'account.id',
      'account.username',
      'account.trueName',
      'account.departmentCode',
      'patient.dept',
      'patient.deptCode',
      'patient.hisBed',
      'patient.hisPid',
      'patient.id',
      'patient.mrn',
      'patient.name',
      'patient.clinicalDiagnosis'
    ]
  });
}

function resetView() {
  els.pageTitle.textContent = DEFAULT_TITLE;
  els.pageDesc.textContent = DEFAULT_DESC;
  els.updatedAt.textContent = '';
  els.rawMessage.textContent = '暂无消息';
  els.jsonContent.textContent = '{}';
  els.summarySection.innerHTML = '';
  els.fieldBody.innerHTML = '';
  els.emptyState.classList.remove('hidden');
  els.contentArea.classList.add('hidden');
  setState('等待消息');
}

function setState(text, type = '') {
  els.messageState.textContent = text;
  els.messageState.classList.remove('ready', 'error');
  if (type) els.messageState.classList.add(type);
}

function notifyParent(type, payload) {
  if (window.parent === window) return;
  window.parent.postMessage({ type, payload }, '*');
}

function decodeText(value) {
  if (value == null) return null;
  return String(value)
    .replace(/宸ョ▼甯?/, '工程师')
    .replace(/閲嶇棁鍖诲绉?/, '重症医学科')
    .replace(/10搴?/, '10床')
    .replace(/寮犱腹/, '张丹');
}

function formatValue(value) {
  if (value == null || value === '') return 'null';
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
