// Predefined color palette
const colors = [
  '#dc2626', // Red
  '#ea580c', // Orange
  '#ca8a04', // Yellow
  '#16a34a', // Green
  '#0891b2', // Cyan
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#8b5a00', // Brown
  '#059669', // Emerald
  '#0284c7', // Sky Blue
  '#9333ea', // Violet
  '#e11d48', // Rose
  '#84cc16', // Lime
  '#f59e0b', // Amber
  '#10b981'  // Teal Green
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
