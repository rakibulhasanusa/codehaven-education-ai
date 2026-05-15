"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  formatCompactNumber,
  getArcPath,
  getAreaPath,
  getDeterministicGraphLayout,
  getLinePath,
  getMaxValue,
  getPieLayout,
  linearScale,
  polarToCartesian,
} from "@/lib/charts/chart-utils";
import type { ChartPoint, GraphLink, GraphNode, PieSlice } from "@/lib/charts/chart-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TooltipState = {
  x: number;
  y: number;
  title: string;
  value: string;
} | null;

type ChartShellProps = {
  title: string;
  subtitle?: string;
  children: (size: { width: number; height: number }) => ReactNode;
  className?: string;
  height?: number;
};

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 640, height: 280 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(280, Math.round(entry.contentRect.width));
      setSize((current) => (current.width === width ? current : { ...current, width }));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size, setSize };
}

function ChartShell({ title, subtitle, children, className, height = 280 }: ChartShellProps) {
  const { ref, size, setSize } = useElementSize<HTMLDivElement>();

  useEffect(() => {
    setSize((current) => (current.height === height ? current : { ...current, height }));
  }, [height, setSize]);

  return (
    <Card
      ref={ref}
      className={cn(
        "overflow-hidden transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg",
        className
      )}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle ? <CardDescription className="text-xs">{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children(size)}</CardContent>
    </Card>
  );
}

function ChartTooltip({ tooltip }: { tooltip: TooltipState }) {
  if (!tooltip) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 rounded-md border bg-popover/95 px-3 py-2 text-xs text-popover-foreground shadow-xl backdrop-blur"
      style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
    >
      <p className="font-semibold">{tooltip.title}</p>
      <p className="text-muted-foreground">{tooltip.value}</p>
    </div>
  );
}

function EmptyChart({ height = 240 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-md border border-dashed bg-background/50 text-sm text-muted-foreground"
      style={{ minHeight: height }}
    >
      No data available
    </div>
  );
}

function toStableId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

type AxisChartProps = {
  data: ChartPoint[];
  title: string;
  subtitle?: string;
  valueLabel?: string;
  className?: string;
  height?: number;
};

