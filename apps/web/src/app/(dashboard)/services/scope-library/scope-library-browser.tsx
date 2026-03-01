'use client';

import { useState, useMemo } from 'react';
import { Building2, LayoutGrid, Shield, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import {
  ChipTabs,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CollapsibleCard,
} from '@gleamops/ui';
import {
  FACILITY_TYPES,
  SPACE_CATEGORIES,
  SPECIAL_PROTOCOLS,
  PRODUCTIVITY_BASELINES,
  SCOPE_DIFFICULTY_MODIFIERS,
  REGULATORY_TAGS,
} from '@gleamops/shared';
import type { FacilityType, SpaceCategory, RegulatoryTagCode } from '@gleamops/shared';

// ---------------------------------------------------------------------------
// Sub-tab config
// ---------------------------------------------------------------------------
const SUB_TABS = [
  { key: 'facility-types', label: 'Facility Types', icon: <Building2 className="h-4 w-4" /> },
  { key: 'spaces-items', label: 'Spaces & Items', icon: <LayoutGrid className="h-4 w-4" /> },
  { key: 'protocols', label: 'Protocols', icon: <Shield className="h-4 w-4" /> },
  { key: 'reference', label: 'Reference', icon: <BookOpen className="h-4 w-4" /> },
];

// ---------------------------------------------------------------------------
// Regulatory tag color mapping
// ---------------------------------------------------------------------------
const TAG_COLORS: Record<RegulatoryTagCode, 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray'> = {
  CDC: 'blue',
  AORN: 'purple',
  ISSA: 'green',
  FGI: 'yellow',
  OSHA: 'orange',
  EPA: 'green',
  JOINT_COMMISSION: 'blue',
  CMS: 'purple',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ScopeLibraryBrowser({ search }: { search: string }) {
  const [subTab, setSubTab] = useState(SUB_TABS[0].key);

  return (
    <div className="space-y-4">
      <ChipTabs tabs={SUB_TABS} active={subTab} onChange={setSubTab} />

      {subTab === 'facility-types' && <FacilityTypesTab search={search} />}
      {subTab === 'spaces-items' && <SpacesItemsTab search={search} />}
      {subTab === 'protocols' && <ProtocolsTab search={search} />}
      {subTab === 'reference' && <ReferenceTab search={search} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Facility Types
// ---------------------------------------------------------------------------
function FacilityTypesTab({ search }: { search: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return FACILITY_TYPES;
    const q = search.toLowerCase();
    return FACILITY_TYPES.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.key_considerations.some((k) => k.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {filtered.map((facility) => (
        <FacilityTypeCard
          key={facility.code}
          facility={facility}
          isExpanded={expanded === facility.code}
          onToggle={() => setExpanded((prev) => (prev === facility.code ? null : facility.code))}
        />
      ))}
      {filtered.length === 0 && (
        <p className="col-span-2 text-sm text-muted-foreground text-center py-8">No facility types match your search.</p>
      )}
    </div>
  );
}

function FacilityTypeCard({
  facility,
  isExpanded,
  onToggle,
}: {
  facility: FacilityType;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onToggle}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{facility.label}</CardTitle>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{facility.description}</p>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Size Tiers */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-2">Size Tiers</h4>
            <div className="grid grid-cols-3 gap-2">
              {facility.size_tiers.map((tier) => (
                <div key={tier.code} className="rounded-lg border border-border bg-muted/30 p-2 text-center">
                  <p className="text-xs font-medium">{tier.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {tier.min_sqft.toLocaleString()}–{tier.max_sqft.toLocaleString()} sqft
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Typical Areas */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-2">Typical Areas</h4>
            <div className="space-y-1">
              {facility.typical_areas.map((area) => (
                <div key={area.name} className="flex items-center justify-between text-xs">
                  <span>{area.name}</span>
                  <span className="text-muted-foreground font-mono">{area.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Considerations */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-2">Key Considerations</h4>
            <ul className="space-y-1">
              {facility.key_considerations.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                  <span className="shrink-0">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Spaces & Items
// ---------------------------------------------------------------------------
function SpacesItemsTab({ search }: { search: string }) {
  const filtered = useMemo(() => {
    if (!search) return SPACE_CATEGORIES;
    const q = search.toLowerCase();
    return SPACE_CATEGORIES.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.cleanable_items.some(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.notes.toLowerCase().includes(q) ||
            item.typical_materials.some((m) => m.toLowerCase().includes(q))
        )
    );
  }, [search]);

  return (
    <div className="space-y-3">
      {filtered.map((space) => (
        <SpaceCategoryCard key={space.code} space={space} />
      ))}
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No spaces match your search.</p>
      )}
    </div>
  );
}

function SpaceCategoryCard({ space }: { space: SpaceCategory }) {
  return (
    <CollapsibleCard id={space.code} title={space.label} description={space.description} defaultOpen={false}>
      <div className="divide-y divide-border">
        {space.cleanable_items.map((item, i) => (
          <div key={i} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Materials: {item.typical_materials.join(', ')}
                </p>
              </div>
              {item.regulatory_tags.length > 0 && (
                <div className="flex gap-1 shrink-0">
                  {item.regulatory_tags.map((tag) => (
                    <Badge key={tag} color={TAG_COLORS[tag]}>{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Protocols
// ---------------------------------------------------------------------------
function ProtocolsTab({ search }: { search: string }) {
  const filtered = useMemo(() => {
    if (!search) return SPECIAL_PROTOCOLS;
    const q = search.toLowerCase();
    return SPECIAL_PROTOCOLS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.key_procedures.some((proc) => proc.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="space-y-4">
      {filtered.map((protocol) => (
        <Card key={protocol.code}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{protocol.label}</CardTitle>
              <div className="flex gap-1">
                {protocol.regulatory_refs.map((tag) => (
                  <Badge key={tag} color={TAG_COLORS[tag]}>{tag}</Badge>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{protocol.description}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-1">Frequency</h4>
              <p className="text-sm">{protocol.typical_frequency}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground tracking-wide mb-1">Key Procedures</h4>
              <ol className="space-y-1 list-decimal list-inside">
                {protocol.key_procedures.map((proc, i) => (
                  <li key={i} className="text-xs text-muted-foreground">{proc}</li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      ))}
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No protocols match your search.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4: Reference
// ---------------------------------------------------------------------------
function ReferenceTab({ search }: { search: string }) {
  const q = search.toLowerCase();

  const filteredBaselines = useMemo(
    () =>
      !search
        ? PRODUCTIVITY_BASELINES
        : PRODUCTIVITY_BASELINES.filter(
            (b) => b.space_type.toLowerCase().includes(q) || b.notes.toLowerCase().includes(q)
          ),
    [search, q]
  );

  const filteredModifiers = useMemo(
    () =>
      !search
        ? SCOPE_DIFFICULTY_MODIFIERS
        : SCOPE_DIFFICULTY_MODIFIERS.filter(
            (m) => m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
          ),
    [search, q]
  );

  const filteredTags = useMemo(
    () =>
      !search
        ? REGULATORY_TAGS
        : REGULATORY_TAGS.filter(
            (t) => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
          ),
    [search, q]
  );

  return (
    <div className="space-y-6">
      {/* Productivity Baselines */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity Baselines (sqft/hr)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Space Type</TableHead>
                <TableHead className="text-right">Min sqft/hr</TableHead>
                <TableHead className="text-right">Max sqft/hr</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBaselines.map((b) => (
                <TableRow key={b.space_type}>
                  <TableCell className="font-medium">{b.space_type}</TableCell>
                  <TableCell className="text-right font-mono">{b.min_sqft_per_hour.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{b.max_sqft_per_hour.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{b.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Difficulty Modifiers */}
      <Card>
        <CardHeader>
          <CardTitle>Difficulty Modifier Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Factor</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModifiers.map((m) => (
                <TableRow key={m.code}>
                  <TableCell className="font-mono font-medium">{m.code}</TableCell>
                  <TableCell>{m.label}</TableCell>
                  <TableCell className="text-right font-mono">{m.factor}x</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Regulatory Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Standards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTags.map((tag) => (
              <div key={tag.code} className="flex items-start gap-3">
                <Badge color={TAG_COLORS[tag.code]}>{tag.code}</Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{tag.label}</p>
                  <p className="text-xs text-muted-foreground">{tag.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
