import { Component, computed, input } from '@angular/core';
import { StageDistributionItem } from '../../../core/models/dashboard.model';

/**
 * A stage distribution is spread across five stages, so no single stage usually
 * holds more than ~50% of the cohort. Scaling the bars against a 0-100 axis
 * would render every bar as a short stub, so the track is instead treated as a
 * 0-`DEFAULT_SCALE_CEILING` axis. The ceiling is only a *starting* point: it
 * grows automatically when the data exceeds it, so a stage holding e.g. 80% of
 * students still fits inside the track.
 */
export const DEFAULT_SCALE_CEILING = 50;

/**
 * Resolves the axis the bars are drawn against: the configured ceiling, widened
 * when the data contains a value larger than it (so a stage holding e.g. 80% of
 * students still fits inside the track instead of overflowing it).
 */
export function resolveScaleCeiling(
  values: readonly number[],
  configuredCeiling: number = DEFAULT_SCALE_CEILING
): number {
  const largestValue = values.reduce((max, value) => Math.max(max, value), 0);
  return Math.max(configuredCeiling, largestValue);
}

/**
 * Converts a percentage into the bar width, in % of the track, that the value
 * occupies on the resolved axis. Always returns a value within 0-100, rounded
 * to 2dp so binary floating point noise (e.g. 28/50 -> 56.00000000000001)
 * never leaks into the style binding.
 */
export function scaleBarWidth(val: number, ceiling: number): number {
  if (ceiling <= 0) {
    return 0;
  }
  const width = (val / ceiling) * 100;
  return Math.max(0, Math.min(100, Math.round(width * 100) / 100));
}

@Component({
  selector: 'app-horizontal-bar-chart',
  standalone: true,
  templateUrl: './horizontal-bar-chart.component.html',
  styleUrl: './horizontal-bar-chart.component.scss'
})
export class HorizontalBarChartComponent {
  readonly items = input.required<StageDistributionItem[]>();

  /** Percentage that maps to the full width of the track. */
  readonly scaleCeiling = input(DEFAULT_SCALE_CEILING);

  /** The configured ceiling, widened if any bar would otherwise overflow. */
  private readonly effectiveCeiling = computed(() =>
    resolveScaleCeiling(
      this.items().map((item) => item.percentage),
      this.scaleCeiling()
    )
  );

  getScaledWidth(val: number): number {
    return scaleBarWidth(val, this.effectiveCeiling());
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
