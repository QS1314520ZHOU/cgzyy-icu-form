import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ScoreReminderService, PendingItem } from '../../services/score-reminder.service';

@Component({
  selector: 'app-score-reminder',
  templateUrl: './score-reminder.component.html',
  styleUrls: ['./score-reminder.component.css']
})
export class ScoreReminderComponent implements OnInit, OnDestroy {
  pendingList: PendingItem[] = [];
  showModal = false;
  private subscriptions: Subscription[] = [];

  // 按患者分组
  groupedByPatient: { [patientId: string]: PendingItem[] } = {};

  constructor(private scoreReminderService: ScoreReminderService) {}

  ngOnInit(): void {
    // 订阅待提醒列表
    this.subscriptions.push(
      this.scoreReminderService.pending$.subscribe(list => {
        this.pendingList = list;
        this.groupByPatient();
      })
    );

    // 订阅弹窗显示状态
    this.subscriptions.push(
      this.scoreReminderService.showModal$.subscribe(show => {
        this.showModal = show;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
    // 这里可以发送消息给父应用，让父应用跳转到评分页面
    console.log(`跳转到评分页面: patientId=${patientId}, scoreType=${scoreType}`);

    // 示例：通过 postMessage 通知父应用
    window.parent.postMessage({
      type: 'GOTO_SCORE',
      payload: { patientId, scoreType }
    }, '*');
  }

  /**
   * 确认已知晓
   */
  ack(patientId: string, scoreType: string): void {
    // 这里需要从登录态获取 deptCode 和 doctorId
    // 示例：假设从某个服务获取
    const deptCode = 'ICU'; // TODO: 从登录态获取
    const doctorId = 'doctor1'; // TODO: 从登录态获取

    this.scoreReminderService.ackAndRefresh(deptCode, doctorId, patientId, scoreType);
  }

  /**
   * 关闭弹窗
   */
  closeModal(): void {
    this.scoreReminderService.closeModal();
  }

  /**
   * 阻止事件冒泡
   */
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
