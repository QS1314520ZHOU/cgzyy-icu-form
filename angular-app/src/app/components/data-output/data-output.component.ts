import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Patient, Account } from '../../models/smartcare.model';

@Component({
  selector: 'app-data-output',
  templateUrl: './data-output.component.html',
  styleUrls: ['./data-output.component.css']
})
export class DataOutputComponent implements OnChanges {
  @Input() patient!: Patient;
  @Input() account!: Account;
  @Input() token?: string;

  patientRows: { key: string; value: string }[] = [];
  accountRows: { key: string; value: string }[] = [];
  maskedToken = '';
  showJson = false;
  jsonData = '';

  // 时间字段名关键词
  private readonly TIME_FIELD_KEYWORDS = ['Time', 'time', 'birthday', 'createdTime', 'bedTime', 'Admission', 'admission'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patient'] && this.patient) {
      this.renderPatientTable();
    }
    if (changes['account'] && this.account) {
      this.renderAccountTable();
    }
    if (changes['token'] && this.token) {
      this.maskedToken = this.maskToken(this.token);
    }
    this.renderJson();
  }

  private renderPatientTable(): void {
    this.patientRows = Object.entries(this.patient).map(([key, value]) => ({
      key,
      value: this.formatValue(value, key)
    }));
  }

  private renderAccountTable(): void {
    this.accountRows = Object.entries(this.account).map(([key, value]) => ({
      key,
      value: this.formatValue(value, key)
    }));
  }

  private renderJson(): void {
    const data: any = {
      type: 'SmartCare',
      account: this.account,
      patient: this.patient
    };
    if (this.token) {
      data.token = this.maskedToken;
    }
    this.jsonData = JSON.stringify(data, null, 2);
  }

  toggleJson(): void {
    this.showJson = !this.showJson;
  }

  private formatValue(value: any, fieldName: string): string {
    if (value == null || value === '' || value === 'NaN') return '-';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    // 时间字段格式化
    if (typeof value === 'number' && this.isTimeField(fieldName) && this.isEpoch(value)) {
      const formatted = this.formatEpoch(value);
      return `${value} (${formatted})`;
    }
    return String(value);
  }

  private isTimeField(name: string): boolean {
    return this.TIME_FIELD_KEYWORDS.some(kw => name.includes(kw));
  }

  private isEpoch(val: number): boolean {
    return val > 1000000000000 && val < 9999999999999;
  }

  private formatEpoch(ms: number): string {
    try {
      const d = new Date(ms);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'Asia/Shanghai'
      }).format(d);
    } catch {
      return '';
    }
  }

  private maskToken(token: string): string {
    if (!token || typeof token !== 'string') return '-';
    if (token.length <= 8) return '****';
    return token.slice(0, 4) + '****' + token.slice(-4);
  }
}
