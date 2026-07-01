import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ReminderEngineService, Account } from '../../services/reminder-engine.service';

interface Department { code: string; name: string; shortName: string; }
interface ScoreItem { realName: string; scoreName: string; scoreType: string; configurable: boolean; }
interface RangeRuleItem { min: number; max: number; value: number; unit: 'hour'|'day'; }
interface RuleConfig { enabled: boolean; value: number; unit: 'hour'|'day'; }
interface RangeRuleConfig { enabled: boolean; rules: RangeRuleItem[]; }
interface ReminderItem {
  scoreType: string; scoreName: string; group: 'doctor'|'nurse';
  enabled: boolean; level: 'low'|'mid'|'high';
  admissionRule: RuleConfig;
  intervalRule: RuleConfig;
  rangeRule: RangeRuleConfig;
}
interface ReminderConfig { deptCode: string; ackSnoozeMinutes: number; items: ReminderItem[]; updatedBy: string; updatedAt: string; }

@Component({
  selector: 'app-reminder-config',
  templateUrl: './reminder-config.component.html',
  styleUrls: ['./reminder-config.component.css']
})
export class ReminderConfigComponent implements OnInit, OnDestroy {
  departments: Department[] = [];
  selectedDeptCode: string | null = null;
  doctorScoreList: ScoreItem[] = [];
  nurseScoreList: ScoreItem[] = [];
  config: ReminderConfig | null = null;
  selectedScoreType: string | null = null;
  loading = false;
  saving = false;
  account: Account | null = null;
  showCopyDialog = false;
  targetDeptCodes: string[] = [];
  private subscriptions: Subscription[] = [];

  constructor(private http: HttpClient, private reminderEngine: ReminderEngineService) {}

  ngOnInit(): void {
    this.loadDepartments();
  }

  ngOnDestroy(): void { this.subscriptions.forEach(s => s.unsubscribe()); }

  loadDepartments(): void {
    this.http.get<{code:number;data:Department[]}>('/api/reminder/departments').subscribe({
      next: r => {
        if (r.code === 200) {
          this.departments = r.data;
          this.setDefaultDept();
        }
      },
      error: e => console.error('加载科室失败:', e)
    });
  }

  private setDefaultDept(): void {
    let deptCode: string | null = null;
    try {
      const cached = sessionStorage.getItem('icu_last_account');
      if (cached) {
        const data = JSON.parse(cached);
        deptCode = data?.account?.departmentCode || null;
      }
    } catch {}

    if (!deptCode) {
      this.subscriptions.push(
        this.reminderEngine.account$.subscribe(account => {
          this.account = account;
          if (account?.departmentCode && !this.selectedDeptCode) {
            this.applyDefaultDept(account.departmentCode);
          }
        })
      );
      return;
    }

    this.applyDefaultDept(deptCode);
  }

  private applyDefaultDept(deptCodeStr: string): void {
    const firstCode = deptCodeStr.split(',')[0].trim();
    const found = this.departments.find(d => d.code === firstCode);

    if (found) {
      this.selectedDeptCode = firstCode;
    } else if (this.departments.length > 0) {
      this.selectedDeptCode = this.departments[0].code;
    }

    if (this.selectedDeptCode) {
      this.loadScoreItems(this.selectedDeptCode);
      this.loadConfig(this.selectedDeptCode);
    }
  }

  onDeptChange(deptCode: string): void {
    this.selectedDeptCode = deptCode;
    this.selectedScoreType = null;
    if (deptCode) { this.loadScoreItems(deptCode); this.loadConfig(deptCode); }
  }

  loadScoreItems(deptCode: string): void {
    this.http.get<{code:number;data:{doctorScoreList:ScoreItem[];nurseScoreList:ScoreItem[]}}>(
      `/api/reminder/scoreItems?deptCode=${deptCode}`
    ).subscribe({
      next: r => { if (r.code === 200) { this.doctorScoreList = r.data.doctorScoreList||[]; this.nurseScoreList = r.data.nurseScoreList||[]; } },
      error: e => console.error('加载评分项失败:', e)
    });
  }

