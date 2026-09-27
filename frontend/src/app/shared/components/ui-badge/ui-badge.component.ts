import { Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-badge',
  standalone: true,
  templateUrl: './ui-badge.component.html'
})
export class UiBadgeComponent {
  readonly variant = input<'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'info' | 'accent'>('neutral');
  readonly customClass = input<string>('');

  /**
   * Semantic status colours from the Akshara palette: emerald for positive /
   * on-track, amber for watch / in-progress, red for alerts, blue for
   * informational, purple for accents, and brand pink for primary highlights.
   */
  get badgeClass(): () => string {
    return () => {
      if (this.customClass()) return this.customClass();
      switch (this.variant()) {
        case 'success':
          return 'bg-emerald-50 text-emerald-600 border border-emerald-200/60';
        case 'warning':
          return 'bg-amber-50 text-amber-700 border border-amber-200/60';
        case 'error':
          return 'bg-red-50 text-red-600 border border-red-200/60';
        case 'primary':
          return 'bg-brand-pink-soft text-brand-pink border border-pink-200/60';
        case 'info':
          return 'bg-blue-50 text-blue-600 border border-blue-200/60';
        case 'accent':
          return 'bg-purple-50 text-purple-600 border border-purple-200/60';
        default:
          return 'bg-slate-100 text-slate-600 border border-slate-200/60';
      }
    };
  }
}
