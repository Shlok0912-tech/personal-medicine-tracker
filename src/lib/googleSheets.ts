export interface Medicine {
  id: string;
  name: string;
  totalStock: number;
  currentStock: number;
  dosage: string;
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
}

class GoogleSheetsService {
  private webAppUrl: string;

  constructor() {
    const envUrl = (import.meta as any).env?.VITE_SHEETS_WEB_APP_URL || '';
    const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('sheetsWebAppUrl') || '' : '';
    this.webAppUrl = envUrl || savedUrl || '';
  }

  private ensureUrl(): void {
    if (this.webAppUrl) return;
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('sheetsWebAppUrl') || '';
    if (saved) {
      this.webAppUrl = saved;
      return;
    }
    const input = window.prompt('Enter your Google Apps Script Web App URL (ends with /exec):');
    if (input && input.startsWith('http')) {
      this.webAppUrl = input.trim();
      localStorage.setItem('sheetsWebAppUrl', this.webAppUrl);
    }
  }

  public setWebAppUrl(url: string): void {
    this.webAppUrl = url.trim();
    if (typeof window !== 'undefined') {
      localStorage.setItem('sheetsWebAppUrl', this.webAppUrl);
    }
  }

  private async request<T>(path: string, options?: RequestInit, id?: string): Promise<T> {
    if (!this.webAppUrl) this.ensureUrl();
    if (!this.webAppUrl) throw new Error('Missing VITE_SHEETS_WEB_APP_URL');
    // Prefer local Vite proxy during dev to avoid CORS
    const proxyUrl = this.composeProxyUrl(path, id);
    const queryUrl = this.composeQueryUrl(path, id);
    try {
      const firstUrl = location.hostname === 'localhost' ? proxyUrl : queryUrl;
      const res = await fetch(firstUrl, {
        headers: { 'Content-Type': 'text/plain' },
        ...options,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      // Fallback: direct to Apps Script with query format
      const proxied = queryUrl;
      const res2 = await fetch(proxied, {
        headers: { 'Content-Type': 'text/plain' },
        ...options,
      });
      if (!res2.ok) {
        const text = await res2.text();
        throw new Error(text || `Request failed: ${res2.status}`);
      }
      return (await res2.json()) as T;
    }
  }

  private composeQueryUrl(path: string, id?: string): string {
    const base = this.webAppUrl;
    const action = encodeURIComponent(path.replace(/^\//, ''));
    const extra = id ? `&id=${encodeURIComponent(id)}` : '';
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}action=${action}${extra}`;
  }

  private composeProxyUrl(path: string, id?: string): string {
    const action = encodeURIComponent(path.replace(/^\//, ''));
    const extra = id ? `&id=${encodeURIComponent(id)}` : '';
    return `/sheets?action=${action}${extra}`;
  }

  // Medicines operations
  async getMedicines(): Promise<Medicine[]> {
    return await this.request<Medicine[]>(`/medicines`);
  }

  async addMedicine(medicine: Omit<Medicine, 'id' | 'createdAt'>): Promise<Medicine> {
    return await this.request<Medicine>(`/medicines`, {
      method: 'POST',
      body: JSON.stringify(medicine),
    });
  }

  async updateMedicine(id: string, updates: Partial<Medicine>): Promise<void> {
    await this.request<void>(`/medicines/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, id);
  }

  async deleteMedicine(id: string): Promise<void> {
    await this.request<void>(`/medicines/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }, id);
  }

  // Medicine Logs operations
  async getMedicineLogs(): Promise<MedicineLog[]> {
    return await this.request<MedicineLog[]>(`/medicine-logs`);
  }

  async addMedicineLog(log: Omit<MedicineLog, 'id' | 'timestamp'>): Promise<MedicineLog> {
    return await this.request<MedicineLog>(`/medicine-logs`, {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }

  // Glucose Readings operations
  async getGlucoseReadings(): Promise<GlucoseReading[]> {
    return await this.request<GlucoseReading[]>(`/glucose-readings`);
  }

  async addGlucoseReading(reading: Omit<GlucoseReading, 'id' | 'timestamp'>): Promise<GlucoseReading> {
    return await this.request<GlucoseReading>(`/glucose-readings`, {
      method: 'POST',
      body: JSON.stringify(reading),
    });
  }

  async deleteGlucoseReading(id: string): Promise<void> {
    await this.request<void>(`/glucose-readings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }, id);
  }
}

export const googleSheetsService = new GoogleSheetsService();
