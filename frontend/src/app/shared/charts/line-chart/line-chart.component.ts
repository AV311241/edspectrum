import { Component, computed, input } from '@angular/core';

/** One labelled sample on a line series, e.g. `{ label: 'Apr', value: 10 }`. */
export interface LineChartPoint {
  label: string;
  value: number;
}

/** A y-axis gridline: the value it marks and the text shown beside it. */
export interface AxisTick {
  value: number;
  label: string;
}

/** A sample resolved into SVG viewBox coordinates. */
export interface PlotPoint {
  x: number;
  y: number;
  point: LineChartPoint;
}

/**
 * Internal SVG viewBox. The plot deliberately uses *no* vertical padding, so a
 * point's y position is exactly `value` mapped onto the 0-100 axis. That lets
 * the HTML gridlines (positioned in %) and the SVG path share one scale and
 * line up to the pixel.
 */
export const VIEWBOX_WIDTH = 300;
export const VIEWBOX_HEIGHT = 100;

/** Horizontal breathing room so the first/last markers are not half-clipped. */
const PLOT_INSET = 8;

/**
 * How far (in % of plot width) an end label is shifted inwards so it is not
 * clipped by the chart bounds. Half a ~30px label, roughly.
 */
const EDGE_LABEL_NUDGE_PERCENT = 1.5;

/** Desired number of y-axis gridlines. The real step is rounded to a "nice" one. */
export const TARGET_TICK_COUNT = 5;

/** The empty path used when there is nothing to draw. */
const EMPTY_PATH = '';

/**
 * Rounds a raw axis step up to the nearest 1, 2, 5 or 10 times a power of ten,
 * so gridlines land on human-readable values (0 / 10 / 20 / 30) rather than on
 * whatever the data spacing happened to be (0 / 8.3 / 16.6 / 24.9).
 */
export function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const snapped = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return snapped * magnitude;
}

/** Formats an axis tick value, avoiding exponent notation on large steps. */
export function formatAxisTick(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/**
 * Builds an evenly spaced y-axis from 0 up to (at least) the largest value.
 * Anchoring at zero keeps the slope of the line honest — a spend trend drawn
 * from a non-zero baseline exaggerates the change.
 */
export function buildAxisTicks(
  values: readonly number[],
  targetCount: number = TARGET_TICK_COUNT
): AxisTick[] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return [{ value: 0, label: formatAxisTick(0) }];
  }

  const max = Math.max(...finite, 0);
  const step = niceStep(max / Math.max(1, targetCount));
  const tickCount = Math.max(1, Math.round(max / step));

  return Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = Math.round(index * step * 1000) / 1000;
    return { value, label: formatAxisTick(value) };
  });
}

/**
 * Maps a series onto the viewBox. The x scale is even across the plot and the
 * y scale spans the full viewBox height between the domain bounds, which is
 * what keeps the SVG and the CSS gridlines on one shared axis.
 */
export function buildPlotPoints(
  series: readonly LineChartPoint[],
  domainMin: number,
  domainMax: number
): PlotPoint[] {
  if (series.length === 0) {
    return [];
  }

  const innerWidth = VIEWBOX_WIDTH - PLOT_INSET * 2;
  const span = domainMax - domainMin || 1;
  const step = series.length === 1 ? 0 : innerWidth / (series.length - 1);

  return series.map((point, index) => ({
    // A lone sample is centred rather than pinned to the left edge.
    x: PLOT_INSET + (series.length === 1 ? innerWidth / 2 : index * step),
    y: VIEWBOX_HEIGHT * (1 - (point.value - domainMin) / span),
    point
  }));
}

