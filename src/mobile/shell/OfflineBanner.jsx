import React, { createContext, useContext, useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { networkStatus, onNetworkChange } from '../native';

export const NetworkContext = createContext({ online: true });
export const useOnline = () => useContext(NetworkContext).online;

/** Tracks connectivity and shows a slim banner under the header when offline. */
export function NetworkProvider({ children, forcedOffline = false }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let dispose = () => {};
    networkStatus().then(setOnline);
    onNetworkChange(setOnline).then((d) => { dispose = d; });
    return () => dispose();
  }, []);
  return <NetworkContext.Provider value={{ online: forcedOffline ? false : online }}>{children}</NetworkContext.Provider>;
}

export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="oi-m-offline" role="status">
      <WifiOff size={16} strokeWidth={1.75} />
      <span>You are offline. Showing what loaded last; changes will wait.</span>
    </div>
  );
}
