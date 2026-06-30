# ICU 数据展示页 - 对接说明

## 概述

本项目用于嵌入医院 SmartCare 系统，通过 postMessage 接收患者/账号数据并展示。

```
SmartCare 宿主 (外层)
  └── parent.html (本项目，嵌入页面)
        └── print.html (内层 iframe，数据预览)
```

## 版本说明

本项目提供两个版本：

### 1. 原生 JS 版本（当前）

```
public/
├── parent.html        # 嵌入 SmartCare 的主页面（接收外层数据 + 转发内层）
├── print.html         # 内层数据预览 iframe
├── js/
│   └── print.js       # 内层通信逻辑
└── css/
    └── print.css      # 样式
```

### 2. Angular 版本（推荐）

```
angular-app/
├── src/
│   ├── app/
│   │   ├── components/           # 组件
│   │   ├── services/             # 服务
│   │   ├── models/               # 数据模型
│   │   └── app.module.ts         # 根模块
│   ├── assets/css/print.css      # 样式
│   └── index.html                # 入口
├── angular.json                  # Angular 配置
└── package.json                  # 依赖
```

**Angular 版本优势**：
- 组件化架构，易于维护
- TypeScript 类型安全
- RxJS 响应式状态管理
- 依赖注入，便于测试
- 更好的代码组织

详见 [angular-app/README.md](angular-app/README.md)

## 通信协议

### 外层 SmartCare ⇄ parent.html

#### parent.html → SmartCare

| type | 说明 | 数据 |
|------|------|------|
| `HOST_PAGE_READY` | 页面就绪 | `{ ok: true }` |
| `REQUEST_HOST_DATA` | 请求数据 | `{ reason: 'init'/'visibilitychange'/'focus'/'pageshow' }` |
| `HOST_DATA_RECEIVED` | 接收确认（可选） | `{ ok: true }` |

#### SmartCare → parent.html

**主形态（推荐）**：event.data 直接是 SmartCare 对象

```javascript
{
  type: 'SmartCare',
  account: { id, username, trueName, profession, departmentCode, signPicID, signPicType, permissionDtoList: [...] },
  patient: { /* 上百个字段 */ },
  token: 'xxxx-ip-admin'
}
```

**兼容形态**：包在 payload 里

```javascript
{ type: 'HOST_DATA', payload: { type: 'SmartCare', account: {...}, patient: {...}, token: '...' } }
{ type: 'PRINT_DATA', payload: { type: 'SmartCare', account: {...}, patient: {...}, token: '...' } }
```

### parent.html → 内层 print iframe

| type | 说明 |
|------|------|
| `PRINT_DATA` | 转发数据 |
| `CLEAR_DATA` | 清除数据 |

内层协议保持不变，向后兼容。

## 数据格式

```javascript
{
  type: 'SmartCare',
  account: {
    id: '账号ID',
    username: '用户名',
    trueName: '真实姓名',
    profession: '职业',
    departmentCode: '科室编码',
    signPicID: '签名图片ID',
    signPicType: '签名图片类型',
    permissionDtoList: []  // 权限列表
    // ... 可扩展任意字段
  },
  patient: {
    // 关键字段（置顶展示）
    name: '患者姓名',
    gender: 'Female/Male',
    age: 30,
    hisBed: '10床',
    mrn: '住院号',
    hisPid: '住院流水号',
    dept: '科室',
    status: 'admitted/discharged',
    clinicalDiagnosis: '临床诊断',
    icuAdmissionTime: 1234567890123,  // epoch 毫秒
    bedDoctorId: '管床医生ID',
    insuranceType: '费别',

    // 其他字段（上百个）
    deptCode: '科室编码',
    showBed: '显示床位',
    id: '患者记录ID',
    childAge: '儿童年龄',
    admissionAge: '入院年龄',
    admissionDiagnosis: '入科诊断',
    bedDoctor: '管床医生',
    treatedDoctor: '主治医生',
    doctorQuality: {...},  // 嵌套对象
    permissionDtoList: [], // 数组
    admissionTime: 1234567890123,
    bedTime: 1234567890123,
    birthday: 1234567890123,
    // ... 大量字段，含 null
  },
  token: 'xxxx-ip-admin'  // 登录凭证，敏感
}
```

