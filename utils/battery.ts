import { useState, useEffect } from 'react';

export interface BatteryState {
  supported: boolean;
  loading: boolean;
  level: number; // 0.0 to 1.0
  charging: boolean;
  isLow: boolean; // level <= 0.2
}

export function useBatteryStatus(): BatteryState {
  const [batteryState, setBatteryState] = useState<BatteryState>({
    supported: false,
    loading: true,
    level: 1.0,
    charging: false,
    isLow: false,
  });

  useEffect(() => {
    if (!navigator || !('getBattery' in navigator)) {
      setBatteryState(prev => ({
        ...prev,
        supported: false,
        loading: false,
      }));
      return;
    }

    let battery: any = null;

    const updateBatteryStatus = () => {
      if (battery) {
        const level = battery.level;
        const charging = battery.charging;
        setBatteryState({
          supported: true,
          loading: false,
          level,
          charging,
          // Low battery is considered <= 20% and not currently plugged in / charging
          isLow: level <= 0.2 && !charging,
        });
      }
    };

    (navigator as any)
      .getBattery()
      .then((batt: any) => {
        battery = batt;
        updateBatteryStatus();

        batt.addEventListener('chargingchange', updateBatteryStatus);
        batt.addEventListener('levelchange', updateBatteryStatus);
      })
      .catch((err: any) => {
        console.warn('Battery Status API blocked or failed:', err);
        setBatteryState(prev => ({
          ...prev,
          supported: false,
          loading: false,
        }));
      });

    return () => {
      if (battery) {
        battery.removeEventListener('chargingchange', updateBatteryStatus);
        battery.removeEventListener('levelchange', updateBatteryStatus);
      }
    };
  }, []);

  return batteryState;
}
