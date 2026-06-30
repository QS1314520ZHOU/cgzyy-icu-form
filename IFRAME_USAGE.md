# iframe通信功能使用说明

## 功能概述

本项目实现了iframe页面与父页面之间的postMessage通信，支持：

1. **iframe主动请求数据** - iframe加载后自动向父页面请求通用数据
2. **父页面响应请求** - 父页面监听请求并发送所需数据
3. **缓存管理** - 关闭时清除缓存，打开时重新加载数据
4. **生命周期管理** - 自动检测iframe就绪状态

## 文件结构

```
public/
├── parent.html              # 父页面示例（完整功能演示）
├── integration-example.html # 简洁集成示例（推荐参考）
├── print.html               # iframe嵌入的子页面
├── js/
│   └── print.js             # 子页面通信逻辑
└── css/
    └── print.css            # 子页面样式
```

## 快速开始

### 1. 启动服务器

```bash
node server.js
```

### 2. 访问页面

- **集成示例（推荐）**: http://localhost:3000/example
- **完整演示**: http://localhost:3000/parent
- **子页面（直接访问）**: http://localhost:3000/print

## 通信协议

### 通信流程

```
┌─────────────────┐                    ┌─────────────────┐
│                 │                    │                 │
│   父页面        │                    │   iframe子页面   │
│   (你的应用)    │                    │   (本项目)       │
│                 │                    │                 │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         │    1. iframe加载完成                   │
         │◄─────────────────────────────────────│
         │         PRINT_PAGE_READY             │
         │                                      │
         │    2. iframe请求数据                   │
         │◄─────────────────────────────────────│
         │     PRINT_PAGE_REQUEST_DATA          │
         │     { requiredFields: [...] }        │
         │                                      │
         │    3. 父页面响应数据                   │
         │─────────────────────────────────────►│
         │          PRINT_DATA                  │
         │          { account: {...},           │
         │            patient: {...} }          │
         │                                      │
         │    4. iframe确认接收                   │
         │◄─────────────────────────────────────│
         │      PRINT_DATA_RECEIVED             │
         │      { ok: true }                    │
         │                                      │
         │    5. 关闭时清除缓存                   │
         │─────────────────────────────────────►│
         │          CLEAR_DATA                  │
         │                                      │
```

### 消息类型

#### iframe → 父页面

| 类型 | 说明 | 数据结构 |
|------|------|----------|
| `PRINT_PAGE_READY` | iframe就绪 | `{ type: 'PRINT_PAGE_READY', payload: { ok: true } }` |
| `PRINT_PAGE_REQUEST_DATA` | 请求数据 | `{ type: 'PRINT_PAGE_REQUEST_DATA', payload: { reason: '...', requiredFields: [...] } }` |
| `PRINT_DATA_RECEIVED` | 数据接收确认 | `{ type: 'PRINT_DATA_RECEIVED', payload: { ok: true/false } }` |

#### 父页面 → iframe

| 类型 | 说明 | 数据结构 |
|------|------|----------|
| `PRINT_DATA` | 响应数据请求 | `{ type: 'PRINT_DATA', payload: {...} }` |
| `CLEAR_DATA` | 清除数据 | `{ type: 'CLEAR_DATA', payload: { reason: '...' } }` |

### 数据格式

```javascript
{
  type: 'SmartCare',
  account: {
    id: '账号ID',
    username: '用户名',
    trueName: '真实姓名',
    departmentCode: '科室编码'
  },
  patient: {
    dept: '科室名称',
    deptCode: '科室编码',
    hisBed: '床位号',
    hisPid: '患者ID',
    id: '记录ID',
    mrn: '住院号',
    name: '患者姓名',
    clinicalDiagnosis: '临床诊断'
  }
}
```

## 在你的项目中集成

### 核心代码（父页面）

