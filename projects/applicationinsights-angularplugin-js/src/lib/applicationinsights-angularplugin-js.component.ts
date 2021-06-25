import { Component } from '@angular/core';
import {
    IConfig, IPageViewTelemetry, IAppInsights, PropertiesPluginIdentifier, Util
} from '@microsoft/applicationinsights-common';
import {
    IPlugin, IConfiguration, IAppInsightsCore,
    ITelemetryPlugin, BaseTelemetryPlugin, arrForEach, ITelemetryItem, ITelemetryPluginChain,
    IProcessTelemetryContext, _InternalMessageId, LoggingSeverity, getLocation
} from '@microsoft/applicationinsights-core-js';
import { NavigationEnd, Router } from '@angular/router';
// For types only
import * as properties from '@microsoft/applicationinsights-properties-js';
import { ApplicationinsightsAngularpluginErrorService } from './applicationinsights-angularplugin-error.service';
import { IErrorService } from './IErrorService';

interface IAngularExtensionConfig {
    /**
     * Angular router for enabling Application Insights PageView tracking.
     */
    router?: Router;

    /**
     * Custom error service for global error handling.
     */
    errorServices?: IErrorService[];
}

@Component({
    selector: 'lib-applicationinsights-angularplugin-js',
    template: ``,
    styles: []
})
// tslint:disable-next-line:component-class-suffix
export class AngularPlugin extends BaseTelemetryPlugin {
    public priority = 186;
    public identifier = 'AngularPlugin';

    private analyticsPlugin: IAppInsights;
    private propertiesPlugin: properties.PropertiesPlugin;

    initialize(config: IConfiguration & IConfig, core: IAppInsightsCore, extensions: IPlugin[], pluginChain?: ITelemetryPluginChain) {
        super.initialize(config, core, extensions, pluginChain);
        const self = this;
        const ctx = self._getTelCtx();
        const extConfig = ctx.getExtCfg<IAngularExtensionConfig>(self.identifier, { router: null, errorServices: null });
        arrForEach(extensions, ext => {
            const identifier = (ext as ITelemetryPlugin).identifier;
            if (identifier === 'ApplicationInsightsAnalytics') {
                self.analyticsPlugin = (ext as any) as IAppInsights;
                if (ApplicationinsightsAngularpluginErrorService.instance !== null) {
                    ApplicationinsightsAngularpluginErrorService.instance.plugin = self.analyticsPlugin;
                    if (extConfig.errorServices && Array.isArray(extConfig.errorServices)) {
                        arrForEach(extConfig.errorServices, (errorService: IErrorService) => {
                            ApplicationinsightsAngularpluginErrorService.instance.addErrorHandler(errorService);
                        });
                    }
                }
            }
            if (identifier === PropertiesPluginIdentifier) {
                self.propertiesPlugin = (ext as any) as properties.PropertiesPlugin;
            }
        });

        if (extConfig.router) {
            let isPageInitialLoad = true;
            const pageViewTelemetry: IPageViewTelemetry = {
                uri: extConfig.router.url
            };
            self.trackPageView(pageViewTelemetry);
            extConfig.router.events.subscribe(event => {
                if (event instanceof NavigationEnd) {
                    // for page initial load, do not call trackPageView twice
                    if (isPageInitialLoad) {
                        isPageInitialLoad = false;
                        return;
                    }
                    const pageViewTelemetry: IPageViewTelemetry = {
                        uri: extConfig.router.url,
                        properties: { duration: 0 } // SPA route change loading durations are undefined, so send 0
                    };
                    self.trackPageView(pageViewTelemetry);
                }
            });
        }
    }

    /**
     * Add Part A fields to the event
     * @param event The event that needs to be processed
     */
    processTelemetry(event: ITelemetryItem, itemCtx?: IProcessTelemetryContext) {
        this.processNext(event, itemCtx);
    }

    trackPageView(pageView: IPageViewTelemetry) {
        const self = this;

        if (self.analyticsPlugin) {
            const location = getLocation();
            if (self.propertiesPlugin && self.propertiesPlugin.context && self.propertiesPlugin.context.telemetryTrace) {
                self.propertiesPlugin.context.telemetryTrace.traceID = Util.generateW3CId();
                self.propertiesPlugin.context.telemetryTrace.name = location && location.pathname || '_unknown_';
            }
            self.analyticsPlugin.trackPageView(pageView);
        } else {
            self.diagLog().throwInternal(
                // tslint:disable-next-line:max-line-length
                LoggingSeverity.CRITICAL, _InternalMessageId.TelemetryInitializerFailed, 'Analytics plugin is not available, Angular plugin telemetry will not be sent: ');
        }
    }
}
