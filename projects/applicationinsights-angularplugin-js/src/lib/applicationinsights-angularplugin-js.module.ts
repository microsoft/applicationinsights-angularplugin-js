import { NgModule } from '@angular/core';
import { AngularPlugin } from './applicationinsights-angularplugin-js.component';
import { ApplicationinsightsAngularpluginErrorService } from './applicationinsights-angularplugin-error.service';

@NgModule({
  declarations: [AngularPlugin],
  imports: [
  ],
  exports: [AngularPlugin],
  providers: [
    ApplicationinsightsAngularpluginErrorService
  ]
})
export class ApplicationinsightsAngularpluginJsModule { }
