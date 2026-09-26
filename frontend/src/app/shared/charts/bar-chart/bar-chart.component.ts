import { Component, input } from '@angular/core';
import { LearningProgressItem } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.scss'
})
export class BarChartComponent {
  readonly data = input.required<LearningProgressItem[]>();
}
