import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ReminderOverlayComponent } from './components/reminder-overlay/reminder-overlay.component';

import { ReminderEngineService } from './services/reminder-engine.service';

/**
 * APP_INITIALIZER 工厂函数
 * 确保 ReminderEngineService 在 bootstrap 阶段就被实例化
 */
function reminderEngineFactory(reminderEngine: ReminderEngineService) {
  return () => Promise.resolve();
}

@NgModule({
  declarations: [
    AppComponent,
    ReminderOverlayComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule
  ],
  providers: [
    ReminderEngineService,
    {
      provide: APP_INITIALIZER,
      useFactory: reminderEngineFactory,
      deps: [ReminderEngineService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
