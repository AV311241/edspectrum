import { Component } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [SidebarComponent, HeaderComponent],
  templateUrl: './layout-shell.component.html'
})
export class LayoutShellComponent {}
