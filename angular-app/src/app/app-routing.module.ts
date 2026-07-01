import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReminderConfigComponent } from './components/reminder-config/reminder-config.component';
import { ReminderPopupComponent } from './components/reminder-popup/reminder-popup.component';

const routes: Routes = [
  { path: 'iframe/reminder/config', component: ReminderConfigComponent },
  { path: 'iframe/reminder/popup', component: ReminderPopupComponent },
  { path: '', redirectTo: 'iframe/reminder/config', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
