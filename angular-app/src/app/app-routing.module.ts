import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReminderConfigComponent } from './components/reminder-config/reminder-config.component';
import { ReminderPopupComponent } from './components/reminder-popup/reminder-popup.component';

const routes: Routes = [
  // 配置页
  { path: 'iframe/reminder/config', component: ReminderConfigComponent },
  // 弹框页（占位，实际由全局遮罩处理）
  { path: 'iframe/reminder/popup', component: ReminderPopupComponent },
  // 默认路由
  { path: '', redirectTo: 'iframe/reminder/config', pathMatch: 'full' },
  // 通配兜底
  { path: '**', redirectTo: 'iframe/reminder/config' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
