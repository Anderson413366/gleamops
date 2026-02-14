'use client';

import { Input, Select, Card, CardContent, CardHeader, CardTitle } from '@gleamops/ui';
import type {
  BidTypeCode,
  BidSpecialization,
  DisinfectingInputs,
  MaidInputs,
  CarpetInputs,
  WindowInputs,
  TileInputs,
  MoveInOutInputs,
  PostConstructionInputs,
} from '@gleamops/cleanflow';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface SpecializationStepProps {
  bidType: BidTypeCode;
  specialization: BidSpecialization | undefined;
  onChange: (spec: BidSpecialization) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DISINFECTING_DEFAULTS: DisinfectingInputs = {
  method: 'SPRAY', density: 'STANDARD', active_cases_nearby: false,
  waiver_signed: false, ppe_included: false,
};

const MAID_DEFAULTS: MaidInputs = {
  bedrooms: 2, bathrooms: 1, has_pets: false, pet_count: 0,
  appliance_cleaning: false, laundry_included: false,
  fridge_inside: false, oven_inside: false,
};

const CARPET_DEFAULTS: CarpetInputs = {
  method: 'HOT_WATER_EXTRACTION', move_furniture: false, furniture_piece_count: 0,
  apply_deodorizer: false, stain_treatment_spots: 0, carpet_age_years: 0,
};

const WINDOW_DEFAULTS: WindowInputs = {
  pane_count_interior: 0, pane_count_exterior: 0,
  includes_screens: false, includes_tracks: false, includes_sills: false,
  high_access_panes: 0, stories: 1,
};

const TILE_DEFAULTS: TileInputs = {
  service_type: 'SCRUB_RECOAT', coats_of_wax: 0,
  current_wax_condition: 'FAIR', needs_stripping: false, grout_cleaning: false,
};

const MOVE_IN_OUT_DEFAULTS: MoveInOutInputs = {
  unit_type: 'APARTMENT', bedrooms: 2, bathrooms: 1,
  garage_included: false, appliance_cleaning: false,
  window_cleaning: false, carpet_cleaning: false,
};

const POST_CONSTRUCTION_DEFAULTS: PostConstructionInputs = {
  phase: 'FINAL', debris_level: 'MODERATE',
  includes_window_cleaning: false, includes_pressure_wash: false,
  includes_floor_polish: false, floors_count: 1,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function SpecializationStep({ bidType, specialization, onChange }: SpecializationStepProps) {
  if (bidType === 'JANITORIAL') {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        Standard janitorial — no specialization inputs needed.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatBidType(bidType)} Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bidType === 'DISINFECTING' && (
          <DisinfectingForm
            inputs={specialization?.type === 'DISINFECTING' ? specialization.inputs : DISINFECTING_DEFAULTS}
            onChange={(inputs) => onChange({ type: 'DISINFECTING', inputs })}
          />
        )}
        {bidType === 'MAID' && (
          <MaidForm
            inputs={specialization?.type === 'MAID' ? specialization.inputs : MAID_DEFAULTS}
            onChange={(inputs) => onChange({ type: 'MAID', inputs })}
          />
        )}
        {bidType === 'CARPET' && (
          <CarpetForm
            inputs={specialization?.type === 'CARPET' ? specialization.inputs : CARPET_DEFAULTS}
            onChange={(inputs) => onChange({ type: 'CARPET', inputs })}
          />
        )}
        {bidType === 'WINDOW' && (
          <WindowForm
            inputs={specialization?.type === 'WINDOW' ? specialization.inputs : WINDOW_DEFAULTS}
            onChange={(inputs) => onChange({ type: 'WINDOW', inputs })}
          />
        )}
        {bidType === 'TILE' && (
          <TileForm
            inputs={specialization?.type === 'TILE' ? specialization.inputs : TILE_DEFAULTS}
            onChange={(inputs) => onChange({ type: 'TILE', inputs })}
          />
        )}
        {bidType === 'MOVE_IN_OUT' && (
          <MoveInOutForm
            inputs={specialization?.type === 'MOVE_IN_OUT' ? specialization.inputs : MOVE_IN_OUT_DEFAULTS}
            onChange={(inputs) => onChange({ type: 'MOVE_IN_OUT', inputs })}
          />
        )}
        {bidType === 'POST_CONSTRUCTION' && (
          <PostConstructionForm
            inputs={specialization?.type === 'POST_CONSTRUCTION' ? specialization.inputs : POST_CONSTRUCTION_DEFAULTS}
            onChange={(inputs) => onChange({ type: 'POST_CONSTRUCTION', inputs })}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-forms
// ---------------------------------------------------------------------------
function DisinfectingForm({ inputs, onChange }: { inputs: DisinfectingInputs; onChange: (i: DisinfectingInputs) => void }) {
  const set = (patch: Partial<DisinfectingInputs>) => onChange({ ...inputs, ...patch });
  return (
    <div className="space-y-3">
      <Select label="Method" value={inputs.method} onChange={(e) => set({ method: e.target.value as DisinfectingInputs['method'] })}
        options={[
          { value: 'SPRAY', label: 'Spray (1.0x)' },
          { value: 'WIPE', label: 'Wipe (1.4x)' },
          { value: 'ELECTROSTATIC', label: 'Electrostatic (0.7x)' },
          { value: 'FOGGING', label: 'Fogging (0.5x)' },
        ]} />
      <Select label="Density" value={inputs.density} onChange={(e) => set({ density: e.target.value as DisinfectingInputs['density'] })}
        options={[
          { value: 'LIGHT', label: 'Light (0.8x)' },
          { value: 'STANDARD', label: 'Standard (1.0x)' },
          { value: 'HIGH', label: 'High (1.3x)' },
        ]} />
      <div className="space-y-2">
        <Checkbox label="Active cases nearby (+20%)" checked={inputs.active_cases_nearby} onChange={(v) => set({ active_cases_nearby: v })} />
        <Checkbox label="PPE included (+10 min setup)" checked={inputs.ppe_included} onChange={(v) => set({ ppe_included: v })} />
        <Checkbox label="Waiver signed" checked={inputs.waiver_signed} onChange={(v) => set({ waiver_signed: v })} />
      </div>
    </div>
  );
}

function MaidForm({ inputs, onChange }: { inputs: MaidInputs; onChange: (i: MaidInputs) => void }) {
  const set = (patch: Partial<MaidInputs>) => onChange({ ...inputs, ...patch });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Bedrooms" type="number" value={inputs.bedrooms} onChange={(e) => set({ bedrooms: Number(e.target.value) })} />
        <Input label="Bathrooms" type="number" value={inputs.bathrooms} onChange={(e) => set({ bathrooms: Number(e.target.value) })} />
      </div>
      <Checkbox label="Has pets" checked={inputs.has_pets} onChange={(v) => set({ has_pets: v })} />
      {inputs.has_pets && (
        <Input label="Pet count" type="number" value={inputs.pet_count} onChange={(e) => set({ pet_count: Number(e.target.value) })} />
      )}
      <Checkbox label="Appliance cleaning" checked={inputs.appliance_cleaning} onChange={(v) => set({ appliance_cleaning: v })} />
      {inputs.appliance_cleaning && (
        <div className="ml-4 space-y-2">
          <Checkbox label="Fridge inside" checked={inputs.fridge_inside} onChange={(v) => set({ fridge_inside: v })} />
          <Checkbox label="Oven inside" checked={inputs.oven_inside} onChange={(v) => set({ oven_inside: v })} />
        </div>
      )}
      <Checkbox label="Laundry included (+30 min)" checked={inputs.laundry_included} onChange={(v) => set({ laundry_included: v })} />
    </div>
  );
}

function CarpetForm({ inputs, onChange }: { inputs: CarpetInputs; onChange: (i: CarpetInputs) => void }) {
  const set = (patch: Partial<CarpetInputs>) => onChange({ ...inputs, ...patch });
  return (
    <div className="space-y-3">
      <Select label="Method" value={inputs.method} onChange={(e) => set({ method: e.target.value as CarpetInputs['method'] })}
        options={[
          { value: 'HOT_WATER_EXTRACTION', label: 'Hot Water Extraction (1.0x)' },
          { value: 'ENCAPSULATION', label: 'Encapsulation (0.7x)' },
          { value: 'BONNET', label: 'Bonnet (0.6x)' },
          { value: 'DRY_COMPOUND', label: 'Dry Compound (0.8x)' },
        ]} />
      <Input label="Carpet Age (years)" type="number" value={inputs.carpet_age_years} onChange={(e) => set({ carpet_age_years: Number(e.target.value) })} />
      <Checkbox label="Move furniture" checked={inputs.move_furniture} onChange={(v) => set({ move_furniture: v })} />
      {inputs.move_furniture && (
        <Input label="Furniture pieces" type="number" value={inputs.furniture_piece_count} onChange={(e) => set({ furniture_piece_count: Number(e.target.value) })} />
      )}
      <Checkbox label="Apply deodorizer" checked={inputs.apply_deodorizer} onChange={(v) => set({ apply_deodorizer: v })} />
      <Input label="Stain treatment spots" type="number" value={inputs.stain_treatment_spots} onChange={(e) => set({ stain_treatment_spots: Number(e.target.value) })} />
    </div>
  );
}

function WindowForm({ inputs, onChange }: { inputs: WindowInputs; onChange: (i: WindowInputs) => void }) {
  const set = (patch: Partial<WindowInputs>) => onChange({ ...inputs, ...patch });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Interior panes" type="number" value={inputs.pane_count_interior} onChange={(e) => set({ pane_count_interior: Number(e.target.value) })} />
        <Input label="Exterior panes" type="number" value={inputs.pane_count_exterior} onChange={(e) => set({ pane_count_exterior: Number(e.target.value) })} />
      </div>
      <Input label="Stories" type="number" value={inputs.stories} onChange={(e) => set({ stories: Number(e.target.value) })} />
      <Input label="High access panes" type="number" value={inputs.high_access_panes} onChange={(e) => set({ high_access_panes: Number(e.target.value) })} />
      <div className="space-y-2">
        <Checkbox label="Includes screens" checked={inputs.includes_screens} onChange={(v) => set({ includes_screens: v })} />
        <Checkbox label="Includes tracks" checked={inputs.includes_tracks} onChange={(v) => set({ includes_tracks: v })} />
        <Checkbox label="Includes sills" checked={inputs.includes_sills} onChange={(v) => set({ includes_sills: v })} />
      </div>
    </div>
  );
}

function TileForm({ inputs, onChange }: { inputs: TileInputs; onChange: (i: TileInputs) => void }) {
  const set = (patch: Partial<TileInputs>) => onChange({ ...inputs, ...patch });
  return (
    <div className="space-y-3">
      <Select label="Service Type" value={inputs.service_type} onChange={(e) => set({ service_type: e.target.value as TileInputs['service_type'] })}
        options={[
          { value: 'STRIP_WAX', label: 'Strip & Wax (1.5x)' },
          { value: 'SCRUB_RECOAT', label: 'Scrub & Recoat (1.0x)' },
          { value: 'DEEP_CLEAN', label: 'Deep Clean (0.8x)' },
          { value: 'SEAL', label: 'Seal (1.2x)' },
        ]} />
      <Select label="Current Wax Condition" value={inputs.current_wax_condition} onChange={(e) => set({ current_wax_condition: e.target.value as TileInputs['current_wax_condition'] })}
        options={[
          { value: 'GOOD', label: 'Good (0.8x)' },
          { value: 'FAIR', label: 'Fair (1.0x)' },
          { value: 'POOR', label: 'Poor (1.3x)' },
          { value: 'NONE', label: 'None (1.5x)' },
        ]} />
      <Input label="Coats of wax" type="number" value={inputs.coats_of_wax} onChange={(e) => set({ coats_of_wax: Number(e.target.value) })} />
      <Checkbox label="Needs stripping (+40%)" checked={inputs.needs_stripping} onChange={(v) => set({ needs_stripping: v })} />
      <Checkbox label="Grout cleaning" checked={inputs.grout_cleaning} onChange={(v) => set({ grout_cleaning: v })} />
    </div>
  );
}

function MoveInOutForm({ inputs, onChange }: { inputs: MoveInOutInputs; onChange: (i: MoveInOutInputs) => void }) {
  const set = (patch: Partial<MoveInOutInputs>) => onChange({ ...inputs, ...patch });
  return (
    <div className="space-y-3">
      <Select label="Unit Type" value={inputs.unit_type} onChange={(e) => set({ unit_type: e.target.value as MoveInOutInputs['unit_type'] })}
        options={[
          { value: 'APARTMENT', label: 'Apartment' },
          { value: 'HOUSE', label: 'House' },
          { value: 'CONDO', label: 'Condo' },
          { value: 'TOWNHOUSE', label: 'Townhouse' },
        ]} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Bedrooms" type="number" value={inputs.bedrooms} onChange={(e) => set({ bedrooms: Number(e.target.value) })} />
        <Input label="Bathrooms" type="number" value={inputs.bathrooms} onChange={(e) => set({ bathrooms: Number(e.target.value) })} />
      </div>
      <div className="space-y-2">
        <Checkbox label="Garage included (+30 min)" checked={inputs.garage_included} onChange={(v) => set({ garage_included: v })} />
        <Checkbox label="Appliance cleaning (+40 min)" checked={inputs.appliance_cleaning} onChange={(v) => set({ appliance_cleaning: v })} />
        <Checkbox label="Window cleaning (+25 min)" checked={inputs.window_cleaning} onChange={(v) => set({ window_cleaning: v })} />
        <Checkbox label="Carpet cleaning (+35 min)" checked={inputs.carpet_cleaning} onChange={(v) => set({ carpet_cleaning: v })} />
      </div>
    </div>
  );
}

function PostConstructionForm({ inputs, onChange }: { inputs: PostConstructionInputs; onChange: (i: PostConstructionInputs) => void }) {
  const set = (patch: Partial<PostConstructionInputs>) => onChange({ ...inputs, ...patch });
  return (
    <div className="space-y-3">
      <Select label="Phase" value={inputs.phase} onChange={(e) => set({ phase: e.target.value as PostConstructionInputs['phase'] })}
        options={[
          { value: 'ROUGH', label: 'Rough (1.8x)' },
          { value: 'FINAL', label: 'Final (1.0x)' },
          { value: 'TOUCH_UP', label: 'Touch-Up (0.5x)' },
        ]} />
      <Select label="Debris Level" value={inputs.debris_level} onChange={(e) => set({ debris_level: e.target.value as PostConstructionInputs['debris_level'] })}
        options={[
          { value: 'LIGHT', label: 'Light (0.8x)' },
          { value: 'MODERATE', label: 'Moderate (1.0x)' },
          { value: 'HEAVY', label: 'Heavy (1.5x)' },
        ]} />
      <Input label="Number of floors" type="number" value={inputs.floors_count} onChange={(e) => set({ floors_count: Number(e.target.value) })} />
      <div className="space-y-2">
        <Checkbox label="Includes window cleaning" checked={inputs.includes_window_cleaning} onChange={(v) => set({ includes_window_cleaning: v })} />
        <Checkbox label="Includes pressure wash" checked={inputs.includes_pressure_wash} onChange={(v) => set({ includes_pressure_wash: v })} />
        <Checkbox label="Includes floor polish" checked={inputs.includes_floor_polish} onChange={(v) => set({ includes_floor_polish: v })} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-border" />
      <span>{label}</span>
    </label>
  );
}

function formatBidType(code: BidTypeCode): string {
  const map: Record<BidTypeCode, string> = {
    JANITORIAL: 'Janitorial',
    DISINFECTING: 'Disinfecting',
    MAID: 'Maid Service',
    CARPET: 'Carpet Cleaning',
    WINDOW: 'Window Cleaning',
    TILE: 'Tile & Floor Care',
    MOVE_IN_OUT: 'Move In/Out',
    POST_CONSTRUCTION: 'Post-Construction',
  };
  return map[code];
}
