import { Component } from '@angular/core';
import { ApplicationInsightsService } from '../telemetry.service';
import { SeverityLevel } from '@microsoft/applicationinsights-web';

@Component({
  selector: 'list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class ListComponent {
  constructor(
    private appInsights: ApplicationInsightsService
  ) { }
  
  trackException() {
    this.appInsights.trackException({
      error: new Error('some error'),
      severityLevel: SeverityLevel.Error,
    });
  }
  
  trackTrace() {
    this.appInsights.trackTrace({
      message: 'some trace',
      severityLevel: SeverityLevel.Information,
    });
  }
  
  trackEvent() {
    this.appInsights.trackEvent({name: 'some event'});
  }
  
  flush() {
    this.appInsights.flush();
  }
  
  throwError() {
    throw new Error('test error');
  }
  
  ajaxRequest() {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://httpbin.org/status/200');
    xhr.send();
  }
  
  fetchRequest() {
    fetch('https://httpbin.org/status/200');
  }
}


