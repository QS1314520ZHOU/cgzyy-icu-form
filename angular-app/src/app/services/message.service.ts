import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { SmartCareData, Patient, Account } from '../models/smartcare.model';
import { StorageService } from './storage.service';
import { LogService } from './log.service';

/**
 * 连接状态枚举
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
  // ── 数据流（暴露给组件订阅）────────────────────────────
  private patientSubject = new BehaviorSubject<Patient | null>(null);
  /** 当前患者数据 */
  patient$: Observable<Patient | null> = this.patientSubject.asObservable();

  private accountSubject = new BehaviorSubject<Account | null>(null);
  /** 当前账号数据 */
  account$: Observable<Account | null> = this.accountSubject.asObservable();

  private tokenSubject = new BehaviorSubject<string | null>(null);
  /** 当前 token */
  token$: Observable<string | null> = this.tokenSubject.asObservable();

  private statusSubject = new BehaviorSubject<ConnectionStatus>('waiting');
  /** 连接状态 */
  status$: Observable<ConnectionStatus> = this.statusSubject.asObservable();

  /** 患者唯一键（用于去重和切换检测） */
  patientKey$: Observable<string> = this.patient$.pipe(
    map(p => this.getPatientKey(p)),
    distinctUntilChanged()
  );

  // ── 内部状态 ──────────────────────────────────────────
  private currentPatientKey = '';
  private isPlaceholder = false;
  private lastRequestTime = 0;
  private lastResponseTime = 0;
  private pollTimer: any = null;

  // ── 配置 ──────────────────────────────────────────────
  private readonly POLL_INTERVAL = 3000;  // 轮询间隔（毫秒）
  private readonly REQUEST_COOLDOWN = 1000;  // 请求冷却时间（毫秒）
  private readonly STORAGE_KEY = 'icu_last_patient';

  // ── origin 白名单 ─────────────────────────────────────
  private readonly ORIGIN_WHITELIST = [
    location.origin,
    'http://10.35.4.10:60000'  // SmartCare 生产环境
  ];

  // ── 接受的消息类型 ─────────────────────────────────────
  private readonly ACCEPTED_TYPES = [
    'SmartCare',
    'HOST_DATA',
    'PRINT_DATA',
    'RESPONSE_DATA',
  ];

  constructor(
    private storageService: StorageService,
    private logService: LogService,
    private ngZone: NgZone
  ) {
    // ★ 关键：在构造函数中立即注册监听器，不依赖任何组件的 ngOnInit
    this.registerMessageListener();
    this.registerLifecycleEvents();

    // 从 sessionStorage 恢复上次数据作为占位
    this.restoreFromStorage();

    // 立即向宿主握手
    this.sendReady();
    this.requestData('init');

    // 启动轮询兜底
    this.startPolling();

    this.logService.add('[MessageService] 根级单例已初始化，监听器已注册', 'success');
  }

  // ── 注册消息监听（常驻，在构造函数中执行）──────────────
  private registerMessageListener(): void {
    window.addEventListener('message', (event) => {
      this.onMessage(event);
    });
    this.logService.add('[监听] window.message 已注册', 'info');
  }

  // ── 消息处理核心逻辑 ──────────────────────────────────
  private onMessage(event: MessageEvent): void {
    // 1. 忽略自己发出的消息
    if (event.source === window) {
      return;
    }

    // 2. origin 校验
    if (!this.isAllowedOrigin(event.origin)) {
      this.statusSubject.next('origin-rejected');
      const warnMsg = `[安全] 来源校验失败: origin=${event.origin}，已忽略`;
      console.warn('[MessageService] ' + warnMsg);
      this.logService.add(warnMsg, 'error');
      return;
    }

    try {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // 3. 类型识别：兼容三种形态
      const normalized = this.normalizeData(data);
      if (!normalized) return;

      const { account, patient, token } = normalized;

      // 4. 无病人消息处理
      if (!patient) {
        this.logService.add('[收到] 消息无 patient 数据，请选中病人', 'warning');
        return;
      }

      // 5. 患者唯一键检测
      const patientKey = this.getPatientKey(patient);
      this.logService.add(`[收到] patientKey=${patientKey}, currentKey=${this.currentPatientKey || '(空)'}`, 'success');

      // 6. 处理数据（含切换检测和去重）
      this.processData({ account, patient, token });

    } catch (error: any) {
      this.logService.add(`[错误] 消息处理失败: ${error.message}`, 'error');
    }
  }

  // ── 数据规范化（兼容三种形态）──────────────────────────
  private normalizeData(data: any): SmartCareData | null {
    // 形态1：event.data 直接是 {type:'SmartCare', account, patient, token}
    if (data.type === 'SmartCare' && data.account && data.patient) {
      return { account: data.account, patient: data.patient, token: data.token };
    }

    // 形态2：{type:'HOST_DATA'|'PRINT_DATA', payload:{...}}
    if (this.ACCEPTED_TYPES.includes(data.type)) {
      const p = data.payload || {};
      if (p.account && p.patient) {
        return { account: p.account, patient: p.patient, token: p.token };
      }
      if (data.account && data.patient) {
        return { account: data.account, patient: data.patient, token: data.token };
      }
    }

    // 形态3：兜底识别"含 account+patient 结构"的消息
    if (data.account && data.patient) {
      return { account: data.account, patient: data.patient, token: data.token };
    }

    return null;
  }

  // ── 处理数据（含切换检测和去重）────────────────────────
  private processData(data: SmartCareData): void {
    const patientKey = this.getPatientKey(data.patient);

    // 唯一键变化 = 切换病人（清旧、覆盖）
    if (patientKey && this.currentPatientKey && patientKey !== this.currentPatientKey) {
      this.logService.add(`[切换] 患者切换: ${this.currentPatientKey} → ${patientKey}`, 'warning');
      this.isPlaceholder = false;
    }

    // 占位缓存模式：收到任何有效数据都无条件覆盖
    if (this.isPlaceholder) {
      this.logService.add('[覆盖] 当前为占位缓存，无条件覆盖为最新数据', 'warning');
      this.isPlaceholder = false;
    }

    // 内容签名去重（同一患者同内容避免闪烁）
    const signature = this.safeStringify(data);
    if (patientKey === this.currentPatientKey && this.isDuplicate(data)) {
      this.logService.add('[去重] 收到重复数据，跳过渲染', 'info');
      return;
    }

    // 更新状态
    this.currentPatientKey = patientKey;
    this.lastResponseTime = Date.now();

    // 写入 sessionStorage
    this.persistToStorage(data);

    // 更新数据流（在 NgZone 内触发变更检测）
    this.ngZone.run(() => {
      this.patientSubject.next(data.patient);
      this.accountSubject.next(data.account);
      this.tokenSubject.next(data.token || null);
      this.statusSubject.next('connected');
    });

    this.logService.add(`[更新] 数据已更新, patientKey=${patientKey}`, 'success');
  }

  // ── 去重检查 ──────────────────────────────────────────
  private lastSignature = '';

  private isDuplicate(data: SmartCareData): boolean {
    const signature = this.safeStringify(data);
    if (signature === this.lastSignature) {
      return true;
    }
    this.lastSignature = signature;
    return false;
  }

  // ── 患者唯一键 ────────────────────────────────────────
  getPatientKey(patient: Patient | null): string {
    if (!patient) return '';
    return String(patient.id || patient.mrn || patient.hisPid || '');
  }

  // ── sessionStorage 持久化 ─────────────────────────────
  private persistToStorage(data: SmartCareData): void {
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }

  private restoreFromStorage(): void {
    try {
      const cached = sessionStorage.getItem(this.STORAGE_KEY);
      if (!cached) {
        this.logService.add('[缓存] 无缓存数据', 'info');
        return;
      }

      const data = JSON.parse(cached);
      const patientKey = this.getPatientKey(data.patient);
      this.currentPatientKey = patientKey;
      this.isPlaceholder = true;

      // 在 NgZone 内更新
      this.ngZone.run(() => {
        this.patientSubject.next(data.patient);
        this.accountSubject.next(data.account);
        this.tokenSubject.next(data.token || null);
        this.statusSubject.next('from-cache');
      });

      this.logService.add(`[缓存] 已恢复, patientKey=${patientKey}, 标记为占位`, 'warning');
    } catch {}
  }

  // ── 发送 READY ────────────────────────────────────────
  private sendReady(): void {
    this.logService.add('[就绪] 发送 HOST_PAGE_READY', 'info');
    try {
      const target = this.getTarget();
      if (target) {
        target.postMessage({ type: 'HOST_PAGE_READY', payload: { ok: true } }, this.getTargetOrigin());
      }
    } catch (e: any) {
      this.logService.add(`[错误] 发送 READY 失败: ${e.message}`, 'error');
    }
  }

  // ── 请求数据 ──────────────────────────────────────────
  requestData(reason: string): void {
    const now = Date.now();

    // 冷却时间检查
    if (this.lastRequestTime && (now - this.lastRequestTime < this.REQUEST_COOLDOWN)) {
      return;
    }

    this.lastRequestTime = now;
    this.logService.add(`[请求] 向外层请求数据, reason=${reason}`, 'info');

    try {
      const target = this.getTarget();
      if (target) {
        target.postMessage({
          type: 'REQUEST_HOST_DATA',
          payload: { reason }
        }, this.getTargetOrigin());
      }
    } catch (e: any) {
      this.logService.add(`[错误] 请求失败: ${e.message}`, 'error');
    }
  }

  // ── 注册生命周期事件 ──────────────────────────────────
  private registerLifecycleEvents(): void {
    // 可见性变化时请求数据
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.logService.add('[触发] visibilitychange → visible', 'info');
        this.requestData('visibilitychange');
      }
    });

    // pageshow 事件
    window.addEventListener('pageshow', (event) => {
      this.logService.add(`[触发] pageshow, persisted=${event.persisted}`, 'info');
      this.requestData('pageshow');
    });

    // window focus 事件
    window.addEventListener('focus', () => {
      this.logService.add('[触发] window focus', 'info');
      this.requestData('focus');
    });
  }

  // ── 启动轮询 ──────────────────────────────────────────
  private startPolling(): void {
    this.logService.add(`[轮询] 启动，间隔 ${this.POLL_INTERVAL}ms`, 'info');

    this.pollTimer = setInterval(() => {
      // 页面不可见时跳过
      if (document.visibilityState !== 'visible') {
        return;
      }

      // 刚收到响应时跳过
      const now = Date.now();
      if (this.lastResponseTime && (now - this.lastResponseTime < this.POLL_INTERVAL * 2)) {
        return;
      }

      // 刚发过请求时跳过
      if (this.lastRequestTime && (now - this.lastRequestTime < this.REQUEST_COOLDOWN)) {
        return;
      }

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
    // 本地开发用 '*'，生产环境用具体域名
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return '*';
    }
    return 'http://10.35.4.10:60000';
  }

  private isAllowedOrigin(origin: string): boolean {
    if (this.ORIGIN_WHITELIST.includes(origin)) return true;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return true;
    return false;
  }

  private safeStringify(value: any): string {
    try { return JSON.stringify(value); } catch { return ''; }
  }

  // ── 清理 ──────────────────────────────────────────────
  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }
}