---

## 🔍 诊断工具：探针监听器

### 用途

确认 SmartCare 是否在切换患者时向 iframe 广播 postMessage。

### 使用方法

1. 打开浏览器开发者工具（F12）→ Console 面板
2. 访问 `http://localhost:3000/parent`
3. 在 SmartCare 中操作：登录选患者 A → 切换到患者 B
4. 观察控制台输出：

```
[probe-parent] origin=https://smartcare.xxx type=SmartCare hasAccount=true hasPatient=true ...
[probe-print] origin=https://smartcare.xxx type=SmartCare hasAccount=true hasPatient=true ...
```

### 判定标准

| 控制台输出 | 说明 | 下一步 |
|------------|------|--------|
| 切换时有新的 `[probe]` 打印 | SmartCare 确实广播了 | 检查 type 是否在 ACCEPTED_TYPES 中 |
| 切换时没有任何 `[probe]` 打印 | SmartCare 没有广播 | 需要 SmartCare 端实现广播 |
| 有 `[probe]` 但 origin 不匹配 | 被 origin 白名单拦截 | 将 SmartCare 域名加入 ORIGIN_WHITELIST |
| 有 `[probe]` 但 type 未识别 | 类型不在 ACCEPTED_TYPES | 将 SmartCare 的 type 加入 ACCEPTED_TYPES |

---

## ⚙️ 配置项

### ACCEPTED_TYPES（接受的消息类型）

在 parent.html 和 print.js 顶部配置，用于识别 SmartCare 广播的消息类型：

```javascript
const ACCEPTED_TYPES = [
  'SmartCare',        // 主形态
  'HOST_DATA',        // 兼容形态
  'PRINT_DATA',       // 兼容形态
  'RESPONSE_DATA',    // 兼容形态
  'patientChanged',   // 如果 SmartCare 使用此 type
  'PATIENT_SWITCH',   // 如果 SmartCare 使用此 type
  'PATIENT_CHANGED',  // 如果 SmartCare 使用此 type
  'patientSwitch',    // 如果 SmartCare 使用此 type
  // 在此添加 SmartCare 实际使用的 type 名
];
```

**如何确定 SmartCare 使用的 type**：
1. 打开控制台，查看 `[probe]` 输出中的 `type=` 字段
2. 将该 type 添加到 `ACCEPTED_TYPES` 数组

### ORIGIN_WHITELIST（origin 白名单）

在 parent.html 顶部配置：

```javascript
const ORIGIN_WHITELIST = [
  location.origin,
  // 'https://smartcare.hospital.com',  // 添加生产域名
];
```

**如何确定 SmartCare 的 origin**：
1. 打开控制台，查看 `[probe]` 输出中的 `origin=` 字段
2. 或查看 `[安全] 来源校验失败` 日志中的 origin

---

## ⚠️ 宿主端必须配合（SmartCare 侧）

### 问题背景

嵌入端已实现以下兜底机制：
- 探针监听器：捕获所有 postMessage，便于诊断
- `visibilitychange` / `focus` / `pageshow` 事件触发时，强制向外层请求数据
- 缓存仅作为首屏占位，收到新数据无条件覆盖
- 患者唯一键变化时强制刷新，绕过内容去重
- 类型识别放宽：支持多种 type，兜底识别 account+patient 结构

**但这些兜底机制的前提是：宿主端必须响应 iframe 的数据请求。**

### 宿主端必须实现的 3 个行为

#### 1. 切换患者时主动推送

```javascript
// SmartCare：用户在「在线病人」切换患者时
function onPatientSwitch(patientId) {
  const currentData = getPatientDataById(patientId);
  const iframe = document.getElementById('icuFrame');

  iframe.contentWindow.postMessage({
    type: 'SmartCare',
    account: getCurrentAccount(),
    patient: currentData,  // ★ 必须是当前选中患者，不是登录时缓存的
    token: getToken()
  }, '*');
}
```

#### 2. 响应 iframe 的数据请求

