import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ReminderEngineService, PendingItem } from '../../services/reminder-engine.service';

@Component({
  selector: 'app-reminder-overlay',
  templateUrl: './reminder-overlay.component.html',
  styleUrls: ['./reminder-overlay.component.css']
})
export class ReminderOverlayComponent implements OnInit, OnDestroy {
  pendingList: PendingItem[] = [];
  showOverlay = false;

  // 按患者分组
  groupedByPatient: { [patientId: string]: PendingItem[] } = {};

  private subscriptions: Subscription[] = [];

  constructor(private reminderEngine: ReminderEngineService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.reminderEngine.pending$.subscribe(list => {
        this.pendingList = list;
        this.groupByPatient();
      })
    );

    this.subscriptions.push(
      this.reminderEngine.showOverlay$.subscribe(show => {
        this.showOverlay = show;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * 按患者分组
   */
  private groupByPatient(): void {
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
      case 'high': return '#ef4444';
      case 'mid': return '#f97316';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  }

  /**
   * 获取级别标签
   */
  getLevelLabel(level: string): string {
    switch (level) {
      case 'high': return '高级';
      case 'mid': return '中级';
      case 'low': return '低级';
      default: return '未知';
    }
  }

  /**
   * 格式化时间
   */
  formatTime(time: string | null): string {
    if (!time) return '无记录';
    return new Date(time).toLocaleString('zh-CN');
  }

  /**
   * 去评分
   */
  goToScore(patientId: string, scoreType: string): void {
    window.parent.postMessage({
      type: 'GOTO_SCORE',
      payload: { patientId, scoreType }
    }, '*');
  }

  /**
   * 确认已知晓
   */
  ack(patientId: string, scoreType: string): void {
    this.reminderEngine.ack(patientId, scoreType);
  }

  /**
   * 关闭遮罩
   */
  close(): void {
    this.reminderEngine.closeOverlay();
  }
}
