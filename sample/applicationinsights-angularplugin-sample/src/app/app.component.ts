import { Component } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router, ActivatedRoute } from '@angular/router';
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
    private appInsights: ApplicationInsightsService,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd
        )
      )
      .subscribe((event) => {
        const activatedComponent = this.getActivatedComponent(this.activatedRoute.snapshot);
        if (activatedComponent) {
          this.appInsights.trackPageView({
            name: activatedComponent.name,
            uri: event.urlAfterRedirects,
          });
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
