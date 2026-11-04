import {
    AppInsightsCore, IConfiguration, ITelemetryItem, IPlugin, IAppInsightsCore, IConfig
} from "@microsoft/applicationinsights-core-js";
import { AngularPlugin } from "./applicationinsights-angularplugin-js.component";
import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { Router } from "@angular/router";
import { ApplicationinsightsAngularpluginErrorService } from "./applicationinsights-angularplugin-error.service";
import { AnalyticsPlugin } from "@microsoft/applicationinsights-analytics-js";
import { RouterTestingModule } from "@angular/router/testing";
import { Component, Injector } from "@angular/core";

@Component({
    template: "<p>Fake Home Component</p>"
})
class FakeHomeComponent {}
class FakeAboutComponent {}
describe("ReactAI", () => {
    let angularPlugin: AngularPlugin;
    let analyticsPlugin: AnalyticsPlugin;
    let core: AppInsightsCore;
    let channel: ChannelPlugin;
    let router: Router;

    let angularPlugin2: AngularPlugin;
    let analyticsPlugin2: AnalyticsPlugin;
    let core2: AppInsightsCore;

    let angularPlugin3: AngularPlugin;
    let analyticsPlugin3: AnalyticsPlugin;
    let core3: AppInsightsCore;

    let angularPlugin4: AngularPlugin;
    let analyticsPlugin4: AnalyticsPlugin;
    let core4: AppInsightsCore;

    const arg1: Injector = Injector.create({
        providers: [
            { provide: ApplicationinsightsAngularpluginErrorService, useClass: ApplicationinsightsAngularpluginErrorService }
        ]
    });
    const arg2: Injector = Injector.create({
        providers: [
            { provide: ApplicationinsightsAngularpluginErrorService, useClass: ApplicationinsightsAngularpluginErrorService }
        ]
    });

    beforeEach(() => {
        const spy = jasmine.createSpyObj("AnalyticsPlugin", ["trackPageView"]);
        TestBed.configureTestingModule({
            imports: [
                RouterTestingModule.withRoutes([
                    { path: "home", component: FakeHomeComponent  },
                    { path: "about", component: FakeAboutComponent },
                    { path: "test", component: FakeHomeComponent }
                ])
            ],
            providers: [
                { provide: AnalyticsPlugin, useValue: spy }
            ]
        });

        angularPlugin = new AngularPlugin(arg1);
        angularPlugin2 = new AngularPlugin(arg2);
        angularPlugin3 = new AngularPlugin();
        angularPlugin4 = new AngularPlugin();

        // this is for analyticsPluginSpy
        TestBed.inject(ApplicationinsightsAngularpluginErrorService);
        router = TestBed.inject(Router);

        // Get the spy on trackPageView from the spy object
        TestBed.inject(AnalyticsPlugin) as jasmine.SpyObj<AnalyticsPlugin>;

        // Setup
        analyticsPlugin = new AnalyticsPlugin();
        analyticsPlugin2 = new AnalyticsPlugin();
        analyticsPlugin3 = new AnalyticsPlugin();
        analyticsPlugin4 = new AnalyticsPlugin();

        core = new AppInsightsCore();
        core2 = new AppInsightsCore();
        core3 = new AppInsightsCore();
        core4 = new AppInsightsCore();

        channel = new ChannelPlugin();

        core.initialize({
            instrumentationKey: "",
            extensionConfig: {
                [angularPlugin.identifier]: {useInjector: true }
            }
        } as IConfig & IConfiguration, [angularPlugin, analyticsPlugin, channel]);

        core2.initialize({
            instrumentationKey: "",
            extensionConfig: {
                [angularPlugin.identifier]: {useInjector: true }
            }
        } as IConfig & IConfiguration, [angularPlugin2, analyticsPlugin2, channel]);

        core3.initialize({
            instrumentationKey: "",
            extensionConfig: {
                [angularPlugin.identifier]: {useInjector: true }
            }
        } as IConfig & IConfiguration, [angularPlugin3, analyticsPlugin3, channel]);

        core4.initialize({
            instrumentationKey: "",
            extensionConfig: {
                [angularPlugin.identifier]: {useInjector: false }
            }
        } as IConfig & IConfiguration, [angularPlugin4, analyticsPlugin4, channel]);
       
    });

    afterEach(() => {
        // Unload and remove any previous resources
        core.unload(false);

        // clean up
        analyticsPlugin = undefined;
        analyticsPlugin2 = undefined;
        analyticsPlugin3 = undefined;
        analyticsPlugin4 = undefined;

        core = undefined;
        channel = undefined;
        ApplicationinsightsAngularpluginErrorService.instance = null; // reset the singleton instance to null for re-assignment

    });

    it("Multiple: router could be added and removed", fakeAsync(()=> {
        console.log("multiple -- ");
        expect(angularPlugin["_getDbgPlgTargets"]().router).toEqual(undefined);
        expect(angularPlugin2["_getDbgPlgTargets"]().router).toEqual(undefined);

        core.config.extensionConfig[angularPlugin.identifier].router = router;
        tick(3000);
        expect(angularPlugin["_getDbgPlgTargets"]().router).toEqual(router);

        // angularPlugin/angularPlugin2 each got their own injector (arg1/arg2), so
        // they each get their own error service - adding a handler to one must not
        // affect the other.
        let customErrorHandler = new CustomErrorHandler();
        angularPlugin["_getErrorService"]().addErrorHandler(customErrorHandler);
        const spy = spyOn(customErrorHandler, "handleError");
        angularPlugin["_getErrorService"]().handleError();
        expect(spy).toHaveBeenCalledTimes(1);

        angularPlugin2["_getErrorService"]().handleError();
        expect(spy).toHaveBeenCalledTimes(1);

        // angularPlugin3/angularPlugin4 were constructed without an injector, so they
        // both fall back to the shared ApplicationinsightsAngularpluginErrorService
        // singleton - which is separate from angularPlugin's own (injector-scoped)
        // instance, so neither call here should reach customErrorHandler.
        angularPlugin3["_getErrorService"]().handleError();
        angularPlugin4["_getErrorService"]().handleError();
        expect(spy).toHaveBeenCalledTimes(1);

        // angularPlugin3 and angularPlugin4 share the same fallback singleton, so
        // adding a handler through angularPlugin3 affects angularPlugin4 too - but
        // not angularPlugin/angularPlugin2, which each have their own instance.
        let customErrorHandler2 = new CustomErrorHandler2();
        angularPlugin3["_getErrorService"]().addErrorHandler(customErrorHandler2);
        const spy2 = spyOn(customErrorHandler2, "handleError");
        angularPlugin3["_getErrorService"]().handleError();
        expect(spy2).toHaveBeenCalledTimes(1);

        angularPlugin["_getErrorService"]().handleError();
        expect(spy2).toHaveBeenCalledTimes(1);

        angularPlugin2["_getErrorService"]().handleError();
        expect(spy2).toHaveBeenCalledTimes(1);

        angularPlugin4["_getErrorService"]().handleError();
        expect(spy2).toHaveBeenCalledTimes(2);
    }));

      
});
class CustomErrorHandler {
    constructor() {
    }
    handleError() {
        return "Custom error handler";
    }
}
class CustomErrorHandler2 {
    constructor() {
    }
    handleError() {
        return "Custom error handler";
    }
}
class ChannelPlugin implements IPlugin {
    public isFlushInvoked = false;
    public isTearDownInvoked = false;
    public isResumeInvoked = false;
    public isPauseInvoked = false;

    public identifier = "Sender";

    public priority: number = 1001;

    constructor() {
        this.processTelemetry = this._processTelemetry.bind(this);
    }
    public pause(): void {
        this.isPauseInvoked = true;
    }

    public resume(): void {
        this.isResumeInvoked = true;
    }

    public teardown(): void {
        this.isTearDownInvoked = true;
    }

    flush(async?: boolean, callBack?: () => void): void {
        this.isFlushInvoked = true;
        if (callBack) {
            callBack();
        }
    }

    public processTelemetry(env: ITelemetryItem) { }

    setNextPlugin(next: any) {
    // no next setup
    }

    public initialize = (config: IConfiguration, core: IAppInsightsCore, plugin: IPlugin[]) => {
    // Mocked - Do Nothing
    };

    private _processTelemetry(env: ITelemetryItem) {

    }
}
