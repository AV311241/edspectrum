import { Component, input } from '@angular/core';
import { StageDistributionItem } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-horizontal-bar-chart',
  standalone: true,
  templateUrl: './horizontal-bar-chart.component.html'
})
export class HorizontalBarChartComponent {
  readonly items = input.required<StageDistributionItem[]>();

  getScaledWidth(val: number): number {
    const max = 32;
    return Math.min(100, Math.max(8, (val / max) * 100));
  }

  getBarColorClass(idx: number): string {
    switch (idx) {
      case 0:
        return 'bg-[#93004e]';
      case 1:
        return 'bg-[#b81d67]';
      case 2:
        return 'bg-[#d94688]';
      case 3:
        return 'bg-[#e8bcd4]';
      default:
        return 'bg-[#f5d5e5]';
    }
  }
}
