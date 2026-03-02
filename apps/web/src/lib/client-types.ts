export const CLIENT_TYPE_LABELS: Record<string, string> = {
  HEALTHCARE: 'Healthcare',
  MANUFACTURING: 'Manufacturing',
  REAL_ESTATE: 'Real Estate',
  EDUCATION: 'Education',
  HOSPITALITY: 'Hospitality',
  RETAIL: 'Retail',
  OFFICE: 'Office / Corporate',
  GOVERNMENT: 'Government',
  NONPROFIT: 'Non-Profit',
  INDUSTRIAL: 'Industrial',
  RESIDENTIAL: 'Residential',
  FITNESS: 'Fitness & Wellness',
  RELIGIOUS: 'Religious Institution',
  FOOD_SERVICE: 'Food Service',
  OTHER: 'Other',
};

export const CLIENT_TYPE_OPTIONS = Object.entries(CLIENT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);
