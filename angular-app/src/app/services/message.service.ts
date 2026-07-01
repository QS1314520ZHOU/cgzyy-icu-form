import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

/**
 * 账号数据
 */
export interface Account {
  id?: string;
  username?: string;
  trueName?: string;
  profession?: string;
  departmentCode?: string;
  [key: string]: any;
}

/**
 * 患者数据
 */
export interface Patient {
  id?: string;
  mrn?: string;
  hisPid?: string;
  name?: string;
  deptCode?: string;
  [key: string]: any;
}

/**
 * 连接状态
 */
export type ConnectionStatus = 'waiting' | 'from-cache' | 'connected' | 'origin-rejected';

/**
 * SmartCare postMessage 通信服务（根级单例）
 *
 * ★ 关键设计：在构造函数中立即注册监听器，确保在任何组件渲染前就已挂上
 * 这样能接住宿主"渲染后那一次带数据的 onload 广播"
 */
@Injectable({
  providedIn: 'root'
})
export class MessageService {
  // ── 数据流 ──────────────────────────────────────────────
  private accountSubject = new BehaviorSubject<Account | null>(null);
  account$: Observable<Account | null> = this.accountSubject.asObservable();

  private patientSubject = new BehaviorSubject<Patient | null>(null);
  patient$: Observable<Patient | null> = this.patientSubject.asObservable();

  private statusSubject = new BehaviorSubject<ConnectionStatus>('waiting');
  status$: Observable<ConnectionStatus> = this.statusSubject.asObservable();

  // 便捷访问
  doctorId$: Observable<string> = this.account$.pipe(
    map(a => a?.id || ''),
    distinctUntilChanged()
  );
  departmentCode$: Observable<string> = this.account$.pipe(
    map(a => a?.departmentCode || ''),
    distinctUntilChanged()
  );

  // ── 内部状态 ──────────────────────────────────────────
  private currentPatientKey = '';
  private lastSignature = '';
  private isPlaceholder = false;
  private lastRequestTime = 0;
  private lastResponseTime = 0;
  private pollTimer: any = null;

  // ── 配置 ──────────────────────────────────────────────
  private readonly POLL_INTERVAL = 3000;
  private readonly REQUEST_COOLDOWN = 1000;
  private readonly STORAGE_KEY = 'icu_last_patient';

  // ── origin 白名单 ─────────────────────────────────────
  private readonly ORIGIN_WHITELIST = [
    location.origin,
    'http://10.35.4.10:60000'
  ];

  // ── 接受的消息类型 ─────────────────────────────────────
  private readonly ACCEPTED_TYPES = [
    'SmartCare',
    'HOST_DATA',
    'PRINT_DATA',
    'RESPONSE_DATA',
  ];

  constructor(private ngZone: NgZone) {
    // ★ 关键：构造函数中立即注册监听器
    this.registerMessageListener();
    this.registerLifecycleEvents();

    // 从 sessionStorage 恢复
    this.restoreFromStorage();

    // 向宿主握手
    this.sendReady();
    this.requestData('init');

    // 启动轮询
    this.startPolling();

    console.log('[MessageService] 根级单例已初始化');
  }

  // ── 注册消息监听 ──────────────────────────────────────
  private registerMessageListener(): void {
    window.addEventListener('message', (event) => this.onMessage(event));
    console.log('[MessageService] window.message 监听已注册');
  }

  // ── 消息处理 ──────────────────────────────────────────
  private onMessage(event: MessageEvent): void {
    // 忽略自己发出的消息
    if (event.source === window) return;

    // origin 校验
    if (!this.isAllowedOrigin(event.origin)) {
      this.statusSubject.next('origin-rejected');
      console.warn(`[MessageService] 来源校验失败: ${event.origin}`);
      return;
    }

    try {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // 类型识别
      const normalized = this.normalizeData(data);
      if (!normalized) return;

      const { account, patient } = normalized;

      if (!patient) {
        console.warn('[MessageService] 消息无 patient 数据');
        return;
      }

      this.processData(normalized);
    } catch (error: any) {
      console.error('[MessageService] 消息处理失败:', error.message);
    }
  }

  // ── 数据规范化 ────────────────────────────────────────
  private normalizeData(data: any): { account: Account; patient: Patient; token?: string } | null {
    // 形态1：直接是 SmartCare 对象
    if (data.type === 'SmartCare' && data.account && data.patient) {
      return { account: data.account, patient: data.patient, token: data.token };
    }

    // 形态2：包在 payload 里
    if (this.ACCEPTED_TYPES.includes(data.type)) {
      const p = data.payload || {};
      if (p.account && p.patient) {
        return { account: p.account, patient: p.patient, token: p.token };
      }
      if (data.account && data.patient) {
        return { account: data.account, patient: data.patient, token: data.token };
      }
    }

    // 形态3：兜底识别
    if (data.account && data.patient) {
      return { account: data.account, patient: data.patient, token: data.token };
    }

    return null;
  }

