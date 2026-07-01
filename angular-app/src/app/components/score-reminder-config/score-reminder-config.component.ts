import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageService, ConnectionStatus } from '../../services/message.service';
import { ScoreReminderService, ScoreReminderConfig, Department } from '../../services/score-reminder.service';

@Component({
  selector: 'app-score-reminder-config',
  templateUrl: './score-reminder-config.component.html',
  styleUrls: ['./score-reminder-config.component.css']
})
export class ScoreReminderConfigComponent implements OnInit, OnDestroy {
  // 科室列表
  departments: Department[] = [];
  selectedDeptCode: string | null = null;

  // 配置
  config: ScoreReminderConfig | null = null;
  loading = false;
  saving = false;

  // 从 MessageService 获取的状态
  status: ConnectionStatus = 'waiting';
  token: string | null = null;
  doctorId: string | null = null;
  deptCode: string | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private messageService: MessageService,
    private scoreReminderService: ScoreReminderService
  ) {}

  ngOnInit(): void {
    // 加载科室列表
    this.loadDepartments();

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
          // 如果有 deptCode，自动加载配置
          if (this.deptCode && !this.selectedDeptCode) {
            this.selectedDeptCode = this.deptCode;
            this.loadConfig(this.deptCode);
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * 加载科室列表
   */
  loadDepartments(): void {
    this.scoreReminderService.getDepartments().subscribe({
      next: (response) => {
        if (response.code === 200) {
          this.departments = response.data;
        }
      },
      error: (error) => {
        console.error('[ScoreReminderConfig] 加载科室列表失败:', error);
      }
    });
  }

  /**
   * 科室选择变化
   */
  onDeptChange(deptCode: string): void {
    this.selectedDeptCode = deptCode;
    if (deptCode) {
      this.loadConfig(deptCode);
    } else {
      this.config = null;
    }
  }

  /**
   * 加载配置
   */
  loadConfig(deptCode: string): void {
    this.loading = true;
    this.scoreReminderService.getConfig(deptCode).subscribe({
      next: (response) => {
        if (response.code === 200) {
          this.config = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('[ScoreReminderConfig] 加载配置失败:', error);
        this.loading = false;
      }
    });
  }

  /**
   * 保存配置
   */
  saveConfig(): void {
    if (!this.selectedDeptCode || !this.config) {
      return;
    }

    this.saving = true;
    this.scoreReminderService.updateConfig(
      this.selectedDeptCode,
      this.config.score,
      this.doctorId || 'unknown'
    ).subscribe({
      next: (response) => {
        if (response.code === 200) {
          alert('配置已保存');
        } else {
          alert('保存失败: ' + response.msg);
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('[ScoreReminderConfig] 保存配置失败:', error);
        alert('保存失败');
        this.saving = false;
      }
    });
  }

  /**
   * 添加规则
   */
  addRule(): void {
    if (!this.config) {
      return;
    }

    this.config.score.rules.push({
      scoreType: '',
      scoreName: '',
      enabled: true,
      level: 'mid',
      firstReminderHours: 24,
      intervalDays: 7,
      rangeRules: []
    });
  }

  /**
   * 删除规则
   */
  removeRule(index: number): void {
    if (!this.config) {
      return;
    }

    this.config.score.rules.splice(index, 1);
  }

  /**
   * 添加分值范围规则
   */
  addRangeRule(ruleIndex: number): void {
    if (!this.config) {
      return;
    }

    this.config.score.rules[ruleIndex].rangeRules.push({
      min: 0,
      max: 100,
      intervalDays: 1
    });
  }

  /**
   * 删除分值范围规则
   */
  removeRangeRule(ruleIndex: number, rangeIndex: number): void {
    if (!this.config) {
      return;
    }

    this.config.score.rules[ruleIndex].rangeRules.splice(rangeIndex, 1);
  }

  /**
   * 获取科室显示名称
   */
  getDeptDisplayName(dept: Department): string {
    return `${dept.name}(${dept.code})`;
  }
}
