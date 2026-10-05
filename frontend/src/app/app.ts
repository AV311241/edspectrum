import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  styles: [':host { display: block; min-width: 0; width: 100%; max-width: 100%; overflow-x: clip; }']
})
export class App {}
