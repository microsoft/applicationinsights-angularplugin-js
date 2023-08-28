import { AppInsightsCore, IConfiguration, ITelemetryItem, IPlugin, IAppInsightsCore } from "@microsoft/applicationinsights-core-js";
import { IConfig, IPageViewTelemetry } from "@microsoft/applicationinsights-common";
import { AngularPlugin } from "./applicationinsights-angularplugin-js.component";
import { ComponentFixture, TestBed, fakeAsync, tick } from "@angular/core/testing";
import { Router } from "@angular/router";
import { ApplicationinsightsAngularpluginErrorService } from "./applicationinsights-angularplugin-error.service";
import { AnalyticsPlugin } from "@microsoft/applicationinsights-analytics-js";
import { RouterTestingModule } from '@angular/router/testing';
import { Component, Injector } from '@angular/core';

@Component({
  template: '<p>Fake Home Component</p>'
})
class FakeHomeComponent {}
class FakeAboutComponent {}
describe("ReactAI", () => {

    let service: ApplicationinsightsAngularpluginErrorService;
    let fixture: ComponentFixture<AngularPlugin>;
    let angularPlugin: AngularPlugin;
    let analyticsPlugin: AnalyticsPlugin;
    let core: AppInsightsCore;
    let channel: ChannelPlugin;
    let router: Router;

    let analyticsPluginSpy: jasmine.SpyObj<AnalyticsPlugin>;

    beforeEach(() => {
        const spy = jasmine.createSpyObj('AnalyticsPlugin', ['trackPageView']);
        const _injector: Injector = Injector.create({
            providers: [
              { provide: ApplicationinsightsAngularpluginErrorService, useClass: ApplicationinsightsAngularpluginErrorService }
            ]
        });
        TestBed.configureTestingModule({
            declarations: [AngularPlugin],
            imports: [
              RouterTestingModule.withRoutes([
                { path: 'home', component: FakeHomeComponent  },
                { path: 'about', component: FakeAboutComponent },
                { path: 'test', component: FakeHomeComponent },
              ]),
            ],
            providers: [
                { 
                    provide: AnalyticsPlugin,  
                    useFactory: (injector: Injector) => {
                    // Initialize AngularPlugin with arguments here
                    return new AngularPlugin(injector);
                    },
                }, 
                { provide: AnalyticsPlugin, useValue: spy },
                { provide: Injector, useValue: _injector }
              ]
        });
        
        service = TestBed.inject(ApplicationinsightsAngularpluginErrorService);
        fixture = TestBed.createComponent(AngularPlugin);
        angularPlugin = fixture.componentInstance;
        router = TestBed.inject(Router); 

        // Get the spy on trackPageView from the spy object
        analyticsPluginSpy = TestBed.inject(AnalyticsPlugin) as jasmine.SpyObj<AnalyticsPlugin>;
        fixture.detectChanges();

        // Setup
        analyticsPlugin = new AnalyticsPlugin();
        core = new AppInsightsCore();
        channel = new ChannelPlugin();

        core.initialize({
          instrumentationKey: '',
          extensionConfig: {
            [angularPlugin.identifier]: {enableInjector: true }
          }
        } as IConfig & IConfiguration, [angularPlugin, analyticsPlugin, channel]);

       
    });

    afterEach(() => {
        // Unload and remove any previous resources
        core.unload(false);

        // clean up
        analyticsPlugin = undefined;
        core = undefined;
        channel = undefined;
        ApplicationinsightsAngularpluginErrorService.instance = null; // reset the singleton instance to null for re-assignment
    });

    it('Dynamic Config Test: router could be added and removed', fakeAsync(()=> {
        console.log("testing---",core.config);
      expect(angularPlugin["_getDbgPlgTargets"]().router).toEqual(undefined);
    //   core.config.extensionConfig[angularPlugin.identifier].router = router;
    //   tick(3000)
    //   expect(angularPlugin["_getDbgPlgTargets"]().router).toEqual(router);
    }));

    // it('Error Service', fakeAsync(()=> {
    //     expect(angularPlugin["_getDbgPlgTargets"]().router).toEqual(undefined);
    //     core.config.extensionConfig[angularPlugin.identifier].router = router;
    //     tick(3000)
    //     expect(angularPlugin["_getDbgPlgTargets"]().router).toEqual(router);
    //   }));

    // it('Dynamic Config Test: trackPageView is updated when router changed', fakeAsync(()=> {
    //   spyOn(angularPlugin, 'trackPageView');
    //   core.config.extensionConfig[angularPlugin.identifier].router = router;
    //   tick(3000);
    //   expect(angularPlugin["_getDbgPlgTargets"]().router).toEqual(router);
      
    //   expect(angularPlugin.trackPageView).toHaveBeenCalledTimes(1);
    //   let args = (angularPlugin.trackPageView as jasmine.Spy).calls.mostRecent().args;
    //   let pageViewEvents: IPageViewTelemetry = args[0];
    //   expect(pageViewEvents.uri).toEqual(router.url);
    //   router.navigate(['about']).then(() => {
    //     expect(angularPlugin.trackPageView).toHaveBeenCalledTimes(1);
    //     router.navigate(['test']).then(() => {
    //       expect(angularPlugin.trackPageView).toHaveBeenCalledTimes(2);
    //       let args = (angularPlugin.trackPageView as jasmine.Spy).calls.mostRecent().args;
    //       let pageViewEvents: IPageViewTelemetry = args[0];
    //       expect(pageViewEvents.uri).toEqual('/test');
    //       router.navigateByUrl('about').then(() => {
    //         args = (angularPlugin.trackPageView as jasmine.Spy).calls.mostRecent().args;
    //         pageViewEvents = args[0];
    //         expect(pageViewEvents.uri).toEqual('/about');
    //       });
         
    //     });
    //   });
    // }));
});

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
  }

  private _processTelemetry(env: ITelemetryItem) {

  }
}