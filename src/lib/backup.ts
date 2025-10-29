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


