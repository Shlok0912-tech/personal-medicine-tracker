import { useEffect, useState } from "react";
import { storage, UserSettings } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { requestPermission } from "@/lib/notification";

interface SettingsPanelProps {
  onSaved?: (settings: UserSettings) => void;
}

export function SettingsPanel({ onSaved }: SettingsPanelProps) {
  const [threshold, setThreshold] = useState(20);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await storage.getUserSettings();
      setThreshold(s.lowStockThresholdPercent ?? 20);
      setTheme((s.theme as any) || 'system');
      setNotificationsEnabled(s.notificationsEnabled ?? true);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (notificationsEnabled) {
      await requestPermission();
    }
    const newSettings: UserSettings = { lowStockThresholdPercent: Number(threshold) || 20, theme, notificationsEnabled };
    await storage.saveUserSettings(newSettings);
    setSaving(false);
    onSaved?.(newSettings);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable notifications</Label>
              <p className="text-sm text-muted-foreground">Show browser notifications for low stock.</p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="threshold">Low stock threshold (%)</Label>
            <Input id="threshold" type="number" min="1" max="100" value={threshold}
                   onChange={(e) => setThreshold(parseInt(e.target.value || '0') || 0)} />
            <p className="text-sm text-muted-foreground">Medicines below this percentage of total stock will be flagged.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
      </div>
    </div>
  );
}


