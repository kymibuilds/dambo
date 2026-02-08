
/**
 * Simple color utility to generate palettes.
 * No external dependencies required.
 */

// Helper to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : null;
}

// Helper to convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h * 360, s, l];
}

// Helper to convert HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generates a monochromatic palette from a base color.
 * @param baseColor Hex color string
 * @param count Number of colors needed
 * @returns Array of hex color strings
 */
export function generatePalette(baseColor: string, count: number): string[] {
    const rgb = hexToRgb(baseColor);
    if (!rgb) return Array(count).fill(baseColor); // Fallback

    const [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]); // s and l are 0-1
    const sPercent = s * 100;
    const lPercent = l * 100;

    const palette: string[] = [];

    // Strategy: vary lightness.
    // Ensure we don't go too white or too black.
    // If base is dark, go lighter. If base is light, go darker.
    // Or just spread around the base lightness.

    const step = 60 / (count + 1); // 60% lightness range
    const startL = Math.max(20, Math.min(80, lPercent - (count / 2) * step));

    for (let i = 0; i < count; i++) {
        // Vary lightness but keep hue and saturation
        const newL = Math.max(10, Math.min(95, startL + i * step));
        palette.push(hslToHex(h, sPercent, newL));
    }

    return palette;
}

/**
 * Returns a semi-transparent version of a hex color.
 */
export function hexToRgba(hex: string, alpha: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}
