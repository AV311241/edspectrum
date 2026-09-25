# Akshara English Skill Building System - Dashboard Implementation Plan

## Overview
This document outlines the architecture, component tree, data models, design system mapping, and step-by-step implementation for the Akshara English Skill Building System Dashboard in Angular 22.

---

## 1. Architecture & Project Structure

```text
src/app/
├── core/
│   ├── models/
│   │   ├── dashboard.model.ts
│   │   ├── filter.model.ts
│   │   ├── school.model.ts
│   │   ├── metrics.model.ts
│   │   ├── teaching.model.ts
│   │   └── finance.model.ts
│   ├── services/
│   │   └── dashboard-data.service.ts
│   └── theme/
│       └── theme.config.ts
├── shared/
│   ├── components/
│   │   ├── ui-card/
│   │   │   └── ui-card.component.ts
│   │   ├── ui-badge/
│   │   │   └── ui-badge.component.ts
│   │   ├── ui-button/
│   │   │   └── ui-button.component.ts
│   │   ├── ui-select/
│   │   │   └── ui-select.component.ts
│   │   └── ui-icon/
│   │       └── ui-icon.component.ts
│   └── charts/
│       ├── bar-chart/
│       │   └── bar-chart.component.ts
│       ├── horizontal-bar-chart/
│       │   └── horizontal-bar-chart.component.ts
│       ├── donut-chart/
│       │   └── donut-chart.component.ts
│       └── line-chart/
│           └── line-chart.component.ts
├── layout/
│   ├── sidebar/
│   │   └── sidebar.component.ts
│   ├── header/
│   │   └── header.component.ts
│   └── layout-shell/
│       └── layout-shell.component.ts
└── features/
    └── dashboard/
        ├── components/
        │   ├── kpi-ribbon/
        │   │   └── kpi-ribbon.component.ts
        │   ├── learning-progress-chart/
        │   │   └── learning-progress-chart.component.ts
        │   ├── stage-distribution-chart/
        │   │   └── stage-distribution-chart.component.ts
        │   ├── overall-progress-summary/
        │   │   └── overall-progress-summary.component.ts
        │   ├── domain-progress-chart/
        │   │   └── domain-progress-chart.component.ts
        │   ├── school-performance-table/
        │   │   └── school-performance-table.component.ts
        │   ├── needs-attention-list/
        │   │   └── needs-attention-list.component.ts
        │   ├── stage-movement/
        │   │   └── stage-movement.component.ts
        │   ├── sas-distribution-chart/
        │   │   └── sas-distribution-chart.component.ts
        │   ├── objective-progress-summary/
        │   │   └── objective-progress-summary.component.ts
        │   ├── engagement-section/
        │   │   └── engagement-section.component.ts
        │   ├── teaching-section/
        │   │   └── teaching-section.component.ts
        │   └── resources-finance-section/
        │       └── resources-finance-section.component.ts
        └── dashboard.component.ts
```

---

## 2. Design System & Tailwind CSS Mapping

### Colors
- Primary: `#93004e`
- Primary Container: `#b81d67`
- On Primary Container: `#ffd2de`
- Secondary: `#006398`
- Secondary Container: `#5bb8fe`
- Tertiary: `#005539`
- Tertiary Container: `#00704c`
- Error: `#ba1a1a`
- Error Container: `#ffdad6`
- Surface: `#faf8ff`
- Surface Container Lowest: `#ffffff`
- Surface Container: `#eaedff`
- On Surface: `#131b2e`
- On Surface Variant: `#584047`
- Outline: `#8b7077`

### Typography (Plus Jakarta Sans)
- `display-lg`: 32px, 700
- `headline-lg`: 22px, 700
- `headline-md`: 18px, 600
- `body-lg`: 14px, 500
- `label-md`: 11px, 600, tracking 0.02em
- `metric-xl`: 28px, 800, tracking -0.02em

### Spacing & Radius
- Gutter: `1rem`
- Space MD: `0.875rem`
- Space LG: `1.25rem`
- Radius MD: `0.75rem`
- Radius LG: `1rem`
- Radius Full: `9999px`

---

## 3. Data Models

1. **KPI Metric**:
   - `id`: string
   - `title`: string
   - `value`: string | number
   - `subtext`: string
   - `trend`: string
   - `isPositive`: boolean
   - `icon`: string
   - `color`: string

2. **School Performance**:
   - `id`: string
   - `name`: string
   - `students`: number
   - `attendance`: number
   - `learningGain`: number
   - `objectivesPercent`: number
   - `meStatus`: 'On Track' | 'Watch' | 'Needs Attention'

3. **Needs Attention Alert**:
   - `id`: string
   - `title`: string
   - `subtitle`: string
   - `category`: string

4. **Domain / Skill Progress**:
   - `domain`: string
   - `baseline`: number
   - `current`: number

5. **Stage Distribution**:
   - `stage`: string
   - `percentage`: number

6. **Teaching Matrix**:
   - `class`: string
   - `modules`: boolean[]
   - `coveragePercent`: number

7. **Finance Summary**:
   - `annualBudget`: number
   - `spentTillAug`: number
   - `balance`: number
   - `categories`: Array<{ name: string; percentage: number }>
   - `monthlySpend`: Array<{ month: string; amount: number }>

---

## 4. Implementation Steps

1. **Config Setup**:
   - Write `tailwind.config.js` extending design tokens.
   - Configure `styles.scss` and `tailwind.css` with `@theme` values and Google Fonts (`Plus Jakarta Sans`).
   - Update `index.html` with font loading.

2. **Core Layer**:
   - Define data interfaces in `src/app/core/models/dashboard.model.ts`.
   - Implement `DashboardDataService` using Angular Signals (`signal()`, `computed()`) with complete dataset mirroring reference UI.

3. **Shared UI Layer**:
   - Build `UiCardComponent`, `UiBadgeComponent`, `UiButtonComponent`, `UiIconComponent`, `UiSelectComponent`.
   - Build custom SVG / Chart components for clustered bar charts, donut charts, horizontal bar progress indicators, line graphs.

4. **Layout Shell**:
   - Build `SidebarComponent` (Deep navy `#0E1726` with active route pink pill `#93004e`).
   - Build `HeaderComponent` (Title with branding, filters for Academic Year, Month, School, Class).
   - Build `LayoutShellComponent` wrapping sidebar and content container.

5. **Dashboard Features**:
   - Build `KpiRibbonComponent` (5 KPI cards + Motivational quote banner).
   - Build `LearningProgressChartComponent` (Listening, Speaking, Reading, Writing clustered bar chart).
   - Build `StageDistributionChartComponent` & `StageMovementComponent`.
   - Build `OverallProgressSummaryComponent` & `SasDistributionChartComponent`.
   - Build `DomainProgressChartComponent` & `ObjectiveProgressSummaryComponent`.
   - Build `SchoolPerformanceTableComponent` & `NeedsAttentionListComponent`.
   - Build `EngagementSectionComponent` (4 Cards with mini trend sparklines).
   - Build `TeachingSectionComponent` (4 KPI boxes + Class matrix grid).
   - Build `ResourcesFinanceSectionComponent` (3 Budget cards + Spend by Category horizontal bars + Monthly spend line chart).

6. **Integration**:
   - Wire all components into `DashboardComponent`.
   - Verify layout and aesthetics matching reference image.
