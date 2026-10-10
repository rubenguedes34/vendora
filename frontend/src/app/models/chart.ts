/**
 * Minimal typings for the Chart.js global loaded from the page, covering
 * only what the app uses.
 */
export interface ChartInstance {
  data: {
    labels: unknown[];
    datasets: { data: unknown[]; backgroundColor?: unknown }[];
  };
  update(): void;
  destroy(): void;
}

export type ChartConstructor = new (context: unknown, config: object) => ChartInstance;

/** Tooltip item for charts with an x/y axis (bar, line). */
export interface CartesianTooltipItem {
  label: string;
  dataIndex: number;
  dataset: { label?: string };
  parsed: { x: number; y: number };
}

/** Tooltip item for charts without axes (pie, doughnut). */
export interface RadialTooltipItem {
  label: string;
  dataIndex: number;
  parsed: number;
}

export function chartConstructor(): ChartConstructor {
  return (window as unknown as { Chart: ChartConstructor }).Chart;
}
