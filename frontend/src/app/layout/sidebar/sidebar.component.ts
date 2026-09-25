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
    { id: 'baseline', label: 'Baseline Assessment', icon: 'target', route: '/baseline-assessment' },
    { id: 'program', label: 'Program Overview', icon: 'book', route: '/' },
    { id: 'learning', label: 'Learning Outcomes', icon: 'chart-bar', route: '/' },
    { id: 'engagement', label: 'Engagement', icon: 'users-group', route: '/' },
    { id: 'teaching', label: 'Teaching', icon: 'academic-cap', route: '/' },
    { id: 'finance', label: 'Resources & Finance', icon: 'wallet', route: '/' },
    { id: 'schools', label: 'Schools', icon: 'home', route: '/' },
    { id: 'reports', label: 'Reports', icon: 'calendar', route: '/' }
  ]);
}
