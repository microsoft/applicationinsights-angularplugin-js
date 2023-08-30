import { Component, Injector } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ApplicationInsightsService } from './telemetry.service';
import { AngularPlugin, ApplicationinsightsAngularpluginErrorService } from '@microsoft/applicationinsights-angularplugin-js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent { 
  title = 'insights';
  private appInsights: ApplicationInsightsService;

  constructor(private router: Router ) {
    this.appInsights = new ApplicationInsightsService(router);
  }

  ngOnInit() {
    this.router.events
      .pipe(filter((event): event is ResolveEnd => event instanceof ResolveEnd))
      .subscribe((event) => {
        const activatedComponent = this.getActivatedComponent(event.state.root);
        if (activatedComponent) {
          this.appInsights.trackPageView({name:activatedComponent.name, uri: event.urlAfterRedirects});
        }
      });
  }

  private getActivatedComponent(snapshot: ActivatedRouteSnapshot): any {
    if (snapshot.firstChild) {
      return this.getActivatedComponent(snapshot.firstChild);
    }
    return snapshot.component;
  }
}
