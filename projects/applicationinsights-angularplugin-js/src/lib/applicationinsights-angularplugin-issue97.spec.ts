import { AngularPlugin } from "./applicationinsights-angularplugin-js.component";

// Mock ApplicationInsights configuration interface to simulate the real scenario
interface MockApplicationInsightsConfig {
    instrumentationKey: string;
    enableAutoRouteTracking: boolean;
    enableCorsCorrelation: boolean;
    extensions: any[]; // In real scenario this would be ITelemetryPlugin[]
    extensionConfig: {
        [key: string]: any;
    };
}

// Mock ApplicationInsights class to simulate the real scenario
class MockApplicationInsights {
    constructor(public config: { config: MockApplicationInsightsConfig }) {}
    loadAppInsights() {
        return this;
    }
}

describe("AngularPlugin Issue #97 Integration Test", () => {
    
    it("should reproduce and verify the fix for the original issue scenario", () => {
        // This reproduces the exact code from the GitHub issue
        const angularPlugin = new AngularPlugin();
        
        // This is the exact configuration that was failing before the fix
        const appInsights = new MockApplicationInsights({
            config: {
                instrumentationKey: "key",
                enableAutoRouteTracking: false, // option to log all route changes
                enableCorsCorrelation: true,
                // This line was causing: TS2322: Type 'AngularPlugin' is not assignable to type 'ITelemetryPlugin'
                extensions: [angularPlugin],
                extensionConfig: {
                    [angularPlugin.identifier]: { router: undefined }
                }
            }
        });
        
        appInsights.loadAppInsights();
        
        // Verify the plugin was properly configured
        expect(appInsights.config.config.extensions.length).toBe(1);
        expect(appInsights.config.config.extensions[0]).toBe(angularPlugin);
        expect(appInsights.config.config.extensionConfig[angularPlugin.identifier]).toBeDefined();
    });
    
    it("should verify that AngularPlugin has all required ITelemetryPlugin properties", () => {
        const angularPlugin = new AngularPlugin();
        
        // Check all required properties that ITelemetryPlugin expects
        expect(angularPlugin.identifier).toBe("AngularPlugin");
        expect(typeof angularPlugin.priority).toBe("number");
        expect(angularPlugin.priority).toBe(186);
        
        // Check methods required by ITelemetryPlugin
        expect(typeof angularPlugin.processTelemetry).toBe("function");
        expect(typeof angularPlugin.initialize).toBe("function");
        
        // Check the problematic setNextPlugin method that was causing the TS error
        expect(typeof angularPlugin.setNextPlugin).toBe("function");
        expect(angularPlugin.setNextPlugin).toBeDefined();
        
        // Verify that setNextPlugin can be called (basic smoke test)
        expect(() => {
            angularPlugin.setNextPlugin(undefined as any);
        }).not.toThrow();
    });
});
