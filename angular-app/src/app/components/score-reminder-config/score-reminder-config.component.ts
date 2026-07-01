import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
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

  // postMessage 状态
  initialized = false;
  token: string | null = null;
  doctorId: string | null = null;

  private subscriptions: Subscription[] = [];

  constructor(private scoreReminderService: ScoreReminderService) {}

  ngOnInit(): void {
    // 加载科室列表
    this.loadDepartments();

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
        console.warn('[ScoreReminderConfig] 来源校验失败:', event.origin);
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
    this.initialized = true;

    // 如果有 deptCode，默认选中
    if (payload?.deptCode) {
      this.selectedDeptCode = payload.deptCode;
      this.loadConfig(payload.deptCode);
    }

    // 发送 READY 消息
    this.sendReady();
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