```javascript
// SmartCare：监听 iframe 消息
window.addEventListener('message', (event) => {
  const iframe = document.getElementById('icuFrame');
  if (event.source !== iframe.contentWindow) return;

  const { type, payload } = event.data;

  if (type === 'HOST_PAGE_READY' || type === 'REQUEST_HOST_DATA') {
    // ★ 必须响应，且回传当前选中患者（不是登录时缓存的）
    sendCurrentPatientData();
  }
});
```

#### 3. 刷新按钮触发重推

```javascript
// SmartCare：刷新按钮不应只刷新 iframe，还应重推当前患者数据
function onRefreshClick() {
  const iframe = document.getElementById('icuFrame');
  iframe.src = iframe.src;

  setTimeout(() => {
    sendCurrentPatientData();
  }, 500);
}
```

### 常见错误

| 错误做法 | 正确做法 |
|----------|----------|
| 只在登录时推送一次患者数据 | 每次切换患者都推送 |
| 响应请求时回传登录时缓存的患者 | 回传当前选中的患者 |
| 刷新按钮只刷新 iframe 不重推数据 | 刷新后重推当前患者 |
| postMessage 用 `'*'` 作为 targetOrigin | 用具体域名 |

---

## 患者切换机制

### 嵌入端实现

以 `patient.id || patient.mrn || patient.hisPid` 作为患者唯一键。

收到外层数据时：
1. **唯一键变化** → 清旧渲染与缓存 → 渲染新患者 → 转发内层 → 日志记录切换
2. **唯一键相同** → 内容签名去重 → 局部更新
3. **占位缓存** → 收到任何有效数据都无条件覆盖

### 兜底触发时机

嵌入端在以下时机强制向外层请求数据（即使有缓存）：

| 事件 | 说明 |
|------|------|
| `init` | 页面首次加载 |
| `visibilitychange` | 页面从后台切到前台 |
| `focus` | 窗口获得焦点 |
| `pageshow` | 页面从前进/后退缓存恢复 |

**关键**：这些请求都会去掉缓存门槛，但前提是宿主端必须响应。

### 宿主端职责

1. **切换患者时主动推送**（推荐，秒级更新）
2. **响应 iframe 的数据请求**（兜底，宿主必须实现）
3. **刷新按钮重推当前患者**（避免重推旧数据）

---

## 页面 UI

### 1. 连接状态

- `等待外层数据` — 初始状态
- `已获取数据` — 成功收到数据
- `已从缓存恢复（等待最新数据）` — 缓存占位，等待宿主最新数据
- `来源校验失败` — origin 不在白名单

### 2. 患者关键信息（置顶）

大字卡片展示：患者姓名、性别、年龄、床位、住院号、科室、状态、诊断、ICU入科时间、管床医生、费别

- 性别：Female→女，Male→男
- 状态：admitted→在科，discharged→出科
- 时间戳：epoch 毫秒 → yyyy-MM-dd HH:mm:ss（Asia/Shanghai）
- 缺失字段显示 "-"

### 3. 通信日志

带时间戳记录所有关键事件：
- `[初始化]` 页面加载
- `[触发]` visibilitychange / focus / pageshow
- `[请求]` 向外层请求数据
- `[收到]` 外层数据
- `[解析]` patientKey 解析
- `[切换]` 患者切换
- `[覆盖]` 占位缓存被覆盖
- `[去重]` 重复数据跳过
- `[转发]` 转发给内层 iframe
- `[缓存]` 缓存恢复
- `[安全]` origin 校验失败（console.warn 也会输出）
- `[未识别]` 消息未匹配任何类型
- `[错误]` 解析失败

### 4. 数据输出

- 账号信息表
- 患者完整信息表（全部字段）
- 原始 JSON（可折叠，token 脱敏）

### 5. 内层 iframe

嵌入 print.html，自动同步数据。

---

## 安全

- **origin 校验**：`ORIGIN_WHITELIST` 白名单，生产环境配置具体域名
- **token 脱敏**：日志和 JSON 展示中 token 前4后4打码
- **不打印明文**：控制台/日志均不输出 token 明文
- **origin 失败 warn**：不仅记日志，还 console.warn 确保控制台可见

