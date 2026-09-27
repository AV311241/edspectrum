import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  templateUrl: './ui-button.component.html'
})
export class UiButtonComponent {
  readonly variant = input<'primary' | 'secondary' | 'outline' | 'ghost'>('primary');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  readonly customClass = input<string>('');

  readonly btnClick = output<MouseEvent>();

  /** Primary actions use brand pink, hovering to the darker brand accent. */
  get buttonClass(): () => string {
    return () => {
      if (this.customClass()) return this.customClass();

      let base = '';
      switch (this.size()) {
        case 'sm':
          base += 'px-3 py-1.5 text-xs rounded-lg ';
          break;
        case 'lg':
          base += 'px-5 py-2.5 text-sm rounded-xl ';
          break;
        default:
          base += 'px-4 py-2 text-xs rounded-xl ';
          break;
      }

      switch (this.variant()) {
        case 'secondary':
          return base + 'bg-brand-navy text-white hover:bg-brand-navy-hover shadow-sm';
        case 'outline':
          return base + 'border border-gray-200 bg-white text-slate-700 hover:bg-gray-50 hover:border-pink-200';
        case 'ghost':
          return base + 'bg-transparent text-slate-600 hover:bg-gray-100';
        default:
          return base + 'bg-brand-pink text-white hover:bg-brand-pink-dark shadow-sm';
      }
    };
  }
}
