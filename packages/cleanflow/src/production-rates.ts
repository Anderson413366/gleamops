/**
 * Production rate matching — most specific match wins.
 * Priority order:
 * 1. task + floor + building
 * 2. task + floor + building=NULL
 * 3. task + floor=NULL + building
 * 4. task + floor=NULL + building=NULL
 */
import type { BidVersionSnapshot } from './types';

type ProductionRate = BidVersionSnapshot['production_rates'][number];

export function findProductionRate(
  taskCode: string,
  floorTypeCode: string | null,
  buildingTypeCode: string | null,
  rates: ProductionRate[]
): ProductionRate | null {
  const taskRates = rates.filter(r => r.task_code === taskCode && r.is_active);

  // Priority 1: exact match (task + floor + building)
  if (floorTypeCode && buildingTypeCode) {
    const exact = taskRates.find(
      r => r.floor_type_code === floorTypeCode && r.building_type_code === buildingTypeCode
    );
    if (exact) return exact;
  }

  // Priority 2: task + floor, building=NULL
  if (floorTypeCode) {
    const floorOnly = taskRates.find(
      r => r.floor_type_code === floorTypeCode && r.building_type_code === null
    );
    if (floorOnly) return floorOnly;
  }

  // Priority 3: task + building, floor=NULL
  if (buildingTypeCode) {
    const buildingOnly = taskRates.find(
      r => r.floor_type_code === null && r.building_type_code === buildingTypeCode
    );
    if (buildingOnly) return buildingOnly;
  }

  // Priority 4: task only (both NULL)
  const taskOnly = taskRates.find(
    r => r.floor_type_code === null && r.building_type_code === null
  );
  return taskOnly ?? null;
}
