import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  bedDoctorId?: string;
  icuAdmissionTime?: number;
  deptCode?: string;
  [key: string]: any;
}

/**
 * 待提醒项
 */
export interface PendingItem {
  patientId: string;
  patientName: string;
  bedNo: string;
  scoreType: string;
  scoreName: string;
  level: 'low' | 'mid' | 'high';
  lastScoreTime: string | null;
  reason: string;
}

/**
 * 连接状态
 */
export type ConnectionStatus = 'waiting' | 'from-cache' | 'connected' | 'origin-rejected';

/**
 * 全局提醒引擎服务（根级单例）
 *
 * ★ 关键设计：
 * 1. 在构造函数中立即注册监听器，确保在任何组件渲染前就已挂上
 * 2. 使用 APP_INITIALIZER 确保在 bootstrap 阶段实例化
 * 3. 只用 account.id 触发查询（防抖）
 */
@Injectable({
  providedIn: 'root'
})
export class ReminderEngineService {
  // ── 数据流 ──────────────────────────────────────────────
  private accountSubject = new BehaviorSubject<Account | null>(null);
  account$: Observable<Account | null> = this.accountSubject.asObservable();

  private patientSubject = new BehaviorSubject<Patient | null>(null);
  patient$: Observable<Patient | null> = this.patientSubject.asObservable();

  private statusSubject = new BehaviorSubject<ConnectionStatus>('waiting');
  status$: Observable<ConnectionStatus> = this.statusSubject.asObservable();

  private pendingSubject = new BehaviorSubject<PendingItem[]>([]);
  pending$: Observable<PendingItem[]> = this.pendingSubject.asObservable();

  private showOverlaySubject = new BehaviorSubject<boolean>(false);
  showOverlay$: Observable<boolean> = this.showOverlaySubject.asObservable();

  // ── 内部状态 ──────────────────────────────────────────
  private currentAccountId: string | null = null;
  private lastSignature = '';
  private isPlaceholder = false;
  private lastRequestTime = 0;
  private lastResponseTime = 0;
  private pollTimer: any = null;
  private destroy$ = new Subject<void>();

  // ── 配置 ──────────────────────────────────────────────
  private readonly POLL_INTERVAL = 10 * 60 * 1000; // 10 分钟
  private readonly REQUEST_COOLDOWN = 1000;
  private readonly STORAGE_KEY = 'icu_last_account';

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

  constructor(
    private http: HttpClient,
    private ngZone: NgZone
  ) {
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

    console.log('[ReminderEngine] 根级单例已初始化');
  }

  // ── 注册消息监听 ──────────────────────────────────────
  private registerMessageListener(): void {
    window.addEventListener('message', (event) => this.onMessage(event));
    console.log('[ReminderEngine] window.message 监听已注册');
  }

  // ── 消息处理 ──────────────────────────────────────────
  private onMessage(event: MessageEvent): void {
    // 忽略自己发出的消息
    if (event.source === window) return;

    // origin 校验
    if (!this.isAllowedOrigin(event.origin)) {
      this.statusSubject.next('origin-rejected');
      console.warn(`[ReminderEngine] 来源校验失败: ${event.origin}`);
      return;
    }

    try {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // 类型识别
      const normalized = this.normalizeData(data);
      if (!normalized) return;

      const { account, patient } = normalized;

      if (!account) {
        console.warn('[ReminderEngine] 消息无 account 数据');
        return;
      }

      this.processData(normalized);
    } catch (error: any) {
      console.error('[ReminderEngine] 消息处理失败:', error.message);
    }
  }

  // ── 数据规范化 ────────────────────────────────────────
  private normalizeData(data: any): { account: Account; patient?: Patient; token?: string } | null {
    // 形态1：直接是 SmartCare 对象
    if (data.type === 'SmartCare' && data.account) {
      return { account: data.account, patient: data.patient, token: data.token };
    }

    // 形态2：包在 payload 里
    if (this.ACCEPTED_TYPES.includes(data.type)) {
      const p = data.payload || {};
      if (p.account) {
        return { account: p.account, patient: p.patient, token: p.token };
      }
      if (data.account) {
        return { account: data.account, patient: data.patient, token: data.token };
      }
    }

    // 形态3：兜底识别
    if (data.account) {
      return { account: data.account, patient: data.patient, token: data.token };
    }

    return null;
  }

