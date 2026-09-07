export const WORKER_PALETTE = [
  '#4A90D9', // Blue
  '#D4A843', // Gold/Yellow
  '#5BA55B', // Green
  '#8B6BB5', // Purple
  '#E74C3C', // Red
  '#1ABC9C', // Teal
  '#F39C12', // Orange
  '#E84393', // Pink
  '#6C5CE7', // Indigo
  '#00B894', // Mint
  '#E17055', // Rust
  '#0984E3', // Bright Blue
];

export const PROJECT_PALETTE = [
  '#FF5252', // Bright Red
  '#448AFF', // Bright Blue
  '#69F0AE', // Bright Green
  '#FFD740', // Bright Amber
  '#E040FB', // Bright Purple
  '#18FFFF', // Bright Cyan
  '#FF4081', // Bright Pink
  '#FFAB40', // Bright Orange
  '#EEFF41', // Bright Lime
  '#B2FF59', // Light Green
  '#64FFDA', // Teal Accent
  '#536DFE', // Indigo Accent
];

export function getAutoAssignedColor(existingColors: string[], palette: string[]): string {
  const normalizedExisting = existingColors.map(c => c.toUpperCase());
  
  const colorCounts = new Map<string, number>();
  
  palette.forEach(color => {
    const normalizedPaletteColor = color.toUpperCase();
    const count = normalizedExisting.filter(c => c === normalizedPaletteColor).length;
    colorCounts.set(normalizedPaletteColor, count);
  });

  let minCount = Infinity;
  let bestColor = palette[0];

  for (const color of palette) {
    const normalizedColor = color.toUpperCase();
    const count = colorCounts.get(normalizedColor) || 0;
    
    if (count < minCount) {
      minCount = count;
      bestColor = color;
    }
  }

  return bestColor;
}

export function getCategoryColor(category: string): string {
  if (!category) return PROJECT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PROJECT_PALETTE.length;
  return PROJECT_PALETTE[index];
}
