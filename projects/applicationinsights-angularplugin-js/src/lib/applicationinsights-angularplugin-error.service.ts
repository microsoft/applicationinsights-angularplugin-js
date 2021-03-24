import { ErrorHandler, Injectable } from '@angular/core';
import { IAppInsights } from '@microsoft/applicationinsights-common';

@Injectable({
  providedIn: 'root'
})
export class ApplicationinsightsAngularpluginErrorService implements ErrorHandler {
  public static instance: ApplicationinsightsAngularpluginErrorService = null;
  private analyticsPlugin: IAppInsights;

  public set plugin(analyticsPlugin: IAppInsights) {
    this.analyticsPlugin = analyticsPlugin;
  }

  constructor() {
    if (ApplicationinsightsAngularpluginErrorService.instance === null) {
      ApplicationinsightsAngularpluginErrorService.instance = this;
    }
  }

  handleError(error: any): void {
    if (this.analyticsPlugin) {
      this.analyticsPlugin.trackException({ exception: error });
    }
  }
}