---

## 部署

### 1. 配置 origin 白名单

编辑 parent.html 中的 `ORIGIN_WHITELIST`：

```javascript
const ORIGIN_WHITELIST = [
  location.origin,
  'https://smartcare.hospital.com',  // 添加生产域名
];
```

### 2. 配置接受类型

编辑 parent.html 和 print.js 中的 `ACCEPTED_TYPES`：

```javascript
const ACCEPTED_TYPES = [
  'SmartCare',
  // 添加 SmartCare 实际使用的 type 名
];
```

### 3. 嵌入 SmartCare

```html
<iframe src="https://your-server/parent" width="100%" height="800"></iframe>
```

### 4. SmartCare 端实现

```javascript
// 监听嵌入页消息
window.addEventListener('message', (event) => {
  const iframe = document.getElementById('icuFrame');
  if (event.source !== iframe.contentWindow) return;

  const { type, payload } = event.data;

  switch (type) {
    case 'HOST_PAGE_READY':
      sendCurrentPatientData();
      break;

    case 'REQUEST_HOST_DATA':
      sendCurrentPatientData();
      break;

    case 'HOST_DATA_RECEIVED':
      console.log('数据接收:', payload.ok ? '成功' : '失败');
      break;
  }
});

// 发送当前选中患者数据
function sendCurrentPatientData() {
  const iframe = document.getElementById('icuFrame');
  iframe.contentWindow.postMessage({
    type: 'SmartCare',
    account: getCurrentAccount(),
    patient: getCurrentSelectedPatient(),
    token: getToken()
  }, '*');
}

// 切换患者时主动推送
function onPatientSwitch(patientId) {
  sendCurrentPatientData();
}
```

---

## 测试

### 测试点

| # | 测试点 | 验证方法 |
|---|--------|----------|
| 1 | 探针确认广播 | 控制台 `[probe]` 在切换患者时打印 |
| 2 | 切 A→B → 自动更新 | 唯一键变化触发刷新 |
| 3 | 刷新按钮 → 显示当前患者 | 宿主重推当前选中 |
| 4 | 反复 A↔B → 每次更新 | 唯一键强制刷新 |
| 5 | 广播在监听前已发 | 加载主动请求补偿 |
| 6 | 非白名单 origin | console.warn + 日志记录 |
| 7 | 同一患者重复广播 | 内容去重，不闪烁 |

### 本地测试

```bash
node server.js
# 访问 http://localhost:3000/parent
# 用 postMessage 模拟外层数据
```

---

## 常见问题

### Q: 切换患者后数据没更新？

**排查步骤**：
1. 打开控制台，查看是否有 `[probe]` 输出
2. 如果没有 → SmartCare 没有广播，需对接方确认
3. 如果有 → 查看 type 是否在 `ACCEPTED_TYPES` 中
4. 如果有但 origin 不匹配 → 将 SmartCare 域名加入 `ORIGIN_WHITELIST`

### Q: 通信日志显示"来源校验失败"？

iframe 收到的消息 origin 不在白名单。检查：
1. `ORIGIN_WHITELIST` 是否包含 SmartCare 的域名
2. 控制台 console.warn 会显示具体 origin

### Q: 通信日志显示"未识别"？

收到的消息 type 不在 `ACCEPTED_TYPES` 中，且不包含 account+patient 结构。检查：
1. 控制台 `[probe]` 输出中的 type 字段
2. 将该 type 添加到 `ACCEPTED_TYPES`

### Q: 刷新后显示旧患者？

**根因**：宿主刷新时重推的是登录时缓存的患者，不是当前选中。

**解决方案**：宿主刷新后应推送当前选中患者。

### Q: 数据字段显示不全？

通用渲染遍历所有字段，不会遗漏。检查：
1. SmartCare 下发的数据是否包含该字段
2. 字段值是否为 null（显示为 "-"）

### Q: 内层 iframe 没有同步数据？

检查：
1. 内层 iframe 是否加载成功
2. 控制台是否有 postMessage 错误
3. 通信日志是否有 `[转发]` 记录
