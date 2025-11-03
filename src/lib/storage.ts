// Offline-first localStorage storage, per PRD

export interface Medicine {
  id: string;
  name: string;
  totalStock: number;
  currentStock: number;
  dosage: string;
  schedule?: 'morning' | 'noon' | 'night' | 'morning_noon' | 'morning_night' | 'noon_night' | 'three_times';
  notes?: string;
  createdAt: string;
}

export interface MedicineLog {
  id: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  timestamp: string;
  notes?: string;
}

export interface GlucoseReading {
  id: string;
  value: number;
  timestamp: string;
  notes?: string;
  unit?: 'mg/dL' | 'mmol/L';
  measurementType?: 'fasting' | 'post-meal' | 'random' | 'bedtime' | string;
}

export interface StockRecord {
  id: string;
  medicineId: string;
  operation: 'initial_stock' | 'administration' | 'refill' | 'adjustment';
  quantityChanged: number; // negative for deductions
  previousStock: number;
  newStock: number;
  timestamp: string;
  notes?: string;
}

export interface UserSettings {
  lowStockThresholdPercent: number; // e.g., 20
  theme?: 'light' | 'dark' | 'system';
  notificationsEnabled?: boolean;
}

const KEYS = {
  medicines: 'med_tracker_medicines',
  medicineLogs: 'med_tracker_administration_logs',
  glucoseReadings: 'med_tracker_glucose_readings',
  stockRecords: 'med_tracker_stock_records',
  userSettings: 'med_tracker_user_settings',
} as const;

function readMap<T extends { id?: string }>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    // Migrate legacy array format to keyed map by id
    if (Array.isArray(parsed)) {
      const map: Record<string, T> = {};
      for (const item of parsed as T[]) {
        const itemId = (item as any)?.id;
        if (typeof itemId === 'string' && itemId.length > 0) {
          map[itemId] = item;
        }
      }
      return map;
    }
    // Ensure we only return plain object maps
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, T>;
    }
    return {};
  } catch {
    return {};
  }
}

function writeMap<T>(key: string, value: Record<string, T>): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId(prefix: string): string {
  // UUID-like but compact and local only
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}

