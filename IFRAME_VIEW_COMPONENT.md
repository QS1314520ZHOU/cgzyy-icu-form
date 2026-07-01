# IframeViewComponent 改动说明

## 背景

SmartCare 主系统的 IframeViewComponent 需要与 iframe 内的子页面（cgzyy-icu-form）进行 postMessage 通信。

**问题**：第一次打开页面或刷新时，iframe 内收不到 postMessage。

**根因**：父页把发送时机绑在宿主渲染完成上，早于 iframe 内部 JS 执行与 message 监听器注册。

## 解决方案：READY 握手协议

### 协议表

| 方向 | type | channel | payload | 说明 |
|------|------|---------|---------|------|
| 子→父 | `READY` | `smartcare.scoreReminder.v1` | `{ok: true}` | 子页就绪，每 300ms 重发，最多 10 次 |
| 父→子 | `INIT` | `smartcare.scoreReminder.v1` | `{token, doctorId, deptCode, patient, menuUrl}` | 父页初始化参数 |
| 子→父 | `ACK` | `smartcare.scoreReminder.v1` | `{ok: true}` | 子页确认收到 INIT |
| 父→子 | `PATIENT` | `smartcare.scoreReminder.v1` | `{patient}` | 父页推送患者更新 |

### 时序图

```
子页 (iframe)                          父页 (IframeViewComponent)
    |                                        |
    |--- READY (每300ms, 最多10次) --------->|
    |                                        |--- 收到 READY
    |<---------- INIT {token,patient,...} ---|
    |--- 收到 INIT，停止重发                  |
    |--- ACK {ok:true} -------------------->|
    |                                        |
    |--- (后续患者变化)                       |
    |<---------- PATIENT {patient} ---------|
```

## IframeViewComponent 改动清单

### 1. 添加常量

```typescript
// channel 配置
private readonly CHANNEL = 'smartcare.scoreReminder.v1';

// iframe origin（子页面的 origin）
private readonly IFRAME_ORIGIN = 'http://127.0.0.1:3000'; // 根据实际部署配置
```

### 2. 维护 latestParams

```typescript
// 最新参数（菜单 url、当前 patient、deptCode、token 等）
private latestParams: any = {
  token: null,
  doctorId: null,
  deptCode: null,
  patient: null,
  menuUrl: null
};

// 子页是否就绪
private iframeReady = false;
```

### 3. 监听 message 事件

```typescript
ngOnInit(): void {
  // 监听子页消息
  window.addEventListener('message', this.handleMessage);

  // 其他初始化逻辑...
}

ngOnDestroy(): void {
  window.removeEventListener('message', this.handleMessage);
}

private handleMessage = (event: MessageEvent) => {
  // 校验 channel
  if (!event.data || event.data.channel !== this.CHANNEL) {
    return;
  }

  // 校验 origin（子页面的 origin）
  if (event.origin !== this.IFRAME_ORIGIN) {
    console.warn('[IframeView] 来源校验失败:', event.origin);
    return;
  }

  const { type, payload } = event.data;

  switch (type) {
    case 'READY':
      this.handleReady();
      break;

    case 'ACK':
      console.log('[IframeView] 收到 ACK');
      break;
  }
}

private handleReady(): void {
  this.iframeReady = true;
  console.log('[IframeView] 子页就绪，发送 INIT');

  // 发送 INIT（含当前参数）
  this.sendInit();
}
```

### 4. 发送 INIT

```typescript
private sendInit(): void {
  const iframe = this.iframeRef?.nativeElement;
  if (!iframe || !iframe.contentWindow) {
    console.warn('[IframeView] iframe 未就绪');
    return;
  }

  iframe.contentWindow.postMessage({
    channel: this.CHANNEL,
    type: 'INIT',
    payload: this.latestParams
  }, this.IFRAME_ORIGIN);
}
```

### 5. 发送 PATIENT（患者变化时）

```typescript
private sendPatient(patient: any): void {
  const iframe = this.iframeRef?.nativeElement;
  if (!iframe || !iframe.contentWindow || !this.iframeReady) {
    return;
  }

  iframe.contentWindow.postMessage({
    channel: this.CHANNEL,
    type: 'PATIENT',
    payload: { patient }
  }, this.IFRAME_ORIGIN);
}
```

### 6. 更新 latestParams 并发送

