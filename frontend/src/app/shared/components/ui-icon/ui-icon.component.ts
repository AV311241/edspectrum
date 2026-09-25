import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-icon',
  standalone: true,
  templateUrl: './ui-icon.component.html'
})
export class UiIconComponent {
  readonly name = input.required<string>();
  readonly size = input<number>(20);
  readonly className = input<string>('');
}
