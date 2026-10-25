import { useState, useEffect } from 'react';
import { BarCodeScanner } from 'expo-barcode-scanner';

interface QRScannerHook {
  hasPermission: boolean | null;
  scanned: boolean;
  scan: (data: string) => void;
  reset: () => void;
}

export const useQRScanner = (onScan: (data: string) => void): QRScannerHook => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const scan = (data: string) => {
    if (!scanned) {
      setScanned(true);
      onScan(data);
    }
  };

  const reset = () => {
    setScanned(false);
  };

  return { hasPermission, scanned, scan, reset };
};