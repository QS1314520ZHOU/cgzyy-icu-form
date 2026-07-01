import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { ScoreReminderConfigComponent } from './components/score-reminder-config/score-reminder-config.component';
import { ScoreReminderPopupComponent } from './components/score-reminder-popup/score-reminder-popup.component';

const routes: Routes = [
  // 默认路由
  { path: '', component: AppComponent },

  // 评分提醒配置页
  { path: 'iframe/score-reminder/config', component: ScoreReminderConfigComponent },

  // 评分提醒弹窗页
  { path: 'iframe/score-reminder/popup', component: ScoreReminderPopupComponent },

  // 通配符路由（可选，重定向到首页）
  // { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
