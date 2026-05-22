import { useCallback, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { pathMiles } from '../lib/calc';
import type { GpsPoint } from '../lib/types';

export type TrackerState = 'idle' | 'requesting' | 'tracking' | 'error';

interface TrackerResult {
  state: TrackerState;
  miles: number;
  points: number;
  error: string;
  start: () => Promise<void>;
  stop: () => GpsPoint[];
  reset: () => void;
}

// Records a GPS path with expo-location and sums the distance. On native this
// keeps tracking while the app is foregrounded; background tracking can be added
// via expo-task-manager + background permissions.
export function useGeoTracker(): TrackerResult {
  const [state, setState] = useState<TrackerState>('idle');
  const [miles, setMiles] = useState(0);
  const [points, setPoints] = useState(0);
  const [error, setError] = useState('');
  const pathRef = useRef<GpsPoint[]>([]);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  const stopWatch = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError('');
    setState('requesting');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied.');
        setState('error');
        return;
      }
      pathRef.current = [];
      setMiles(0);
      setPoints(0);
      setState('tracking');
      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (pos) => {
          if (pos.coords.accuracy && pos.coords.accuracy > 100 && pathRef.current.length > 0) return;
          const pt: GpsPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            t: pos.timestamp,
          };
          pathRef.current = [...pathRef.current, pt];
          setPoints(pathRef.current.length);
          setMiles(pathMiles(pathRef.current));
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to start tracking.');
      setState('error');
      stopWatch();
    }
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

  return { state, miles, points, error, start, stop, reset };
}
