import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { UiIconComponent } from '../../shared/components/ui-icon/ui-icon.component';

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
  constructor(private router: Router) {}

  readonly navItems = signal<NavItem[]>([
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', route: '/' },
    { id: 'data-upload', label: 'Data Upload', icon: 'upload', route: '/data-upload' },
    { id: 'program', label: 'Program Overview', icon: 'book', route: '/program-overview' },
    { id: 'learning', label: 'Learning Outcomes', icon: 'chart-bar', route: '/learning-outcomes' },
    { id: 'engagement', label: 'Engagement', icon: 'users-group', route: '/engagement' },
    { id: 'teaching', label: 'Teaching', icon: 'academic-cap', route: '/teaching' },
    { id: 'finance', label: 'Resources & Finance', icon: 'wallet', route: '/resources-finance' },
    { id: 'schools', label: 'Schools', icon: 'home', route: '/schools' },
    { id: 'reports', label: 'Reports', icon: 'calendar', route: '/reports' }
  ]);
}
