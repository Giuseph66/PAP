export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult extends LatLng {
  label: string;
}

export interface RouteResult {
  coordinates: LatLng[];
  distanceKm: number;
  durationMin: number;
}

const USER_AGENT = 'PAP-Mobile/1.0 (contact: dev@pap.local)';

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address.trim()) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const item = data[0];
  return {
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    label: item.display_name,
  };
}

export interface SuggestionItem {
  label: string;
  latitude: number;
  longitude: number;
}

// Sugestões de endereço com viés por cidade e área visível (viewbox)
export async function suggestAddresses(
  queryText: string,
  options?: {
    city?: string;
    countryCodes?: string; // ex: 'br'
    viewbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
    bounded?: boolean;
  }
): Promise<SuggestionItem[]> {
  const q = queryText.trim();
  if (!q || q.length < 3) return [];
  const queryWithCity = options?.city ? `${q}, ${options.city}` : q;
  const params: string[] = [
    `format=json`,
    `q=${encodeURIComponent(queryWithCity)}`,
    `addressdetails=0`,
    `limit=6`,
  ];
  if (options?.countryCodes) params.push(`countrycodes=${options.countryCodes}`);
  if (options?.viewbox) {
    const { minLon, minLat, maxLon, maxLat } = options.viewbox;
    params.push(`viewbox=${minLon},${maxLat},${maxLon},${minLat}`); // Nominatim expects left,top,right,bottom
    if (options.bounded) params.push(`bounded=1`);
  }
  const url = `https://nominatim.openstreetmap.org/search?${params.join('&')}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((item: any) => ({
    label: item.display_name as string,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.display_name || null;
}

export async function getDrivingRoute(origin: LatLng, destination: LatLng): Promise<RouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.routes?.length) return null;
  const route = data.routes[0];
  const coords: LatLng[] = route.geometry.coordinates.map((c: [number, number]) => ({
    longitude: c[0],
    latitude: c[1],
  }));
  return {
    coordinates: coords,
    distanceKm: (route.distance || 0) / 1000,
    durationMin: (route.duration || 0) / 60,
  };
}


