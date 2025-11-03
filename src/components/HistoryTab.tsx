import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicineLog, GlucoseReading } from "@/lib/storage";
import { exportMedicineLogsCsv, exportGlucoseCsv, importMedicineLogsCsv, importGlucoseCsv } from "@/lib/backup";
import { Clock, Pill, Droplets, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HistoryTabProps {
  medicineLogs: MedicineLog[];
  glucoseReadings: GlucoseReading[];
  onDeleteGlucose: (id: string) => void;
  onDeleteMedicineLog: (id: string) => void;
}

export const HistoryTab = ({ medicineLogs, glucoseReadings, onDeleteGlucose, onDeleteMedicineLog }: HistoryTabProps) => {
  const getGlucoseStatus = (value: number) => {
    if (value < 70) return { label: "Low", variant: "destructive" as const };
    if (value > 140) return { label: "High", variant: "destructive" as const };
    return { label: "Normal", variant: "secondary" as const };
  };

  return (
    <Tabs defaultValue="medicine" className="w-full">
      <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <TabsList className="inline-flex w-auto min-w-full sm:w-full sm:grid sm:grid-cols-2 gap-1 sm:gap-2">
          <TabsTrigger value="medicine" className="whitespace-nowrap flex-shrink-0 px-3 sm:px-3 text-xs sm:text-sm">
            Medicine History
          </TabsTrigger>
          <TabsTrigger value="glucose" className="whitespace-nowrap flex-shrink-0 px-3 sm:px-3 text-xs sm:text-sm">
            Glucose History
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="medicine" className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => exportMedicineLogsCsv()}>Export CSV</Button>
          <input id="import-medicine-logs" type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            await importMedicineLogsCsv(file);
            // Simple reload to reflect imported data
            window.location.reload();
          }} />
          <Button variant="secondary" size="sm" onClick={() => document.getElementById('import-medicine-logs')?.click()}>Import CSV</Button>
        </div>
        {medicineLogs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No medicine logs yet</p>
            </CardContent>
          </Card>
        ) : (
          medicineLogs.map((log) => (
            <Card key={log.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{log.medicineName}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {log.quantity} {log.quantity === 1 ? 'tablet' : 'tablets'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteMedicineLog(log.id)}
                      aria-label="Delete medicine log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {log.notes && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{log.notes}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </TabsContent>
      
      <TabsContent value="glucose" className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => exportGlucoseCsv()}>Export CSV</Button>
          <input id="import-glucose" type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            await importGlucoseCsv(file);
            window.location.reload();
          }} />
          <Button variant="secondary" size="sm" onClick={() => document.getElementById('import-glucose')?.click()}>Import CSV</Button>
        </div>
        {glucoseReadings.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No glucose readings yet</p>
            </CardContent>
          </Card>
        ) : (
          glucoseReadings.map((reading) => {
            const status = getGlucoseStatus(reading.value);
            return (
              <Card key={reading.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-5 w-5 text-accent" />
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {reading.value} mg/dL
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {new Date(reading.timestamp).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteGlucose(reading.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {reading.notes && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{reading.notes}</p>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </TabsContent>
    </Tabs>
  );
};
