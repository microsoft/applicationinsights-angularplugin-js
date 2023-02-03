import { Component } from '@angular/core';
import {
    IConfig, IPageViewTelemetry, IAppInsights, PropertiesPluginIdentifier, AnalyticsPluginIdentifier
} from '@microsoft/applicationinsights-common';
import {
    IPlugin, IConfiguration, IAppInsightsCore,
    BaseTelemetryPlugin, arrForEach, ITelemetryItem, ITelemetryPluginChain,
    IProcessTelemetryContext, getLocation, _throwInternal, eLoggingSeverity, _eInternalMessageId, IProcessTelemetryUnloadContext, ITelemetryUnloadState, generateW3CId
} from '@microsoft/applicationinsights-core-js';
import { NavigationEnd, Router } from '@angular/router';
// For types only
import * as properties from '@microsoft/applicationinsights-properties-js';
import { ApplicationinsightsAngularpluginErrorService } from './applicationinsights-angularplugin-error.service';
import { IErrorService } from './IErrorService';
import { Subscription } from 'rxjs';
import { AnalyticsPlugin } from '@microsoft/applicationinsights-analytics-js';

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
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class AngularPlugin extends BaseTelemetryPlugin {
    public priority = 186;
    public identifier = 'AngularPlugin';

    private analyticsPlugin: AnalyticsPlugin;
    private propertiesPlugin: properties.PropertiesPlugin;
    private _angularCfg: IAngularExtensionConfig = null;
    private _eventSubscription: Subscription = null;


    constructor() {
        super();
        let self = this;

        self._doTeardown = (unloadCtx?: IProcessTelemetryUnloadContext, unloadState?: ITelemetryUnloadState, asyncCallback?: () => void): void | boolean => {
            if (this.analyticsPlugin && ApplicationinsightsAngularpluginErrorService.instance !== null) {
                ApplicationinsightsAngularpluginErrorService.instance.plugin = null;
                if (self._angularCfg) {
                    if (self._angularCfg.errorServices && Array.isArray(self._angularCfg.errorServices)) {
                        arrForEach(self._angularCfg.errorServices, (errorService: IErrorService) => {
                            ApplicationinsightsAngularpluginErrorService.instance.removeErrorHandler(errorService);
                        });
                    }
                }
            }

            if (self._eventSubscription) {
                self._eventSubscription.unsubscribe();
                self._eventSubscription = null;
            }

            self.analyticsPlugin = null;
            self.propertiesPlugin = null;
            self._angularCfg = null;
        }
    }

    initialize(config: IConfiguration & IConfig, core: IAppInsightsCore, extensions: IPlugin[], pluginChain?: ITelemetryPluginChain) {
        super.initialize(config, core, extensions, pluginChain);
        const self = this;
        const ctx = self._getTelCtx();
        const extConfig = ctx.getExtCfg<IAngularExtensionConfig>(self.identifier, { router: null, errorServices: null });

        self.propertiesPlugin = core.getPlugin<properties.PropertiesPlugin>(PropertiesPluginIdentifier)?.plugin;
        self.analyticsPlugin = core.getPlugin<AnalyticsPlugin>(AnalyticsPluginIdentifier)?.plugin;
        if (self.analyticsPlugin) {
            if (ApplicationinsightsAngularpluginErrorService.instance !== null) {
                ApplicationinsightsAngularpluginErrorService.instance.plugin = self.analyticsPlugin;
                if (extConfig.errorServices && Array.isArray(extConfig.errorServices)) {
                    arrForEach(extConfig.errorServices, (errorService: IErrorService) => {
                        ApplicationinsightsAngularpluginErrorService.instance.addErrorHandler(errorService);
                    });
                }
            }
        }

        if (extConfig.router) {
            let isPageInitialLoad = true;
            const pageViewTelemetry: IPageViewTelemetry = {
                uri: extConfig.router.url
            };
            self.trackPageView(pageViewTelemetry);
            self._eventSubscription = extConfig.router.events.subscribe(event => {
                if (self.isInitialized()) {
                    if (event instanceof NavigationEnd) {
                        // for page initial load, do not call trackPageView twice
                        if (isPageInitialLoad) {
                            isPageInitialLoad = false;
                            return;
                        }
                        const pvt: IPageViewTelemetry = {
                            uri: extConfig.router.url,
                            properties: { duration: 0 } // SPA route change loading durations are undefined, so send 0
                        };
                        self.trackPageView(pvt);
                    }
                }
            });
        }
    }

    /**
     * Add Part A fields to the event
     *
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
                self.propertiesPlugin.context.telemetryTrace.traceID = generateW3CId();
                self.propertiesPlugin.context.telemetryTrace.name = location && location.pathname || '_unknown_';
            }
            self.analyticsPlugin.trackPageView(pageView);
        } else {
            _throwInternal(self.diagLog(),
                // eslint-disable-next-line max-len
                eLoggingSeverity.CRITICAL, _eInternalMessageId.TelemetryInitializerFailed, 'Analytics plugin is not available, Angular plugin telemetry will not be sent: ');
        }
    }

}
