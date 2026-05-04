import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import apiService from '../services/api';
import { useToast } from '../components/ToastProvider';

interface ScanStatusData {
  status: 'queued' | 'scanning' | 'completed' | 'failed' | 'not_found';
  progress: number;
  current_file?: string;
  total_files?: number;
  error?: string;
  scan_id?: string;
}

interface BackgroundScanContextType {
  activeScanId: string | null;
  scanData: ScanStatusData | null;
  startScanTracking: (scanId: string) => void;
  clearScanTracking: () => void;
  cancelScan: () => Promise<void>;
}

const BackgroundScanContext = createContext<BackgroundScanContextType | undefined>(undefined);

export function BackgroundScanProvider({ children }: { children: ReactNode }) {
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [scanData, setScanData] = useState<ScanStatusData | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (activeScanId) {
      interval = setInterval(async () => {
        try {
          const res = await apiService.getGitHubScanStatus(activeScanId);
          if (res.success && res.data) {
            setScanData(res.data);

            if (res.data.status === 'completed') {
              showToast("Background scan completed successfully!", "success");
              clearInterval(interval);
              setTimeout(() => {
                setActiveScanId(null);
                setScanData(null);
              }, 5000);
            } else if (res.data.status === 'failed') {
              showToast(res.data.error || "Background scan failed.", "error");
              clearInterval(interval);
              setTimeout(() => {
                setActiveScanId(null);
                setScanData(null);
              }, 5000);
            }
          }
        } catch (error) {
          console.error("Failed to fetch scan status", error);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeScanId, showToast]);

  const startScanTracking = (scanId: string) => {
    setActiveScanId(scanId);
    setScanData({ status: 'queued', progress: 0 });
  };

  const clearScanTracking = () => {
    setActiveScanId(null);
    setScanData(null);
  };

  const cancelScan = async () => {
    if (!activeScanId) return;
    try {
      const res = await apiService.cancelGitHubScan(activeScanId);
      if (res.success) {
        showToast("Scan cancelled.", "info");
        clearScanTracking();
      } else {
        showToast(res.error || "Failed to cancel scan", "error");
      }
    } catch (err) {
      showToast("Error cancelling scan", "error");
    }
  };

  return (
    <BackgroundScanContext.Provider value={{ activeScanId, scanData, startScanTracking, clearScanTracking, cancelScan }}>
      {children}
    </BackgroundScanContext.Provider>
  );
}

export function useBackgroundScan() {
  const context = useContext(BackgroundScanContext);
  if (context === undefined) {
    throw new Error('useBackgroundScan must be used within a BackgroundScanProvider');
  }
  return context;
}