  // ── 处理数据 ──────────────────────────────────────────
  private processData(data: { account: Account; patient: Patient; token?: string }): void {
    const patientKey = this.getPatientKey(data.patient);

    // 唯一键变化 = 切换病人
    if (patientKey && this.currentPatientKey && patientKey !== this.currentPatientKey) {
      console.log(`[MessageService] 患者切换: ${this.currentPatientKey} → ${patientKey}`);
      this.isPlaceholder = false;
    }

    // 占位模式：无条件覆盖
    if (this.isPlaceholder) {
      console.log('[MessageService] 占位缓存被覆盖');
      this.isPlaceholder = false;
    }

    // 内容签名去重
    const signature = JSON.stringify(data);
    if (patientKey === this.currentPatientKey && signature === this.lastSignature) {
      return; // 同一患者同内容，跳过
    }

    // 更新状态
    this.currentPatientKey = patientKey;
    this.lastSignature = signature;
    this.lastResponseTime = Date.now();

    // 写入 sessionStorage
    this.persistToStorage(data);

    // 更新数据流
    this.ngZone.run(() => {
      this.accountSubject.next(data.account);
      this.patientSubject.next(data.patient);
      this.statusSubject.next('connected');
    });

    console.log(`[MessageService] 数据已更新, patientKey=${patientKey}`);
  }

  // ── 患者唯一键 ────────────────────────────────────────
  private getPatientKey(patient: Patient): string {
    if (!patient) return '';
    return String(patient.id || patient.mrn || patient.hisPid || '');
  }

  // ── sessionStorage ────────────────────────────────────
  private persistToStorage(data: any): void {
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  private restoreFromStorage(): void {
    try {
      const cached = sessionStorage.getItem(this.STORAGE_KEY);
      if (!cached) return;

      const data = JSON.parse(cached);
      const patientKey = this.getPatientKey(data.patient);
      this.currentPatientKey = patientKey;
      this.isPlaceholder = true;

      this.ngZone.run(() => {
        this.accountSubject.next(data.account);
        this.patientSubject.next(data.patient);
        this.statusSubject.next('from-cache');
      });

      console.log(`[MessageService] 从缓存恢复, patientKey=${patientKey}`);
    } catch {}
  }

  // ── 发送 READY ────────────────────────────────────────
  private sendReady(): void {
    try {
      const target = this.getTarget();
      if (target) {
        target.postMessage({ type: 'HOST_PAGE_READY', payload: { ok: true } }, this.getTargetOrigin());
        console.log('[MessageService] 已发送 HOST_PAGE_READY');
      }
    } catch (e: any) {
      console.error('[MessageService] 发送 READY 失败:', e.message);
    }
  }

  // ── 请求数据 ──────────────────────────────────────────
  requestData(reason: string): void {
    const now = Date.now();
    if (this.lastRequestTime && (now - this.lastRequestTime < this.REQUEST_COOLDOWN)) return;

    this.lastRequestTime = now;
    console.log(`[MessageService] 请求数据, reason=${reason}`);

    try {
      const target = this.getTarget();
      if (target) {
        target.postMessage({ type: 'REQUEST_HOST_DATA', payload: { reason } }, this.getTargetOrigin());
      }
    } catch (e: any) {
      console.error('[MessageService] 请求失败:', e.message);
    }
  }

  // ── 生命周期事件 ──────────────────────────────────────
  private registerLifecycleEvents(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.requestData('visibilitychange');
      }
    });

    window.addEventListener('pageshow', () => this.requestData('pageshow'));
    window.addEventListener('focus', () => this.requestData('focus'));
  }

  // ── 轮询 ──────────────────────────────────────────────
  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (this.lastResponseTime && (now - this.lastResponseTime < this.POLL_INTERVAL * 2)) return;
      if (this.lastRequestTime && (now - this.lastRequestTime < this.REQUEST_COOLDOWN)) return;

      this.requestData('poll');
    }, this.POLL_INTERVAL);
  }

  // ── 工具方法 ──────────────────────────────────────────
  private getTarget(): Window | null {
    if (window.parent !== window) return window.parent;
    if (window.top !== window) return window.top;
    return null;
  }

  private getTargetOrigin(): string {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return '*';
    return 'http://10.35.4.10:60000';
  }

  private isAllowedOrigin(origin: string): boolean {
    if (this.ORIGIN_WHITELIST.includes(origin)) return true;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return true;
    return false;
  }

  // ── 清理 ──────────────────────────────────────────────
  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
}
