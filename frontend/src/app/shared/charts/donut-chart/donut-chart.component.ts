import { Component, input } from '@angular/core';

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  templateUrl: './donut-chart.component.html'
})
export class DonutChartComponent {
  readonly totalStudents = input<number>(500);
}
