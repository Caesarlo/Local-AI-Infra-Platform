import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BarConfig = {
  key: string;
  label: string;
  color: string;
  gradientId?: string;
};

type BarChartProps<TData> = {
  data: TData[];
  bars: BarConfig[];
  xKey: keyof TData;
  height?: number;
  formatTooltipValue?: (value: unknown, key: string) => string;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  formatTooltipValue,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: unknown; color: string; name: string }[];
  label?: unknown;
  formatTooltipValue?: (value: unknown, key: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-sm px-3 py-2.5 shadow-glass text-xs">
      <p className="mb-2 text-text-muted">{String(label)}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="text-text-body">{entry.name}:</span>
            <span className="font-medium text-text-primary">
              {formatTooltipValue
                ? formatTooltipValue(entry.value, entry.dataKey)
                : String(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart<TData extends Record<string, unknown>>({
  data,
  bars,
  xKey,
  height = 260,
  formatTooltipValue,
}: BarChartProps<TData>) {
  const gradientBars = bars.filter((b) => b.gradientId);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        {gradientBars.length > 0 && (
          <defs>
            {gradientBars.map((bar) => (
              <linearGradient
                key={bar.gradientId}
                id={bar.gradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={bar.color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={bar.color} stopOpacity={0.4} />
              </linearGradient>
            ))}
          </defs>
        )}
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,185,210,0.25)" vertical={false} />
        <XAxis
          dataKey={String(xKey)}
          tick={{ fontSize: 11, fill: "#9eb0c0" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9eb0c0" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={(props) => (
            <ChartTooltipContent {...props} formatTooltipValue={formatTooltipValue} />
          )}
          cursor={{ fill: "rgba(160,185,210,0.12)" }}
        />
        {bars.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} name={bar.label} radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={bar.gradientId ? `url(#${bar.gradientId})` : bar.color}
              />
            ))}
          </Bar>
        ))}
      </ReBarChart>
    </ResponsiveContainer>
  );
}
