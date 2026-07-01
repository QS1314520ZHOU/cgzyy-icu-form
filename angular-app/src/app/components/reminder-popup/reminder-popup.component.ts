import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MessageService } from '../../services/message.service';

interface PendingItem {
  patientId: string;
  patientName: string;
  bedNo: string;
  scoreType: string;
  scoreName: string;
  level: 'low' | 'mid' | 'high';
  lastScoreTime: string | null;
  reason: string;
}

@Component({
  selector: 'app-reminder-popup',
  templateUrl: './reminder-popup.component.html',
  styleUrls: ['./reminder-popup.component.css']
})
export class ReminderPopupComponent implements OnInit, OnDestroy {
  pendingList: PendingItem[] = [];
  loading = false;

  // 按患者分组
  groupedByPatient: { [patientId: string]: PendingItem[] } = {};

  // 状态
  deptCode: string | null = null;
  doctorId: string | null = null;

  private subscriptions: Subscription[] = [];
  private pollSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // 订阅账号数据
    this.subscriptions.push(
      this.messageService.account$.subscribe(account => {
        if (account) {
          this.doctorId = account.id || null;
          this.deptCode = account.departmentCode || null;
          this.tryLoadPending();
        }
      })
    );

    // 每 15 分钟轮询
    this.pollSubscription = interval(15 * 60 * 1000).subscribe(() => {
      this.loadPending();
    });

    // visibilitychange 补拉
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('focus', this.onFocus);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.pollSubscription) this.pollSubscription.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('focus', this.onFocus);
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.loadPending();
    }
  };

  private onFocus = () => {
    this.loadPending();
  };

  /**
   * 尝试加载待提醒列表
   */
  private tryLoadPending(): void {
    if (this.deptCode && this.doctorId) {
      this.loadPending();
    }
  }

  /**
   * 加载待提醒列表
   */
  loadPending(): void {
    if (!this.deptCode || !this.doctorId) return;

    this.loading = true;
    const params = new HttpParams()
      .set('deptCode', this.deptCode)
      .set('doctorId', this.doctorId);

    this.http.get<{ code: number; data: PendingItem[] }>('/api/reminder/pending', { params }).subscribe({
      next: (response) => {
        if (response.code === 200) {
          this.pendingList = response.data;
          this.groupByPatient();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('加载待提醒列表失败:', error);
        this.loading = false;
      }
    });
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
    // 通知宿主跳转到评分页面
    window.parent.postMessage({
      type: 'GOTO_SCORE',
      payload: { patientId, scoreType }
    }, '*');
  }

  /**
   * 确认已知晓
   */
  ack(patientId: string, scoreType: string): void {
    if (!this.deptCode || !this.doctorId) return;

    this.http.post<{ code: number; msg: string }>('/api/reminder/ack', {
      deptCode: this.deptCode,
      doctorId: this.doctorId,
      patientId,
      scoreType
    }).subscribe({
      next: (response) => {
        if (response.code === 200) {
          // 从列表中移除
          this.pendingList = this.pendingList.filter(
            item => !(item.patientId === patientId && item.scoreType === scoreType)
          );
          this.groupByPatient();
        }
      },
      error: (error) => console.error('确认已知晓失败:', error)
    });
  }
}
