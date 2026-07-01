import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { PatientInfoComponent } from './components/patient-info/patient-info.component';
import { AccountInfoComponent } from './components/account-info/account-info.component';
import { LogPanelComponent } from './components/log-panel/log-panel.component';
import { DataOutputComponent } from './components/data-output/data-output.component';
import { ScoreReminderComponent } from './components/score-reminder/score-reminder.component';

import { MessageService } from './services/message.service';
import { StorageService } from './services/storage.service';
import { LogService } from './services/log.service';
import { ScoreReminderService } from './services/score-reminder.service';

@NgModule({
  declarations: [
    AppComponent,
    PatientInfoComponent,
    AccountInfoComponent,
    LogPanelComponent,
    DataOutputComponent,
    ScoreReminderComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    HttpClientModule
  ],
  providers: [
    MessageService,
    StorageService,
    LogService,
    ScoreReminderService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