```typescript
// 患者变化时（去掉 skip(1)）
this.getPatient().subscribe(patient => {
  this.latestParams.patient = patient;
  this.sendPatient(patient);
});

// 菜单变化时
this.getMenuUrl().subscribe(menuUrl => {
  this.latestParams.menuUrl = menuUrl;
  if (this.iframeReady) {
    this.sendInit();
  }
});

// token 变化时
this.getToken().subscribe(token => {
  this.latestParams.token = token;
  if (this.iframeReady) {
    this.sendInit();
  }
});
```

### 7. iframe load 事件（兜底）

```typescript
onIframeLoad(): void {
  // iframe 重新加载后，重置就绪状态
  this.iframeReady = false;

  // 子页会重新发送 READY，父页收到后自动发送 INIT
}
```

## 完整代码示例

```typescript
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-iframe-view',
  template: `
    <iframe
      #iframeRef
      [src]="iframeSrc"
      (load)="onIframeLoad()"
      width="100%"
      height="100%"
    ></iframe>
  `
})
export class IframeViewComponent implements OnInit, OnDestroy {
  @ViewChild('iframeRef') iframeRef!: ElementRef<HTMLIFrameElement>;

  // channel 配置
  private readonly CHANNEL = 'smartcare.scoreReminder.v1';
  private readonly IFRAME_ORIGIN = 'http://127.0.0.1:3000';

  // 最新参数
  private latestParams: any = {
    token: null,
    doctorId: null,
    deptCode: null,
    patient: null,
    menuUrl: null
  };

  // 子页是否就绪
  private iframeReady = false;

  iframeSrc = 'http://127.0.0.1:3000';

  ngOnInit(): void {
    // 监听子页消息
    window.addEventListener('message', this.handleMessage);

    // 订阅患者变化（去掉 skip(1)）
    this.getPatient().subscribe(patient => {
      this.latestParams.patient = patient;
      this.sendPatient(patient);
    });

    // 订阅 token 变化
    this.getToken().subscribe(token => {
      this.latestParams.token = token;
      if (this.iframeReady) {
        this.sendInit();
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent) => {
    // 校验 channel
    if (!event.data || event.data.channel !== this.CHANNEL) {
      return;
    }

    // 校验 origin
    if (event.origin !== this.IFRAME_ORIGIN) {
      console.warn('[IframeView] 来源校验失败:', event.origin);
      return;
    }

    const { type, payload } = event.data;

    switch (type) {
      case 'READY':
        this.handleReady();
        break;

      case 'ACK':
        console.log('[IframeView] 收到 ACK');
        break;
    }
  }

  private handleReady(): void {
    this.iframeReady = true;
    console.log('[IframeView] 子页就绪，发送 INIT');
    this.sendInit();
  }

  private sendInit(): void {
    const iframe = this.iframeRef?.nativeElement;
    if (!iframe || !iframe.contentWindow) {
      console.warn('[IframeView] iframe 未就绪');
      return;
    }

    iframe.contentWindow.postMessage({
      channel: this.CHANNEL,
      type: 'INIT',
      payload: this.latestParams
    }, this.IFRAME_ORIGIN);
  }

  private sendPatient(patient: any): void {
    const iframe = this.iframeRef?.nativeElement;
    if (!iframe || !iframe.contentWindow || !this.iframeReady) {
      return;
    }

    iframe.contentWindow.postMessage({
      channel: this.CHANNEL,
      type: 'PATIENT',
      payload: { patient }
    }, this.IFRAME_ORIGIN);
  }

  onIframeLoad(): void {
    // iframe 重新加载后，重置就绪状态
    this.iframeReady = false;
    // 子页会重新发送 READY，父页收到后自动发送 INIT
  }

  // 这些方法需要根据实际业务实现
  private getPatient(): Observable<any> { /* ... */ }
  private getToken(): Observable<any> { /* ... */ }
}
```

## 验收点

| 测试点 | 预期结果 |
|--------|----------|
| ① 首次打开 | 子页发送 READY → 父页发送 INIT → 子页收到参数并初始化 |
| ② 浏览器刷新 | 子页重新发送 READY → 父页重新发送 INIT → 子页重新初始化 |
| ③ 连续刷新 10 次 | 每次都能收到 INIT，不丢消息 |
| ④ 切换病人 | 父页发送 PATIENT → 子页实时更新 |
| ⑤ 非白名单 origin | 消息被忽略 |
