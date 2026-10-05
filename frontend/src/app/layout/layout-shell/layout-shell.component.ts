import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  templateUrl: './layout-shell.component.html',
  styles: [':host { display: block; min-width: 0; width: 100%; max-width: 100%; overflow-x: clip; }']
})
export class LayoutShellComponent {
  private readonly router = inject(Router);

  /**
   * Dashboard header owns the School/Class filters, which only make sense on
   * the analytics pages — `/schools` and `/admin` bring their own hierarchy
   * controls. Tracks the live URL so the header toggles atomically with
   * navigation (a plain `router.url` read would go stale after the first load).
   */
  readonly showDashboardHeader = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
      map((url) => !url.startsWith('/schools') && !url.startsWith('/admin'))
    ),
    { initialValue: true }
  );
}
