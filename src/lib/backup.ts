import { storage } from './storage';

export async function exportAllData(): Promise<Blob> {
  const [medicines, logs, glucose] = await Promise.all([
    storage.getMedicines(),
    storage.getMedicineLogs(),
    storage.getGlucoseReadings(),
  ]);
  // Stock records are per medicine fetch; read whole map via localStorage directly
  const stockRaw = localStorage.getItem('med_tracker_stock_records');
  const stockRecords = stockRaw ? JSON.parse(stockRaw) : {};
  const userSettingsRaw = localStorage.getItem('med_tracker_user_settings');
  const userSettings = userSettingsRaw ? JSON.parse(userSettingsRaw) : {};
  const payload = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    medicines,
    medicineLogs: logs,
    glucoseReadings: glucose,
    stockRecords,
    userSettings,
  };
  const json = JSON.stringify(payload, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export async function downloadExport(filename = 'medicine_tracker_backup.json'): Promise<void> {
  const blob = await exportAllData();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerLine = headers.map(csvEscape).join(',');
  const lines = rows.map(r => headers.map(h => csvEscape((r as any)[h])).join(','));
  return [headerLine, ...lines].join('\n');
}

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadCsvExport(): Promise<void> {
  const [medicines, medicineLogs, glucose] = await Promise.all([
    storage.getMedicines(),
    storage.getMedicineLogs(),
    storage.getGlucoseReadings(),
  ]);
  const stockRaw = localStorage.getItem('med_tracker_stock_records');
  const stockMap = stockRaw ? JSON.parse(stockRaw) as Record<string, any> : {};
  const stock = Object.values(stockMap);
  const settingsRaw = localStorage.getItem('med_tracker_user_settings');
  const settingsObj = settingsRaw ? JSON.parse(settingsRaw) : { settings: {} };

  // Medicines
  downloadTextFile(
    'medicines.csv',
    toCsv(
      ['id', 'name', 'totalStock', 'currentStock', 'dosage', 'notes', 'createdAt'],
      medicines as any
    )
  );

  // Medicine Logs
  downloadTextFile(
    'medicine_logs.csv',
    toCsv(
      ['id', 'medicineId', 'medicineName', 'quantity', 'timestamp', 'notes'],
      medicineLogs as any
    )
  );

  // Glucose Readings
  downloadTextFile(
    'glucose_readings.csv',
    toCsv(
      ['id', 'value', 'timestamp', 'notes'],
      glucose as any
    )
  );

  // Stock Records
  if (stock.length) {
    downloadTextFile(
      'stock_records.csv',
      toCsv(
        ['id', 'medicineId', 'operation', 'quantityChanged', 'previousStock', 'newStock', 'timestamp', 'notes'],
        stock as any
      )
    );
  }

  // User Settings (flattened)
  const settings = settingsObj.settings || {};
  downloadTextFile(
    'user_settings.csv',
    toCsv(['lowStockThresholdPercent', 'theme'], [settings])
  );
}

// --- CSV helpers per section ---

function parseCsv(text: string): { headers: string[]; rows: Array<Record<string, string>> } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ',') { out.push(cur); cur = ''; }
        else { cur += ch; }
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(l => {
    const vals = parseLine(l);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

export async function exportMedicinesCsv(): Promise<void> {
  const medicines = await storage.getMedicines();
  downloadTextFile(
    'medicines.csv',
    toCsv(
      ['name', 'totalStock', 'currentStock', 'dosage', 'notes'],
      medicines.map(m => ({
        name: m.name,
        totalStock: m.totalStock,
        currentStock: m.currentStock,
        dosage: m.dosage,
        notes: m.notes ?? ''
      })) as any
    )
  );
}

export async function exportMedicineLogsCsv(): Promise<void> {
  const logs = await storage.getMedicineLogs();
  downloadTextFile(
    'medicine_logs.csv',
    toCsv(
      ['medicineName', 'quantity', 'timestamp', 'notes'],
      logs.map(l => ({
        medicineName: l.medicineName,
        quantity: l.quantity,
        timestamp: l.timestamp,
        notes: l.notes ?? ''
      })) as any
    )
  );
}

export async function exportGlucoseCsv(): Promise<void> {
  const readings = await storage.getGlucoseReadings();
  downloadTextFile(
    'glucose_readings.csv',
    toCsv(
      ['value', 'timestamp', 'notes', 'unit', 'measurementType'],
      readings.map(r => ({
        value: r.value,
        timestamp: r.timestamp,
        notes: r.notes ?? '',
        unit: r.unit ?? 'mg/dL',
        measurementType: r.measurementType ?? 'random'
      })) as any
    )
  );
}

export async function importMedicinesCsv(file: File): Promise<number> {
  const text = await file.text();
  const { rows } = parseCsv(text);
  let count = 0;
  // Upsert by name
  const existing = await storage.getMedicines();
  const byName = new Map(existing.map(m => [m.name.toLowerCase(), m]));
  for (const r of rows) {
    const name = (r['name'] || '').trim();
    if (!name) continue;
    const totalStock = Number(r['totalStock'] || '0') || 0;
    const currentStock = Number(r['currentStock'] || '0') || 0;
    const dosage = (r['dosage'] || '').trim();
    const notes = (r['notes'] || '').trim() || undefined;
    const existingMed = byName.get(name.toLowerCase());
    if (existingMed) {
      await storage.updateMedicine(existingMed.id, { totalStock, currentStock, dosage, notes });
      count++;
    } else {
      await storage.addMedicine({ name, totalStock, currentStock, dosage, notes });
      count++;
    }
  }
  return count;
}

export async function importMedicineLogsCsv(file: File): Promise<number> {
  const text = await file.text();
  const { rows } = parseCsv(text);
  let count = 0;
  const meds = await storage.getMedicines();
  const byName = new Map(meds.map(m => [m.name.toLowerCase(), m]));
  for (const r of rows) {
    const medicineName = (r['medicineName'] || '').trim();
    const med = byName.get(medicineName.toLowerCase());
    if (!med) continue;
    const quantity = Number(r['quantity'] || '0') || 0;
    const timestamp = (r['timestamp'] || '').trim() || new Date().toISOString();
    const notes = (r['notes'] || '').trim() || undefined;
    await storage.addMedicineLogWithTimestamp({ medicineId: med.id, medicineName, quantity, timestamp, notes });
    count++;
  }
  return count;
}

export async function importGlucoseCsv(file: File): Promise<number> {
  const text = await file.text();
  const { rows } = parseCsv(text);
  let count = 0;
  for (const r of rows) {
    const value = Number(r['value'] || '0');
    if (!isFinite(value)) continue;
    const timestamp = (r['timestamp'] || '').trim() || new Date().toISOString();
    const notes = (r['notes'] || '').trim() || undefined;
    const unit = ((r['unit'] || '').trim() as any) || 'mg/dL';
    const measurementType = ((r['measurementType'] || '').trim() as any) || 'random';
    await storage.addGlucoseReadingWithTimestamp({ value, timestamp, notes, unit, measurementType });
    count++;
  }
  return count;
}


