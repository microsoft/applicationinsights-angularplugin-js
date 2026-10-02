import { Injector} from "@angular/core";
import {
    IPlugin, IConfiguration, IAppInsightsCore, BaseTelemetryPlugin, arrForEach, ITelemetryItem, ITelemetryPluginChain,
    IProcessTelemetryContext, getLocation, _throwInternal, eLoggingSeverity, _eInternalMessageId, IProcessTelemetryUnloadContext,
    ITelemetryUnloadState, generateW3CId, onConfigChange, IConfigDefaults, isArray,
    IPageViewTelemetry, PropertiesPluginIdentifier, AnalyticsPluginIdentifier
} from "@microsoft/applicationinsights-core-js";
import dynamicProto from "@microsoft/dynamicproto-js";
import { NavigationEnd, Router } from "@angular/router";
import { ApplicationinsightsAngularpluginErrorService } from "./applicationinsights-angularplugin-error.service";
import { IErrorService } from "./IErrorService";
import { Subscription } from "rxjs";
import { AnalyticsPlugin } from "@microsoft/applicationinsights-analytics-js";
import {objDeepFreeze} from "@nevware21/ts-utils";
import { PropertiesPlugin } from "@microsoft/applicationinsights-properties-js";

interface IAngularExtensionConfig {
    /**
     * Angular router for enabling Application Insights PageView tracking. When set, the
     * plugin automatically tracks the initial page view and every subsequent route change
     * as PageView telemetry - you don't need to call trackPageView() yourself.
     *
     * @example
     * ```ts
     * const angularPlugin = new AngularPlugin();
     * const appInsights = new ApplicationInsights({
     *     config: {
     *         instrumentationKey: 'YOUR_INSTRUMENTATION_KEY_GOES_HERE',
     *         extensions: [angularPlugin],
     *         extensionConfig: {
     *             [angularPlugin.identifier]: { router }
     *         }
     *     }
     * });
     * ```
     */
    router?: Router;

    /**
     * Custom error handlers to chain into the error service (see IErrorService and
     * ApplicationinsightsAngularpluginErrorService). Whenever that service - set up as
     * Angular's ErrorHandler provider - catches an uncaught error, it tracks exception
     * telemetry and then calls handleError() on each of these, in order.
     *
     * @example
     * ```ts
     * class CustomErrorHandler implements IErrorService {
     *     handleError(error: any) {
     *         // ...
     *     }
     * }
     *
     * extensionConfig: {
     *     [angularPlugin.identifier]: {
     *         router,
     *         errorServices: [new CustomErrorHandler()]
     *     }
     * }
     * ```
     */
    errorServices?: IErrorService[];

    /**
     * By default, every AngularPlugin instance on the page shares one
     * ApplicationinsightsAngularpluginErrorService singleton (its static `instance`
     * field), so error handlers added through one instance are visible to all of them.
     * That's fine with a single ApplicationInsights instance, but if you're running
     * more than one in the same session - e.g. one per tenant, or a host app plus
     * embedded widgets, each with its own errorServices - they'd otherwise all share
     * (and stomp on) the same handler list.
     *
     * Set this to true, together with passing an Injector into
     * `new AngularPlugin(injector)`, to give that instance its own error service
     * instead of the shared one. The injector just needs to be able to resolve
     * ApplicationinsightsAngularpluginErrorService - it doesn't need to be (and usually
     * isn't) the app's root injector. Setting useInjector without also passing an
     * injector to the constructor has no effect - it silently falls back to the shared
     * singleton.
     *
     * @example
     * ```ts
     * const injector = Injector.create({
     *     providers: [ApplicationinsightsAngularpluginErrorService]
     * });
     * const angularPlugin = new AngularPlugin(injector);
     * const appInsights = new ApplicationInsights({
     *     config: {
     *         instrumentationKey: 'YOUR_INSTRUMENTATION_KEY_GOES_HERE',
     *         extensions: [angularPlugin],
     *         extensionConfig: {
     *             [angularPlugin.identifier]: { router, useInjector: true }
     *         }
     *     }
     * });
     * ```
     */
    useInjector?: boolean;
}

let undefValue;

const defaultAngularExtensionConfig: IConfigDefaults<IAngularExtensionConfig> = objDeepFreeze({
    router: { blkVal: true, v: undefValue},
    errorServices: { blkVal: true, v: undefValue}
});

declare const Zone: any;

// If code runs inside Angular's zone, any setTimeout/promise/etc it kicks off also
// runs inside that zone. Angular waits for the zone to go quiet (no pending timers)
// before it considers the app "stable" - that's what hydration and isStable/whenStable
// wait on. The telemetry SDK keeps a recurring batch/retry timer alive to send events,
// so if that timer is scheduled inside Angular's zone, the zone never goes quiet and
// the app never becomes stable. Running our calls in the root zone instead keeps that
// timer invisible to Angular, so it doesn't block stability.
const isNgZoneEnabled = typeof Zone !== "undefined" && typeof Zone.root?.run === "function";
function runOutsideAngular<T>(callback: () => T): T {
    return isNgZoneEnabled ? Zone.root.run(callback) : callback();
}