  // ── 处理数据 ──────────────────────────────────────────
  private processData(data: { account: Account; patient?: Patient; token?: string }): void {
    const accountId = data.account.id;

    // 写入 sessionStorage
    this.persistToStorage(data);

    // 更新数据流
    this.ngZone.run(() => {
      this.accountSubject.next(data.account);
      if (data.patient) {
        this.patientSubject.next(data.patient);
      }
      this.statusSubject.next('connected');
    });

    // ★ 只用 account.id 触发查询（防抖）
    if (accountId && accountId !== this.currentAccountId) {
      this.currentAccountId = accountId;
      this.loadPending(accountId);
    }

    console.log(`[ReminderEngine] 数据已更新, accountId=${accountId}`);
  }

  // ── 加载待提醒列表 ────────────────────────────────────
  private loadPending(accountId: string): void {
    const params = new HttpParams().set('accountId', accountId);

    this.http.get<{ code: number; data: PendingItem[] }>('/api/reminder/pending', { params }).subscribe({
      next: (response) => {
        if (response.code === 200) {
          this.pendingSubject.next(response.data);
          // 有待提醒时显示遮罩
          this.showOverlaySubject.next(response.data.length > 0);
        }
      },
      error: (error) => {
        console.error('[ReminderEngine] 加载待提醒列表失败:', error);
      }
    });
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
      this.isPlaceholder = true;

      this.ngZone.run(() => {
        this.accountSubject.next(data.account);
        if (data.patient) {
          this.patientSubject.next(data.patient);
        }
        this.statusSubject.next('from-cache');
      });

      // 用缓存的 accountId 查询
      if (data.account?.id) {
        this.currentAccountId = data.account.id;
        this.loadPending(data.account.id);
      }

      console.log(`[ReminderEngine] 从缓存恢复, accountId=${data.account?.id}`);
    } catch {}
  }

  // ── 发送 READY ────────────────────────────────────────
  private sendReady(): void {
    try {
      const target = this.getTarget();
      if (target) {
        target.postMessage({ type: 'HOST_PAGE_READY', payload: { ok: true } }, this.getTargetOrigin());
        console.log('[ReminderEngine] 已发送 HOST_PAGE_READY');
      }
    } catch (e: any) {
      console.error('[ReminderEngine] 发送 READY 失败:', e.message);
    }
  }

  // ── 请求数据 ──────────────────────────────────────────
  requestData(reason: string): void {
    const now = Date.now();
    if (this.lastRequestTime && (now - this.lastRequestTime < this.REQUEST_COOLDOWN)) return;

    this.lastRequestTime = now;
    console.log(`[ReminderEngine] 请求数据, reason=${reason}`);

    try {
      const target = this.getTarget();
      if (target) {
        target.postMessage({ type: 'REQUEST_HOST_DATA', payload: { reason } }, this.getTargetOrigin());
      }
    } catch (e: any) {
      console.error('[ReminderEngine] 请求失败:', e.message);
    }
  }

  // ── 生命周期事件 ──────────────────────────────────────
  private registerLifecycleEvents(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.requestData('visibilitychange');
        // 补拉待提醒
        if (this.currentAccountId) {
          this.loadPending(this.currentAccountId);
        }
      }
    });

    window.addEventListener('pageshow', () => {
      this.requestData('pageshow');
      if (this.currentAccountId) {
        this.loadPending(this.currentAccountId);
      }
    });

    window.addEventListener('focus', () => {
      this.requestData('focus');
      if (this.currentAccountId) {
        this.loadPending(this.currentAccountId);
      }
    });
  }

  // ── 轮询 ──────────────────────────────────────────────
  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (this.lastResponseTime && (now - this.lastResponseTime < this.POLL_INTERVAL * 2)) return;
      if (this.lastRequestTime && (now - this.lastRequestTime < this.REQUEST_COOLDOWN)) return;

      this.requestData('poll');
      if (this.currentAccountId) {
        this.loadPending(this.currentAccountId);
      }
    }, this.POLL_INTERVAL);
  }

  // ── 关闭遮罩 ──────────────────────────────────────────
  closeOverlay(): void {
    this.showOverlaySubject.next(false);
  }

  // ── 确认已知晓 ────────────────────────────────────────
  ack(patientId: string, scoreType: string): void {
    if (!this.currentAccountId) return;

    this.http.post<{ code: number; msg: string }>('/api/reminder/ack', {
      accountId: this.currentAccountId,
      patientId,
      scoreType
    }).subscribe({
      next: (response) => {
        if (response.code === 200) {
          // 从列表中移除
          const current = this.pendingSubject.value;
          this.pendingSubject.next(current.filter(
            item => !(item.patientId === patientId && item.scoreType === scoreType)
          ));

          // 如果没有待提醒了，关闭遮罩
          if (this.pendingSubject.value.length === 0) {
            this.showOverlaySubject.next(false);
          }
        }
      },
      error: (error) => console.error('[ReminderEngine] 确认已知晓失败:', error)
    });
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
    this.destroy$.next();
    this.destroy$.complete();
  }
}
