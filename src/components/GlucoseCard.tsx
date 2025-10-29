import { Droplets, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlucoseReading } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";

interface GlucoseCardProps {
  readings: GlucoseReading[];
}

export const GlucoseCard = ({ readings }: GlucoseCardProps) => {
  const latestReading = readings[0];
  const previousReading = readings[1];
  
  const getTrend = () => {
    if (!latestReading || !previousReading) return null;
    const diff = latestReading.value - previousReading.value;
    return diff > 0 ? "up" : diff < 0 ? "down" : "stable";
  };
  
  const getGlucoseStatus = (value: number) => {
    if (value < 70) return { label: "Low", variant: "destructive" as const };
    if (value > 140) return { label: "High", variant: "destructive" as const };
    return { label: "Normal", variant: "secondary" as const };
  };
  
  const trend = getTrend();
  const status = latestReading ? getGlucoseStatus(latestReading.value) : null;
  
  return (
    <Card className="bg-gradient-to-br from-card to-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Droplets className="h-5 w-5 text-accent" />
          </div>
          Latest Glucose Reading
        </CardTitle>
      </CardHeader>
      <CardContent>
        {latestReading ? (
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{latestReading.value}</span>
              <span className="text-muted-foreground mb-1">mg/dL</span>
              {status && <Badge variant={status.variant}>{status.label}</Badge>}
            </div>
            
            {trend && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {trend === "up" && <TrendingUp className="h-4 w-4 text-destructive" />}
                {trend === "down" && <TrendingDown className="h-4 w-4 text-accent" />}
                <span>
                  {trend === "up" ? "Increased" : trend === "down" ? "Decreased" : "Stable"} from previous reading
                </span>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              {new Date(latestReading.timestamp).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">No readings yet</p>
        )}
      </CardContent>
    </Card>
  );
};
