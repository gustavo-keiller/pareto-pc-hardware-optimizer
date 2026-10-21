import { forwardRef } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import {
  ScatterChart,
  EffectScatterChart,
  LineChart,
  LinesChart,
  BarChart,
  RadarChart,
  ParallelChart,
} from 'echarts/charts';
import {
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  ParallelComponent,
  RadarComponent,
  AxisPointerComponent,
} from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsReactProps } from 'echarts-for-react/lib/types';

// Register only the specific modules needed across ParetoPC (PERF-02)
echarts.use([
  ScatterChart,
  EffectScatterChart,
  LineChart,
  LinesChart,
  BarChart,
  RadarChart,
  ParallelChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  ParallelComponent,
  RadarComponent,
  AxisPointerComponent,
  LabelLayout,
  CanvasRenderer,
]);

export type EChartsRendererProps = Omit<EChartsReactProps, 'echarts'>;

export type EChartsInstanceRef = ReactEChartsCore;

export const EChartsRenderer = forwardRef<
  ReactEChartsCore,
  EChartsRendererProps
>((props, ref) => {
  return <ReactEChartsCore ref={ref} echarts={echarts} {...props} />;
});

EChartsRenderer.displayName = 'EChartsRenderer';
