import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ReminderConfigComponent } from './components/reminder-config/reminder-config.component';
import { ReminderPopupComponent } from './components/reminder-popup/reminder-popup.component';

import { MessageService } from './services/message.service';

/**
 * APP_INITIALIZER 工厂函数
 * 确保 MessageService 在 bootstrap 阶段就被实例化
 */
function messageServiceFactory(messageService: MessageService) {
  return () => Promise.resolve();
}

@NgModule({
  declarations: [
    AppComponent,
    ReminderConfigComponent,
    ReminderPopupComponent
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
