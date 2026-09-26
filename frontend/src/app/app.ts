import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutShellComponent } from './layout/layout-shell/layout-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LayoutShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  styles: [':host { display: block; min-width: 0; width: 100%; max-width: 100%; overflow-x: clip; }']
})
export class App {}