function getAxisLayout(data: ChartPoint[], width: number, height: number) {
  const padding = { top: 20, right: 18, bottom: 34, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = getMaxValue(data);
  const points = data.map((item, index) => ({
    ...item,
    x: padding.left + linearScale({ value: index, domainMin: 0, domainMax: Math.max(1, data.length - 1), rangeMin: 0, rangeMax: innerWidth }),
    y: padding.top + linearScale({ value: item.value, domainMin: 0, domainMax: maxValue, rangeMin: innerHeight, rangeMax: 0 }),
  }));
  return { padding, innerWidth, innerHeight, maxValue, points, baseline: padding.top + innerHeight };
}

export const LineChart = memo(function LineChart({ data, title, subtitle, valueLabel = "value", className, height }: AxisChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const gradientId = useMemo(() => `line-gradient-${toStableId(`${title}-${subtitle ?? ""}-${valueLabel}`)}`, [title, subtitle, valueLabel]);

  return (
    <ChartShell title={title} subtitle={subtitle} className={className} height={height}>
      {({ width, height }) => {
        if (!data.length) return <EmptyChart height={height} />;
        const layout = getAxisLayout(data, width, height);
        const path = getLinePath(layout.points);

        return (
          <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
              <defs>
                <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--chart-1)" />
                  <stop offset="100%" stopColor="var(--chart-2)" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const y = layout.padding.top + layout.innerHeight * tick;
                return <line key={tick} x1={layout.padding.left} x2={width - layout.padding.right} y1={y} y2={y} className="stroke-border" strokeDasharray="4 5" />;
              })}
              <path d={path} fill="none" stroke={`url(#${gradientId})`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
              {layout.points.map((point, index) => (
                <circle
                  key={`${point.label}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  className="origin-center fill-background stroke-primary transition-transform duration-200 hover:scale-125"
                  strokeWidth="3"
                  onMouseMove={(event) => setTooltip({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY, title: point.label, value: `${point.value} ${valueLabel}` })}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
              {layout.points.map((point, index) =>
                index % Math.max(1, Math.ceil(layout.points.length / 5)) === 0 ? (
                  <text key={`${point.label}-${index}-label`} x={point.x} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                    {point.label}
                  </text>
                ) : null
              )}
            </svg>
            <ChartTooltip tooltip={tooltip} />
          </div>
        );
      }}
    </ChartShell>
  );
});

export const AreaChart = memo(function AreaChart({ data, title, subtitle, valueLabel = "value", className, height }: AxisChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const gradientId = useMemo(() => `area-gradient-${toStableId(`${title}-${subtitle ?? ""}-${valueLabel}`)}`, [title, subtitle, valueLabel]);

  return (
    <ChartShell title={title} subtitle={subtitle} className={className} height={height}>
      {({ width, height }) => {
        if (!data.length) return <EmptyChart height={height} />;
        const layout = getAxisLayout(data, width, height);
        return (
          <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.48" />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.03" />
                </linearGradient>
              </defs>
              <path d={getAreaPath(layout.points, layout.baseline)} fill={`url(#${gradientId})`} />
              <path d={getLinePath(layout.points)} fill="none" stroke="var(--chart-2)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {layout.points.map((point, index) => (
                <rect
                  key={`${point.label}-${index}`}
                  x={point.x - 12}
                  y={layout.padding.top}
                  width="24"
                  height={layout.innerHeight}
                  className="fill-transparent hover:fill-primary/5"
                  onMouseMove={(event) => setTooltip({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY, title: point.label, value: `${point.value} ${valueLabel}` })}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </svg>
            <ChartTooltip tooltip={tooltip} />
          </div>
        );
      }}
    </ChartShell>
  );
});

export const BarChart = memo(function BarChart({ data, title, subtitle, valueLabel = "value", className, height }: AxisChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  return (
    <ChartShell title={title} subtitle={subtitle} className={className} height={height}>
      {({ width, height }) => {
        if (!data.length) return <EmptyChart height={height} />;
        const layout = getAxisLayout(data, width, height);
        const barWidth = Math.max(12, layout.innerWidth / Math.max(1, data.length) - 10);
        return (
          <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
              {layout.points.map((point, index) => {
                const barHeight = layout.baseline - point.y;
                return (
                  <g key={`${point.label}-${index}`}>
                    <rect
                      x={point.x - barWidth / 2}
                      y={point.y}
                      width={barWidth}
                      height={barHeight}
                      rx="6"
                      className="fill-primary/80 transition-all duration-300 hover:fill-primary"
                      onMouseMove={(event) => setTooltip({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY, title: point.label, value: `${point.value} ${valueLabel}` })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    <text x={point.x} y={height - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                      {point.label.length > 8 ? `${point.label.slice(0, 8)}...` : point.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            <ChartTooltip tooltip={tooltip} />
          </div>
        );
      }}
    </ChartShell>
  );
});

export const PieChart = memo(function PieChart({ data, title, subtitle, className, height }: { data: PieSlice[]; title: string; subtitle?: string; className?: string; height?: number }) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const layout = useMemo(() => getPieLayout(data), [data]);
  const total = useMemo(() => data.reduce((sum, slice) => sum + Math.max(0, slice.value), 0), [data]);
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  return (
    <ChartShell title={title} subtitle={subtitle} className={className} height={height}>
      {({ width, height }) => {
        if (!data.length || total <= 0) return <EmptyChart height={height} />;
        const radius = Math.min(width, height) * 0.34;
        const cx = width * 0.42;
        const cy = height * 0.5;
        return (
          <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
              {layout.map((slice, index) => {
                const labelPoint = polarToCartesian(cx, cy, radius * 0.68, (slice.startAngle + slice.endAngle) / 2);
                return (
                  <g key={`${slice.label}-${index}`}>
                    <path
                      d={getArcPath(cx, cy, radius, slice.startAngle, slice.endAngle)}
                      fill={colors[index % colors.length]}
                      className="origin-center opacity-85 transition-all duration-300 hover:scale-[1.025] hover:opacity-100"
                      onMouseMove={(event) => setTooltip({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY, title: slice.label, value: `${slice.value} (${slice.percent}%)` })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    {slice.percent >= 10 ? (
                      <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle" className="fill-white text-[11px] font-bold">
                        {slice.percent}%
                      </text>
                    ) : null}
                  </g>
                );
              })}
              <g transform={`translate(${width * 0.72} ${height * 0.26})`}>
                {layout.map((slice, index) => (
                  <g key={`${slice.label}-${index}-legend`} transform={`translate(0 ${index * 24})`}>
                    <rect width="12" height="12" rx="3" fill={colors[index % colors.length]} />
                    <text x="20" y="10" className="fill-foreground text-xs">
                      {slice.label} - {slice.percent}%
                    </text>
                  </g>
                ))}
              </g>
            </svg>
            <ChartTooltip tooltip={tooltip} />
          </div>
        );
      }}
    </ChartShell>
  );
});

export const RealtimeChart = memo(function RealtimeChart({ data, title, subtitle }: AxisChartProps) {
  return <AreaChart data={data.slice(-24)} title={title} subtitle={subtitle} valueLabel="events" />;
});

export const ForceDirectedGraph = memo(function ForceDirectedGraph({
  nodes,
  links,
  title,
  subtitle,
  className,
  height = 320,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  title: string;
  subtitle?: string;
  className?: string;
  height?: number;
}) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  return (
    <ChartShell title={title} subtitle={subtitle} className={className} height={height}>
      {({ width, height }) => {
        if (!nodes.length) return <EmptyChart height={height} />;
        const graph = getDeterministicGraphLayout({ nodes, links, width, height });
        return (
          <div className="relative">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
              {graph.links.map((link, index) => (
                <line
                  key={`${link.source}-${link.target}-${index}`}
                  x1={link.sourceNode.x}
                  y1={link.sourceNode.y}
                  x2={link.targetNode.x}
                  y2={link.targetNode.y}
                  className="stroke-border"
                  strokeWidth={Math.max(1, link.value ?? 1)}
                />
              ))}
              {graph.nodes.map((node, index) => (
                <g
                  key={node.id}
                  className="cursor-default transition-opacity duration-200 hover:opacity-90"
                  onMouseMove={(event) => setTooltip({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY, title: node.label, value: `${node.group ?? "node"} - ${formatCompactNumber(node.value ?? 0)}` })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <circle cx={node.x} cy={node.y} r={node.r} fill={`var(--chart-${(index % 5) + 1})`} className="drop-shadow-sm" opacity="0.88" />
                  <text x={node.x} y={node.y + node.r + 13} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                    {node.label.length > 14 ? `${node.label.slice(0, 14)}...` : node.label}
                  </text>
                </g>
              ))}
            </svg>
            <ChartTooltip tooltip={tooltip} />
          </div>
        );
      }}
    </ChartShell>
  );
});

export const EmbeddingVisualization = memo(function EmbeddingVisualization({
  nodes,
  title,
  subtitle,
  className,
  height = 320,
}: {
  nodes: GraphNode[];
  title: string;
  subtitle?: string;
  className?: string;
  height?: number;
}) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const points = useMemo(
    () =>
      nodes.map((node, index) => {
        const angle = index * 2.3999632297;
        const radius = Math.sqrt(index + 1) / Math.sqrt(Math.max(1, nodes.length));
        return { ...node, nx: 0.5 + Math.cos(angle) * radius * 0.43, ny: 0.5 + Math.sin(angle) * radius * 0.43 };
      }),
    [nodes]
  );

  return (
    <ChartShell title={title} subtitle={subtitle} className={className} height={height}>
      {({ width, height }) => (
        nodes.length ? <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
            {points.map((point, index) => (
              <circle
                key={point.id}
                cx={point.nx * width}
                cy={point.ny * height}
                r={Math.max(5, Math.min(16, 5 + (point.value ?? 0) * 0.08))}
                fill={`var(--chart-${(index % 5) + 1})`}
                className="opacity-75 transition-all duration-200 hover:opacity-100"
                onMouseMove={(event) => setTooltip({ x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY, title: point.label, value: point.group ?? "embedding" })}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </svg>
          <ChartTooltip tooltip={tooltip} />
        </div> : <EmptyChart height={height} />
      )}
    </ChartShell>
  );
});