/** Builds the `M … L …` polyline for the plotted samples. */
export function buildLinePath(plot: readonly PlotPoint[]): string {
  if (plot.length === 0) {
    return EMPTY_PATH;
  }
  return plot
    .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

/** Closes the line down to the baseline to produce the shaded area fill. */
export function buildAreaPath(plot: readonly PlotPoint[]): string {
  if (plot.length < 2) {
    return EMPTY_PATH;
  }
  const first = plot[0];
  const last = plot[plot.length - 1];
  return `${buildLinePath(plot)} L ${last.x.toFixed(2)} ${VIEWBOX_HEIGHT} L ${first.x.toFixed(2)} ${VIEWBOX_HEIGHT} Z`;
}

/**
 * Sparkline path. Unlike the full chart a sparkline auto-scales to its own
 * min/max, because the trend *shape* is the message and the absolute values
 * are reported as text beside it.
 */
export function buildSparklinePath(
  values: readonly number[],
  width = 100,
  height = 30,
  verticalPadding = 2
): string {
  if (values.length === 0) {
    return EMPTY_PATH;
  }
  if (values.length === 1) {
    return `M 0 ${height / 2} L ${width} ${height / 2}`;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const usableHeight = height - verticalPadding * 2;
  const step = width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * step;
      const y = verticalPadding + usableHeight * (1 - (value - min) / span);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  templateUrl: './line-chart.component.html'
})
export class LineChartComponent {
  /** Sparkline mode: a bare trend shape with no axes, used inside KPI tiles. */
  readonly isSparkline = input<boolean>(false);

  /** Sparkline samples (used only when `isSparkline` is true). */
  readonly points = input<number[]>([]);

  /** Labelled samples for the full chart. */
  readonly series = input<LineChartPoint[]>([]);

  /** Text placed before every axis / value label, e.g. a currency symbol. */
  readonly valuePrefix = input<string>('');

  /** Text placed after every axis / value label, e.g. a unit such as "L". */
  readonly valueSuffix = input<string>('');

  /** Decimal places kept on the value labels. */
  readonly valueDecimals = input<number>(0);

  /** Hide the per-point numbers on dense charts and rely on hover instead. */
  readonly showValueLabels = input<boolean>(true);

  /** Describes the chart for assistive technology. */
  readonly ariaLabel = input<string>('Line chart');

  readonly viewBox = `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`;

  /** Gridlines, ascending from zero to the top of the axis. */
  readonly ticks = computed<AxisTick[]>(() => {
    const prefix = this.valuePrefix();
    const suffix = this.valueSuffix();
    const ticks = buildAxisTicks(this.series().map((point) => point.value));
    return ticks.map((tick) => ({ ...tick, label: `${prefix}${tick.label}${suffix}` }));
  });

  readonly domainMin = computed(() => this.ticks()[0]?.value ?? 0);
  readonly domainMax = computed(() => this.ticks()[this.ticks().length - 1]?.value ?? 1);

  readonly plotPoints = computed(() =>
    buildPlotPoints(this.series(), this.domainMin(), this.domainMax())
  );

  readonly linePath = computed(() => buildLinePath(this.plotPoints()));
  readonly areaPath = computed(() => buildAreaPath(this.plotPoints()));

  readonly sparklineD = computed(() => buildSparklinePath(this.points()));

  /** True when there is at least one sample, so the chart can show a fallback. */
  readonly hasData = computed(() =>
    this.isSparkline() ? this.points().length > 0 : this.series().length > 0
  );

  /** Formats a single data value for its on-chart label and tooltip. */
  formatValue(value: number): string {
    return `${this.valuePrefix()}${value.toFixed(this.valueDecimals())}${this.valueSuffix()}`;
  }

  /**
   * Distance of a value from the top of the plot, in %. Shared by the gridlines
   * and the point labels so the two layers can never drift apart.
   */
  positionPercent(value: number): number {
    const span = this.domainMax() - this.domainMin();
    if (span <= 0) {
      return 0;
    }
    return (100 * (this.domainMax() - value)) / span;
  }

  /**
   * Horizontal position of a plotted sample as a % of the plot width. The first
   * and last samples are nudged inwards so their value label is not clipped by
   * the chart's own bounds; every other label is centred on its point.
   */
  labelLeftPercent(x: number, index: number): number {
    const percent = (100 * x) / VIEWBOX_WIDTH;
    if (index === 0) {
      return percent + EDGE_LABEL_NUDGE_PERCENT;
    }
    if (index === this.series().length - 1) {
      return percent - EDGE_LABEL_NUDGE_PERCENT;
    }
    return percent;
  }
}

