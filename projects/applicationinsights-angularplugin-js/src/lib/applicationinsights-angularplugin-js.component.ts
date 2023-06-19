import { Component } from '@angular/core';
import {
    IConfig, IPageViewTelemetry, IAppInsights, PropertiesPluginIdentifier, AnalyticsPluginIdentifier
} from '@microsoft/applicationinsights-common';
import {
    IPlugin, IConfiguration, IAppInsightsCore,
    BaseTelemetryPlugin, arrForEach, ITelemetryItem, ITelemetryPluginChain,
    IProcessTelemetryContext, getLocation, _throwInternal, eLoggingSeverity, _eInternalMessageId, IProcessTelemetryUnloadContext, ITelemetryUnloadState, generateW3CId, onConfigChange, IConfigDefaults
} from '@microsoft/applicationinsights-core-js';
import dynamicProto from "@microsoft/dynamicproto-js";
import { NavigationEnd, Router } from '@angular/router';
import { ApplicationinsightsAngularpluginErrorService } from './applicationinsights-angularplugin-error.service';
import { IErrorService } from './IErrorService';
import { Subscription } from 'rxjs';
import { AnalyticsPlugin } from '@microsoft/applicationinsights-analytics-js';
import {objDeepFreeze} from "@nevware21/ts-utils";
import { PropertiesPlugin } from '@microsoft/applicationinsights-properties-js';

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

let undefValue = undefined;

const defaultAngularExtensionConfig: IConfigDefaults<IAngularExtensionConfig> = objDeepFreeze({
    router: { blkVal: true, v: undefValue},
    errorServices: { blkVal: true, v: undefValue}
});

