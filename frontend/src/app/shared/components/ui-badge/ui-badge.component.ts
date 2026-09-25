import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-badge',
  standalone: true,
  templateUrl: './ui-badge.component.html'
})
export class UiBadgeComponent {
  readonly variant = input<'success' | 'warning' | 'error' | 'neutral' | 'primary'>('neutral');
  readonly customClass = input<string>('');

  get badgeClass(): () => string {
    return () => {
      if (this.customClass()) return this.customClass();
      switch (this.variant()) {
        case 'success':
          return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
        case 'warning':
          return 'bg-amber-50 text-amber-700 border border-amber-200/60';
        case 'error':
          return 'bg-rose-50 text-rose-700 border border-rose-200/60';
        case 'primary':
          return 'bg-pink-50 text-[#93004e] border border-pink-200/60';
        default:
          return 'bg-slate-100 text-slate-700 border border-slate-200/60';
      }
    };
  }
}
