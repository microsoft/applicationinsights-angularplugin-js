import { AppInsightsCore, IConfiguration, DiagnosticLogger, ITelemetryItem, IPlugin, IAppInsightsCore } from "@microsoft/applicationinsights-core-js";
import { IPageViewTelemetry } from "@microsoft/applicationinsights-common";
import { AngularPlugin } from "./applicationinsights-angularplugin-js.component";

let angularPlugin: AngularPlugin;
let core: AppInsightsCore;
let coreConfig: IConfiguration;
let orgWarn = console && console.warn;

describe("ReactAI", () => {

  beforeEach(() => {
    if (orgWarn) {
      console.warn = (msg) => { /* Swallow */ }
    }
  });

  afterEach(() => {
    if (orgWarn) {
      console.warn = orgWarn;
    }
  });

  function init() {
    core = new AppInsightsCore();
    core.logger = new DiagnosticLogger();
    angularPlugin = new AngularPlugin();
    coreConfig = {
      instrumentationKey: 'testIkey',
      endpointUrl: 'testEndpoint',
      extensionConfig: {}
  };
  }

  it("React Configuration: Config options can be passed from root config", () => {
    
    init();
    coreConfig.extensionConfig = {
      [angularPlugin.identifier]: {
        history
      }
    }
    core.initialize(coreConfig, [ angularPlugin, new ChannelPlugin() ]);
    console.log("init success")
  });

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