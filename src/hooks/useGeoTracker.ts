import { useCallback, useRef, useState } from 'react';
import { pathMiles } from '../lib/calc';
import type { GpsPoint } from '../lib/types';

export type TrackerState = 'idle' | 'tracking' | 'error';

interface TrackerResult {
  state: TrackerState;
  miles: number;
  points: number;
  error: string;
  path: GpsPoint[];
  start: () => void;
  stop: () => GpsPoint[];
  reset: () => void;
}

// Records a GPS path while the page is foregrounded and sums the distance.
// Note: browsers suspend geolocation when the screen locks or the tab is
// backgrounded, so the user must keep the app open during a tracked drive.
export function useGeoTracker(): TrackerResult {
  const [state, setState] = useState<TrackerState>('idle');
  const [miles, setMiles] = useState(0);
  const [points, setPoints] = useState(0);
  const [error, setError] = useState('');
  const pathRef = useRef<GpsPoint[]>([]);
  const watchId = useRef<number | null>(null);

  const stopWatch = useCallback(() => {
    if (watchId.current != null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not available on this device.');
      setState('error');
      return;
    }
    pathRef.current = [];
    setMiles(0);
    setPoints(0);
    setError('');
    setState('tracking');
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt: GpsPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          t: pos.timestamp,
        };
        // Skip jitter: ignore points with very poor accuracy.
        if (pos.coords.accuracy && pos.coords.accuracy > 100 && pathRef.current.length > 0) return;
        pathRef.current = [...pathRef.current, pt];
        setPoints(pathRef.current.length);
        setMiles(pathMiles(pathRef.current));
      },
      (err) => {
        setError(err.message || 'Unable to read your location.');
        setState('error');
        stopWatch();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }, [stopWatch]);

  const stop = useCallback(() => {
    stopWatch();
    setState('idle');
    return pathRef.current;
  }, [stopWatch]);

  const reset = useCallback(() => {
    stopWatch();
    pathRef.current = [];
    setMiles(0);
    setPoints(0);
    setError('');
    setState('idle');
  }, [stopWatch]);

  return { state, miles, points, error, path: pathRef.current, start, stop, reset };
}
