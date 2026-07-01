import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PatientInfoComponent } from './components/patient-info/patient-info.component';
import { AccountInfoComponent } from './components/account-info/account-info.component';
import { LogPanelComponent } from './components/log-panel/log-panel.component';
import { DataOutputComponent } from './components/data-output/data-output.component';
import { ScoreReminderComponent } from './components/score-reminder/score-reminder.component';
import { ScoreReminderConfigComponent } from './components/score-reminder-config/score-reminder-config.component';
import { ScoreReminderPopupComponent } from './components/score-reminder-popup/score-reminder-popup.component';

import { MessageService } from './services/message.service';
import { StorageService } from './services/storage.service';
import { LogService } from './services/log.service';
import { ScoreReminderService } from './services/score-reminder.service';

/**
 * APP_INITIALIZER 工厂函数
 * ★ 关键：确保 MessageService 在 bootstrap 阶段就被实例化
 * 这样构造函数中的监听器注册会在任何组件渲染前完成
 */
function messageServiceFactory(messageService: MessageService) {
  return () => {
    // MessageService 构造函数中已完成初始化
    // 这里返回一个 resolved 的 Promise，不阻塞启动
    return Promise.resolve();
  };
}

@NgModule({
  declarations: [
    AppComponent,
    PatientInfoComponent,
    AccountInfoComponent,
    LogPanelComponent,
    DataOutputComponent,
    ScoreReminderComponent,
    ScoreReminderConfigComponent,
    ScoreReminderPopupComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [
    MessageService,
    StorageService,
    LogService,
    ScoreReminderService,
    // ★ APP_INITIALIZER 确保 MessageService 在 bootstrap 阶段实例化
    {
      provide: APP_INITIALIZER,
      useFactory: messageServiceFactory,
      deps: [MessageService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
