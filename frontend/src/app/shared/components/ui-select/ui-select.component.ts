import { Component, input, output } from '@angular/core';

export interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-ui-select',
  standalone: true,
  templateUrl: './ui-select.component.html'
})
export class UiSelectComponent {
  readonly selectId = input<string>('select-' + Math.random().toString(36).substring(2, 9));
  readonly label = input<string>('');
  readonly value = input<string>('');
  readonly options = input<SelectOption[]>([]);

  readonly valueChange = output<string>();

  onSelectionChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.valueChange.emit(target.value);
    }
  }
}
