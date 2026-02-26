export type LoadDirection = 'deliver' | 'pickup';

export interface LoadSheetSiteBreakdown {
  stop_order: number;
  site_name: string;
  quantity: number;
}

export interface LoadSheetItem {
  supply_id: string;
  supply_name: string;
  unit: string | null;
  direction: LoadDirection;
  total_quantity: number;
  site_breakdown: LoadSheetSiteBreakdown[];
}

export interface LoadSheetSpecialItem {
  description: string;
  for_stop: number;
  site_name: string;
}

export interface LoadSheetResponse {
  route_id: string;
  route_date: string;
  items: LoadSheetItem[];
  special_items: LoadSheetSpecialItem[];
}
