const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees) => degrees * (Math.PI / 180);

const isValidCoordinate = (lat, lon) => {
    const numLat = Number(lat);
    const numLon = Number(lon);
    return (
        lat !== null &&
        lat !== undefined &&
        lat !== '' &&
        lon !== null &&
        lon !== undefined &&
        lon !== '' &&
        Number.isFinite(numLat) &&
        Number.isFinite(numLon) &&
        numLat >= -90 &&
        numLat <= 90 &&
        numLon >= -180 &&
        numLon <= 180
    );
};

/**
 * Calculates great-circle distance in metres between two coordinates using Haversine formula.
 */
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const phi1 = toRadians(Number(lat1));
    const phi2 = toRadians(Number(lat2));
    const deltaPhi = toRadians(Number(lat2) - Number(lat1));
    const deltaLambda = toRadians(Number(lon2) - Number(lon1));

    const sinHalfPhi = Math.sin(deltaPhi / 2);
    const sinHalfLambda = Math.sin(deltaLambda / 2);

    const a =
        sinHalfPhi * sinHalfPhi +
        Math.cos(phi1) * Math.cos(phi2) * sinHalfLambda * sinHalfLambda;

    const clampedA = Math.min(1, Math.max(0, a));
    const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

    return EARTH_RADIUS_METERS * c;
};

/**
 * Verifies a submitted geolocation against a branch's configured geofence.
 * When geofencing is enabled on the branch, any reading outside the radius,
 * missing, or severely unreliable is hard-blocked (allowed: false).
 */
const verifyBranchGeofence = (branch, location) => {
    const enabled = Boolean(branch && Number(branch.geofence_enabled) === 1);
    const radiusMeters = branch && Number(branch.geofence_radius_meters) > 0
        ? Number(branch.geofence_radius_meters)
        : 100;
    const branchLabel = (branch && (branch.name || branch.branch_name)) || 'this branch';

    if (!enabled) {
        if (
            branch &&
            isValidCoordinate(branch.latitude, branch.longitude) &&
            location &&
            isValidCoordinate(location.latitude, location.longitude)
        ) {
            const distance = calculateHaversineDistance(
                branch.latitude,
                branch.longitude,
                location.latitude,
                location.longitude
            );
            const accuracy = Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : null;
            return {
                enforced: false,
                allowed: true,
                status: distance <= radiusMeters ? 'INSIDE' : 'OUTSIDE',
                distanceMeters: Math.round(distance * 100) / 100,
                accuracyMeters: accuracy !== null ? Math.round(accuracy * 100) / 100 : null,
                radiusMeters,
                latitude: Number(location.latitude),
                longitude: Number(location.longitude)
            };
        }

        return {
            enforced: false,
            allowed: true,
            status: 'SKIPPED',
            distanceMeters: null,
            accuracyMeters: null,
            radiusMeters,
            latitude: null,
            longitude: null
        };
    }

    if (!isValidCoordinate(branch.latitude, branch.longitude)) {
        return {
            enforced: true,
            allowed: false,
            status: 'CONFIG_MISSING',
            distanceMeters: null,
            accuracyMeters: null,
            radiusMeters,
            message: `Geo-fencing is enabled for "${branchLabel}", but branch latitude and longitude are not configured. Contact your administrator.`
        };
    }

    if (!location || !isValidCoordinate(location.latitude, location.longitude)) {
        return {
            enforced: true,
            allowed: false,
            status: 'LOCATION_MISSING',
            distanceMeters: null,
            accuracyMeters: null,
            radiusMeters,
            message: `Location verification is required to submit attendance for "${branchLabel}". Please enable browser location access and try again.`
        };
    }

    const userLat = Number(location.latitude);
    const userLon = Number(location.longitude);
    const rawAccuracy = Number(location.accuracy);
    const accuracyMeters = Number.isFinite(rawAccuracy) && rawAccuracy >= 0
        ? Math.round(rawAccuracy * 100) / 100
        : null;

    const rawDistance = calculateHaversineDistance(
        branch.latitude,
        branch.longitude,
        userLat,
        userLon
    );
    const distanceMeters = Math.round(rawDistance * 100) / 100;

    // Reject degraded readings with uncertainty > 150m (allows Chrome DevTools 150m simulation and mobile GPS)
    const maxAllowedAccuracy = 150;
    if (accuracyMeters !== null && accuracyMeters > maxAllowedAccuracy) {
        return {
            enforced: true,
            allowed: false,
            status: 'LOCATION_UNRELIABLE',
            distanceMeters,
            accuracyMeters,
            radiusMeters,
            latitude: userLat,
            longitude: userLon,
            message: `GPS accuracy (±${Math.round(accuracyMeters)}m) is too low to verify presence inside "${branchLabel}" (max allowed uncertainty: ±${maxAllowedAccuracy}m). Move near an open area or enable precise location.`
        };
    }

    if (distanceMeters > radiusMeters) {
        return {
            enforced: true,
            allowed: false,
            status: 'OUTSIDE',
            distanceMeters,
            accuracyMeters,
            radiusMeters,
            latitude: userLat,
            longitude: userLon,
            message: `Attendance blocked: You are ${Math.round(distanceMeters)}m away from "${branchLabel}" (permitted radius: ${radiusMeters}m).`
        };
    }

    return {
        enforced: true,
        allowed: true,
        status: 'INSIDE',
        distanceMeters,
        accuracyMeters,
        radiusMeters,
        latitude: userLat,
        longitude: userLon
    };
};

module.exports = {
    EARTH_RADIUS_METERS,
    isValidCoordinate,
    calculateHaversineDistance,
    verifyBranchGeofence
};

