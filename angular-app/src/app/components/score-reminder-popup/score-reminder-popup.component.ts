import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageService, ConnectionStatus } from '../../services/message.service';
import { ScoreReminderService, PendingItem } from '../../services/score-reminder.service';

@Component({
  selector: 'app-score-reminder-popup',
  templateUrl: './score-reminder-popup.component.html',
  styleUrls: ['./score-reminder-popup.component.css']
})
export class ScoreReminderPopupComponent implements OnInit, OnDestroy {
  pendingList: PendingItem[] = [];
  loading = false;

  // 从 MessageService 获取的状态
  status: ConnectionStatus = 'waiting';
  token: string | null = null;
  doctorId: string | null = null;
  deptCode: string | null = null;

  // 按患者分组
  groupedByPatient: { [patientId: string]: PendingItem[] } = {};

  private subscriptions: Subscription[] = [];

  constructor(
    private messageService: MessageService,
    private scoreReminderService: ScoreReminderService
  ) {}

  ngOnInit(): void {
    // ★ 订阅 MessageService 的数据流（不再自己监听 postMessage）
    this.subscriptions.push(
      this.messageService.status$.subscribe(status => {
        this.status = status;
      })
    );

    this.subscriptions.push(
      this.messageService.token$.subscribe(token => {
        this.token = token;
      })
    );

    this.subscriptions.push(
      this.messageService.account$.subscribe(account => {
        if (account) {
          this.doctorId = account.id || null;
        }
      })
    );

    this.subscriptions.push(
      this.messageService.patient$.subscribe(patient => {
        if (patient) {
          this.deptCode = patient.deptCode || null;
          // 如果有 deptCode 和 doctorId，自动加载待提醒列表
          if (this.deptCode && this.doctorId) {
            this.loadPending();
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
}
