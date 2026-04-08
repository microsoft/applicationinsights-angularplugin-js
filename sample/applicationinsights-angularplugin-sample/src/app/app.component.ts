import { Component } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ApplicationInsightsService } from './telemetry.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'insights';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private appInsights: ApplicationInsightsService
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd
        )
      )
      .subscribe((event) => {
        const activatedComponent = this.getActivatedComponent(this.route);
        if (activatedComponent) {
          this.appInsights.trackPageView({
            name: activatedComponent.name,
            uri: event.urlAfterRedirects,
          });
        }
      });
  }

  private getActivatedComponent(route: ActivatedRoute): any | null {
    while (route.firstChild) {
      route = route.firstChild;
    }

    return route.component ?? null;
  }

}