```javascript
// 获取iframe元素
const iframe = document.getElementById('icuFrame');

// 监听iframe消息
window.addEventListener('message', (event) => {
  // 验证来源
  if (event.source !== iframe.contentWindow) return;

  const { type, payload } = event.data;

  switch (type) {
    case 'PRINT_PAGE_READY':
      // iframe已就绪，等待数据请求
      console.log('iframe已就绪');
      break;

    case 'PRINT_PAGE_REQUEST_DATA':
      // iframe请求数据 - 这是关键！
      console.log('iframe请求数据，原因:', payload.reason);
      console.log('请求的字段:', payload.requiredFields);

      // 从你的应用中获取当前数据
      const currentData = {
        type: 'SmartCare',
        account: {
          id: getCurrentAccountId(),      // 你的业务方法
          username: getCurrentUsername(),
          trueName: getCurrentTrueName(),
          departmentCode: getCurrentDeptCode()
        },
        patient: {
          dept: getCurrentDept(),
          deptCode: getCurrentDeptCode(),
          hisBed: getCurrentBed(),
          hisPid: getCurrentPid(),
          id: getCurrentPatientId(),
          mrn: getCurrentMrn(),
          name: getCurrentPatientName(),
          clinicalDiagnosis: getCurrentDiagnosis()
        }
      };

      // 发送数据给iframe
      iframe.contentWindow.postMessage({
        type: 'PRINT_DATA',
        payload: currentData
      }, '*');
      break;

    case 'PRINT_DATA_RECEIVED':
      // iframe已接收数据
      console.log('数据接收:', payload.ok ? '成功' : '失败');
      break;
  }
});

// 关闭iframe时清除缓存
function closeIframe() {
  iframe.contentWindow.postMessage({
    type: 'CLEAR_DATA',
    payload: { reason: 'parent_close' }
  }, '*');
}

// 打开iframe（会自动请求数据）
function openIframe() {
  iframe.src = 'http://localhost:3000/print';
}

// 页面关闭时清除
window.addEventListener('beforeunload', closeIframe);
```

### 完整示例

参考 `public/integration-example.html`，包含：
- 表单输入示例数据
- 打开/关闭iframe按钮
- 实时通信日志
- 完整的代码示例

访问 http://localhost:3000/example 查看效果。

## 关键实现细节

### 1. iframe就绪检测

子页面在加载完成后会自动发送 `PRINT_PAGE_READY` 消息：

```javascript
// 子页面 (print.js)
function init() {
  resetView();
  restoreFromStorage();
  notifyParent(READY_EVENT, { ok: true });  // 通知父页面就绪
  requestDataFromParent();                   // 请求数据
}
```

### 2. 数据请求机制

子页面在以下情况会请求数据：
- 初始化时
- 页面变为可见时（如果没有缓存数据）
- 用户点击"清空内容"按钮后

```javascript
// 子页面 (print.js)
function requestDataFromParent() {
  notifyParent(REQUEST_EVENT, { reason: 'init' });
}
```

### 3. 缓存管理

**存储**: 使用 `sessionStorage` 存储数据，仅在当前会话有效

**清除时机**:
- 父页面发送 `CLEAR_DATA` 消息
- 子页面卸载时（`pagehide`, `beforeunload`）
- 用户点击"清空内容"按钮

### 4. 页面可见性处理

当页面从后台切换到前台时，如果没有缓存数据，会自动请求父页面发送数据：

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !hasStoredPayload()) {
    requestDataFromParent();
  }
});
```

## 常见问题

### Q: 打开iframe时没有获取到数据？

**原因**: 父页面没有监听或响应iframe的数据请求

**解决方案**: 确保父页面监听 `PRINT_PAGE_REQUEST_DATA` 消息并响应

```javascript
// 正确的做法 ✓
window.addEventListener('message', (event) => {
  if (event.data.type === 'PRINT_PAGE_REQUEST_DATA') {
    // iframe请求数据，立即响应
    const data = getCurrentData(); // 获取你的业务数据
    event.source.postMessage({
      type: 'PRINT_DATA',
      payload: data
    }, '*');
  }
});
```

**关键点**: iframe会主动请求数据，父页面只需响应请求即可。

### Q: 如何在单页应用(SPA)中使用？

在SPA中，iframe可能被动态创建和销毁，需要：

1. 组件挂载时创建iframe
2. 组件卸载时发送清除消息
3. 重新挂载时会收到新的就绪消息

```javascript
// React示例
useEffect(() => {
  const handleMessage = (event) => {
    if (event.data.type === 'PRINT_PAGE_READY') {
      sendData();
    }
  };

  window.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('message', handleMessage);
    // 组件卸载时清除iframe数据
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage({
        type: 'CLEAR_DATA',
        payload: { reason: 'component_unmount' }
      }, '*');
    }
  };
}, []);
```

### Q: 跨域场景如何处理？

如果父页面和iframe不在同一个域：

1. **发送消息**: 第二个参数使用具体的targetOrigin而不是`'*'`

```javascript
iframe.contentWindow.postMessage(data, 'http://localhost:3000');
```

2. **接收消息**: 检查event.origin

```javascript
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:3000') {
    return;  // 忽略非预期来源的消息
  }
  // 处理消息...
});
```

## 测试方法

1. 启动服务器: `node server.js`
2. 打开浏览器访问: http://localhost:3000
3. 在父页面中：
   - 点击"加载示例数据"快速填充表单
   - 点击"发送数据到iframe"查看效果
   - 点击"关闭并清除缓存"测试清除功能
4. 观察"通信日志"面板了解通信过程

## 生产环境建议

1. **安全**: 验证消息来源（`event.origin`）
2. **错误处理**: 添加重试机制
3. **性能**: 避免频繁发送大数据
4. **兼容性**: 测试不同浏览器的postMessage支持
