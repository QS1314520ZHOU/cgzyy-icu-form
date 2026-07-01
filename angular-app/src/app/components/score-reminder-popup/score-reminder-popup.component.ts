import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ScoreReminderService, PendingItem } from '../../services/score-reminder.service';

@Component({
  selector: 'app-score-reminder-popup',
  templateUrl: './score-reminder-popup.component.html',
  styleUrls: ['./score-reminder-popup.component.css']
})
export class ScoreReminderPopupComponent implements OnInit, OnDestroy {
  pendingList: PendingItem[] = [];
  loading = false;

  // postMessage 状态
  initialized = false;
  token: string | null = null;
  doctorId: string | null = null;
  deptCode: string | null = null;

  // 按患者分组
  groupedByPatient: { [patientId: string]: PendingItem[] } = {};

  private subscriptions: Subscription[] = [];

  constructor(private scoreReminderService: ScoreReminderService) {}

  ngOnInit(): void {
    // 监听 postMessage
    this.setupPostMessageListener();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * 监听 postMessage
   */
  private setupPostMessageListener(): void {
    window.addEventListener('message', (event) => {
      // 校验 origin
      if (!this.isAllowedOrigin(event.origin)) {
        console.warn('[ScoreReminderPopup] 来源校验失败:', event.origin);
        return;
      }

      // 校验 channel
      if (event.data?.channel !== 'smartcare.scoreReminder.v1') {
        return;
      }

      const { type, payload } = event.data;

      if (type === 'INIT') {
        this.handleInit(payload);
      }
    });
  }

  /**
   * 处理 INIT 消息
   */
  private handleInit(payload: any): void {
    this.token = payload?.token || null;
    this.doctorId = payload?.doctorId || null;
    this.deptCode = payload?.deptCode || null;
    this.initialized = true;

    // 发送 READY 消息
    this.sendReady();

    // 如果有 deptCode 和 doctorId，加载待提醒列表
    if (this.deptCode && this.doctorId) {
      this.loadPending();
    }
  }

  /**
   * 发送 READY 消息
   */
  private sendReady(): void {
    window.parent.postMessage({
      channel: 'smartcare.scoreReminder.v1',
      type: 'READY',
      payload: { ok: true }
    }, '*');
  }

  /**
   * 校验 origin
   */
  private isAllowedOrigin(origin: string): boolean {
    // 本地开发允许所有
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return true;
    }
    // TODO: 添加生产环境 origin 白名单
    return true;
  }

  /**
   * 加载待提醒列表
   */
  loadPending(): void {
    if (!this.deptCode || !this.doctorId) {
      return;
    }

    this.loading = true;
    this.scoreReminderService.getPending(this.deptCode, this.doctorId).subscribe({
      next: (response) => {
        if (response.code === 200) {
          this.pendingList = response.data;
          this.groupByPatient();

          // 通知父页面调整大小
          this.sendResize();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('[ScoreReminderPopup] 加载待提醒列表失败:', error);
        this.loading = false;
      }
    });
  }

  /**
   * 按患者分组
   */
  groupByPatient(): void {
    this.groupedByPatient = {};
    for (const item of this.pendingList) {
      if (!this.groupedByPatient[item.patientId]) {
        this.groupedByPatient[item.patientId] = [];
      }
      this.groupedByPatient[item.patientId].push(item);
    }
  }

  /**
   * 获取患者列表
   */
  getPatientIds(): string[] {
    return Object.keys(this.groupedByPatient);
  }

  /**
   * 获取级别颜色
   */
  getLevelColor(level: string): string {
    switch (level) {
      case 'high':
        return '#ef4444'; // 红色
      case 'mid':
        return '#f97316'; // 橙色
      case 'low':
        return '#3b82f6'; // 蓝色
      default:
        return '#6b7280'; // 灰色
    }
  }

  /**
   * 获取级别标签
   */
  getLevelLabel(level: string): string {
    switch (level) {
      case 'high':
        return '紧急';
      case 'mid':
        return '重要';
      case 'low':
        return '一般';
      default:
        return '未知';
    }
  }

  /**
   * 格式化时间
   */
  formatTime(time: string | null): string {
    if (!time) {
      return '无记录';
    }
    return new Date(time).toLocaleString('zh-CN');
  }

  /**
   * 去评分
   */
  goToScore(patientId: string, scoreType: string): void {
    // 通知父页面跳转到评分页面
    window.parent.postMessage({
      channel: 'smartcare.scoreReminder.v1',
      type: 'GOTO_SCORE',
      payload: { patientId, scoreType }
    }, '*');
  }

  /**
   * 确认已知晓
   */
  ack(patientId: string, scoreType: string): void {
    if (!this.deptCode || !this.doctorId) {
      return;
    }

    this.scoreReminderService.ackAndRefresh(
      this.deptCode,
      this.doctorId,
      patientId,
      scoreType
    );

    // 通知父页面已知晓
    window.parent.postMessage({
      channel: 'smartcare.scoreReminder.v1',
      type: 'ACKED',
      payload: { patientId, scoreType }
    }, '*');
  }

  /**
   * 关闭弹窗
   */
  close(): void {
    // 通知父页面关闭
    window.parent.postMessage({
      channel: 'smartcare.scoreReminder.v1',
      type: 'CLOSE',
      payload: {}
    }, '*');
  }

  /**
   * 通知父页面调整大小
   */
  private sendResize(): void {
    window.parent.postMessage({
      channel: 'smartcare.scoreReminder.v1',
      type: 'RESIZE',
      payload: { height: document.body.scrollHeight }
    }, '*');
  }
}
