// Predefined color palette
const colors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#1f2937', '#000000', '#ffffff'
];

/**
 * Get a random color from the predefined color palette
 * @returns A random hex color string
 */
export const getRandomColor = (): string => {
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Get the predefined color palette
 * @returns Array of hex color strings
 */
export const getColorPalette = (): string[] => {
  return [...colors];
};

/**
 * Check if a color is in the predefined palette
 * @param color - Hex color string to check
 * @returns True if color is in the palette
 */
export const isColorInPalette = (color: string): boolean => {
  return colors.includes(color);
};

/**
 * Convert a hex color to RGB
 * @param hex - Hex color string
 * @returns RGB representation of the color
 */
export const hexToRgb = (hex: string): { r: number, g: number, b: number } => {
  let r = 0, g = 0, b = 0;

  // 3 digits
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  }
  // 6 digits
  else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }

  return { r, g, b };
};

/**
 * Convert an RGB color to hex
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Hex representation of the color
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return '#' + toHex(r) + toHex(g) + toHex(b);
};
