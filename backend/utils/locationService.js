/**
 * Location Service - Handles geocoding and proximity-based matching
 * Uses Open Street Map API (Nominatim) for free geocoding
 * No API key required for reasonable usage
 */

import axios from 'axios';

class LocationService {
  constructor() {
    // Nominatim API endpoint for geocoding
    this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    // Cache for coordinates to avoid repeated API calls
    this.coordinateCache = new Map();
  }

  /**
   * Geocode a location name to GPS coordinates
   * Uses OpenStreetMap Nominatim API
   */
  async geocodeLocation(locationName) {
    try {
      // Check cache first
      if (this.coordinateCache.has(locationName.toLowerCase())) {
        return this.coordinateCache.get(locationName.toLowerCase());
      }

      // Query Nominatim API
      const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
        params: {
          q: locationName,
          format: 'json',
          limit: 1,
          countrycodes: 'gh', // Ghana only for CareLink context
          timeout: 10
        },
        headers: {
          'User-Agent': 'CareLink-App' // Required by Nominatim
        }
      });

      if (!response.data || response.data.length === 0) {
        console.warn(`Could not geocode location: ${locationName}`);
        return null;
      }

      const result = response.data[0];
      const coordinates = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name
      };

      // Cache for 1 hour
      this.coordinateCache.set(locationName.toLowerCase(), coordinates);
      setTimeout(() => {
        this.coordinateCache.delete(locationName.toLowerCase());
      }, 60 * 60 * 1000);

      return coordinates;
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Find nearby caregivers based on proximity.
   * Uses stored caregiver coordinates when available, falling back to geocoding
   * only for caregivers whose lat/lng were never captured.
   *
   **/
  async findNearbyCaregiversByProximity(inputLocation, caregivers, radiusKm = 5, preResolvedCoords = null) {
    try {
      // Resolve search origin — use client-supplied coords when available
      const searchCoords = preResolvedCoords || await this.geocodeLocation(inputLocation);
      if (!searchCoords) {
        console.warn(`Could not resolve search location: ${inputLocation}`);
        return caregivers;
      }

      const caregiversWithDistance = await Promise.all(
        caregivers.map(async (caregiver) => {
          try {
            let cgLat = caregiver.latitude;
            let cgLng = caregiver.longitude;

            // Prefer stored GPS coordinates — avoids a Nominatim round-trip
            const hasStoredCoords = cgLat && cgLng && cgLat !== 0 && cgLng !== 0;
            if (!hasStoredCoords) {
              // Fallback: geocode the location string (slower, rate-limited)
              if (!caregiver.location) {
                return { ...caregiver, distance: Infinity, withinRadius: false };
              }
              const fallbackCoords = await this.geocodeLocation(caregiver.location);
              if (!fallbackCoords) {
                return { ...caregiver, distance: Infinity, withinRadius: false };
              }
              cgLat = fallbackCoords.latitude;
              cgLng = fallbackCoords.longitude;
            }

            const distance = this.calculateDistance(
              searchCoords.latitude,
              searchCoords.longitude,
              cgLat,
              cgLng
            );

            return {
              ...caregiver,
              distance: parseFloat(distance.toFixed(2)),
              withinRadius: distance <= radiusKm,
              proximityScore: this.calculateProximityScore(distance, radiusKm)
            };
          } catch (error) {
            console.error(`Error processing caregiver ${caregiver.name}:`, error.message);
            return { ...caregiver, distance: Infinity, withinRadius: false };
          }
        })
      );

      return caregiversWithDistance.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error('Error in findNearbyCaregiversByProximity:', error.message);
      return caregivers;
    }
  }

  /**
   * Calculate proximity score (0-100) based on distance
   * Closer = higher score
   */
  calculateProximityScore(distance, radiusKm) {
    if (distance > radiusKm) {
      return 0;
    }
    // Score: 100 at 0km, decreasing to 0 at radiusKm
    return Math.round(((radiusKm - distance) / radiusKm) * 100);
  }

  /**
   * Find nearest caregiver(s) to a location
   * @returns {Object} Nearest caregiver with distance
   */
  async findNearestCaregiver(inputLocation, caregivers) {
    const nearby = await this.findNearbyCaregiversByProximity(inputLocation, caregivers, 1000); // Large radius
    if (nearby.length > 0) {
      return nearby[0];
    }
    return null;
  }

  /**
   * Validate if location is within radius using cached/quick check
   */
  async isLocationWithinRadius(location1, location2, radiusKm) {
    try {
      const coords1 = await this.geocodeLocation(location1);
      const coords2 = await this.geocodeLocation(location2);

      if (!coords1 || !coords2) {
        return false;
      }

      const distance = this.calculateDistance(
        coords1.latitude,
        coords1.longitude,
        coords2.latitude,
        coords2.longitude
      );

      return distance <= radiusKm;
    } catch (error) {
      console.error('Error validating radius:', error.message);
      return false;
    }
  }

  /**
   * Get location details from coordinates (reverse geocoding)
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get(`${this.nominatimBaseUrl}/reverse`, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json'
        },
        headers: {
          'User-Agent': 'CareLink-App'
        }
      });

      return response.data.display_name;
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      return null;
    }
  }

  /**
   * Clear coordinate cache (useful for testing or manual cache reset)
   */
  clearCache() {
    this.coordinateCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedLocations: this.coordinateCache.size,
      cacheSize: this.coordinateCache.size
    };
  }
}

// Export singleton instance
export default new LocationService();
