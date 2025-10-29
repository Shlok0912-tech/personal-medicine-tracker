import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlucoseReading } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";

interface ReportsPanelProps {
  glucoseReadings: GlucoseReading[];
}

function filterByRange(readings: GlucoseReading[], range: '1d' | '7d' | '30d') {
  const now = Date.now();
  const days = range === '1d' ? 1 : range === '7d' ? 7 : 30;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return readings.filter(r => new Date(r.timestamp).getTime() >= cutoff);
}

export function ReportsPanel({ glucoseReadings }: ReportsPanelProps) {
  const [range, setRange] = useState<'1d' | '7d' | '30d'>('7d');

  const filtered = useMemo(() => filterByRange(glucoseReadings, range), [glucoseReadings, range]);
  const series = useMemo(
    () =>
      filtered
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((r) => ({
          date: new Date(r.timestamp).toLocaleString(),
          value: r.value,
        })),
    [filtered]
  );

  const avg = useMemo(() => {
    if (!filtered.length) return 0;
    const sum = filtered.reduce((acc, r) => acc + (r.value || 0), 0);
    return Math.round((sum / filtered.length) * 10) / 10;
  }, [filtered]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardTitle>Glucose Trend</CardTitle>
          <div className="flex gap-2">
            <Button variant={range === '1d' ? 'default' : 'outline'} size="sm" onClick={() => setRange('1d')}>1D</Button>
            <Button variant={range === '7d' ? 'default' : 'outline'} size="sm" onClick={() => setRange('7d')}>7D</Button>
            <Button variant={range === '30d' ? 'default' : 'outline'} size="sm" onClick={() => setRange('30d')}>1M</Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Average: {filtered.length ? `${avg} mg/dL` : 'N/A'}</div>
      </CardHeader>
      <CardContent>
        {series.length ? (
          <ChartContainer
            config={{ glucose: { label: 'Glucose', color: 'hsl(var(--primary))' } }}
            className="w-full"
          >
            <LineChart data={series} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis width={40} tickLine={false} axisLine={false} domain={[0, 'auto']} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="value" stroke="var(--color-glucose)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="text-muted-foreground">No readings in selected range</div>
        )}
      </CardContent>
    </Card>
  );
}


