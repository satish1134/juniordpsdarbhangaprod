// Runtime theme override — swaps the 6 core hex colors used across the site
// with the values chosen in the Admin CMS "Theme Colors" tab.
// Works by injecting a <style> tag with high-specificity rules targeting
// Tailwind's compiled arbitrary-value class selectors (e.g. .bg-\[\#0a5f3d\]).

import { useEffect } from "react";
import { useContent } from "../lib/ContentContext";

export const DEFAULT_THEME = {
  primary: "#0a5f3d",       // main green
  primary_dark: "#0a3d29",  // deep hero bg / headings
  primary_darker: "#084a30",// hover state of primary
  accent: "#c99f3b",        // gold
  accent_dark: "#8a6b1e",   // gold dark text
  cream_light: "#fff9e6",   // text on dark bg
  cream_bg: "#fbfaf6",      // page background
  cream_neutral: "#f5f2ea", // secondary bg
};

export const THEME_PRESETS = [
  { key: "emerald_gold", label: "Emerald & Gold (default)", colors: DEFAULT_THEME },
  {
    key: "royal_sapphire",
    label: "Royal Sapphire",
    colors: {
      primary: "#1e40af", primary_dark: "#0f2b6b", primary_darker: "#0a1f52",
      accent: "#eab308", accent_dark: "#854d0e",
      cream_light: "#fef9c3", cream_bg: "#f8fafc", cream_neutral: "#eef2ff",
    },
  },
  {
    key: "regal_maroon",
    label: "Regal Maroon",
    colors: {
      primary: "#7f1d1d", primary_dark: "#4a0d0d", primary_darker: "#3a0808",
      accent: "#d4a373", accent_dark: "#6b4a1e",
      cream_light: "#fef3c7", cream_bg: "#fef7ef", cream_neutral: "#f5e8d3",
    },
  },
  {
    key: "modern_teal",
    label: "Modern Teal",
    colors: {
      primary: "#0f766e", primary_dark: "#134e4a", primary_darker: "#0d3b38",
      accent: "#f97316", accent_dark: "#9a3412",
      cream_light: "#fef3c7", cream_bg: "#f0fdfa", cream_neutral: "#ccfbf1",
    },
  },
  {
    key: "midnight_purple",
    label: "Midnight Purple",
    colors: {
      primary: "#6d28d9", primary_dark: "#3b1670", primary_darker: "#2a0f52",
      accent: "#f59e0b", accent_dark: "#78350f",
      cream_light: "#fef9c3", cream_bg: "#faf5ff", cream_neutral: "#ede9fe",
    },
  },
  {
    key: "ocean_navy",
    label: "Ocean Navy",
    colors: {
      primary: "#0c4a6e", primary_dark: "#082f49", primary_darker: "#062033",
      accent: "#0ea5e9", accent_dark: "#075985",
      cream_light: "#e0f2fe", cream_bg: "#f0f9ff", cream_neutral: "#dbeafe",
    },
  },
  {
    key: "forest_terracotta",
    label: "Forest & Terracotta",
    colors: {
      primary: "#166534", primary_dark: "#14532d", primary_darker: "#0f3d20",
      accent: "#c2410c", accent_dark: "#7c2d12",
      cream_light: "#fef3c7", cream_bg: "#fafaf9", cream_neutral: "#f5f5f4",
    },
  },
];

// Escape a hex color for use inside a CSS class selector (Tailwind's escaping)
const escHex = (hex) => hex.replace("#", "\\#");
const OPACITIES = [5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 65, 70, 75, 80, 85, 90, 95];

