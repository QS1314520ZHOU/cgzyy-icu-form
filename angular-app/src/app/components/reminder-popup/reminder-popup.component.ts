import { Component } from '@angular/core';

/**
 * 提醒弹框页（占位组件）
 * 实际提醒由全局遮罩 ReminderOverlayComponent 处理
 */
@Component({
  selector: 'app-reminder-popup',
  template: `<div class="placeholder"><p>提醒功能由全局遮罩自动处理，无需单独访问此页面。</p></div>`,
  styles: [`.placeholder{display:flex;justify-content:center;align-items:center;height:100vh;color:#6b7280}`]
})
export class ReminderPopupComponent {}
