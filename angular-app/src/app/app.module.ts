import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

import { AppComponent } from './app.component';
import { PatientInfoComponent } from './components/patient-info/patient-info.component';
import { AccountInfoComponent } from './components/account-info/account-info.component';
import { LogPanelComponent } from './components/log-panel/log-panel.component';
import { DataOutputComponent } from './components/data-output/data-output.component';

import { MessageService } from './services/message.service';
import { StorageService } from './services/storage.service';
import { LogService } from './services/log.service';

@NgModule({
  declarations: [
    AppComponent,
    PatientInfoComponent,
    AccountInfoComponent,
    LogPanelComponent,
    DataOutputComponent
  ],
  imports: [
    BrowserModule,
    CommonModule
  ],
  providers: [
    MessageService,
    StorageService,
    LogService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