@Component({
    selector: 'lib-applicationinsights-angularplugin-js',
    template: ``,
    styles: []
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class AngularPlugin extends BaseTelemetryPlugin {
    public priority = 186;
    public identifier = 'AngularPlugin';

    constructor() {
        super();
        let _analyticsPlugin: AnalyticsPlugin;
        let _propertiesPlugin: PropertiesPlugin;
        let _angularCfg: IAngularExtensionConfig;
        let _eventSubscription: Subscription;
        let _isPageInitialLoad: boolean;
        let _prevRouter: Router;

        dynamicProto(AngularPlugin, this, (_self, _base) => {
            _initDefaults();

            _self.initialize = (config: IConfiguration & IConfig, core: IAppInsightsCore, extensions: IPlugin[], pluginChain?: ITelemetryPluginChain) => {
                super.initialize(config, core, extensions, pluginChain);
        
                _self._addHook(onConfigChange(config, (details) => {
                    let ctx = _self._getTelCtx();
                    _angularCfg = ctx.getExtCfg<IAngularExtensionConfig>(_self.identifier, defaultAngularExtensionConfig);
                    _propertiesPlugin = core.getPlugin<PropertiesPlugin>(PropertiesPluginIdentifier)?.plugin as PropertiesPlugin;
                    _analyticsPlugin = core.getPlugin<AnalyticsPlugin>(AnalyticsPluginIdentifier)?.plugin as AnalyticsPlugin;

                    if (_analyticsPlugin) {
                        if (ApplicationinsightsAngularpluginErrorService.instance !== null) {
                            ApplicationinsightsAngularpluginErrorService.instance.plugin = _analyticsPlugin;
                            if (_angularCfg.errorServices && Array.isArray(_angularCfg.errorServices)) {
                                ApplicationinsightsAngularpluginErrorService.instance.clearErrorHandlers();
                                // another method would be use blkVal, and compare the two array value to decide  
                                // whether clear it or not, but it will cause more performance issue.
                                arrForEach(_angularCfg.errorServices, (errorService: IErrorService) => {
                                    ApplicationinsightsAngularpluginErrorService.instance.addErrorHandler(errorService);
                                });
                            }
                        }
                    }
            
                    if (_angularCfg.router !== _prevRouter) {
                        // router is changed, or has not been initialized yet

                        // unsubscribe previous router events
                        if (_eventSubscription) {
                            _eventSubscription.unsubscribe();
                        }

                        if (_angularCfg.router){
                            
                            // only track page view if it is the initial page load for this plugin
                            if (_isPageInitialLoad){
                                const pageViewTelemetry: IPageViewTelemetry = {
                                    uri: _angularCfg.router.url
                                };
                                _self.trackPageView(pageViewTelemetry);
                            }
                            
                            // subscribe to new router events
                            _eventSubscription = _angularCfg.router.events.subscribe(event => {
                                if (_self.isInitialized()) {
                                    if (event instanceof NavigationEnd) {
                                        // for page initial load, do not call trackPageView twice
                                        if (_isPageInitialLoad) {
                                            _isPageInitialLoad = false;
                                            return;
                                        }
                                        const pvt: IPageViewTelemetry = {
                                            uri: _angularCfg.router.url,
                                            properties: { duration: 0 } // SPA route change loading durations are undefined, so send 0
                                        };
                                        _self.trackPageView(pvt);
                                    }
                                }
                            });
                        }     
                        _prevRouter = _angularCfg.router;
                    }
                }));
            }

            _self.trackPageView = (pageView: IPageViewTelemetry) => {
                const self = this;
        
                if (_analyticsPlugin) {
                    const location = getLocation();
                    if (_propertiesPlugin && _propertiesPlugin.context && _propertiesPlugin.context.telemetryTrace) {
                        _propertiesPlugin.context.telemetryTrace.traceID = generateW3CId();
                        _propertiesPlugin.context.telemetryTrace.name = location && location.pathname || '_unknown_';
                    }
                    _analyticsPlugin.trackPageView(pageView);
                } else {
                    _throwInternal(self.diagLog(),
                        // eslint-disable-next-line max-len
                        eLoggingSeverity.CRITICAL, _eInternalMessageId.TelemetryInitializerFailed, 'Analytics plugin is not available, Angular plugin telemetry will not be sent: ');
                }
            }
        

            _self._doTeardown = (unloadCtx?: IProcessTelemetryUnloadContext, unloadState?: ITelemetryUnloadState, asyncCallback?: () => void): void | boolean => {
                if (_analyticsPlugin && ApplicationinsightsAngularpluginErrorService.instance !== null) {
                    ApplicationinsightsAngularpluginErrorService.instance.plugin = null;
                    if (_angularCfg) {
                        if (_angularCfg.errorServices && Array.isArray(_angularCfg.errorServices)) {
                            // arrForEach(_angularCfg.errorServices, (errorService: IErrorService) => {
                            //     ApplicationinsightsAngularpluginErrorService.instance.removeErrorHandler(errorService);
                            // });
                            ApplicationinsightsAngularpluginErrorService.instance.clearErrorHandlers();
             
                        }
                    }
                }
    
                if (_eventSubscription) {
                    _eventSubscription.unsubscribe();
                    _eventSubscription = null;
                }
                _initDefaults();
            }

            function _initDefaults() {
                _analyticsPlugin = null;
                _propertiesPlugin = null;
                _angularCfg = null;
                _eventSubscription = null;
                _isPageInitialLoad = true;
                _prevRouter = null;
            }

        });

    }

   

    /**
     * Add Part A fields to the event
     *
     * @param event The event that needs to be processed
     */
    processTelemetry(event: ITelemetryItem, itemCtx?: IProcessTelemetryContext) {
        this.processNext(event, itemCtx);
    }


    initialize(config: IConfiguration & IConfig, core: IAppInsightsCore, extensions: IPlugin[], pluginChain?:ITelemetryPluginChain) {
        // @DynamicProtoStub -- DO NOT add any code as this will be removed during packaging
    }

    trackPageView(pageView: IPageViewTelemetry) {
        // @DynamicProtoStub -- DO NOT add any code as this will be removed during packaging
    }


   
}
