import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { TopBarComponent } from './top-bar/top-bar.component';
import { ApplicationInsightsService } from './telemetry.service';
import { AccountComponent } from './account/account.component';
import { ListComponent } from './list/list.component';

@NgModule({
  imports: [
    BrowserModule,
    HttpClientModule,
    ReactiveFormsModule,
    RouterModule.forRoot([
      { path: '', component: ListComponent },
      { path: 'account', component: AccountComponent },
    ]),
  ],
  declarations: [
    AppComponent,
    TopBarComponent,
    AccountComponent,
    ListComponent,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
