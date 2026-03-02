import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export interface TaskCategory {
  id: string;
  category_name: string;
  default_area_type: string | null;
  is_active: boolean;
}

export async function getTaskCategories(): Promise<TaskCategory[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('task_categories')
    .select('id, category_name, default_area_type, is_active')
    .eq('is_active', true)
    .order('category_name');

  if (error) throw error;
  return (data ?? []) as TaskCategory[];
}
