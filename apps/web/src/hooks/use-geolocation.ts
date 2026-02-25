'use client';

import { useCallback, useState } from 'react';

export interface GeofenceTarget {
  lat: number | null;
  lng: number | null;
  radiusMeters: number | null;
}

export interface GeolocationCapture {
  lat: number;
  lng: number;
  accuracy: number;
  capturedAt: string;
  distanceToGeofenceMeters: number | null;
  isWithinGeofence: boolean | null;
}

interface CaptureOptions {
  geofence?: GeofenceTarget | null;
  timeoutMs?: number;
  enableHighAccuracy?: boolean;
  maximumAge?: number;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadiusMeters = 6_371_000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function hasGeofence(geofence: GeofenceTarget | null | undefined): geofence is { lat: number; lng: number; radiusMeters: number } {
  return geofence != null
    && typeof geofence.lat === 'number'
    && typeof geofence.lng === 'number'
    && typeof geofence.radiusMeters === 'number'
    && Number.isFinite(geofence.lat)
    && Number.isFinite(geofence.lng)
    && Number.isFinite(geofence.radiusMeters)
    && geofence.radiusMeters > 0;
}

export function useGeolocation() {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<GeolocationCapture | null>(null);

  const clear = useCallback(() => {
    setError(null);
    setReading(null);
  }, []);

  const capture = useCallback(async (options?: CaptureOptions): Promise<GeolocationCapture> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation is not available in this browser.');
    }

    setCapturing(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (value) => resolve(value),
          (geoError) => reject(new Error(geoError.message || 'Unable to capture GPS location.')),
          {
            enableHighAccuracy: options?.enableHighAccuracy ?? true,
            timeout: options?.timeoutMs ?? 12_000,
            maximumAge: options?.maximumAge ?? 0,
          },
        );
      });

      let distanceToGeofenceMeters: number | null = null;
      let isWithinGeofence: boolean | null = null;

      if (hasGeofence(options?.geofence)) {
        distanceToGeofenceMeters = haversineMeters(
          position.coords.latitude,
          position.coords.longitude,
          options.geofence.lat,
          options.geofence.lng,
        );
        isWithinGeofence = distanceToGeofenceMeters <= options.geofence.radiusMeters;
      }

      const nextReading: GeolocationCapture = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date().toISOString(),
        distanceToGeofenceMeters,
        isWithinGeofence,
      };

      setReading(nextReading);
      return nextReading;
    } catch (captureError) {
      const message = captureError instanceof Error ? captureError.message : 'Unable to capture GPS location.';
      setError(message);
      throw new Error(message);
    } finally {
      setCapturing(false);
    }
  }, []);

  return {
    capturing,
    error,
    reading,
    capture,
    clear,
  };
}

