import { useState, useEffect } from "react";
import { Activity, History } from "lucide-react";
import { storage, Medicine, MedicineLog, GlucoseReading, isLocalStorageAvailable } from "@/lib/storage";
import { exportMedicinesCsv, importMedicinesCsv } from "@/lib/backup";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ReportsPanel } from "@/components/ReportsPanel";
import { showNotification } from "@/lib/notification";
import { MedicineCard } from "@/components/MedicineCard";
import { AddMedicineDialog } from "@/components/AddMedicineDialog";
import { TakeMedicineDialog } from "@/components/TakeMedicineDialog";
import { GlucoseCard } from "@/components/GlucoseCard";
import { AddGlucoseDialog } from "@/components/AddGlucoseDialog";
import { HistoryTab } from "@/components/HistoryTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import DosageCalculator from "@/components/DosageCalculator";

const Index = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineLogs, setMedicineLogs] = useState<MedicineLog[]>([]);
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [takeMedicineOpen, setTakeMedicineOpen] = useState(false);
  const { toast } = useToast();
  const [lowStockThreshold, setLowStockThreshold] = useState(20);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [scheduleFilter, setScheduleFilter] = useState<"all" | NonNullable<Medicine["schedule"]>>("all");
  const [editMedicineForDialog, setEditMedicineForDialog] = useState<Medicine | null>(null);
  const [lowStockSearch, setLowStockSearch] = useState("");
  const [lowStockSort, setLowStockSort] = useState<"percent_desc" | "percent_asc" | "name">("percent_desc");
  const [refillForId, setRefillForId] = useState<string | null>(null);
  const [refillQuantity, setRefillQuantity] = useState<number>(0);

  const deriveSchedule = (m: Medicine): Medicine["schedule"] | undefined => {
    if (m.schedule) return m.schedule;
    const text = `${m.dosage || ''} ${m.notes || ''}`.toLowerCase();
    const hasMorning = /\b(morning|breakfast|am)\b/.test(text);
    const hasNoon = /\b(noon|lunch|afternoon|midday)\b/.test(text);
    const hasNight = /\b(night|evening|dinner|bed\s*time|pm)\b/.test(text);
    if (/\b(thrice|3\s*times|three\s*times)\b/.test(text)) return 'three_times';
    if (/\b(twice|2\s*times|two\s*times|bid)\b/.test(text)) return 'morning_night';
    if (hasMorning && hasNoon && hasNight) return 'three_times';
    if (hasMorning && hasNoon) return 'morning_noon';
    if (hasMorning && hasNight) return 'morning_night';
    if (hasNoon && hasNight) return 'noon_night';
    if (hasMorning) return 'morning';
    if (hasNoon) return 'noon';
    if (hasNight) return 'night';
    return undefined;
  };

  const matchesScheduleFilter = (m: Medicine, filter: typeof scheduleFilter): boolean => {
    if (filter === 'all') return true;
    const s = m.schedule ?? deriveSchedule(m);
    if (!s) return false;
    if (filter === 'morning') return s === 'morning' || s === 'morning_noon' || s === 'morning_night' || s === 'three_times';
    if (filter === 'noon') return s === 'noon' || s === 'morning_noon' || s === 'noon_night' || s === 'three_times';
    if (filter === 'night') return s === 'night' || s === 'morning_night' || s === 'noon_night' || s === 'three_times';
    return true;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!isLocalStorageAvailable()) {
          toast({ title: 'Storage unavailable', description: 'Local Storage is disabled. Data will not persist.', variant: 'destructive' });
        }
        const [medicinesData, logsData, readingsData, settings] = await Promise.all([
          storage.getMedicines(),
          storage.getMedicineLogs(),
          storage.getGlucoseReadings(),
          storage.getUserSettings(),
        ]);
        setMedicines(medicinesData);
        setMedicineLogs(logsData);
        setGlucoseReadings(readingsData);
        setLowStockThreshold(settings.lowStockThresholdPercent ?? 20);
        setNotificationsEnabled(settings.notificationsEnabled ?? true);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({ title: "Error", description: "Failed to load local data.", variant: "destructive" });
      }
    };
    
    loadData();
  }, []);

  // Notify on low stock (deduplicated using localStorage)
  useEffect(() => {
    const key = 'med_tracker_low_stock_notified_ids';
    const parseSet = (): Set<string> => {
      try { return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
    };
    const saveSet = (s: Set<string>) => localStorage.setItem(key, JSON.stringify(Array.from(s)));

    const notified = parseSet();
    const lowMeds = medicines.filter(m => m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < lowStockThreshold);
    const lowIds = new Set(lowMeds.map(m => m.id));

    // Remove from notified if recovered
    const updatedNotified = new Set(Array.from(notified).filter(id => lowIds.has(id)));

    if (notificationsEnabled) {
      // Notify for new low-stock meds
      lowMeds.forEach(m => {
        if (!updatedNotified.has(m.id)) {
          showNotification('Low stock alert', `${m.name}: ${m.currentStock} remaining`);
          updatedNotified.add(m.id);
        }
      });
    }

    saveSet(updatedNotified);
  }, [medicines, lowStockThreshold, notificationsEnabled]);

  const handleAddMedicine = async (medicine: Omit<Medicine, 'id' | 'createdAt'>) => {
    try {
      await storage.addMedicine(medicine);
      const updatedMedicines = await storage.getMedicines();
      setMedicines(updatedMedicines);
      toast({
        title: "Medicine Added",
        description: `${medicine.name} has been added to your inventory.`,
      });
    } catch (error) {
      console.error('Error adding medicine:', error);
      toast({
        title: "Error",
        description: "Failed to add medicine. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMedicine = async (id: string, updates: Partial<Medicine>) => {
    try {
      await storage.updateMedicine(id, updates);
      const updatedMedicines = await storage.getMedicines();
      setMedicines(updatedMedicines);
      toast({
        title: "Medicine Updated",
        description: "Medicine details have been updated.",
      });
    } catch (error) {
      console.error('Error updating medicine:', error);
      toast({
        title: "Error",
        description: "Failed to update medicine. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMedicine = async (id: string) => {
    try {
      await storage.deleteMedicine(id);
      const updatedMedicines = await storage.getMedicines();
      setMedicines(updatedMedicines);
      toast({
        title: "Medicine Deleted",
        description: "Medicine has been removed from your inventory.",
      });
    } catch (error) {
      console.error('Error deleting medicine:', error);
      toast({
        title: "Error",
        description: "Failed to delete medicine. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTakeMedicine = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setTakeMedicineOpen(true);
  };

  const handleConfirmTakeMedicine = async (quantity: number, notes?: string) => {
    if (!selectedMedicine) return;
    
    try {
      const prevPercent = selectedMedicine.totalStock > 0 ? (selectedMedicine.currentStock / selectedMedicine.totalStock) * 100 : 100;
      await storage.addMedicineLog({
        medicineId: selectedMedicine.id,
        medicineName: selectedMedicine.name,
        quantity,
        notes,
      });
      
      await storage.updateMedicine(selectedMedicine.id, {
        currentStock: selectedMedicine.currentStock - quantity,
      });
      
      const [updatedMedicines, updatedLogs] = await Promise.all([
        storage.getMedicines(),
        storage.getMedicineLogs()
      ]);
      
      setMedicines(updatedMedicines);
      setMedicineLogs(updatedLogs);
      // After update, if crossing threshold, notify
      const updated = updatedMedicines.find(m => m.id === selectedMedicine.id);
      if (updated && updated.totalStock > 0) {
        const newPercent = (updated.currentStock / updated.totalStock) * 100;
        if (notificationsEnabled && prevPercent >= lowStockThreshold && newPercent < lowStockThreshold) {
          showNotification('Low stock alert', `${updated.name}: ${updated.currentStock} remaining`);
        }
      }
      
      toast({
        title: "Medicine Taken",
        description: `${quantity} ${selectedMedicine.name} recorded at ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      console.error('Error taking medicine:', error);
      toast({
        title: "Error",
        description: "Failed to record medicine intake. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddGlucose = async (value: number, notes?: string) => {
    try {
      await storage.addGlucoseReading({ value, notes });
      const updatedReadings = await storage.getGlucoseReadings();
      setGlucoseReadings(updatedReadings);
      toast({
        title: "Glucose Recorded",
        description: `Reading of ${value} mg/dL has been saved.`,
      });
    } catch (error) {
      console.error('Error adding glucose reading:', error);
      toast({
        title: "Error",
        description: "Failed to record glucose reading. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGlucose = async (id: string) => {
    try {
      await storage.deleteGlucoseReading(id);
      const updatedReadings = await storage.getGlucoseReadings();
      setGlucoseReadings(updatedReadings);
      toast({
        title: "Reading Deleted",
        description: "Glucose reading has been removed.",
      });
    } catch (error) {
      console.error('Error deleting glucose reading:', error);
      toast({
        title: "Error",
        description: "Failed to delete glucose reading. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMedicineLog = async (id: string) => {
    try {
      await storage.deleteMedicineLog(id);
      const updatedLogs = await storage.getMedicineLogs();
      setMedicineLogs(updatedLogs);
      toast({ title: 'Entry Deleted', description: 'Medicine history entry removed.' });
    } catch (error) {
      console.error('Error deleting medicine log:', error);
      toast({ title: 'Error', description: 'Failed to delete entry. Please try again.', variant: 'destructive' });
    }
  };

  const handleRefill = async (medicine: Medicine, quantity: number) => {
    if (!quantity || quantity <= 0) return;
    try {
      await storage.updateMedicine(medicine.id, { currentStock: medicine.currentStock + quantity, totalStock: Math.max(medicine.totalStock, medicine.currentStock + quantity) });
      const updatedMedicines = await storage.getMedicines();
      setMedicines(updatedMedicines);
      setRefillForId(null);
      setRefillQuantity(0);
      toast({ title: "Stock Refilled", description: `${medicine.name} increased by ${quantity}.` });
    } catch (error) {
      console.error('Error refilling medicine:', error);
      toast({ title: 'Error', description: 'Failed to refill stock.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-6xl py-6 sm:py-8 px-4 space-y-6 sm:space-y-8">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1" />
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Meditrack
              </span>
            </h1>
            <div className="flex-1" />
          </div>
          <p className="text-muted-foreground">
            Track your medicines and glucose levels
          </p>
        </header>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <TabsList className="inline-flex w-auto min-w-full sm:w-full sm:grid sm:grid-cols-5 gap-1 sm:gap-2">
              <TabsTrigger value="dashboard" className="gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 px-3 sm:px-3">
                <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 px-3 sm:px-3">
                <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">History</span>
              </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 px-3 sm:px-3">
                <span className="text-xs sm:text-sm">Reports</span>
              </TabsTrigger>
              <TabsTrigger value="calculator" className="gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 px-3 sm:px-3">
                <span className="text-xs sm:text-sm">Calculator</span>
              </TabsTrigger>
              <TabsTrigger value="low-stock" className="gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 px-3 sm:px-3">
                <span className="text-xs sm:text-sm">Low Stock</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 px-3 sm:px-3">
                <span className="text-xs sm:text-sm">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <GlucoseCard readings={glucoseReadings} />
              </div>
              <div className="flex items-center justify-center">
                <AddGlucoseDialog onAdd={handleAddGlucose} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-semibold">Medicine Inventory</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Tabs value={scheduleFilter} onValueChange={(v) => setScheduleFilter(v as any)}>
                    <TabsList className="grid grid-cols-4">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="morning">Morning</TabsTrigger>
                      <TabsTrigger value="noon">Noon</TabsTrigger>
                      <TabsTrigger value="night">Night</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <AddMedicineDialog 
                    onAdd={handleAddMedicine} 
                    editMedicine={editMedicineForDialog || undefined}
                    onUpdate={handleUpdateMedicine}
                    onClose={() => setEditMedicineForDialog(null)}
                  />
                <button
                  className="text-xs sm:text-sm px-3 py-1 rounded-md border hover:bg-accent/10"
                  onClick={() => exportMedicinesCsv()}
                >
                  Export CSV
                </button>
                <input id="import-medicines" type="file" accept=".csv,text/csv" className="hidden" onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  await importMedicinesCsv(file);
                  window.location.reload();
                }} />
                <button
                  className="text-xs sm:text-sm px-3 py-1 rounded-md border hover:bg-accent/10"
                  onClick={() => document.getElementById('import-medicines')?.click()}
                >
                  Import CSV
                </button>
                </div>
              </div>

              {medicines.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No medicines yet. Add your first medicine to get started.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {medicines
                    .filter(m => matchesScheduleFilter(m, scheduleFilter))
                    .map((medicine) => (
                    <MedicineCard
                      key={medicine.id}
                      medicine={medicine}
                      lowStockThreshold={lowStockThreshold}
                      onTake={handleTakeMedicine}
                      onEdit={(med) => {
                        setEditMedicineForDialog(med);
                      }}
                      onDelete={handleDeleteMedicine}
                    />
                  ))}
                </div>
              )}
              {/* Low Stock Alerts */}
              {medicines.some(m => m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < lowStockThreshold) && (
                <div className="mt-4 rounded-lg border p-4 bg-warning/5">
                  <h3 className="font-medium mb-2">Low Stock Alerts</h3>
                  <ul className="text-sm space-y-1">
                    {medicines
                      .filter(m => m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < lowStockThreshold)
                      .map(m => (
                        <li key={m.id}>⚠ {m.name} - {m.currentStock} remaining</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <HistoryTab
              medicineLogs={medicineLogs}
              glucoseReadings={glucoseReadings}
              onDeleteGlucose={handleDeleteGlucose}
              onDeleteMedicineLog={handleDeleteMedicineLog}
            />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsPanel glucoseReadings={glucoseReadings} />
          </TabsContent>

          <TabsContent value="calculator">
            <DosageCalculator medicines={medicines} />
          </TabsContent>

          <TabsContent value="low-stock">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <h2 className="text-xl sm:text-2xl font-semibold">Low Stock</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search medicine..."
                    value={lowStockSearch}
                    onChange={(e) => setLowStockSearch(e.target.value)}
                  />
                  <Select value={lowStockSort} onValueChange={(v) => setLowStockSort(v as any)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent_desc">Lowest % first</SelectItem>
                      <SelectItem value="percent_asc">Highest % first</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(() => {
                const filtered = medicines
                  .filter(m => m.totalStock > 0 && (m.currentStock / m.totalStock) * 100 < lowStockThreshold)
                  .filter(m => m.name.toLowerCase().includes(lowStockSearch.toLowerCase().trim()));

                const sorted = filtered.slice().sort((a, b) => {
                  const pa = (a.currentStock / a.totalStock) * 100;
                  const pb = (b.currentStock / b.totalStock) * 100;
                  if (lowStockSort === 'percent_desc') return pa - pb;
                  if (lowStockSort === 'percent_asc') return pb - pa;
                  return a.name.localeCompare(b.name);
                });

                if (!sorted.length) {
                  return <div className="text-sm text-muted-foreground">No medicines match your filters.</div>;
                }

                return (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {sorted.map(m => {
                      const pct = Math.max(0, Math.round((m.currentStock / m.totalStock) * 100));
                      const critical = pct < Math.max(5, Math.floor(lowStockThreshold / 2));
                      return (
                        <div key={m.id} className="rounded-lg border p-4 space-y-3 bg-background">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{m.name}</div>
                              <div className="text-xs text-muted-foreground">{m.currentStock} of {m.totalStock} remaining</div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-md border ${critical ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-warning/10 text-warning-foreground border-warning/30'}`}>
                              {pct}%
                            </span>
                          </div>

                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${critical ? 'bg-destructive' : 'bg-primary'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => handleTakeMedicine(m)}>Take</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setRefillForId(m.id); setRefillQuantity(0); }}>Refill</Button>
                          </div>

                          {refillForId === m.id && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                placeholder="Qty"
                                value={refillQuantity || ''}
                                onChange={(e) => setRefillQuantity(parseInt(e.target.value || '0') || 0)}
                                className="w-28"
                              />
                              <Button size="sm" onClick={() => handleRefill(m, refillQuantity)} disabled={!refillQuantity || refillQuantity <= 0}>Add</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setRefillForId(null); setRefillQuantity(0); }}>Cancel</Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel onSaved={(s) => setLowStockThreshold(s.lowStockThresholdPercent)} />
          </TabsContent>
        </Tabs>

        <TakeMedicineDialog
          medicine={selectedMedicine}
          open={takeMedicineOpen}
          onOpenChange={setTakeMedicineOpen}
          onConfirm={handleConfirmTakeMedicine}
        />
      </div>
    </div>
  );
};

export default Index;