const buildOverrides = (theme) => {
  // Map source hex → target theme value
  const map = [
    ["#0a5f3d", theme.primary],
    ["#0a3d29", theme.primary_dark],
    ["#084a30", theme.primary_darker],
    ["#167a51", theme.primary],
    ["#c99f3b", theme.accent],
    ["#b48c2b", theme.accent_dark],
    ["#8a6b1e", theme.accent_dark],
    ["#fff9e6", theme.cream_light],
    ["#f5f2ea", theme.cream_neutral],
    ["#fbfaf6", theme.cream_bg],
  ];

  const rules = [];
  for (const [src, tgt] of map) {
    if (!tgt) continue;
    const s = escHex(src);
    // Base utilities
    rules.push(`.bg-\\[${s}\\]{background-color:${tgt} !important}`);
    rules.push(`.text-\\[${s}\\]{color:${tgt} !important}`);
    rules.push(`.border-\\[${s}\\]{border-color:${tgt} !important}`);
    rules.push(`.ring-\\[${s}\\]{--tw-ring-color:${tgt} !important}`);
    rules.push(`.fill-\\[${s}\\]{fill:${tgt} !important}`);
    rules.push(`.stroke-\\[${s}\\]{stroke:${tgt} !important}`);
    rules.push(`.from-\\[${s}\\]{--tw-gradient-from:${tgt} var(--tw-gradient-from-position) !important;--tw-gradient-to:${tgt} var(--tw-gradient-to-position) !important;--tw-gradient-stops:var(--tw-gradient-from), var(--tw-gradient-to) !important}`);
    rules.push(`.to-\\[${s}\\]{--tw-gradient-to:${tgt} var(--tw-gradient-to-position) !important}`);
    rules.push(`.via-\\[${s}\\]{--tw-gradient-via:${tgt} !important;--tw-gradient-stops:var(--tw-gradient-from), ${tgt} var(--tw-gradient-via-position), var(--tw-gradient-to) !important}`);
    rules.push(`.decoration-\\[${s}\\]{text-decoration-color:${tgt} !important}`);

    // Hover variants
    rules.push(`.hover\\:bg-\\[${s}\\]:hover{background-color:${tgt} !important}`);
    rules.push(`.hover\\:text-\\[${s}\\]:hover{color:${tgt} !important}`);
    rules.push(`.hover\\:border-\\[${s}\\]:hover{border-color:${tgt} !important}`);
    rules.push(`.group:hover .group-hover\\:text-\\[${s}\\]{color:${tgt} !important}`);
    rules.push(`.group:hover .group-hover\\:bg-\\[${s}\\]{background-color:${tgt} !important}`);

    // Opacity variants using color-mix
    for (const o of OPACITIES) {
      const mix = `color-mix(in srgb, ${tgt} ${o}%, transparent)`;
      rules.push(`.bg-\\[${s}\\]\\/${o}{background-color:${mix} !important}`);
      rules.push(`.text-\\[${s}\\]\\/${o}{color:${mix} !important}`);
      rules.push(`.border-\\[${s}\\]\\/${o}{border-color:${mix} !important}`);
      rules.push(`.ring-\\[${s}\\]\\/${o}{--tw-ring-color:${mix} !important}`);
      rules.push(`.fill-\\[${s}\\]\\/${o}{fill:${mix} !important}`);
      rules.push(`.hover\\:bg-\\[${s}\\]\\/${o}:hover{background-color:${mix} !important}`);
      rules.push(`.hover\\:text-\\[${s}\\]\\/${o}:hover{color:${mix} !important}`);
    }
  }

  // Root body + selection color (from index.css)
  rules.push(`body{background:${theme.cream_bg} !important}`);
  rules.push(`::selection{background:${theme.primary} !important;color:${theme.cream_light} !important}`);

  return rules.join("\n");
};

// Returns the currently-active theme colors given the base theme + seasonal list.
// Seasonal windows are recurring yearly (MM-DD → MM-DD). Handles year-wraps.
export const resolveActiveTheme = (theme, now = new Date()) => {
  const base = { ...DEFAULT_THEME, ...(theme || {}) };
  if (!theme || theme.seasonal_enabled === false) return { colors: base, active: null };
  const list = Array.isArray(theme.seasonal_themes) ? theme.seasonal_themes : [];
  const m = now.getMonth() + 1; // 1-12
  const d = now.getDate();
  const todayNum = m * 100 + d; // e.g. Aug 15 → 815
  const matches = list.filter((s) => {
    if (!s || s.enabled === false) return false;
    const sm = Number(s.start_month) || 1, sd = Number(s.start_day) || 1;
    const em = Number(s.end_month) || sm, ed = Number(s.end_day) || sd;
    const startNum = sm * 100 + sd;
    const endNum = em * 100 + ed;
    if (startNum <= endNum) return todayNum >= startNum && todayNum <= endNum;
    // wrap around (e.g., Dec 28 → Jan 3)
    return todayNum >= startNum || todayNum <= endNum;
  });
  if (!matches.length) return { colors: base, active: null };
  // Higher priority number wins
  matches.sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0));
  const chosen = matches[0];
  const seasonalColors = {
    primary: chosen.primary || base.primary,
    primary_dark: chosen.primary_dark || base.primary_dark,
    primary_darker: chosen.primary_darker || base.primary_darker,
    accent: chosen.accent || base.accent,
    accent_dark: chosen.accent_dark || base.accent_dark,
    cream_light: chosen.cream_light || base.cream_light,
    cream_bg: chosen.cream_bg || base.cream_bg,
    cream_neutral: chosen.cream_neutral || base.cream_neutral,
  };
  return { colors: seasonalColors, active: chosen };
};

const ThemeVars = () => {
  const { content } = useContent();
  const { colors, active } = resolveActiveTheme(content.theme);

  useEffect(() => {
    const id = "jdps-theme-override";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = buildOverrides(colors);
  }, [colors.primary, colors.primary_dark, colors.primary_darker, colors.accent, colors.accent_dark, colors.cream_light, colors.cream_bg, colors.cream_neutral]);

  // Re-evaluate the seasonal window every hour so the palette flips at midnight without a reload
  useEffect(() => {
    const interval = setInterval(() => {
      const el = document.getElementById("jdps-theme-override");
      if (el) {
        const next = resolveActiveTheme(content.theme);
        el.textContent = buildOverrides(next.colors);
      }
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [content.theme]);

  // Signal to any UI that wants to display "🎉 Diwali theme active"
  useEffect(() => {
    if (active) {
      window.__jdpsActiveSeasonalTheme = active.name;
    } else {
      delete window.__jdpsActiveSeasonalTheme;
    }
  }, [active?.name]);

  return null;
};

export default ThemeVars;
