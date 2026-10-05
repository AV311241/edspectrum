import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { UiIconComponent } from '../../shared/components/ui-icon/ui-icon.component';
import { AuthService } from '../../core/services/auth.service';
import { isAdminUser } from '../../core/auth/admin.guard';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, UiIconComponent],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);

  constructor(private router: Router) {}

  private readonly baseNavItems = signal<NavItem[]>([
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', route: '/' },
    { id: 'data-upload', label: 'Data Upload', icon: 'upload', route: '/data-upload' },
    { id: 'program', label: 'Program Overview', icon: 'book', route: '/program-overview' },
    { id: 'learning', label: 'Learning Outcomes', icon: 'chart-bar', route: '/learning-outcomes' },
    { id: 'engagement', label: 'Engagement', icon: 'users-group', route: '/engagement' },
    { id: 'teaching', label: 'Teaching', icon: 'academic-cap', route: '/teaching' },
    { id: 'finance', label: 'Resources & Finance', icon: 'wallet', route: '/resources-finance' },
    { id: 'schools', label: 'Schools', icon: 'home', route: '/schools' },
    { id: 'admin', label: 'Admin', icon: 'database', route: '/admin' },
    { id: 'reports', label: 'Reports', icon: 'calendar', route: '/reports' }
  ]);

  /** Admin-only entries (user management) are appended for administrators. */
  private readonly adminNavItems = signal<NavItem[]>([
    { id: 'users', label: 'Users', icon: 'users-group', route: '/users' }
  ]);

  /** Base navigation plus admin-only links when the session is an admin. */
  readonly navItems = computed<NavItem[]>(() =>
    isAdminUser(this.auth.user())
      ? [...this.baseNavItems(), ...this.adminNavItems()]
      : this.baseNavItems()
  );
}
