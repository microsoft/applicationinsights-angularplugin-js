# Microsoft Application Insights JavaScript SDK - Angular Plugin

[![Angular CI](https://github.com/microsoft/applicationinsights-angularplugin-js/actions/workflows/angular.yml/badge.svg?branch=main)](https://github.com/microsoft/applicationinsights-angularplugin-js/actions/workflows/angular.yml)
[![npm version](https://badge.fury.io/js/%40microsoft%2Fapplicationinsights-angularplugin-js.svg)]()

Angular Plugin for the Application Insights Javascript SDK, enables the following:

> ***Note:*** Angular plugin is NOT es3 compatible

- Tracking of router changes
- Tracking uncaught exceptions

Angular Plugin for the Application Insights Javascript SDK

## Getting Started

Install npm package:

```bash
npm install @microsoft/applicationinsights-angularplugin-js
```

## Basic Usage

Set up an instance of Application Insights in the entry component in your app:

```js
import { Component } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { AngularPlugin } from '@microsoft/applicationinsights-angularplugin-js';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
    constructor(
        private router: Router
    ){
        var angularPlugin = new AngularPlugin();
        const appInsights = new ApplicationInsights({ config: {
        instrumentationKey: 'YOUR_INSTRUMENTATION_KEY_GOES_HERE',
        extensions: [angularPlugin],
        extensionConfig: {
            [angularPlugin.identifier]: { router: this.router }
        }
        } });
        appInsights.loadAppInsights();
    }
}
```

To track uncaught exceptions, setup ApplicationinsightsAngularpluginErrorService in `app.module.ts`:

```js
import { ApplicationinsightsAngularpluginErrorService } from '@microsoft/applicationinsights-angularplugin-js';

@NgModule({
  ...
  providers: [
    {
      provide: ErrorHandler,
      useClass: ApplicationinsightsAngularpluginErrorService
    }
  ]
  ...
})
export class AppModule { }
```

To chain more custom error handlers, create custom error handlers that implement IErrorService:

```js
import { IErrorService } from '@microsoft/applicationinsights-angularplugin-js';

export class CustomErrorHandler implements IErrorService {
    handleError(error: any) {
        ...
    }
}
```

And pass errorServices array through extensionConfig:

```js
extensionConfig: {
        [angularPlugin.identifier]: {
          router: this.router,
          errorServices: [new CustomErrorHandler()]
        }
      }
```

## Compatibility Matrix

| Version |  Application Insights | Angular              | Branch
|---------|-----------------------|----------------------|-----------
| 2.9.2   | ^2.8.5                | peer: ^13.0.3        | [main](https://github.com/microsoft/applicationinsights-angularplugin-js)
| 2.9.1   | ~2.8.2                | peer: ^13.0.3        | [main](https://github.com/microsoft/applicationinsights-angularplugin-js)
| 2.9.0   | ~2.8.1                | peer: ^13.0.3        | [main](https://github.com/microsoft/applicationinsights-angularplugin-js)
| 2.8.1   | ~2.7.4                | peer: ^13.0.3        | [main](https://github.com/microsoft/applicationinsights-angularplugin-js)
| 2.8.0   | ^2.7.3                | peer: ^13.0.3        | [main](https://github.com/microsoft/applicationinsights-angularplugin-js)
| 2.7.2   | ~2.7.5                | peer: ^11.0.6        | [Angular11](https://github.com/microsoft/applicationinsights-angularplugin-js/commits/Angular11)
| 2.7.1   | ~2.7.4                | peer: ^11.0.6        | [Angular11](https://github.com/microsoft/applicationinsights-angularplugin-js/commits/Angular11)

Previous releases where from the [ApplicationInsights-JS repo with archived angularplugin-legacy Branch](https://github.com/microsoft/ApplicationInsights-JS/tree/angularplugin-legacy) and previous [Release Notes](https://github.com/microsoft/ApplicationInsights-JS/blob/angularplugin-legacy/RELEASES.md)

### Note

Angular plugin is using newer version of typescript, make sure to build and test before you create a pull request.
Navigate to the root folder of Angular plugin, under /applicationinsights-angularplugin-js:

```js
npm install
npm run build
npm run test
```

### Testing

`npm run test` will run the tests once and exit

`npm run watch` will run the tests and watch for changes

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Data Collection

As this SDK is designed to enable applications to perform data collection which is sent to the Microsoft collection endpoints the following is required to identify our privacy statement.

The software may collect information about you and your use of the software and send it to Microsoft. Microsoft may use this information to provide services and improve our products and services. You may turn off the telemetry as described in the repository. There are also some features in the software that may enable you and Microsoft to collect data from users of your applications. If you use these features, you must comply with applicable law, including providing appropriate notices to users of your applications together with a copy of Microsoft's privacy statement. Our privacy statement is located at https://go.microsoft.com/fwlink/?LinkID=824704. You can learn more about data collection and use in the help documentation and our privacy statement. Your use of the software operates as your consent to these practices.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party's policies.

## License

[MIT](LICENSE)
