// Location autocomplete utility using OpenStreetMap Nominatim API
export interface LocationSuggestion {
  name: string;
  lat: number;
  lng: number;
  displayName: string;
}

const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

export const searchLocations = async (query: string): Promise<LocationSuggestion[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `${NOMINATIM_API}/search?format=json&q=${encodeURIComponent(query)}&limit=8&countrycodes=gh`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch location suggestions');
    }

    const results = await response.json();
    
    if (!Array.isArray(results)) {
      return [];
    }

    return results.map((result: any) => ({
      name: result.name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name
    }));
  } catch (error) {
    console.error('Location autocomplete error:', error);
    return [];
  }
};

// Debounce helper for autocomplete searches
export const createDebounce = (delay: number) => {
  let timeout: NodeJS.Timeout;
  return (callback: () => void) => {
    clearTimeout(timeout);
    timeout = setTimeout(callback, delay);
  };
};
