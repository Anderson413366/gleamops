import { z } from 'zod';

export const loadSheetDirectionSchema = z.enum(['deliver', 'pickup']);

export const loadSheetSiteBreakdownSchema = z.object({
  stop_order: z.number().int().min(1),
  site_name: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const loadSheetItemSchema = z.object({
  supply_id: z.string().uuid(),
  supply_name: z.string().nullable().transform((value) => value ?? 'Unknown supply'),
  unit: z.string().nullable(),
  direction: loadSheetDirectionSchema,
  total_quantity: z.number().int().min(1),
  site_breakdown: z.array(loadSheetSiteBreakdownSchema),
});

export const loadSheetSpecialItemSchema = z.object({
  description: z.string().min(1),
  for_stop: z.number().int().min(1),
  site_name: z.string().min(1),
});

export const loadSheetResponseSchema = z.object({
  route_id: z.string().uuid(),
  route_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(loadSheetItemSchema),
  special_items: z.array(loadSheetSpecialItemSchema),
});

export type LoadSheetResponseSchema = z.infer<typeof loadSheetResponseSchema>;
