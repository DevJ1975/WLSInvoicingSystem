import { mapboxToken } from './firebase';

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

export const mapboxEnabled = Boolean(mapboxToken);

// Geocode a free-form address to coordinates via Mapbox (if a token is set).
export async function geocode(address: string): Promise<GeocodeResult | null> {
  if (!mapboxToken || !address.trim()) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address,
  )}.json?limit=1&access_token=${mapboxToken}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;
  return {
    label: feature.place_name ?? address,
    lat: feature.center[1],
    lng: feature.center[0],
  };
}

// Driving distance in miles between two coordinates via Mapbox Directions.
export async function drivingMiles(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<number | null> {
  if (!mapboxToken) return null;
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?overview=false&access_token=${mapboxToken}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const meters = data.routes?.[0]?.distance;
  if (typeof meters !== 'number') return null;
  return Math.round((meters / 1609.344) * 10) / 10;
}

// Resolve two addresses and return the driving distance between them.
export async function distanceBetweenAddresses(
  fromAddress: string,
  toAddress: string,
): Promise<{ miles: number; from: GeocodeResult; to: GeocodeResult } | null> {
  const [from, to] = await Promise.all([geocode(fromAddress), geocode(toAddress)]);
  if (!from || !to) return null;
  const miles = await drivingMiles(from, to);
  if (miles == null) return null;
  return { miles, from, to };
}
