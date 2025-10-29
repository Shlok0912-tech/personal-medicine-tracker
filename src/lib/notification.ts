export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

export async function showNotification(title: string, body: string): Promise<void> {
  try {
    const ok = await requestPermission();
    if (!ok) return;
    new Notification(title, { body });
  } catch {
    // noop
  }
}


