import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [SidebarComponent, HeaderComponent],
  templateUrl: './layout-shell.component.html',
  styles: [':host { display: block; min-width: 0; width: 100%; max-width: 100%; overflow-x: clip; }']
})
export class LayoutShellComponent {
  constructor(readonly router: Router) {}
}