  loadConfig(deptCode: string): void {
    this.loading = true;
    this.http.get<{code:number;data:ReminderConfig}>(`/api/reminder/config?deptCode=${deptCode}`).subscribe({
      next: r => {
        if (r.code === 200) {
          this.config = r.data;
          if (!this.config.items) this.config.items = [];
          // 确保所有项都有新结构
          this.config.items = this.config.items.map(i => this.normalizeItem(i));
        }
        this.loading = false;
      },
      error: e => { console.error('加载配置失败:', e); this.loading = false; }
    });
  }

  /**
   * 标准化配置项结构（兼容旧数据）
   */
  private normalizeItem(item: any): ReminderItem {
    return {
      scoreType: item.scoreType || '',
      scoreName: item.scoreName || '',
      group: item.group || 'doctor',
      enabled: item.enabled || false,
      level: item.level || 'mid',
      admissionRule: item.admissionRule || { enabled: false, value: 24, unit: 'hour' },
      intervalRule: item.intervalRule || { enabled: false, value: 7, unit: 'day' },
      rangeRule: item.rangeRule || { enabled: false, rules: [] }
    };
  }

  selectScoreType(scoreType: string): void {
    this.selectedScoreType = scoreType;
    if (this.config && !this.config.items.find(i => i.scoreType === scoreType)) {
      const si = [...this.doctorScoreList, ...this.nurseScoreList].find(s => s.scoreType === scoreType);
      if (si) this.config.items.push({
        scoreType, scoreName: si.scoreName,
        group: this.doctorScoreList.includes(si) ? 'doctor' : 'nurse',
        enabled: false, level: 'mid',
        admissionRule: { enabled: false, value: 24, unit: 'hour' },
        intervalRule: { enabled: false, value: 7, unit: 'day' },
        rangeRule: { enabled: false, rules: [] }
      });
    }
  }

  getSelectedItem(): ReminderItem|null {
    if (!this.config || !this.selectedScoreType) return null;
    return this.config.items.find(i => i.scoreType === this.selectedScoreType) || null;
  }

  addRangeRuleItem(): void {
    const item = this.getSelectedItem();
    if (item) {
      item.rangeRule.rules.push({ min: 0, max: 100, value: 7, unit: 'day' });
    }
  }

  removeRangeRuleItem(idx: number): void {
    const item = this.getSelectedItem();
    if (item) {
      item.rangeRule.rules.splice(idx, 1);
    }
  }

  saveConfig(): void {
    if (!this.selectedDeptCode || !this.config) return;
    this.saving = true;
    this.http.put<{code:number;msg:string}>('/api/reminder/config', {
      deptCode: this.selectedDeptCode, config: this.config, updatedBy: this.account?.id||'unknown'
    }).subscribe({
      next: r => { alert(r.code===200?'配置已保存':'保存失败: '+r.msg); this.saving=false; },
      error: e => { console.error('保存失败:',e); alert('保存失败'); this.saving=false; }
    });
  }

  copyToOtherDepts(): void {
    if (!this.selectedDeptCode || !this.targetDeptCodes.length) return;
    this.http.post<{code:number;msg:string}>('/api/reminder/config/copy', {
      sourceDeptCode: this.selectedDeptCode, targetDeptCodes: this.targetDeptCodes, updatedBy: this.account?.id||'unknown'
    }).subscribe({
      next: r => { if (r.code===200) { alert('已复制'); this.showCopyDialog=false; this.targetDeptCodes=[]; } else alert('复制失败'); },
      error: e => { console.error('复制失败:',e); alert('复制失败'); }
    });
  }

  resetConfig(): void {
    if (!this.selectedDeptCode || !confirm('确定恢复初始值？')) return;
    this.http.post<{code:number;msg:string}>('/api/reminder/config/reset', {
      deptCode: this.selectedDeptCode, updatedBy: this.account?.id||'unknown'
    }).subscribe({
      next: r => { if (r.code===200) { alert('已恢复'); this.loadConfig(this.selectedDeptCode!); } },
      error: e => { console.error('恢复失败:',e); alert('恢复失败'); }
    });
  }

  getDeptDisplayName(d: Department): string { return `${d.name}(${d.shortName})`; }

  /**
   * 检查评分项是否已启用
   */
  isItemEnabled(scoreType: string): boolean {
    if (!this.config || !this.config.items) return false;
    const item = this.config.items.find(i => i.scoreType === scoreType);
    return item ? item.enabled : false;
  }
}
