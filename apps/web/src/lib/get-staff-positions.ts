import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface StaffPosition {
  id: string;
  position_name: string;
  position_code: string;
  color_hex: string | null;
  display_order: number | null;
  position_group: string | null;
  is_active: boolean;
}

export async function getStaffPositions(): Promise<StaffPosition[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('staff_positions')
    .select('id, position_name, position_code, color_hex, display_order, position_group, is_active')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as StaffPosition[];
}