export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__med_tracker_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export const storage = {
  // Medicines
  async getMedicines(): Promise<Medicine[]> {
    const map = readMap<Medicine>(KEYS.medicines);
    // Return newest first by createdAt desc
    return Object.values(map).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  
  async addMedicine(medicine: Omit<Medicine, 'id' | 'createdAt'>): Promise<Medicine> {
    const map = readMap<Medicine>(KEYS.medicines);
    const id = generateId('med');
    const createdAt = new Date().toISOString();
    const record: Medicine = { id, createdAt, ...medicine };
    map[id] = record;
    writeMap(KEYS.medicines, map);
    // create initial stock record if totals present
    if (typeof medicine.currentStock === 'number') {
      await storage.addStockRecord({
        medicineId: id,
        operation: 'initial_stock',
        quantityChanged: medicine.currentStock,
        previousStock: 0,
        newStock: medicine.currentStock,
        notes: 'Initial stock',
      });
    }
    return record;
  },
  
  async updateMedicine(id: string, updates: Partial<Medicine>): Promise<void> {
    const map = readMap<Medicine>(KEYS.medicines);
    if (!map[id]) throw new Error('Medicine not found');
    const prev = map[id];
    map[id] = { ...prev, ...updates };
    // Guard against negative stock
    if (map[id].currentStock < 0) map[id].currentStock = 0;
    writeMap(KEYS.medicines, map);
  },
  
  async deleteMedicine(id: string): Promise<void> {
    const meds = readMap<Medicine>(KEYS.medicines);
    const logs = readMap<MedicineLog>(KEYS.medicineLogs);
    if (meds[id]) delete meds[id];
    // Also remove related logs
    const newLogs: Record<string, MedicineLog> = {};
    Object.values(logs).forEach((l) => {
      if (l.medicineId !== id) newLogs[l.id] = l;
    });
    writeMap(KEYS.medicines, meds);
    writeMap(KEYS.medicineLogs, newLogs);
  },
  
  // Medicine Logs
  async getMedicineLogs(): Promise<MedicineLog[]> {
    const map = readMap<MedicineLog>(KEYS.medicineLogs);
    // Newest first
    return Object.values(map).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  
  async addMedicineLog(log: Omit<MedicineLog, 'id' | 'timestamp'>): Promise<MedicineLog> {
    const logs = readMap<MedicineLog>(KEYS.medicineLogs);
    const id = generateId('admin');
    const timestamp = new Date().toISOString();
    const entry: MedicineLog = { id, timestamp, ...log };
    logs[id] = entry;
    writeMap(KEYS.medicineLogs, logs);
    // Also create a stock record for administration
    const meds = readMap<Medicine>(KEYS.medicines);
    const med = meds[log.medicineId];
    const previousStock = med?.currentStock ?? 0;
    const quantityChanged = -Math.abs(log.quantity || 0);
    const newStock = Math.max(0, previousStock + quantityChanged);
    await storage.addStockRecord({
      medicineId: log.medicineId,
      operation: 'administration',
      quantityChanged,
      previousStock,
      newStock,
      notes: entry.notes,
    });
    return entry;
  },

  // Add a medicine log with provided timestamp (for CSV import)
  async addMedicineLogWithTimestamp(entry: Omit<MedicineLog, 'id'>): Promise<MedicineLog> {
    const logs = readMap<MedicineLog>(KEYS.medicineLogs);
    const id = generateId('admin');
    const record: MedicineLog = { id, ...entry };
    logs[id] = record;
    writeMap(KEYS.medicineLogs, logs);
    // Also create a stock record for administration to keep stock in sync
    const meds = readMap<Medicine>(KEYS.medicines);
    const med = meds[entry.medicineId];
    const previousStock = med?.currentStock ?? 0;
    const quantityChanged = -Math.abs(entry.quantity || 0);
    const newStock = Math.max(0, previousStock + quantityChanged);
    await storage.addStockRecord({
      medicineId: entry.medicineId,
      operation: 'administration',
      quantityChanged,
      previousStock,
      newStock,
      notes: entry.notes,
    });
    return record;
  },

  async deleteMedicineLog(id: string): Promise<void> {
    const map = readMap<MedicineLog>(KEYS.medicineLogs);
    if (map[id]) delete map[id];
    writeMap(KEYS.medicineLogs, map);
  },
  
  // Glucose Readings
  async getGlucoseReadings(): Promise<GlucoseReading[]> {
    const map = readMap<GlucoseReading>(KEYS.glucoseReadings);
    return Object.values(map).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  
  async addGlucoseReading(reading: Omit<GlucoseReading, 'id' | 'timestamp'>): Promise<GlucoseReading> {
    const map = readMap<GlucoseReading>(KEYS.glucoseReadings);
    const id = generateId('glucose');
    const timestamp = new Date().toISOString();
    const record: GlucoseReading = { id, timestamp, unit: 'mg/dL', measurementType: 'random', ...reading };
    map[id] = record;
    writeMap(KEYS.glucoseReadings, map);
    return record;
  },

  // Add a glucose reading with provided timestamp (for CSV import)
  async addGlucoseReadingWithTimestamp(entry: Omit<GlucoseReading, 'id'>): Promise<GlucoseReading> {
    const map = readMap<GlucoseReading>(KEYS.glucoseReadings);
    const id = generateId('glucose');
    const record: GlucoseReading = { id, unit: 'mg/dL', measurementType: 'random', ...entry };
    map[id] = record;
    writeMap(KEYS.glucoseReadings, map);
    return record;
  },
  
  async deleteGlucoseReading(id: string): Promise<void> {
    const map = readMap<GlucoseReading>(KEYS.glucoseReadings);
    if (map[id]) delete map[id];
    writeMap(KEYS.glucoseReadings, map);
  },

  // Stock records
  async addStockRecord(record: Omit<StockRecord, 'id' | 'timestamp'>): Promise<StockRecord> {
    const map = readMap<StockRecord>(KEYS.stockRecords);
    const id = generateId('stock');
    const timestamp = new Date().toISOString();
    const entry: StockRecord = { id, timestamp, ...record };
    map[id] = entry;
    writeMap(KEYS.stockRecords, map);
    // Sync medicine currentStock if applicable
    const meds = readMap<Medicine>(KEYS.medicines);
    if (meds[record.medicineId]) {
      meds[record.medicineId].currentStock = record.newStock;
      writeMap(KEYS.medicines, meds);
    }
    return entry;
  },

  async getStockRecordsByMedicine(medicineId: string): Promise<StockRecord[]> {
    const map = readMap<StockRecord>(KEYS.stockRecords);
    return Object.values(map)
      .filter(r => r.medicineId === medicineId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  // Settings
  async getUserSettings(): Promise<UserSettings> {
    const existing = readMap<UserSettings>(KEYS.userSettings);
    const settings = (existing['settings'] as unknown as UserSettings) || {
      lowStockThresholdPercent: 20,
      theme: 'system',
      notificationsEnabled: true,
    };
    // Persist default if not present
    if (!existing['settings']) {
      writeMap(KEYS.userSettings, { settings } as any);
    }
    return settings;
  },

  async saveUserSettings(settings: UserSettings): Promise<void> {
    writeMap(KEYS.userSettings, { settings } as any);
  },
};
