import { Component, input } from '@angular/core';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  templateUrl: './line-chart.component.html'
})
export class LineChartComponent {
  readonly isSparkline = input<boolean>(false);
  readonly points = input<number[]>([]);

  get sparklineD(): () => string {
    return () => {
      const data = this.points();
      if (!data || data.length === 0) return 'M 0 15 L 100 15';
      const max = Math.max(...data, 1);
      const min = Math.min(...data, 0);
      const step = 100 / (data.length - 1);
      return data.map((val, idx) => {
        const x = idx * step;
        const y = 28 - ((val - min) / (max - min || 1)) * 24;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ');
    };
  }
}
