import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ReminderEngineService, Account } from '../../services/reminder-engine.service';

interface Department { code: string; name: string; shortName: string; }
interface ScoreItem { realName: string; scoreName: string; scoreType: string; configurable: boolean; }
interface RangeRule { min: number; max: number; intervalDays: number; }
interface ReminderItem {
  scoreType: string; scoreName: string; group: 'doctor'|'nurse';
  enabled: boolean; level: 'low'|'mid'|'high';
  admissionNoScoreHours: number; intervalDays: number; rangeRules: RangeRule[];
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
    this.subscriptions.push(
      this.reminderEngine.account$.subscribe(account => {
        this.account = account;
        if (account?.departmentCode && !this.selectedDeptCode) {
          this.selectedDeptCode = account.departmentCode;
          this.loadScoreItems(account.departmentCode);
          this.loadConfig(account.departmentCode);
        }
      })
    );
    this.loadDepartments();
  }

  ngOnDestroy(): void { this.subscriptions.forEach(s => s.unsubscribe()); }

  loadDepartments(): void {
    this.http.get<{code:number;data:Department[]}>('/api/reminder/departments').subscribe({
      next: r => { if (r.code === 200) this.departments = r.data; },
      error: e => console.error('加载科室失败:', e)
    });
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
      next: r => { if (r.code === 200) { this.config = r.data; if (!this.config.items) this.config.items = []; } this.loading = false; },
      error: e => { console.error('加载配置失败:', e); this.loading = false; }
    });
  }

  selectScoreType(scoreType: string): void {
    this.selectedScoreType = scoreType;
    if (this.config && !this.config.items.find(i => i.scoreType === scoreType)) {
      const si = [...this.doctorScoreList, ...this.nurseScoreList].find(s => s.scoreType === scoreType);
      if (si) this.config.items.push({
        scoreType, scoreName: si.scoreName,
        group: this.doctorScoreList.includes(si) ? 'doctor' : 'nurse',
        enabled: true, level: 'mid', admissionNoScoreHours: 24, intervalDays: 7, rangeRules: []
      });
    }
  }

  getSelectedItem(): ReminderItem|null {
    if (!this.config || !this.selectedScoreType) return null;
    return this.config.items.find(i => i.scoreType === this.selectedScoreType) || null;
  }

  addRangeRule(): void { const i = this.getSelectedItem(); if (i) i.rangeRules.push({min:0,max:100,intervalDays:1}); }
  removeRangeRule(idx: number): void { const i = this.getSelectedItem(); if (i) i.rangeRules.splice(idx,1); }

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
}
