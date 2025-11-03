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
            <TabsList className="inline-flex w-auto min-w-full sm:w-full sm:grid sm:grid-cols-4 gap-1 sm:gap-2">
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
                  <Select value={scheduleFilter} onValueChange={(v) => setScheduleFilter(v as any)}>
                    <SelectTrigger className="w-[160px] sm:w-[210px]">
                      <SelectValue placeholder="Filter by schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Schedules</SelectItem>
                      <SelectItem value="morning">Only Morning</SelectItem>
                      <SelectItem value="noon">Only Noon</SelectItem>
                      <SelectItem value="night">Only Night</SelectItem>
                      <SelectItem value="morning_noon">Morning and Noon</SelectItem>
                      <SelectItem value="morning_night">Morning and Night</SelectItem>
                      <SelectItem value="noon_night">Noon and Night</SelectItem>
                      <SelectItem value="three_times">3 times</SelectItem>
                    </SelectContent>
                  </Select>
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
                    .filter(m => scheduleFilter === 'all' || (m.schedule ?? 'all') === scheduleFilter)
                    .map((medicine) => (
                    <MedicineCard
                      key={medicine.id}
                      medicine={medicine}
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
            <ReportsPanel medicineLogs={medicineLogs} glucoseReadings={glucoseReadings} />
          </TabsContent>

          <TabsContent value="calculator">
            <DosageCalculator medicines={medicines} />
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
