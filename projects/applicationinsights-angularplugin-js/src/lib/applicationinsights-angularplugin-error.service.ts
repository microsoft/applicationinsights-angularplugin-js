import { Injectable } from '@angular/core';
import { IAppInsights } from '@microsoft/applicationinsights-common';
import { arrForEach } from '@microsoft/applicationinsights-core-js';
import { IErrorService } from './IErrorService';

@Injectable({
  providedIn: 'root'
})
export class ApplicationinsightsAngularpluginErrorService implements IErrorService {
  public static instance: ApplicationinsightsAngularpluginErrorService = null;
  private analyticsPlugin: IAppInsights;
  private errorServices: IErrorService[];

  public set plugin(analyticsPlugin: IAppInsights) {
    this.analyticsPlugin = analyticsPlugin;
  }

  public set errorHandlers(errorServices: IErrorService[]) {
    this.errorServices = errorServices;
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

    if (this.errorServices) {
      arrForEach(this.errorServices, errorService => {
        if (errorService.handleError && typeof errorService.handleError === 'function') {
          errorService.handleError(error);
        }
      });
    }
  }
}