export class AngularPlugin extends BaseTelemetryPlugin {
    public priority = 186;
    public identifier = "AngularPlugin";
    
    constructor(private _injector?: Injector) { // _injector is optional to provide
        super();
        let _analyticsPlugin: AnalyticsPlugin;
        let _propertiesPlugin: PropertiesPlugin;
        let _angularCfg: IAngularExtensionConfig;
        let _eventSubscription: Subscription;
        let _isPageInitialLoad: boolean;
        let _prevRouter: Router;
        let _errorServiceInstance: ApplicationinsightsAngularpluginErrorService;

        dynamicProto(AngularPlugin, this, (_self, _base) => {

            const _initDefaults = () => {
                _analyticsPlugin = null;
                _propertiesPlugin = null;
                _angularCfg = null;
                _eventSubscription = null;
                _isPageInitialLoad = true;
                _prevRouter = undefValue;
                _errorServiceInstance = null;
            };

            _initDefaults();

            _self.initialize = (config: IConfiguration, core: IAppInsightsCore, extensions: IPlugin[],
                pluginChain?: ITelemetryPluginChain) => {
                super.initialize(config, core, extensions, pluginChain);
        
                _self._addHook(onConfigChange(config, (details) => {
                    let ctx = _self._getTelCtx();
                    _angularCfg = ctx.getExtCfg<IAngularExtensionConfig>(_self.identifier, defaultAngularExtensionConfig);
                    _propertiesPlugin = core.getPlugin<PropertiesPlugin>(PropertiesPluginIdentifier)?.plugin as PropertiesPlugin;
                    _analyticsPlugin = core.getPlugin<AnalyticsPlugin>(AnalyticsPluginIdentifier)?.plugin as AnalyticsPlugin;
                    
                    if (_angularCfg.useInjector && _injector){
                        _errorServiceInstance = this._injector.get(ApplicationinsightsAngularpluginErrorService);
                    }
                    _errorServiceInstance = _errorServiceInstance ? _errorServiceInstance
                        : ApplicationinsightsAngularpluginErrorService.instance;

                    // two instance of errorService

                    if (_analyticsPlugin) {
                        if (_errorServiceInstance !== null) {
                            _errorServiceInstance.plugin = _analyticsPlugin;
                            if (_angularCfg.errorServices && isArray(_angularCfg.errorServices)) {
                                _errorServiceInstance.clearErrorHandlers();
                                arrForEach(_angularCfg.errorServices, (errorService: IErrorService) => {
                                    _errorServiceInstance.addErrorHandler(errorService);
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
                                        runOutsideAngular(() => _self.trackPageView(pvt));
                                    }
                                }
                            });
                        }
                        _prevRouter = _angularCfg.router;
                    }
                }));

                // for test purpose only
                _self["_getDbgPlgTargets"] = () => _angularCfg;
                _self["_getErrorService"] = () => _errorServiceInstance;
            };

            _self.trackPageView = (pageView: IPageViewTelemetry) => {
                if (_analyticsPlugin) {
                    const location = getLocation();
                    if (_propertiesPlugin && _propertiesPlugin.context && _propertiesPlugin.context.telemetryTrace) {
                        _propertiesPlugin.context.telemetryTrace.traceID = generateW3CId();
                        _propertiesPlugin.context.telemetryTrace.name = location && location.pathname || "_unknown_";
                    }
                    _analyticsPlugin.trackPageView(pageView);
                } else {
                    _throwInternal(_self.diagLog(),
                        // eslint-disable-next-line max-len
                        eLoggingSeverity.CRITICAL, _eInternalMessageId.TelemetryInitializerFailed, "Analytics plugin is not available, Angular plugin telemetry will not be sent: ");
                }
            };
        

            _self._doTeardown = (unloadCtx?: IProcessTelemetryUnloadContext, unloadState?: ITelemetryUnloadState,
                asyncCallback?: () => void): void | boolean => {
                if (_analyticsPlugin && _errorServiceInstance !== null) {
                    _errorServiceInstance.plugin = null;
                    if (_angularCfg) {
                        if (_angularCfg.errorServices && Array.isArray(_angularCfg.errorServices)) {
                            _errorServiceInstance.clearErrorHandlers();
             
                        }
                    }
                }
    
                if (_eventSubscription) {
                    _eventSubscription.unsubscribe();
                    _eventSubscription = null;
                }
                _initDefaults();
            };
        });

    }
    /**
     * Add Part A fields to the event
     *
     * @param event The event that needs to be processed
     */
    processTelemetry(event: ITelemetryItem, itemCtx?: IProcessTelemetryContext) {
        runOutsideAngular(() => this.processNext(event, itemCtx));
    }


    initialize(config: IConfiguration, core: IAppInsightsCore, extensions: IPlugin[], pluginChain?: ITelemetryPluginChain) {
        // @DynamicProtoStub -- DO NOT add any code as this will be removed during packaging
    }

    trackPageView(pageView: IPageViewTelemetry) {
        // @DynamicProtoStub -- DO NOT add any code as this will be removed during packaging
    }
 
}
