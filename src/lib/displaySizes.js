// Display sizing helpers — map admin-chosen size keys to concrete pixel/tailwind values.

export const LOGO_BOX_PX = { sm: 40, md: 56, lg: 72, xl: 88 };
export const LOGO_ICON_PX = { sm: 22, md: 28, lg: 36, xl: 44 };

// School name font-size (main line) in pixels
export const NAME_SIZE_PX = { sm: 18, md: 24, lg: 30, xl: 38 };
// Tagline font-size (independent from name size)
export const TAGLINE_SIZE_PX = { sm: 10, md: 12, lg: 14, xl: 16 };

// Letter case options for the tagline text
export const TAGLINE_CASE_OPTIONS = [
  { key: "upper", label: "UPPER CASE" },
  { key: "normal", label: "Normal Case" },
];

// Hero section min height (viewport height percent)
export const HERO_MIN_VH = { sm: 78, md: 92, lg: 108 };

// Gallery aspect ratio row height
export const GALLERY_ROW_PX = { sm: 180, md: 220, lg: 280 };

export const pick = (map, key, fallback = "md") => map[key] || map[fallback];

export const SIZE_OPTIONS_4 = [
  { key: "sm", label: "Small" },
  { key: "md", label: "Medium" },
  { key: "lg", label: "Large" },
  { key: "xl", label: "Extra Large" },
];

export const SIZE_OPTIONS_3 = [
  { key: "sm", label: "Compact" },
  { key: "md", label: "Standard" },
  { key: "lg", label: "Tall" },
];

export const GALLERY_OPTIONS_3 = [
  { key: "sm", label: "Small" },
  { key: "md", label: "Medium" },
  { key: "lg", label: "Large" },
];

export const LOGO_SHAPE_OPTIONS = [
  { key: "square", label: "Square" },
  { key: "rounded", label: "Rounded" },
  { key: "circle", label: "Circle" },
];

// Map logo shape key -> Tailwind border-radius class
export const LOGO_RADIUS_CLASS = {
  square: "rounded-md",
  rounded: "rounded-xl",
  circle: "rounded-full",
};

// Font style presets for the school name text
export const NAME_FONT_PRESETS = [
  { key: "fraunces", label: "Fraunces (default)", family: "'Fraunces', Georgia, serif" },
  { key: "playfair", label: "Playfair Display", family: "'Playfair Display', Georgia, serif" },
  { key: "merriweather", label: "Merriweather", family: "'Merriweather', Georgia, serif" },
  { key: "dmserif", label: "DM Serif Display", family: "'DM Serif Display', Georgia, serif" },
  { key: "cinzel", label: "Cinzel Classic", family: "'Cinzel', Georgia, serif" },
  { key: "poppins", label: "Poppins Modern", family: "'Poppins', system-ui, sans-serif" },
  { key: "montserrat", label: "Montserrat Bold", family: "'Montserrat', system-ui, sans-serif" },
  { key: "bebas", label: "Bebas Neue", family: "'Bebas Neue', system-ui, sans-serif" },
];

// Preset name colors surfaced in the color picker
export const NAME_COLOR_PRESETS = [
  { color: "#0a3d29", label: "Emerald" },
  { color: "#16a34a", label: "Green" },
  { color: "#65a30d", label: "Lime" },
  { color: "#c99f3b", label: "Gold" },
  { color: "#0f172a", label: "Ink" },
  { color: "#1e3a8a", label: "Navy" },
  { color: "#7c2d12", label: "Maroon" },
  { color: "#111827", label: "Charcoal" },
];

// Helper — resolve a font key to its full CSS family value
export const fontFamilyFor = (key) => {
  const found = NAME_FONT_PRESETS.find((f) => f.key === key);
  return (found && found.family) || NAME_FONT_PRESETS[0].family;
};
