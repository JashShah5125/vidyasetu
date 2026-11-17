export interface CapturedGeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const EARTH_RADIUS_METERS = 6371000;

export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  const dLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;

  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  return EARTH_RADIUS_METERS * c;
};

export const captureCurrentLocation = (
  options: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000
  }
): Promise<CapturedGeoLocation> => {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7)),
          accuracy: Math.round(position.coords.accuracy || 0)
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please allow location access in your browser to continue.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is currently unavailable on your device.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out. Please try again in an area with better GPS/Wi-Fi signal.'));
            break;
          default:
            reject(new Error(error.message || 'Failed to capture current location.'));
        }
      },
      options
    );
  });
};

