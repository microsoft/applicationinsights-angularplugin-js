# Releases

## 3.0.2 (Apr, 12th, 2023)

### Changelog

- #99 Update to ApplicationInsights v2.8.12
- #96 Internal Task 17133116: Add Policheck exclusion file

## 3.0.1 (Feb 7th, 2023)

### Changelog

- #76 Types incompatibility with @microsoft/applicationinsights-web
- #75 [Task]14057227: Add Angular Plugin Sample
- #78 Add license to package.json
- #94 update to ApplicationInsights v2.8.10
- #88 Bump json5 from 2.2.1 to 2.2.3 in /sample/applicationinsights-angularplugin-sample
- #91 Bump ua-parser-js from 0.7.31 to 0.7.33 in /sample/applicationinsights-angularplugin-sample
- #93 Bump http-cache-semantics from 4.1.0 to 4.1.1 in /sample/applicationinsights-angularplugin-sample
- #89 Add code owners
- #87 Bump json5 from 1.0.1 to 1.0.2
- #85 Bump engine.io from 6.2.0 to 6.2.1 in /sample/applicationinsights-angularplugin-sample
- #84 Bump engine.io from 6.2.0 to 6.2.1
- #86 Bump decode-uri-component from 0.2.0 to 0.2.2
- #79 Add license to the package.json here as well
- #83 Bump loader-utils from 2.0.2 to 2.0.4 in /sample/applicationinsights-angularplugin-sample
- #82 Bump loader-utils from 2.0.2 to 2.0.4

## 3.0.0 (Aug 2nd, 2022)

### Changelog

- #54 Create a compatibility table for the versions of the AngularPlugin -> ApplicationInsights versions
- #55 The root package.json has the ApplicationInsights components listed as devDependencies they should be dependencies
- #62 Missing Dependency either in package.json or documentation
- #68 [Testing] Re-enable test validation during PR validation on github
- #63 Angular 14 support

## 2.9.2 (July 27th, 2022)

This will likely be the last release from the `main` branch targeting Angular 13, once `main` targets a newer version a branch will be created to support any necessary security patches.
### Changelog

- Update to [ApplicationInsights to ^2.8.5 from ~2.8.2](https://github.com/microsoft/ApplicationInsights-JS/blob/master/RELEASES.md)
- #65 Update and add legal compliance notices and license terms

## 2.9.1 (May 2nd, 2022)

### Changelog

- #59 [IE8] Support for IE8 and ES3 support was broken a while ago
* Updates to Application Insights v2.8.2
 - [#1823 [BUG] IE8 Support was broken by several components](https://github.com/microsoft/ApplicationInsights-JS/issues/1823)
 - [#47 [IE8] The _checkPrototype always fails on IE in IE8 mode](https://github.com/microsoft/DynamicProto-JS/issues/47)

## 2.9.0 (Apr 19th, 2022)

### Significant changes

This release adds support from the base SDK to

- TelemetryInitializers have been moved to `BaseCore` so they are now available as part of all Sku's and not just those using the `analytics` plugin (@microsoft/applicationinsights-analytics-js) using the `appInsights.addTelemetryInitializer(...)`
- Web Events (addEventHandler) now support "event namespaces" (similar to jQuery) to enable the removing of events by just specifying the namespace and new specific `eventOn(...)` and `eventOff(...)` API's.
- Fully unload, removing all internal event handlers (may be re-initialized) via the `appInsights.unload(...)` function.
- Dynamically add a plugin to an already initialized SDK (optionally replacing an existing) via new `appInsights.addPlugin(...)` function
- New helper to get any plugin from an initialized SDK via `appInsights.getPlugin("...identifier...")`
- Dynamically remove a plugin via the `appInsights.getPlugin("...identifier..").remove()`
- Enable / Disable any plugin (even if the plugin doesn't support disabling itself) via `appInsights.getPlugin("...identifier...").setEnabled(true/false)`
- `fetch` Ajax tracking was also been change to be on by default from this version moving forward, if you are running in an environment without `fetch` support and you are using an incompatible polyfill (that doesn't identify itself as a polyfill) or the SDK you start seeing recursive or duplicate (`fetch` and `XHR` requests) being reported you WILL need to add `disableFetchTracking` with a value of `true` to your configuration to disable this functionality.

### Changelog

* Update to Application Insights v2.8.1
 - [#1807](https://github.com/microsoft/ApplicationInsights-JS/issues/1807) [BUG] Angular project doesn't build after install latest version v.2.8.0
 - [#1810](https://github.com/microsoft/ApplicationInsights-JS/issues/1810) v2.8.0 has incompatible TypeScript 3.x type declaration
 - [#1812](https://github.com/microsoft/ApplicationInsights-JS/issues/1812) [BUG] Browser exceptions are no longer automatically tracked after 2.8.0

## 2.8.1 (Apr 19th, 2022)

### Changelog

* Update and change dependency to Application Insights ~2.7.4
* [#1807](https://github.com/microsoft/ApplicationInsights-JS/issues/1807) [BUG] Angular project doesn't build after install latest version v.2.8.0

## 2.8.0 (Feb 3rd, 2022)

### Changelog

* Update to Application Insights v2.7.3
* #28 Add support for Angular v13
  * Update to Angular v13 (from v11)

## 2.7.0 (Nov 19th, 2021)

### Changelog

* Update to Application Insights v2.7.1


## 2.6.4

### Changelog

* Update to Application Insights v2.6.5
