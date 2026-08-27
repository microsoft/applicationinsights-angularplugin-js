import { ApplicationRef, Component, NgZone, provideZoneChangeDetection } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { RouterTestingModule } from "@angular/router/testing";
import { ApplicationInsights } from "@microsoft/applicationinsights-web";
import { AngularPlugin } from "./applicationinsights-angularplugin-js.component";

@Component({
    template: "<p>Fake Home Component</p>"
})
class FakeHomeComponent { }

@Component({
    template: "<p>Fake About Component</p>"
})
class FakeAboutComponent { }

// Regression test for #117: telemetry timers blocking Angular hydration/stability.
//
// Unlike the other spec file, this one does NOT stub out the channel/Sender - it
// spins up a real ApplicationInsights instance (the same `loadAppInsights()` call
// real apps make) so it exercises the actual timers the SDK schedules, not a mock.
//
// This plugin only controls two entry points - trackPageView (on route change) and
// processTelemetry - so it can only keep timers that flow through *those* out of
// Angular's zone (that includes the Sender's own batch/retry timer, since it's
// armed downstream of processTelemetry). It has no way to touch timers that
// AppInsightsCore itself arms directly inside loadAppInsights() (e.g. its
// diagnosticLogInterval, which defaults to 10s and is exactly the kind of timer
// #117 is about) - that call belongs to the consuming app, not this plugin. So the
// test below has two phases: it calls loadAppInsights() itself outside NgZone (the
// pattern the README recommends), then separately triggers a route change *inside*
// NgZone (matching a real click/navigate() call) to prove this plugin's own fix
// covers what's left - stability has to come back quickly after both.
describe("AngularPlugin hydration regression (#117)", () => {
    let fixture: ComponentFixture<AngularPlugin>;
    let angularPlugin: AngularPlugin;
    let router: Router;
    let ngZone: NgZone;
    let appRef: ApplicationRef;
    let appInsights: ApplicationInsights;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [AngularPlugin],
            imports: [
                RouterTestingModule.withRoutes([
                    { path: "home", component: FakeHomeComponent },
                    { path: "about", component: FakeAboutComponent }
                ])
            ],
            // TestBed defaults NgZone to a noop/zoneless stub. This regression is
            // specifically about real zone.js behavior, so opt back into it - this
            // is what every real bootstrapped app gets by default.
            providers: [provideZoneChangeDetection()]
        });

        fixture = TestBed.createComponent(AngularPlugin);
        angularPlugin = fixture.componentInstance;
        router = TestBed.inject(Router);
        ngZone = TestBed.inject(NgZone);
        appRef = TestBed.inject(ApplicationRef);
        fixture.detectChanges();
    });

    afterEach(() => {
        // Tear down the real Sender so its timer doesn't keep firing (and hitting
        // the network) after the test has finished.
        appInsights?.unload(false);
    });

    it("becomes stable quickly when loadAppInsights() is called outside NgZone, per the recommended pattern", async () => {
        // This is the pattern the README recommends: call loadAppInsights() itself
        // via runOutsideAngular, the same way you'd wrap any other non-UI async work
        // (an HTTP client's setup, a websocket, etc.) that shouldn't hold up Angular.
        // That keeps AppInsightsCore's own init-time timers (diagnosticLogInterval,
        // cfgSync polling) out of NgZone from the start. This plugin's fix then keeps
        // the timers it's responsible for - the Sender's batch/retry timer, reached
        // via trackPageView/processTelemetry - out of NgZone too, even though those
        // calls happen synchronously as part of this same call chain.
        ngZone.runOutsideAngular(() => {
            appInsights = new ApplicationInsights({
                config: {
                    // Instrumentation key is a dummy; the endpoint is an address that
                    // refuses connections instantly (nothing listens on port 9) so the
                    // Sender's request fails fast instead of hanging - but it still
                    // queues the pageview and arms its batch timer either way, which is
                    // all this test needs.
                    connectionString:
                        "InstrumentationKey=00000000-0000-0000-0000-000000000000;IngestionEndpoint=http://127.0.0.1:9/",
                    extensions: [angularPlugin],
                    extensionConfig: {
                        [angularPlugin.identifier]: { router }
                    }
                }
            });
            appInsights.loadAppInsights();
        });

        const start = performance.now();
        await appRef.whenStable();
        const elapsed = performance.now() - start;

        // AppInsightsCore's diagnosticLogInterval defaults to 10s and keeps
        // re-arming itself for as long as the SDK is alive - that's the timer #117
        // is really about, and it's why loadAppInsights() itself has to run outside
        // NgZone, not just this plugin's own calls. 3s here is a generous margin:
        // with every relevant timer kept out of NgZone, stability should come back
        // almost immediately instead of waiting on (or never seeing) that 10s mark.
        expect(elapsed).toBeLessThan(3000);

        // Everything above ran inside runOutsideAngular, so it would stay out of
        // NgZone even without this plugin's own fix - that part only proves the
        // recommended pattern works. A route change is different: Router navigation
        // triggered by a real user (a click, a programmatic navigate() call from a
        // component) always runs *inside* NgZone, and that's exactly the call site
        // this plugin's fix wraps (see runOutsideAngular in the component). So run
        // the navigation itself inside NgZone here, on purpose, to prove that a
        // plugin-only regression - forgetting the Zone.root.run() wrap on
        // trackPageView - would show up here even with SDK init done correctly.
        //
        // The plugin ignores the *first* NavigationEnd it sees after init (it
        // treats it as a duplicate of the page view already sent during init), so
        // this navigates twice: the first is a throwaway to get past that, the
        // second is the one that actually reaches the wrapped trackPageView call.
        ngZone.run(() => {
            router.navigate(["home"]);
        });
        await appRef.whenStable();

        ngZone.run(() => {
            router.navigate(["about"]);
        });

        const navStart = performance.now();
        await appRef.whenStable();
        const navElapsed = performance.now() - navStart;
        expect(navElapsed).toBeLessThan(3000);
    });
});
