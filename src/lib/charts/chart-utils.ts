export type ChartPoint = {
  label: string;
  value: number;
  secondaryValue?: number;
};

export type PieSlice = {
  label: string;
  value: number;
};

export type GraphNode = {
  id: string;
  label: string;
  group?: string;
  value?: number;
};

export type GraphLink = {
  source: string;
  target: string;
  value?: number;
};

export type PositionedNode = GraphNode & {
  x: number;
  y: number;
  r: number;
};

export type PositionedLink = GraphLink & {
  sourceNode: PositionedNode;
  targetNode: PositionedNode;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getMaxValue(points: ChartPoint[], fallback = 1) {
  const max = Math.max(
    fallback,
    ...points.flatMap((point) => [point.value, point.secondaryValue ?? 0])
  );
  return Number.isFinite(max) ? max : fallback;
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function linearScale(input: {
  value: number;
  domainMin: number;
  domainMax: number;
  rangeMin: number;
  rangeMax: number;
}) {
  const span = input.domainMax - input.domainMin || 1;
  const ratio = (input.value - input.domainMin) / span;
  return input.rangeMin + ratio * (input.rangeMax - input.rangeMin);
}

export function getLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function getAreaPath(points: Array<{ x: number; y: number }>, baseline: number) {
  if (!points.length) return "";
  return `${getLinePath(points)} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
}

export function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export function getArcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

export function getPieLayout(slices: PieSlice[]) {
  const total = Math.max(1, slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0));
  let cursor = -Math.PI / 2;

  return slices.map((slice) => {
    const angle = (Math.max(0, slice.value) / total) * Math.PI * 2;
    const layout = {
      ...slice,
      total,
      startAngle: cursor,
      endAngle: cursor + angle,
      percent: Math.round((Math.max(0, slice.value) / total) * 100),
    };
    cursor += angle;
    return layout;
  });
}

export function getDeterministicGraphLayout(input: {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
}) {
  const centerX = input.width / 2;
  const centerY = input.height / 2;
  const groupMap = new Map<string, number>();
  const degrees = new Map<string, number>();

  input.nodes.forEach((node) => {
    if (!groupMap.has(node.group ?? "default")) {
      groupMap.set(node.group ?? "default", groupMap.size);
    }
    degrees.set(node.id, 0);
  });

  input.links.forEach((link) => {
    degrees.set(link.source, (degrees.get(link.source) ?? 0) + 1);
    degrees.set(link.target, (degrees.get(link.target) ?? 0) + 1);
  });

  const radius = Math.max(88, Math.min(input.width, input.height) * 0.34);
  const nodes: PositionedNode[] = input.nodes.map((node, index) => {
    const groupIndex = groupMap.get(node.group ?? "default") ?? 0;
    const angle = (index / Math.max(input.nodes.length, 1)) * Math.PI * 2 + groupIndex * 0.42;
    const degree = degrees.get(node.id) ?? 0;
    const orbit = radius * (0.72 + (groupIndex % 3) * 0.16);
    return {
      ...node,
      x: centerX + Math.cos(angle) * orbit,
      y: centerY + Math.sin(angle) * orbit,
      r: clamp(8 + degree * 2 + (node.value ?? 0) * 0.12, 10, 24),
    };
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const links: PositionedLink[] = input.links
    .map((link) => {
      const sourceNode = nodeMap.get(link.source);
      const targetNode = nodeMap.get(link.target);
      if (!sourceNode || !targetNode) return null;
      return { ...link, sourceNode, targetNode };
    })
    .filter((link): link is PositionedLink => Boolean(link));

  return { nodes, links };
}

