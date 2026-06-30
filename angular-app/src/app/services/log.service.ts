import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LogEntry } from '../models/smartcare.model';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private logsSubject = new BehaviorSubject<LogEntry[]>([]);
  logs$ = this.logsSubject.asObservable();

  private logs: LogEntry[] = [];

  constructor(private ngZone: NgZone) {}

  /**
   * 添加日志
   */
  add(message: string, type: LogEntry['type'] = 'info'): void {
    const time = this.formatTime(new Date());
    const entry: LogEntry = { time, message, type };

    this.logs.push(entry);

    this.ngZone.run(() => {
      this.logsSubject.next([...this.logs]);
    });

    // 同时输出到控制台
    const prefix = `[${time}]`;
    switch (type) {
      case 'success':
        console.log(prefix, message);
        break;
      case 'warning':
        console.warn(prefix, message);
        break;
      case 'error':
        console.error(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = [];
    this.ngZone.run(() => {
      this.logsSubject.next([]);
    });
    this.add('日志已清空', 'info');
  }

  /**
   * 格式化时间
   */
  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai'
    }).format(date);
  }
}
