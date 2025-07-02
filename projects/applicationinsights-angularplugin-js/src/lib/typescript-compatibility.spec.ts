import { AngularPlugin } from "./applicationinsights-angularplugin-js.component";
import { ITelemetryPlugin } from "@microsoft/applicationinsights-core-js";

describe('TypeScript Compatibility Tests', () => {
    
    it('should allow AngularPlugin to be assigned to ITelemetryPlugin variable', () => {
        // This test ensures TypeScript compatibility with newer versions
        const plugin = new AngularPlugin();
        
        // This assignment should not cause TypeScript compilation errors
        const telemetryPlugin: ITelemetryPlugin = plugin;
        
        expect(telemetryPlugin).toBeDefined();
        expect(telemetryPlugin.identifier).toBe('AngularPlugin');
        expect(telemetryPlugin.priority).toBe(186);
        expect(typeof telemetryPlugin.setNextPlugin).toBe('function');
    });
    
    it('should have compatible setNextPlugin signature', () => {
        const plugin = new AngularPlugin();
        
        // Verify that the setNextPlugin method has the correct signature
        expect(plugin.setNextPlugin).toBeDefined();
        expect(typeof plugin.setNextPlugin).toBe('function');
        
        // This should not throw TypeScript errors when compiled with stricter settings
        const telemetryPlugin: ITelemetryPlugin = plugin;
        expect(telemetryPlugin.setNextPlugin).toBe(plugin.setNextPlugin);
    });
});