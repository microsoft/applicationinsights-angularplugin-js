import { Injectable } from '@angular/core';
import { IAppInsights } from '@microsoft/applicationinsights-common';
import { arrForEach, isFunction } from '@microsoft/applicationinsights-core-js';
import { IErrorService } from './IErrorService';

@Injectable({
    providedIn: 'root'
})
export class ApplicationinsightsAngularpluginErrorService implements IErrorService {
    public static instance: ApplicationinsightsAngularpluginErrorService = null;
    private analyticsPlugin: IAppInsights;
    private errorServices: IErrorService[] = [];

    constructor() {
        if (ApplicationinsightsAngularpluginErrorService.instance === null) {
            ApplicationinsightsAngularpluginErrorService.instance = this;
        }
    }

    public set plugin(analyticsPlugin: IAppInsights) {
        this.analyticsPlugin = analyticsPlugin;
    }

    public clearErrorHandlers() {
        this.errorServices = [];
    }

    public addErrorHandler(errorService: IErrorService): void {
        if (errorService && isFunction(errorService.handleError)) {
            this.errorServices.push(errorService);
        }
    }

    public removeErrorHandler(errorService: IErrorService): void {
        if (errorService && isFunction(errorService.handleError)) {
            const idx = this.errorServices.indexOf(errorService);
            if (idx !== -1) {
                this.errorServices.splice(idx, 1);
            }
        }
    }

    handleError(error: any): void {
        if (this.analyticsPlugin) {
            this.analyticsPlugin.trackException({ exception: error });
        }

        if (this.errorServices && this.errorServices.length > 0) {
            arrForEach(this.errorServices, errorService => {
                if (isFunction(errorService.handleError)) {
                    errorService.handleError(error);
                }
            });
        }
    }
}

