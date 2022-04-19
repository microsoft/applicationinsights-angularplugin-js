import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppInsightsCore, IConfiguration, ITelemetryItem, IPlugin } from '@microsoft/applicationinsights-core-js';
import { AnalyticsPlugin } from '@microsoft/applicationinsights-analytics-js';
import { IConfig } from '@microsoft/applicationinsights-common';
import { ApplicationinsightsAngularpluginErrorService } from './applicationinsights-angularplugin-error.service';
import { AngularPlugin } from '../lib/applicationinsights-angularplugin-js.component';

describe('ApplicationinsightsAngularpluginErrorService', () => {
    let service: ApplicationinsightsAngularpluginErrorService;
    let fixture: ComponentFixture<AngularPlugin>;
    let component: AngularPlugin;
    let appInsights: AnalyticsPlugin;
    let core: AppInsightsCore;
    let channel: ChannelPlugin;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [AngularPlugin]
        });
        service = TestBed.inject(ApplicationinsightsAngularpluginErrorService);
        fixture = TestBed.createComponent(AngularPlugin);
        component = fixture.componentInstance;
        fixture.detectChanges();

        // Setup
        appInsights = new AnalyticsPlugin();
        core = new AppInsightsCore();
        channel = new ChannelPlugin();

        // Act
        core.initialize({
            instrumentationKey: '',
            enableAutoRouteTracking: true,
            extensions: [component],
        } as IConfig & IConfiguration, [appInsights, channel]);
    });

    afterEach(() => {
        // Unload and remove any previous resources
        core.unload(false);

        // clean up
        appInsights = undefined;
        core = undefined;
        channel = undefined;
        ApplicationinsightsAngularpluginErrorService.instance = null; // reset the singleton instance to null for re-assignment

    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should assign analytics plugin to service plugin property', () => {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        expect(service['analyticsPlugin']).toBeTruthy();
    });

    // this is not testing if handleError is called - Angular does that already
    it('should capture uncaught exception and send exception telemetry', () => {
        // eslint-disable-next-line @typescript-eslint/dot-notation
        const spy = spyOn(service['analyticsPlugin'], 'trackException');
        const error: Error = new Error('ERROR');
        service.handleError(error);
        expect(spy).toHaveBeenCalledWith({ exception: error });
    });
});

class ChannelPlugin implements IPlugin {

    public isFlushInvoked = false;
    public isTearDownInvoked = false;
    public isResumeInvoked = false;
    public isPauseInvoked = false;

    public processTelemetry;

    public identifier = 'Sender';

    public priority = 1001;

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

    setNextPlugin(next: any): void {
        // no next setup
    }

    public initialize = (config: IConfiguration) => {
    };

    private _processTelemetry(env: ITelemetryItem): void {
    }
}
