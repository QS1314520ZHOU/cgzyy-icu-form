import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MessageService, Account } from '../../services/message.service';

interface Department {
  code: string;
  name: string;
  shortName: string;
}

interface ScoreItem {
  realName: string;
  scoreName: string;
  scoreType: string;
  configurable: boolean;
  printToForm: boolean;
}

interface RangeRule {
  min: number;
  max: number;
  intervalDays: number;
}

interface ReminderItem {
  scoreType: string;
  scoreName: string;
  group: 'doctor' | 'nurse';
  enabled: boolean;
  level: 'low' | 'mid' | 'high';
  admissionNoScoreHours: number;
  intervalDays: number;
  rangeRules: RangeRule[];
}

interface ReminderConfig {
  deptCode: string;
  ackSnoozeMinutes: number;
  items: ReminderItem[];
  updatedBy: string;
  updatedAt: string;
}

@Component({
  selector: 'app-reminder-config',
  templateUrl: './reminder-config.component.html',
  styleUrls: ['./reminder-config.component.css']
})
export class ReminderConfigComponent implements OnInit, OnDestroy {
  // 科室
  departments: Department[] = [];
  selectedDeptCode: string | null = null;

  // 评分项
  doctorScoreList: ScoreItem[] = [];
  nurseScoreList: ScoreItem[] = [];

  // 配置
  config: ReminderConfig | null = null;
  selectedScoreType: string | null = null;

  // 状态
  loading = false;
  saving = false;
  account: Account | null = null;

  // 复制到其他科室
  showCopyDialog = false;
  targetDeptCodes: string[] = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // 订阅账号数据
    this.subscriptions.push(
      this.messageService.account$.subscribe(account => {
        this.account = account;
        // 如果有 departmentCode，自动选中
        if (account?.departmentCode && !this.selectedDeptCode) {
          this.selectedDeptCode = account.departmentCode;
          this.loadScoreItems(account.departmentCode);
          this.loadConfig(account.departmentCode);
        }
      })
    );

    // 加载科室列表
    this.loadDepartments();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * 加载科室列表
   */
  loadDepartments(): void {
    this.http.get<{ code: number; data: Department[] }>('/api/departments').subscribe({
      next: (response) => {
        if (response.code === 200) {
          this.departments = response.data;
        }
      },
      error: (error) => console.error('加载科室列表失败:', error)
    });
  }

  /**
   * 科室选择变化
   */
  onDeptChange(deptCode: string): void {
    this.selectedDeptCode = deptCode;
    this.selectedScoreType = null;
    if (deptCode) {
      this.loadScoreItems(deptCode);
      this.loadConfig(deptCode);
    }
  }

  /**
   * 加载评分项
   */
  loadScoreItems(deptCode: string): void {
    this.http.get<{ code: number; data: { doctorScoreList: ScoreItem[]; nurseScoreList: ScoreItem[] } }>(
      `/api/reminder/scoreItems?deptCode=${deptCode}`
    ).subscribe({
      next: (response) => {
        if (response.code === 200) {
          this.doctorScoreList = response.data.doctorScoreList || [];
          this.nurseScoreList = response.data.nurseScoreList || [];
        }
      },
      error: (error) => console.error('加载评分项失败:', error)
    });
  }

  /**
   * 加载配置
   */
  loadConfig(deptCode: string): void {
    this.loading = true;
    this.http.get<{ code: number; data: ReminderConfig }>(`/api/reminder/config?deptCode=${deptCode}`).subscribe({
      next: (response) => {
        if (response.code === 200) {
          this.config = response.data;
          // 如果配置为空，初始化默认配置
          if (!this.config.items) {
            this.config.items = [];
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('加载配置失败:', error);
        this.loading = false;
      }
    });
  }

  /**
   * 选择评分项
   */
  selectScoreType(scoreType: string): void {
    this.selectedScoreType = scoreType;

    // 如果配置中没有该项，添加默认配置
    if (this.config && !this.config.items.find(i => i.scoreType === scoreType)) {
      const scoreItem = [...this.doctorScoreList, ...this.nurseScoreList].find(s => s.scoreType === scoreType);
      if (scoreItem) {
        this.config.items.push({
          scoreType,
          scoreName: scoreItem.scoreName,
          group: this.doctorScoreList.includes(scoreItem) ? 'doctor' : 'nurse',
          enabled: true,
          level: 'mid',
          admissionNoScoreHours: 24,
          intervalDays: 7,
          rangeRules: []
        });
      }
    }
  }

  /**
   * 获取当前选中项配置
   */
  getSelectedItem(): ReminderItem | null {
    if (!this.config || !this.selectedScoreType) return null;
    return this.config.items.find(i => i.scoreType === this.selectedScoreType) || null;
  }

  /**
   * 添加分值范围规则
   */
  addRangeRule(): void {
    const item = this.getSelectedItem();
    if (item) {
      item.rangeRules.push({ min: 0, max: 100, intervalDays: 1 });
    }
  }

  /**
   * 删除分值范围规则
   */
  removeRangeRule(index: number): void {
    const item = this.getSelectedItem();
    if (item) {
      item.rangeRules.splice(index, 1);
    }
  }

  /**
   * 保存配置
   */
  saveConfig(): void {
    if (!this.selectedDeptCode || !this.config) return;

    this.saving = true;
    this.http.put<{ code: number; msg: string }>('/api/reminder/config', {
      deptCode: this.selectedDeptCode,
      config: this.config,
      updatedBy: this.account?.id || 'unknown'
    }).subscribe({
      next: (response) => {
        if (response.code === 200) {
          alert('配置已保存');
        } else {
          alert('保存失败: ' + response.msg);
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('保存配置失败:', error);
        alert('保存失败');
        this.saving = false;
      }
    });
  }

  /**
   * 复制到其他科室
   */
  copyToOtherDepts(): void {
    if (!this.selectedDeptCode || this.targetDeptCodes.length === 0) return;

    this.http.post<{ code: number; msg: string }>('/api/reminder/config/copy', {
      sourceDeptCode: this.selectedDeptCode,
      targetDeptCodes: this.targetDeptCodes,
      updatedBy: this.account?.id || 'unknown'
    }).subscribe({
      next: (response) => {
        if (response.code === 200) {
          alert('配置已复制');
          this.showCopyDialog = false;
          this.targetDeptCodes = [];
        } else {
          alert('复制失败: ' + response.msg);
        }
      },
      error: (error) => {
        console.error('复制配置失败:', error);
        alert('复制失败');
      }
    });
  }

  /**
   * 恢复初始值
   */
  resetConfig(): void {
    if (!this.selectedDeptCode) return;
    if (!confirm('确定要恢复初始值吗？当前配置将被清除。')) return;

    this.http.post<{ code: number; msg: string }>('/api/reminder/config/reset', {
      deptCode: this.selectedDeptCode,
      updatedBy: this.account?.id || 'unknown'
    }).subscribe({
      next: (response) => {
        if (response.code === 200) {
          alert('已恢复初始值');
          this.loadConfig(this.selectedDeptCode!);
        } else {
          alert('恢复失败: ' + response.msg);
        }
      },
      error: (error) => {
        console.error('恢复初始值失败:', error);
        alert('恢复失败');
      }
    });
  }

  /**
   * 获取科室显示名称
   */
  getDeptDisplayName(dept: Department): string {
    return `${dept.name}(${dept.shortName})`;
  }

  /**
   * 获取评分项显示名称
   */
  getScoreDisplayName(item: ScoreItem): string {
    return `${item.scoreName}(${item.scoreType})`;
  }
}
