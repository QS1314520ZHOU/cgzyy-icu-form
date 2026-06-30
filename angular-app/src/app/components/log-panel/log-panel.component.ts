import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { LogService } from '../../services/log.service';
import { LogEntry } from '../../models/smartcare.model';

@Component({
  selector: 'app-log-panel',
  templateUrl: './log-panel.component.html',
  styleUrls: ['./log-panel.component.css']
})
export class LogPanelComponent implements OnInit, OnDestroy {
  @Output() clearLog = new EventEmitter<void>();

  logs: LogEntry[] = [];
  private subscription!: Subscription;

  constructor(private logService: LogService) {}

  ngOnInit(): void {
    this.subscription = this.logService.logs$.subscribe(logs => {
      this.logs = logs;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onClearLog(): void {
    this.clearLog.emit();
  }
}
