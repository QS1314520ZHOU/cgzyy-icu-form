import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageService, SmartCareData } from './services/message.service';
import { LogService } from './services/log.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'ICU 数据展示';

  // 状态
  connectionState: 'waiting' | 'received' | 'cached' | 'error' = 'waiting';
  stateText = '等待外层数据';
  updatedAt = '';
  patientKey = '';

  // 数据
  currentData: SmartCareData | null = null;
  isEmpty = true;

  private subscription!: Subscription;

  constructor(
    private messageService: MessageService,
    private logService: LogService
  ) {}

  ngOnInit(): void {
    // 订阅数据变化
    this.subscription = this.messageService.data$.subscribe(data => {
      if (data) {
        this.currentData = data;
        this.patientKey = this.messageService.getPatientKey(data.patient);
        this.isEmpty = false;
        this.connectionState = 'received';
        this.stateText = '已获取数据';
        this.updatedAt = this.formatDateTime(new Date());
      }
    });

    // 订阅状态变化
    this.messageService.state$.subscribe(state => {
      this.connectionState = state.type;
      this.stateText = state.text;
    });

    // 初始化
    this.messageService.init();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  clearLog(): void {
    this.logService.clear();
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Shanghai'
    }).format(date);
  }
}
