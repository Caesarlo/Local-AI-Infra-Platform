import {
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  type TooltipProps,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

type LineConfig = {
  key: string;
  label: string;
  color: string;
};

type LineChartProps<TData> = {
  data: TData[];
  lines: LineConfig[];
  xKey: keyof TData;
  height?: number;
  formatX?: (value: unknown) => string;
  formatTooltipValue?: (value: unknown, key: string) => string;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  formatX,
  formatTooltipValue,
}: TooltipProps<ValueType, NameType> & {
  formatX?: (value: unknown) => string;
  formatTooltipValue?: (value: unknown, key: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-sm px-3 py-2.5 shadow-glass text-xs">
      <p className="mb-2 text-text-muted">{formatX ? formatX(label) : String(label)}</p>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.color }} />
            <span className="text-text-body">{entry.name}:</span>
            <span className="font-medium text-text-primary">
              {formatTooltipValue
                ? formatTooltipValue(entry.value, String(entry.dataKey))
                : String(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart<TData extends Record<string, unknown>>({
  data,
  lines,
  xKey,
  height = 260,
  formatX,
  formatTooltipValue,
}: LineChartProps<TData>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(160,185,210,0.25)" />
        <XAxis
          dataKey={String(xKey)}
          tickFormatter={formatX}
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
            <ChartTooltipContent
              {...props}
              formatX={formatX}
              formatTooltipValue={formatTooltipValue}
            />
          )}
          cursor={{ stroke: "rgba(160,185,210,0.4)", strokeWidth: 1 }}
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  );
}
