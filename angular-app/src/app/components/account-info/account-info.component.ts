import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Account } from '../../models/smartcare.model';

@Component({
  selector: 'app-account-info',
  templateUrl: './account-info.component.html',
  styleUrls: ['./account-info.component.css']
})
export class AccountInfoComponent implements OnChanges {
  @Input() account!: Account;

  rows: { key: string; value: string }[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account'] && this.account) {
      this.renderAccountInfo();
    }
  }

  private renderAccountInfo(): void {
    this.rows = Object.entries(this.account).map(([key, value]) => ({
      key,
      value: this.formatValue(value, key)
    }));
  }

  private formatValue(value: any, fieldName: string): string {
    if (value == null || value === '' || value === 'NaN') return '-';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }
}
