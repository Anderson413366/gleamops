'use client';

import { Badge } from '@gleamops/ui';
import type { GeolocationCapture } from '@/hooks/use-geolocation';

interface GpsLocationBadgeProps {
  reading: GeolocationCapture | null;
  capturing?: boolean;
  error?: string | null;
}

function formatDistance(distance: number): string {
  if (distance < 1000) return `${Math.round(distance)}m`;
  return `${(distance / 1000).toFixed(2)}km`;
}

export function GpsLocationBadge({ reading, capturing = false, error }: GpsLocationBadgeProps) {
  if (capturing) {
    return <Badge color="blue">Capturing GPS...</Badge>;
  }

  if (error) {
    return <Badge color="red">GPS Error</Badge>;
  }

  if (!reading) {
    return <Badge color="gray">GPS Pending</Badge>;
  }

  if (reading.isWithinGeofence === true) {
    return <Badge color="green">Inside Geofence</Badge>;
  }

  if (reading.isWithinGeofence === false) {
    const distance = reading.distanceToGeofenceMeters != null
      ? ` (${formatDistance(reading.distanceToGeofenceMeters)})`
      : '';
    return <Badge color="red">Outside Geofence{distance}</Badge>;
  }

  return <Badge color="yellow">GPS Captured</Badge>;
}

