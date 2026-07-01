import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subject } from 'rxjs';
import { switchMap, takeUntil, filter } from 'rxjs/operators';

export interface Department {
  code: string;
  name: string;
  shortName: string;
}

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

export interface ScoreReminderConfig {
  deptCode: string;
  score: {
    enabled: boolean;
    ackSnoozeMinutes: number;
    onlyBedPatients: boolean;
    patientScope: string;
    rules: Array<{
      scoreType: string;
      scoreName: string;
      enabled: boolean;
      level: 'low' | 'mid' | 'high';
      firstReminderHours: number;
      intervalDays: number;
      rangeRules: Array<{
        min: number;
        max: number;
        intervalDays: number;
      }>;
    }>;
  };
  updatedBy: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ScoreReminderService {
  private apiUrl = '/api/score-reminder';

  // 待提醒列表
  private pendingSubject = new BehaviorSubject<PendingItem[]>([]);
  pending$ = this.pendingSubject.asObservable();

  // 是否显示弹窗
  private showModalSubject = new BehaviorSubject<boolean>(false);
  showModal$ = this.showModalSubject.asObservable();

  // 轮询控制
  private destroy$ = new Subject<void>();
  private pollInterval = 15 * 60 * 1000; // 15 分钟

  constructor(private http: HttpClient) {}

  /**
   * 获取科室列表
   */
  getDepartments(): Observable<{ code: number; data: Department[] }> {
    return this.http.get<{ code: number; data: Department[] }>(
      `${this.apiUrl}/departments`
    );
  }

  /**
   * 获取待提醒列表
   */
  getPending(deptCode: string, doctorId: string): Observable<{ code: number; data: PendingItem[] }> {
    const params = new HttpParams()
      .set('deptCode', deptCode)
      .set('doctorId', doctorId);

    return this.http.get<{ code: number; data: PendingItem[] }>(
      `${this.apiUrl}/pending`,
      { params }
    );
  }

  /**
   * 确认已知晓
   */
  ack(deptCode: string, doctorId: string, patientId: string, scoreType: string): Observable<{ code: number; msg: string }> {
    const params = new HttpParams()
      .set('deptCode', deptCode)
      .set('doctorId', doctorId);

    return this.http.post<{ code: number; msg: string }>(
      `${this.apiUrl}/ack`,
      { patientId, scoreType },
      { params }
    );
  }

  /**
   * 获取配置
   */
  getConfig(deptCode: string): Observable<{ code: number; data: ScoreReminderConfig }> {
    const params = new HttpParams().set('deptCode', deptCode);

    return this.http.get<{ code: number; data: ScoreReminderConfig }>(
      `${this.apiUrl}/config`,
      { params }
    );
  }

  /**
   * 更新配置
   */
  updateConfig(deptCode: string, score: any, updatedBy: string): Observable<{ code: number; msg: string }> {
    return this.http.put<{ code: number; msg: string }>(
      `${this.apiUrl}/config`,
      { deptCode, score, updatedBy }
    );
  }

  /**
   * 启动轮询
   */
  startPolling(deptCode: string, doctorId: string): void {
    // 停止之前的轮询
    this.stopPolling();

    // 立即拉取一次
    this.fetchPending(deptCode, doctorId);

    // 启动轮询
    interval(this.pollInterval)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.getPending(deptCode, doctorId))
      )
      .subscribe({
        next: (response) => {
          if (response.code === 200) {
            this.pendingSubject.next(response.data);
            if (response.data.length > 0) {
              this.showModalSubject.next(true);
            }
          }
        },
        error: (error) => {
          console.error('[ScoreReminderService] 轮询失败:', error);
        }
      });
  }

  /**
   * 停止轮询
   */
  stopPolling(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$ = new Subject<void>();
  }

  /**
   * 拉取待提醒列表
   */
  fetchPending(deptCode: string, doctorId: string): void {
    this.getPending(deptCode, doctorId).subscribe({
      next: (response) => {
        if (response.code === 200) {
          this.pendingSubject.next(response.data);
          if (response.data.length > 0) {
            this.showModalSubject.next(true);
          }
        }
      },
      error: (error) => {
        console.error('[ScoreReminderService] 拉取待提醒列表失败:', error);
      }
    });
  }

  /**
   * 关闭弹窗
   */
  closeModal(): void {
    this.showModalSubject.next(false);
  }

  /**
   * 确认已知晓并刷新
   */
  ackAndRefresh(deptCode: string, doctorId: string, patientId: string, scoreType: string): void {
    this.ack(deptCode, doctorId, patientId, scoreType).subscribe({
      next: (response) => {
        if (response.code === 200) {
          // 刷新待提醒列表
          this.fetchPending(deptCode, doctorId);
        }
      },
      error: (error) => {
        console.error('[ScoreReminderService] 确认已知晓失败:', error);
      }
    });
  }
}
