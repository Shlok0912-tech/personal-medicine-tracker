import { useEffect, useMemo, useState } from "react";
import { Medicine } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DosageCalculatorProps {
  medicines: Medicine[];
}

export const DosageCalculator = ({ medicines }: DosageCalculatorProps) => {
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>(medicines[0]?.id ?? "");
  const [tabletsPerDose, setTabletsPerDose] = useState<string>("1");
  const [timesPerDay, setTimesPerDay] = useState<string>("1");

  const selectedMedicine = useMemo(() => medicines.find(m => m.id === selectedMedicineId), [medicines, selectedMedicineId]);

  const tabletsPerDoseNum = Math.max(0, parseInt(tabletsPerDose || "0", 10));
  const timesPerDayNum = Math.max(0, parseInt(timesPerDay || "0", 10));
  const totalFor30Days = tabletsPerDoseNum * timesPerDayNum * 30;

  function getTimesPerDayFromSchedule(schedule: Medicine["schedule"] | undefined): number {
    switch (schedule) {
      case 'morning':
      case 'noon':
      case 'night':
        return 1;
      case 'morning_noon':
      case 'morning_night':
      case 'noon_night':
        return 2;
      case 'three_times':
        return 3;
      default:
        return 1;
    }
  }

  function inferTabletsPerDoseFromText(text?: string): number | undefined {
    if (!text) return undefined;
    const lower = text.toLowerCase();
    // Patterns: "x2", "×2", "2x", "2 tablets", "2 tab"
    const xMatch = lower.match(/(?:x|×)\s*(\d+)/i) || lower.match(/(\d+)\s*(?:x)/i);
    if (xMatch && xMatch[1]) {
      const n = parseInt(xMatch[1], 10);
      if (Number.isFinite(n) && n > 0 && n < 10) return n;
    }
    const tabMatch = lower.match(/(\d+)\s*(?:tablet|tablets|tab)\b/i);
    if (tabMatch && tabMatch[1]) {
      const n = parseInt(tabMatch[1], 10);
      if (Number.isFinite(n) && n > 0 && n < 10) return n;
    }
    return undefined;
  }

  // When selected medicine changes, auto-detect suggested values
  useEffect(() => {
    if (!selectedMedicine) return;
    const inferredTimes = getTimesPerDayFromSchedule(selectedMedicine.schedule);
    const inferredPerDose = inferTabletsPerDoseFromText(selectedMedicine.dosage) ?? inferTabletsPerDoseFromText(selectedMedicine.notes) ?? 1;
    setTimesPerDay(String(inferredTimes));
    setTabletsPerDose(String(inferredPerDose));
  }, [selectedMedicineId]);

  // If no medicines exist, show a simple message instead of rendering broken selects
  if (medicines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">30-Day Tablet Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No medicines available. Please add a medicine first.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">30-Day Tablet Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Medicine</Label>
              <Select value={selectedMedicineId || undefined} onValueChange={(v) => setSelectedMedicineId(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select medicine" />
                </SelectTrigger>
                <SelectContent>
                  {medicines.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tablets per dose</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={tabletsPerDose}
                onChange={(e) => setTabletsPerDose(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Times per day</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={timesPerDay}
                onChange={(e) => setTimesPerDay(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Selected medicine</div>
              <div className="font-medium">{selectedMedicine ? selectedMedicine.name : '-'}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">30-day total</div>
              <div className="font-semibold text-lg">{Number.isFinite(totalFor30Days) ? totalFor30Days : 0} tablets</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Current stock coverage</div>
              <div className="font-medium">
                {selectedMedicine && timesPerDayNum > 0 && tabletsPerDoseNum > 0
                  ? `${Math.floor(selectedMedicine.currentStock / (timesPerDayNum * tabletsPerDoseNum))} days`
                  : '-'}
              </div>
            </div>
          </div>
          {selectedMedicine && (
            <div className="text-xs text-muted-foreground">
              Auto-detected: {tabletsPerDoseNum} per dose, {timesPerDayNum} per day (from medicine details). You can adjust manually.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DosageCalculator;


