import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCALE_CEILING,
  HorizontalBarChartComponent,
  resolveScaleCeiling,
  scaleBarWidth
} from './horizontal-bar-chart.component';
import { StageDistributionItem } from '../../../core/models/dashboard.model';

/** Mirrors how the component draws a row: ceiling from the data, then scale. */
function widthsFor(
  values: number[],
  ceiling: number = DEFAULT_SCALE_CEILING
): number[] {
  const resolved = resolveScaleCeiling(values, ceiling);
  return values.map((value) => scaleBarWidth(value, resolved));
}

function items(...percentages: number[]): StageDistributionItem[] {
  return percentages.map((percentage, i) => ({ stage: `Stage ${i + 1}`, percentage }));
}

describe('resolveScaleCeiling', () => {
  it('uses the 50% default when no value exceeds it', () => {
    expect(resolveScaleCeiling([28, 24, 23, 15, 5])).toBe(50);
  });

  it('grows to the largest value so bars never overflow the track', () => {
    expect(resolveScaleCeiling([80, 10, 5])).toBe(80);
  });

  it('honours a custom ceiling larger than the data', () => {
    expect(resolveScaleCeiling([30, 15], 100)).toBe(100);
  });

  it('defaults the ceiling to 50%', () => {
    expect(DEFAULT_SCALE_CEILING).toBe(50);
  });
});

describe('scaleBarWidth', () => {
  it('scales bars against the 50% ceiling, not a 0-100 axis', () => {
    // The dashboard's stage distribution: 28% of a 50% axis = 56% of the track.
    expect(widthsFor([28, 24, 23, 15, 5])).toEqual([56, 48, 46, 30, 10]);
  });

  it('keeps bars proportional to each other', () => {
    const [first, second] = widthsFor([28, 24]);

    expect(second).toBeCloseTo((first * 24) / 28, 5);
  });

  it('fills the whole track when a value equals the resolved ceiling', () => {
    expect(widthsFor([80, 10, 5, 3, 2])).toEqual([100, 12.5, 6.25, 3.75, 2.5]);
  });

  it('honours a custom ceiling', () => {
    expect(widthsFor([30, 15], 100)).toEqual([30, 15]);
  });

  it('renders an empty track for a zero or negative value', () => {
    expect(widthsFor([0, -5, 50])).toEqual([0, 0, 100]);
  });

  it('does not divide by zero when every value is zero', () => {
    expect(widthsFor([0, 0])).toEqual([0, 0]);
    expect(scaleBarWidth(10, 0)).toBe(0);
  });

  it('never returns a width outside 0-100', () => {
    expect(scaleBarWidth(150, 50)).toBe(100);
    expect(scaleBarWidth(-20, 50)).toBe(0);
  });

  it('builds a valid StageDistributionItem list', () => {
    expect(items(28, 24)[0]).toEqual({ stage: 'Stage 1', percentage: 28 });
  });
});

/**
 * Rendering tests. These guard the regression where the component's SCSS was
 * never registered via `styleUrl`, so the chart rendered as unstyled stacked
 * text with no visible bars.
 */
describe('HorizontalBarChartComponent rendering', () => {
  const DASHBOARD_DATA: StageDistributionItem[] = [
    { stage: 'Stage 1', percentage: 28 },
    { stage: 'Stage 2', percentage: 24 },
    { stage: 'Stage 3', percentage: 23 },
    { stage: 'Stage 4', percentage: 15 },
    { stage: 'Stage 5', percentage: 5 }
  ];

  /** Renders the chart and returns the on-screen bar widths, in %. */
  function renderBars(data: StageDistributionItem[] = DASHBOARD_DATA): HTMLElement[] {
    const fixture = TestBed.createComponent(HorizontalBarChartComponent);
    fixture.componentRef.setInput('items', data);
    fixture.detectChanges();
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.bar-fill')
    );
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HorizontalBarChartComponent] });
  });

  it('registers its stylesheet, so the chart is not left unstyled', () => {
    // The stylesheet defines .chart-root; without styleUrl the chart renders
    // as raw stacked text and every bar collapses to zero height.
    const styles = (HorizontalBarChartComponent as unknown as { ɵcmp: { styles: string[] } }).ɵcmp
      .styles;
    expect(styles.join('')).toContain('.chart-root');
  });

  it('renders one bar per stage, each with a non-zero width', () => {
    const bars = renderBars();

    expect(bars).toHaveLength(5);
    for (const bar of bars) {
      expect(parseFloat(bar.style.width)).toBeGreaterThan(0);
    }
  });

  it('renders the bars at their 50%-axis widths', () => {
    const widths = renderBars().map((bar) => parseFloat(bar.style.width));

    expect(widths).toEqual([56, 48, 46, 30, 10]);
  });

  it('gives each bar a track to sit in', () => {
    const fixture = TestBed.createComponent(HorizontalBarChartComponent);
    fixture.componentRef.setInput('items', DASHBOARD_DATA);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.chart-row').length).toBe(5);
    expect(el.querySelectorAll('.track').length).toBe(5);
    expect(el.textContent).toContain('28%');
  });
});

