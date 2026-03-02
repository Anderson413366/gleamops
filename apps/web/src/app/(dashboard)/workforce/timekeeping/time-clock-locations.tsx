'use client';

import { useState } from 'react';
import GeofenceTable from '../../operations/geofence/geofence-table';
import { GeofenceForm } from '@/components/forms/geofence-form';
import type { Geofence } from '@gleamops/shared';

interface TimeClockLocationsProps {
  search: string;
}

export default function TimeClockLocations({ search }: TimeClockLocationsProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdd = () => {
    setSelectedGeofence(null);
    setFormOpen(true);
  };

  const handleSelect = (geofence: Geofence) => {
    setSelectedGeofence(geofence);
    setFormOpen(true);
  };

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      <GeofenceTable
        key={refreshKey}
        search={search}
        onAdd={handleAdd}
        onSelect={handleSelect}
      />
      <GeofenceForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={selectedGeofence}
        onSuccess={handleSuccess}
      />
    </>
  );
}
