# Microsoft Application Insights JavaScript SDK - Angular Plugin

[![Angular CI](https://github.com/microsoft/applicationinsights-angularplugin-js/actions/workflows/angular.yml/badge.svg?branch=main)](https://github.com/microsoft/applicationinsights-angularplugin-js/actions/workflows/angular.yml)
[![npm version](https://badge.fury.io/js/%40microsoft%2Fapplicationinsights-angularplugin-js.svg)](https://www.npmjs.com/package/@microsoft/applicationinsights-angularplugin-js)

Angular Plugin for the Application Insights JavaScript SDK. Enables:

- Tracking of router changes
- Tracking of uncaught exceptions

> **Note:** the Angular plugin is not ES3 compatible.

## Contents

- [Getting Started](#getting-started)
- [Basic Usage](#basic-usage)
- [Lazy Loading](#lazy-loading)
- [Tracking Uncaught Exceptions](#tracking-uncaught-exceptions)
- [Multiple Instance Setup](#multiple-instance-setup-method)
- [Compatibility Matrix](#compatibility-matrix)
- [Contributing](#contributing)

## Getting Started

```bash
npm install @microsoft/applicationinsights-angularplugin-js
```

## Basic Usage

Set up an instance of Application Insights in the entry component of your app. Construct it and call
`loadAppInsights()` inside `NgZone.runOutsideAngular()`:

```ts
import { Component, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { AngularPlugin } from '@microsoft/applicationinsights-angularplugin-js';

// Note: if you also want to use the ErrorService, you MUST include either the
// '@microsoft/applicationinsights-web' package or the
// '@microsoft/applicationinsights-analytics-js' extension - otherwise unhandled
// errors caught by the error service won't be sent.

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor() {
    const router = inject(Router);
    const ngZone = inject(NgZone);

    ngZone.runOutsideAngular(() => {
      const angularPlugin = new AngularPlugin();
      const appInsights = new ApplicationInsights({
        config: {
          instrumentationKey: 'YOUR_INSTRUMENTATION_KEY_GOES_HERE',
          extensions: [angularPlugin],
          extensionConfig: {
            [angularPlugin.identifier]: { router },
          },
        },
      });
      appInsights.loadAppInsights();
    });
  }
}
```

> **Why `runOutsideAngular`?** The SDK keeps its own timers alive in the background for as long as it's running -
> batching/retrying telemetry, polling for config changes, diagnostic logging. Constructing `ApplicationInsights`
> and calling `loadAppInsights()` inside Angular's zone schedules those timers inside NgZone too, which triggers
> change-detection ticks for work that never touches a template, and - if your app uses SSR hydration or anything
> else that waits on `ApplicationRef.isStable`/`whenStable()` - can keep Angular from ever reporting the app as
> stable. This plugin keeps its own telemetry-processing timers (route-change tracking and `processTelemetry`) out
> of NgZone automatically, but it doesn't call `loadAppInsights()` for you, so wrapping that call is on your app.

See [Page view titles](./projects/applicationinsights-angularplugin-js/README.md#page-view-titles) for title timing behavior and manual tracking guidance.

## Lazy Loading

The SDK doesn't need to be on the critical path - you can defer loading it until after the app has bootstrapped
(or behind a dynamic `import()`). Pass an async function to `runOutsideAngular()` so the dynamic imports themselves,
not just the SDK initialization at the end of them, run outside Angular's zone:

```ts
// router/ngZone are kept as fields here, not local consts, since inject() only
// works during construction - initTelemetry() below runs later, as its own call.
private readonly router = inject(Router);
private readonly ngZone = inject(NgZone);

initTelemetry(): void {
  this.ngZone.runOutsideAngular(async () => {
    const { ApplicationInsights } = await import('@microsoft/applicationinsights-web');
    const { AngularPlugin } = await import('@microsoft/applicationinsights-angularplugin-js');

    const angularPlugin = new AngularPlugin();
    const appInsights = new ApplicationInsights({
      config: {
        instrumentationKey: 'YOUR_INSTRUMENTATION_KEY_GOES_HERE',
        extensions: [angularPlugin],
        extensionConfig: {
          [angularPlugin.identifier]: { router: this.router },
        },
        // Router already drives page view tracking through the plugin above.
        enableAutoRouteTracking: false,
        // Chrome is deprecating the 'unload' event because it's unreliable and
        // breaks the back/forward cache (bfcache). Excluding it here just makes
        // the SDK fall back to 'pagehide'/'beforeunload' for exit tracking instead,
        // which silences the Chrome deprecation warning.
        disablePageUnloadEvents: ['unload'],
      },
    });
    appInsights.loadAppInsights();
  });
}
```

## Tracking Uncaught Exceptions

Set up `ApplicationinsightsAngularpluginErrorService` in `app.module.ts`:

> **Note:** the ErrorService has an implicit dependency on the `@microsoft/applicationinsights-analytics-js`
> extension, which is included in the `@microsoft/applicationinsights-web` SKU. Your project must be initialized
> with the analytics package included, otherwise unhandled errors caught by the error service won't be sent.

```ts
import { NgModule, ErrorHandler } from '@angular/core';
import { ApplicationinsightsAngularpluginErrorService } from '@microsoft/applicationinsights-angularplugin-js';

@NgModule({
  // ...
  providers: [
    {
      provide: ErrorHandler,
      useClass: ApplicationinsightsAngularpluginErrorService,
    },
  ],
  // ...
})
export class AppModule {}
```

To chain more custom error handlers, implement `IErrorService`:

```ts
import { IErrorService } from '@microsoft/applicationinsights-angularplugin-js';

export class CustomErrorHandler implements IErrorService {
  handleError(error: any) {
    // ...
  }
}
```

And pass an `errorServices` array through `extensionConfig`:

```ts
extensionConfig: {
  [angularPlugin.identifier]: {
    router: this.router,
    errorServices: [new CustomErrorHandler()],
  },
}
```

## Multiple Instance Setup Method

When multiple Angular plugin instances run in the same session, their error services can overlap and conflict with
each other. To work around this, give each instance its own `Injector.create(...)` - not the app's `inject(Injector)`
- so each one resolves its own `ApplicationinsightsAngularpluginErrorService` instead of the shared root instance:

```ts
import { Component, inject, Injector, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import {
  AngularPlugin,
  ApplicationinsightsAngularpluginErrorService,
} from '@microsoft/applicationinsights-angularplugin-js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor() {
    const router = inject(Router);
    const ngZone = inject(NgZone);

    // A dedicated injector per instance, not the app's own inject(Injector) - the
    // latter would just resolve to the same app-wide root injector every time, giving
    // every plugin instance the same shared error service instead of its own.
    const injector = Injector.create({
      providers: [ApplicationinsightsAngularpluginErrorService],
    });

    ngZone.runOutsideAngular(() => {
      const angularPlugin = new AngularPlugin(injector);
      const appInsights = new ApplicationInsights({
        config: {
          instrumentationKey: 'YOUR_INSTRUMENTATION_KEY_GOES_HERE',
          extensions: [angularPlugin],
          extensionConfig: {
            [angularPlugin.identifier]: { router, useInjector: true },
          },
        },
      });
      appInsights.loadAppInsights();
    });
  }
}
```

## Compatibility Matrix

As part of updating to support [ApplicationInsights 3.x](https://github.com/microsoft/ApplicationInsights-JS/blob/main/RELEASES.md),
we bumped the major version of this extension to match the major version of the supported Angular version (v14.x
for the first release).

The existing v3.x extension has been moved to the
[release3.x branch](https://github.com/microsoft/applicationinsights-angularplugin-js/tree/release3.x).

The `15.x` line requires **Angular 15.0.0 or later** and is compatible with newer Angular majors (verified through
Angular 21). Angular 14 is *not* supported by `15.x` - its generated type declarations can't be consumed by the
Angular 14 compiler. Angular 14 users should stay on the
[`14.x`](https://github.com/microsoft/applicationinsights-angularplugin-js/tree/Angular14) line.

| Version | Application Insights | Angular        | Branch |
|---------|-----------------------|----------------|--------|
| 15.4.2  | ^3.4.4                | peer: >= 15.0.0 | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.4.1  | ^3.4.2                | peer: >= 14.0.3 | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.4.0  | ^3.4.1                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.3.8  | ^3.3.10               | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.3.7  | ^3.3.9                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.3.6  | ^3.3.6                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.3.5  | ^3.3.5                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.3.4  | ^3.3.4                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.3.3  | ^3.3.3                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.3.2  | ^3.3.2                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.3.1  | ^3.3.1                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.3.0  | ^3.3.0                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.2.0  | ^3.2.0                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.1.2  | ^3.1.2                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| ~~15.1.1~~ (deprecated) | ^3.1.1  | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.1.0  | ^3.1.0                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.0.2  | ^3.0.8                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.0.1  | ^3.0.5                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 15.0.0  | ^3.0.3                | peer: ^15.2.9  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 14.0.0  | ^3.0.3                | peer: ^14.0.3  | [Angular14](https://github.com/microsoft/applicationinsights-angularplugin-js/tree/Angular14) (moved here since Sep. 2023) |
| 3.0.3   | ^2.8.14               | peer: ^14.0.3  | [release3.x](https://github.com/microsoft/applicationinsights-angularplugin-js/tree/release3.x) |
| 3.0.2   | ^2.8.14               | peer: ^14.0.3  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 3.0.1   | ^2.8.10               | peer: ^14.0.3  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 3.0.0   | ^2.8.5                | peer: ^14.0.3  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 2.9.2   | ^2.8.5                | peer: ^13.0.3  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) (Angular v13 archived to [Angular13](https://github.com/microsoft/applicationinsights-angularplugin-js/tree/Angular13)) |
| 2.9.1   | ~2.8.2                | peer: ^13.0.3  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 2.9.0   | ~2.8.1                | peer: ^13.0.3  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 2.8.1   | ~2.7.4                | peer: ^13.0.3  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 2.8.0   | ^2.7.3                | peer: ^13.0.3  | [main](https://github.com/microsoft/applicationinsights-angularplugin-js) |
| 2.7.2   | ~2.7.5                | peer: ^11.0.6  | [Angular11](https://github.com/microsoft/applicationinsights-angularplugin-js/tree/Angular11) |
| 2.7.1   | ~2.7.4                | peer: ^11.0.6  | [Angular11](https://github.com/microsoft/applicationinsights-angularplugin-js/tree/Angular11) |

Previous releases are from the
[ApplicationInsights-JS repo's archived angularplugin-legacy branch](https://github.com/microsoft/ApplicationInsights-JS/tree/angularplugin-legacy)
- see its [Release Notes](https://github.com/microsoft/ApplicationInsights-JS/blob/angularplugin-legacy/RELEASES.md).

### Building and Testing

The Angular plugin uses a newer version of TypeScript, so make sure to build and test locally before opening a
pull request. From the root of the repo:

```bash
npm install
npm run build
npm run test
```

`npm run test` runs the tests once and exits; `npm run watch` runs them and watches for changes.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a Contributor
License Agreement (CLA) declaring that you have the right to, and actually do, grant us the rights to use your
contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide a CLA and
decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions provided by the bot.
You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact
[opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Data Collection

As this SDK is designed to enable applications to perform data collection which is sent to the Microsoft collection
endpoints, the following is required to identify our privacy statement.

The software may collect information about you and your use of the software and send it to Microsoft. Microsoft may
use this information to provide services and improve our products and services. You may turn off the telemetry as
described in the repository. There are also some features in the software that may enable you and Microsoft to
collect data from users of your applications. If you use these features, you must comply with applicable law,
including providing appropriate notices to users of your applications together with a copy of Microsoft's privacy
statement. Our privacy statement is located at https://go.microsoft.com/fwlink/?LinkID=824704. You can learn more
about data collection and use in the help documentation and our privacy statement. Your use of the software
operates as your consent to these practices.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply
Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third parties' policies.

## License

[MIT](LICENSE)
