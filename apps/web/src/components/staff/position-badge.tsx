interface PositionBadgeProps {
  positionName: string;
  colorHex?: string | null;
  size?: 'sm' | 'md';
}

export function PositionBadge({ positionName, colorHex, size = 'md' }: PositionBadgeProps) {
  const bg = colorHex ?? '#6B7280';
  return (
    <span
      style={{ backgroundColor: bg }}
      className={`inline-flex items-center rounded-full font-medium text-white ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {positionName}
    </span>
  );
}
