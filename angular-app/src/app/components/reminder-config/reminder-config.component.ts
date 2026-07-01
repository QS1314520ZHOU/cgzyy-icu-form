import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ReminderEngineService, Account } from '../../services/reminder-engine.service';

interface Department { code: string; name: string; shortName: string; }
interface ScoreItem { realName: string; scoreName: string; scoreType: string; configurable: boolean; }
interface RangeRuleItem { min: number|null; max: number|null; value: number; unit: 'hour'|'day'; }
interface RuleConfig { enabled: boolean; value: number; unit: 'hour'|'day'; }
interface RangeRuleConfig { enabled: boolean; rules: RangeRuleItem[]; }
interface AckSnooze { value: number; unit: 'minute'|'hour'|'day'; }
interface ReminderItem {
  scoreType: string; scoreName: string; group: 'doctor'|'nurse';
  enabled: boolean; level: 'low'|'mid'|'high';
  admissionRule: RuleConfig;
  intervalRule: RuleConfig;
  rangeRule: RangeRuleConfig;
}
interface ReminderConfig { deptCode: string; ackSnooze: AckSnooze; items: ReminderItem[]; updatedBy: string; updatedAt: string; }

// ★ 默认规则结构（深拷贝用）
const DEFAULT_ADMISSION_RULE = (): RuleConfig => ({ enabled: false, value: 24, unit: 'hour' });
const DEFAULT_INTERVAL_RULE = (): RuleConfig => ({ enabled: false, value: 7, unit: 'day' });
const DEFAULT_RANGE_RULE = (): RangeRuleConfig => ({ enabled: false, rules: [] });
const DEFAULT_RANGE_RULE_ITEM = (): RangeRuleItem => ({ min: null, max: null, value: 1, unit: 'day' });

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
          // ★ 兼容旧数据：确保 ackSnooze 存在
          if (!this.config.ackSnooze) {
            this.config.ackSnooze = { value: 60, unit: 'minute' };
          }
          // ★ 确保所有项都有完整的规则结构（深拷贝默认值）
          this.config.items = this.config.items.map(i => this.normalizeItem(i));
        }
        this.loading = false;
      },
      error: e => { console.error('加载配置失败:', e); this.loading = false; }
    });
  }

  /**
   * 标准化配置项结构（兼容旧数据，深拷贝默认值避免共享引用）
   */
  private normalizeItem(item: any): ReminderItem {
    return {
      scoreType: item.scoreType || '',
      scoreName: item.scoreName || '',
      group: item.group || 'doctor',
      enabled: item.enabled || false,
      level: item.level || 'mid',
      // ★ 已有保存值则保留，缺字段才补默认（深拷贝）
      admissionRule: item.admissionRule
        ? { ...DEFAULT_ADMISSION_RULE(), ...item.admissionRule }
        : DEFAULT_ADMISSION_RULE(),
      intervalRule: item.intervalRule
        ? { ...DEFAULT_INTERVAL_RULE(), ...item.intervalRule }
        : DEFAULT_INTERVAL_RULE(),
      rangeRule: item.rangeRule
        ? { enabled: item.rangeRule.enabled || false, rules: (item.rangeRule.rules || []).map((r: any) => ({ ...DEFAULT_RANGE_RULE_ITEM(), ...r })) }
        : DEFAULT_RANGE_RULE()
    };
  }

  /**
   * 选择评分项（确保规则结构完整）
   */
  selectScoreType(scoreType: string): void {
    this.selectedScoreType = scoreType;
    if (this.config && !this.config.items.find(i => i.scoreType === scoreType)) {
      const si = [...this.doctorScoreList, ...this.nurseScoreList].find(s => s.scoreType === scoreType);
      if (si) {
        // ★ 新建项时深拷贝默认值
        this.config.items.push({
          scoreType, scoreName: si.scoreName,
          group: this.doctorScoreList.includes(si) ? 'doctor' : 'nurse',
          enabled: false, level: 'mid',
          admissionRule: DEFAULT_ADMISSION_RULE(),
          intervalRule: DEFAULT_INTERVAL_RULE(),
          rangeRule: DEFAULT_RANGE_RULE()
        });
      }
    }
  }

  getSelectedItem(): ReminderItem|null {
    if (!this.config || !this.selectedScoreType) return null;
    const item = this.config.items.find(i => i.scoreType === this.selectedScoreType) || null;
    // ★ 双重保险：如果找到但规则未初始化，补齐
    if (item && !item.admissionRule) item.admissionRule = DEFAULT_ADMISSION_RULE();
    if (item && !item.intervalRule) item.intervalRule = DEFAULT_INTERVAL_RULE();
    if (item && !item.rangeRule) item.rangeRule = DEFAULT_RANGE_RULE();
    return item;
  }

  /**
   * 添加分值区间规则（深拷贝默认值）
   */
  addRangeRuleItem(): void {
    const item = this.getSelectedItem();
    if (item) {
      item.rangeRule.rules.push(DEFAULT_RANGE_RULE_ITEM());
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
    // ★ 保存时确保完整包含 ackSnooze 和每个 item
    const configToSave = {
      ackSnooze: this.config.ackSnooze || { value: 60, unit: 'minute' },
      items: this.config.items.map(item => ({
        scoreType: item.scoreType,
        scoreName: item.scoreName,
        group: item.group,
        enabled: item.enabled,
        level: item.level,
        admissionRule: item.admissionRule || DEFAULT_ADMISSION_RULE(),
        intervalRule: item.intervalRule || DEFAULT_INTERVAL_RULE(),
        rangeRule: item.rangeRule || DEFAULT_RANGE_RULE()
      }))
    };
    this.http.put<{code:number;msg:string}>('/api/reminder/config', {
      deptCode: this.selectedDeptCode, config: configToSave, updatedBy: this.account?.id||'unknown'
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

  isItemEnabled(scoreType: string): boolean {
    if (!this.config || !this.config.items) return false;
    const item = this.config.items.find(i => i.scoreType === scoreType);
    return item ? item.enabled : false;
  }
}
