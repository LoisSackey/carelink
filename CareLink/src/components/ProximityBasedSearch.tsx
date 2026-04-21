import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, AlertCircle, Loader } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { userAPI } from '@/lib/api';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ProximityCaregiverCard {
  _id: string;
  name: string;
  serviceType: string;
  location: string;
  distance: number;
  proximityScore: number;
  dailyRate: number;
  rating: number;
  totalReviews: number;
  bio: string;
  verified: boolean;
  email?: string;
  phone?: string;
}

interface ProximitySearchProps {
  onCaregiversFound?: (caregivers: ProximityCaregiverCard[]) => void;
  initialLocation?: string;
  maxRadius?: number;
}

export function ProximityBasedSearch({
  onCaregiversFound,
  initialLocation = '',
  maxRadius = 50,
}: ProximitySearchProps) {
  const [location, setLocation] = useState(initialLocation);
  const [radius, setRadius] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [caregivers, setCaregivers] = useState<ProximityCaregiverCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<{
    totalFound: number;
    totalInSystem: number;
  } | null>(null);
  const navigate = useNavigate();
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  // navigation helpers
  const goToProfile = (caregiverId: string) => {
    navigate(`/caregiver/${caregiverId}`);
  };
  const bookNow = (caregiverId: string) => {
    navigate(`/booking?caregiver=${caregiverId}`);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setCoordinates({ lat, lng });
    const address = await reverseGeocode(lat, lng);
    setLocation(address);
  };

  // Component to handle map clicks
  function LocationMarker() {
    useMapEvents({
      click(e) {
        handleMapClick(e.latlng.lat, e.latlng.lng);
      },
    });
    return coordinates ? <Marker position={[coordinates.lat, coordinates.lng]} /> : null;
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!location.trim()) {
        setError('Please enter a location');
        setIsLoading(false);
        return;
      }

      // Pass map-click coordinates when available so the backend skips Nominatim geocoding
      const response = await userAPI.findNearbyCaregiversByProximity(
        location,
        radius,
        20,
        coordinates ?? undefined
      );

      if (response.caregivers && response.caregivers.length > 0) {
        setCaregivers(response.caregivers);
        setSearchResults({
          totalFound: response.totalFound,
          totalInSystem: response.totalCaregiversInSystem,
        });

        toast({
          title: 'Success',
          description: `Found ${response.totalFound} caregivers within ${radius}km`,
        });

        if (onCaregiversFound) {
          onCaregiversFound(response.caregivers);
        }
      } else {
        setCaregivers([]);
        setSearchResults({
          totalFound: 0,
          totalInSystem: response.totalCaregiversInSystem || 0,
        });

        toast({
          title: 'No Results',
          description: `No caregivers found within ${radius}km of ${location}. Try increasing the search radius.`,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to search for nearby caregivers';
      setError(errorMessage);

      toast({
        title: 'Search Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="card-elevated p-6">
        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Find Nearby Caregivers
        </h2>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-foreground mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="location"
                type="text"
                placeholder="e.g., Accra National Theatre"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-base pl-10"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter a landmark, address, or location name
            </p>
          </div>

          <div>
            <label htmlFor="radius" className="block text-sm font-medium text-foreground mb-2">
              Search Radius: {radius}km
            </label>
            <input
              id="radius"
              type="range"
              min="1"
              max={maxRadius}
              step="1"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max {maxRadius}km radius
            </p>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading || !location.trim()}
              className="btn-primary w-full h-10 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  Search Nearby
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex gap-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Map for location selection */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Or select location on map
          </label>
          <div className="h-64 rounded-md overflow-hidden border">
            <MapContainer
              center={[5.6037, -0.1870]} // Default to Accra, Ghana
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationMarker />
            </MapContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Click on the map to select your location
          </p>
        </div>
      </form>

      {/* Search Results Summary */}
      {searchResults && (
        <div className="bg-primary/5 border border-primary/10 rounded-md p-4">
          <p className="text-sm font-medium text-foreground">
            Found <span className="text-primary font-bold">{searchResults.totalFound}</span> caregiver
            {searchResults.totalFound !== 1 ? 's' : ''} within {radius}km of "{location}"
            {searchResults.totalInSystem > 0 && (
              <span className="text-muted-foreground ml-2">
                ({searchResults.totalInSystem} total caregivers in system)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Caregivers List */}
      {caregivers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Caregivers Sorted by Distance
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            {caregivers.map((caregiver) => (
              <div
                key={caregiver._id}
                className="card-elevated p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground text-lg">{caregiver.name}</h4>
                    <p className="text-sm text-muted-foreground">{caregiver.serviceType}</p>
                  </div>
                  {caregiver.verified && (
                    <div className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                      ✓ Verified
                    </div>
                  )}
                </div>

                {/* Distance Display - Most Important */}
                <div className="bg-accent/20 rounded-md p-3 mb-3 border border-accent/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-accent" />
                      <span className="text-sm text-foreground font-medium">{caregiver.location}</span>
                    </div>
                    <span className="text-lg font-bold text-accent">{caregiver.distance.toFixed(1)}km</span>
                  </div>
                  <div className="mt-2 bg-white rounded-full h-2 w-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-full"
                      style={{ width: `${caregiver.proximityScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Proximity Score: {caregiver.proximityScore}/100
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div className="bg-secondary/50 rounded p-2">
                    <p className="text-muted-foreground">Rating</p>
                    <p className="font-bold text-foreground">{caregiver.rating || 'N/A'} ⭐</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-2">
                    <p className="text-muted-foreground">Reviews</p>
                    <p className="font-bold text-foreground">{caregiver.totalReviews || 0}</p>
                  </div>
                  <div className="bg-secondary/50 rounded p-2">
                    <p className="text-muted-foreground">Rate</p>
                    <p className="font-bold text-foreground">GH₵{caregiver.dailyRate}/day</p>
                  </div>
                </div>

                {/* Bio */}
                {caregiver.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{caregiver.bio}</p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    className="btn-secondary flex-1 text-sm h-9"
                    onClick={() => goToProfile(caregiver._id)}
                  >
                    View Profile
                  </button>
                  <button
                    className="btn-primary flex-1 text-sm h-9"
                    onClick={() => bookNow(caregiver._id)}
                  >
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && caregivers.length === 0 && searchResults && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Caregivers Found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Try increasing the search radius or entering a different location. Make sure the location
            name is clear and specific (e.g., "Accra National Theatre" instead of just "Accra").
          </p>
        </div>
      )}
    </div>
  );
}

export default ProximityBasedSearch;
