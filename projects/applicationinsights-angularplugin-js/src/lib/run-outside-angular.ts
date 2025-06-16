// This would be exposed on the `globalThis` whenever `zone.js` is
// included in the `polyfills` configuration property. Starting from Angular 17,
// users can opt-in to use zoneless change detection.
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const Zone: any;

/**
 * The function that does the same job as `NgZone.runOutsideAngular`.
 * It doesn't require an injection context to be specified.
 *
 * ⚠️ Note: Most of the Application Insights functionality called from
 * inside the Angular execution context must be wrapped in this function.
 * Angular's rendering relies on asynchronous tasks being scheduled within
 * its execution context.
 * Since the plugin schedules tasks that do not interact with Angular's rendering,
 * it may prevent Angular from functioning reliably. Consequently, it may disrupt
 * processes such as server-side rendering or client-side hydration.
 */
export const runOutsideAngular = <T>(callback: () => T): T =>
    // Running the `callback` within the root execution context enables Angular
    // processes (such as SSR and hydration) to continue functioning normally without
    // timeouts and delays that could affect the user experience.
    typeof Zone !== "undefined" ? Zone.root.run(callback) : callback()
;
