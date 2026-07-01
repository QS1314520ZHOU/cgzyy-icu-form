import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ReminderConfigComponent } from './components/reminder-config/reminder-config.component';
import { ReminderPopupComponent } from './components/reminder-popup/reminder-popup.component';
import { ReminderOverlayComponent } from './components/reminder-overlay/reminder-overlay.component';

import { ReminderEngineService } from './services/reminder-engine.service';

function reminderEngineFactory(engine: ReminderEngineService) {
  return () => Promise.resolve();
}

@NgModule({
  declarations: [
    AppComponent,
    ReminderConfigComponent,
    ReminderPopupComponent,
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
    { provide: APP_INITIALIZER, useFactory: reminderEngineFactory, deps: [ReminderEngineService], multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
