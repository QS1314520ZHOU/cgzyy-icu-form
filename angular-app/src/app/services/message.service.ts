import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SmartCareData, Patient, ConnectionState } from '../models/smartcare.model';
import { StorageService } from './storage.service';
import { LogService } from './log.service';

/**
 * SmartCare postMessage 通信服务
 *
 * 核心职责：
 * 1. 监听 window message 事件（常驻，应用级）
 * 2. 主动向宿主请求数据（requestData）
 * 3. 注册生命周期事件（visibilitychange/focus/pageshow）
 * 4. 患者切换检测（patientKey = id || mrn || hisPid）
 * 5. NgZone.run 内更新状态，触发变更检测
 */
@Injectable({
  providedIn: 'root'
})
export class MessageService {
  // ── 数据流 ──────────────────────────────────────────────
  private dataSubject = new BehaviorSubject<SmartCareData | null>(null);
  data$ = this.dataSubject.asObservable();

  private stateSubject = new BehaviorSubject<ConnectionState>({
    type: 'waiting',
    text: '等待外层数据'
  });
  state$ = this.stateSubject.asObservable();

  // ── 状态 ──────────────────────────────────────────────
  private currentPatientKey = '';
  private isPlaceholder = false;
  private initialized = false;

  // ── origin 白名单 ─────────────────────────────────────
  private readonly ORIGIN_WHITELIST = [
    location.origin,
    'http://10.35.4.10:60000'  // SmartCare 生产环境
  ];

  constructor(
    private storageService: StorageService,
    private logService: LogService,
    private ngZone: NgZone
  ) {}

  // ── 初始化（应用启动时调用一次）────────────────────────
  init(): void {
    if (this.initialized) {
      this.logService.add('[初始化] 已初始化，跳过', 'info');
      return;
    }
    this.initialized = true;

    this.logService.add('[初始化] 页面加载', 'info');

    // 1. 恢复缓存
    this.restoreFromStorage();

    // 2. 注册消息监听
    this.registerMessageListener();

    // 3. 注册生命周期事件
    this.registerLifecycleEvents();

    // 4. 请求数据
    this.requestData('init');
  }

  // ── 注册消息监听（常驻）────────────────────────────────
  private registerMessageListener(): void {
    window.addEventListener('message', (event) => {
      // origin 校验
      if (!this.isAllowedOrigin(event.origin)) {
        const warnMsg = `[安全] 来源校验失败: origin=${event.origin}，已忽略`;
        console.warn('[MessageService] ' + warnMsg);
        this.logService.add(warnMsg, 'error');
        return;
      }

      try {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        // 从 event.data 顶层取数据（兼容 payload 包装）
        const type = data.type;
        const account = data.account || (data.payload && data.payload.account);
        const patient = data.patient || (data.payload && data.payload.patient);
        const token = data.token || (data.payload && data.payload.token);

        // "无病人"消息处理
        if (type === 'SmartCare' && !patient) {
          this.logService.add('[收到] SmartCare 消息，但无 patient 数据，请选中病人', 'warning');
          this.setState('error', '请选中病人');
          return;
        }

        // 只处理有 patient 的 SmartCare 消息
        if (type === 'SmartCare' && patient) {
          const patientKey = this.getPatientKey(patient);
          this.logService.add(`[收到] SmartCare 消息, patientKey=${patientKey}`, 'success');

          // 无条件处理
          this.processData({ account, patient, token });
          return;
        }

        // 其他消息记录但不处理
        this.logService.add(`[收到] 非 SmartCare 消息: type=${type}`, 'info');

      } catch (error: any) {
        this.logService.add(`[错误] 消息处理失败: ${error.message}`, 'error');
      }
    });
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

  // ── 请求数据 ──────────────────────────────────────────
  requestData(reason: string): void {
    this.logService.add(`[请求] 向外层请求数据, reason=${reason}`, 'info');
    try {
      const target = window.parent !== window ? window.parent : (window.top !== window ? window.top : null);
      if (target) {
        target.postMessage({ type: 'REQUEST_HOST_DATA', payload: { reason } }, '*');
      }
    } catch (e: any) {
      this.logService.add(`[错误] 请求失败: ${e.message}`, 'error');
    }
  }

  // ── 处理数据（无条件消费）─────────────────────────────
  private processData(data: SmartCareData): void {
    const patientKey = this.getPatientKey(data.patient);

    this.logService.add(
      `[处理] patientKey=${patientKey}, currentKey=${this.currentPatientKey || '(空)'}, isPlaceholder=${this.isPlaceholder}`,
      'info'
    );

    // 唯一键变化：强制刷新
    if (patientKey && this.currentPatientKey && patientKey !== this.currentPatientKey) {
      this.logService.add(`[切换] 患者切换: ${this.currentPatientKey} → ${patientKey}`, 'warning');
    }

    // 无条件更新状态
    this.currentPatientKey = patientKey;
    this.isPlaceholder = false;

    // 持久化
    this.storageService.persist(data);

    // ngZone.run() 内更新状态，触发变更检测
    this.ngZone.run(() => {
      this.dataSubject.next(data);
      this.setState('received', '已获取数据');
    });

    // 转发给内层 iframe（如果有）
    this.forwardToIframe(data);
  }

  // ── 转发给内层 iframe ─────────────────────────────────
  private forwardToIframe(data: SmartCareData): void {
    try {
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'PRINT_DATA',
          payload: { type: 'SmartCare', account: data.account, patient: data.patient }
        }, '*');
        const patientKey = this.getPatientKey(data.patient);
        this.logService.add(`[转发] 已转发给内层 iframe, patientKey=${patientKey}`, 'info');
      }
    } catch (error: any) {
      this.logService.add(`[错误] 转发给 iframe 失败: ${error.message}`, 'error');
    }
  }

  // ── 患者唯一键 ────────────────────────────────────────
  getPatientKey(patient: Patient): string {
    if (!patient) return '';
    return String(patient.id || patient.mrn || patient.hisPid || '');
  }

  // ── 设置状态 ──────────────────────────────────────────
  private setState(type: ConnectionState['type'], text: string): void {
    this.stateSubject.next({ type, text });
  }

  // ── origin 校验 ────────────────────────────────────────
  private isAllowedOrigin(origin: string): boolean {
    if (this.ORIGIN_WHITELIST.includes(origin)) return true;
    // 本地开发允许所有
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return true;
    return false;
  }

  // ── 缓存恢复 ──────────────────────────────────────────
  private restoreFromStorage(): void {
    const cached = this.storageService.restore();
    if (!cached) {
      this.logService.add('[缓存] 无缓存数据', 'info');
      return;
    }

    const patientKey = this.getPatientKey(cached.data.patient);
    this.currentPatientKey = patientKey;
    this.isPlaceholder = true;

    this.ngZone.run(() => {
      this.dataSubject.next(cached.data);
      this.setState('cached', '已从缓存恢复（等待最新数据）');
    });

    this.logService.add(`[缓存] 已恢复, patientKey=${patientKey}, 标记为占位`, 'warning');

    // 同步给内层
    this.forwardToIframe(cached.data);
  }
}
