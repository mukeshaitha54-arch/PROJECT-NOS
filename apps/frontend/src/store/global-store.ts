import { create } from 'zustand';
import { Device, Alert, TelemetryPoint } from '../types/api';

interface GlobalStoreState {
  devices: Device[];
  alerts: Alert[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  telemetryBuffer: Record<string, TelemetryPoint[]>;
  isLoading: boolean;
  
  setDevices: (devices: Device[]) => void;
  updateDevicePresence: (deviceId: string, status: string, lastSeen: string) => void;
  appendTelemetry: (deviceId: string, data: TelemetryPoint) => void;
  prependAlert: (alert: Alert) => void;
  updateAlertStatus: (alertId: string, status: Alert['status']) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  setLoading: (isLoading: boolean) => void;
}

export const useGlobalStore = create<GlobalStoreState>((set) => ({
  devices: [],
  alerts: [],
  connectionStatus: 'disconnected',
  telemetryBuffer: {},
  isLoading: false,

  setDevices: (devices) => set({ devices }),

  updateDevicePresence: (deviceId, status, lastSeen) => set((state) => ({
    devices: state.devices.map(device => 
      device.id === deviceId 
        ? { ...device, status, lastSeen } 
        : device
    )
  })),

  appendTelemetry: (deviceId, data) => set((state) => {
    const buffer = state.telemetryBuffer[deviceId] || [];
    // Keep last 100 points per device for memory safety
    const updatedBuffer = [...buffer, data].slice(-100);
    return {
      telemetryBuffer: {
        ...state.telemetryBuffer,
        [deviceId]: updatedBuffer
      }
    };
  }),

  prependAlert: (alert) => set((state) => {
    const newAlerts = [alert, ...state.alerts.filter(a => a.id !== alert.id)];
    // Keep top 10 recent
    newAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { alerts: newAlerts.slice(0, 10) };
  }),

  updateAlertStatus: (alertId, status) => set((state) => ({
    alerts: state.alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status } 
        : alert
    )
  })),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  setLoading: (isLoading) => set({ isLoading }),
}));
