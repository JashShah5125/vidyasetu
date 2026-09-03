import * as React from 'react';
import { ResponsiveContainer } from 'recharts';
import type { TooltipProps } from 'recharts';

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<string, string>;
  }
>;

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig;
  children: React.ReactElement;
}

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className = '', children, config, ...props }, ref) => {
    const chartId = React.useId();
    const containerId = id || `chart-${chartId.replace(/:/g, '')}`;

    // Inline CSS vars for config colors
    const style = React.useMemo(() => {
      const colorStyles: Record<string, string> = {};
      Object.entries(config).forEach(([key, item]) => {
        if (item.color) {
          colorStyles[`--color-${key}`] = item.color;
        }
      });
      return colorStyles;
    }, [config]);

    return (
      <div
        ref={ref}
        id={containerId}
        style={style}
        className={`w-full h-full text-xs ${className}`}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    );
  }
);
ChartContainer.displayName = 'ChartContainer';

export const ChartTooltip = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-xl border border-slate-200 bg-white/95 backdrop-blur-md p-3 shadow-lg shadow-slate-200/50 text-slate-800 font-sans text-xs min-w-[140px] animate-in fade-in-0 zoom-in-95 ${className}`}
      {...props}
    />
  )
);
ChartTooltip.displayName = 'ChartTooltip';

export interface ChartTooltipContentProps extends Partial<TooltipProps<any, any>> {
  hideLabel?: boolean;
  nameKey?: string;
  labelKey?: string;
  indicator?: 'line' | 'dot' | 'dashed';
  config?: ChartConfig;
  formatter?: (value: any, name: any, item: any, index: number, payload: any) => React.ReactNode;
}

export const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      label,
      hideLabel = false,
      indicator = 'dot',
      config = {},
      formatter,
    },
    ref
  ) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <ChartTooltip ref={ref}>
        {!hideLabel && label && (
          <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1.5 mb-2">
            {label}
          </div>
        )}
        <div className="space-y-1.5">
          {payload.map((item, index) => {
            const dataKey = item.dataKey || item.name || 'value';
            const itemConfig = config[dataKey] || config[item.name] || {};
            const color = item.fill || item.color || itemConfig.color || '#3b82f6';
            const labelText = itemConfig.label || item.name || dataKey;

            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 min-w-0">
                  {indicator === 'dot' && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  {indicator === 'line' && (
                    <span
                      className="w-3 h-1 rounded shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <span className="text-slate-600 font-medium truncate">{labelText}</span>
                </div>
                <span className="font-bold text-slate-900 ml-auto">
                  {formatter
                    ? formatter(item.value, item.name, item, index, payload)
                    : item.value?.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </ChartTooltip>
    );
  }
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

export const ChartLegend = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center justify-center gap-4 text-xs font-medium text-slate-600 flex-wrap pt-2 ${className}`}
      {...props}
    />
  )
);
ChartLegend.displayName = 'ChartLegend';

export interface ChartLegendContentProps {
  payload?: any[];
  config?: ChartConfig;
}

export const ChartLegendContent: React.FC<ChartLegendContentProps> = ({ payload = [], config = {} }) => {
  if (!payload.length) return null;

  return (
    <ChartLegend>
      {payload.map((entry, index) => {
        const itemConfig = config[entry.dataKey] || config[entry.value] || {};
        const color = entry.color || itemConfig.color || '#3b82f6';
        const labelText = itemConfig.label || entry.value;

        return (
          <div key={index} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span>{labelText}</span>
          </div>
        );
      })}
    </ChartLegend>
  );
};
