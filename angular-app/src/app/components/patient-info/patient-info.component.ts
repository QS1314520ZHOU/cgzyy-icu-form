import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Patient } from '../../models/smartcare.model';

interface KeyField {
  key: string;
  label: string;
  fallback?: string[];
  map?: Record<string, string>;
  isTime?: boolean;
}

@Component({
  selector: 'app-patient-info',
  templateUrl: './patient-info.component.html',
  styleUrls: ['./patient-info.component.css']
})
export class PatientInfoComponent implements OnChanges {
  @Input() patient!: Patient;
  @Input() updatedAt = '';

  keyInfoItems: { label: string; value: string }[] = [];

  // 枚举映射
  private readonly GENDER_MAP: Record<string, string> = { Female: '女', Male: '男' };
  private readonly STATUS_MAP: Record<string, string> = { admitted: '在科', discharged: '出科' };

  // 置顶关键信息字段定义
  private readonly KEY_FIELDS: KeyField[] = [
    { key: 'name', label: '患者姓名' },
    { key: 'gender', label: '性别', map: this.GENDER_MAP },
    { key: 'age', label: '年龄', fallback: ['childAge', 'admissionAge'] },
    { key: 'hisBed', label: '床位', fallback: ['showBed'] },
    { key: 'mrn', label: '住院号' },
    { key: 'hisPid', label: '住院流水号' },
    { key: 'dept', label: '科室' },
    { key: 'status', label: '状态', map: this.STATUS_MAP },
    { key: 'clinicalDiagnosis', label: '临床诊断', fallback: ['admissionDiagnosis'] },
    { key: 'icuAdmissionTime', label: 'ICU入科时间', isTime: true },
    { key: 'bedDoctorId', label: '管床医生', fallback: ['bedDoctor', 'treatedDoctor'] },
    { key: 'insuranceType', label: '费别' }
  ];

  // 时间字段名关键词
  private readonly TIME_FIELD_KEYWORDS = ['Time', 'time', 'birthday', 'createdTime', 'bedTime', 'Admission', 'admission'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patient'] && this.patient) {
      this.renderKeyInfo();
    }
  }

  private renderKeyInfo(): void {
    this.keyInfoItems = this.KEY_FIELDS.map(field => {
      let value = this.getFieldValue(this.patient, field);

      // 枚举映射
      if (field.map && value != null) {
        value = field.map[value] || value;
      }

      // 时间格式化
      if (field.isTime && value != null) {
        const formatted = this.formatEpoch(value);
        if (formatted) value = formatted;
      }

      return {
        label: field.label,
        value: this.formatDisplayValue(value)
      };
    });
  }

  private getFieldValue(obj: any, field: KeyField): any {
    if (obj[field.key] != null && obj[field.key] !== '') return obj[field.key];
    if (field.fallback) {
      for (const fb of field.fallback) {
        if (obj[fb] != null && obj[fb] !== '') return obj[fb];
      }
    }
    return null;
  }

  private formatEpoch(ms: number): string | null {
    try {
      const d = new Date(ms);
      if (isNaN(d.getTime())) return null;
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'Asia/Shanghai'
      }).format(d);
    } catch {
      return null;
    }
  }

  private formatDisplayValue(value: any): string {
    if (value == null || value === '' || value === 'NaN') return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }
}
