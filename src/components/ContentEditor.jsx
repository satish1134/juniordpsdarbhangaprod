import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Save, RotateCcw, Plus, Trash2, GripVertical, Upload, X, Image as ImageIcon, Ruler } from "lucide-react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { fetchContent, updateContent, resetContent, sendTestEnquiryEmail, resolveImageUrl } from "../lib/api";
import { THEME_PRESETS, DEFAULT_THEME } from "./ThemeVars";
import { useToast } from "../hooks/use-toast";
import { logError } from "../lib/logger";
import {
  LOGO_BOX_PX, NAME_SIZE_PX, TAGLINE_SIZE_PX, HERO_MIN_VH, GALLERY_ROW_PX,
  SIZE_OPTIONS_4, SIZE_OPTIONS_3, GALLERY_OPTIONS_3, LOGO_SHAPE_OPTIONS, LOGO_RADIUS_CLASS,
  NAME_COLOR_PRESETS, NAME_FONT_PRESETS, TAGLINE_CASE_OPTIONS, fontFamilyFor, pick,
} from "../lib/displaySizes";

// Reusable image picker: paste URL or upload file (compressed to <= ~500KB)
const ImagePicker = ({ value, onChange, aspect = "aspect-video" }) => {
  const { toast } = useToast();
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Compress image using canvas to keep base64 small
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1400;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        if (dataUrl.length > 900 * 1024) {
          toast({ title: "Image still large", description: "Try a smaller or shorter photo." });
        }
        onChange(dataUrl);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl h-10 text-[13px]"
          placeholder="Paste image URL or upload below"
        />
        <label className="cursor-pointer flex items-center justify-center h-10 px-3 rounded-xl bg-[#0a5f3d]/8 text-[#0a5f3d] text-[12.5px] font-semibold hover:bg-[#0a5f3d]/15 whitespace-nowrap">
          <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
      {value ? (
        <div className={`mt-2 relative rounded-xl overflow-hidden ${aspect} bg-[#f5f2ea]`}>
          <img src={resolveImageUrl(value)} alt="preview" className="w-full h-full object-cover" crossOrigin="anonymous" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className={`mt-2 rounded-xl border-2 border-dashed border-[#0a5f3d]/20 ${aspect} flex flex-col items-center justify-center text-[#0a5f3d]/50 text-[12px]`}>
          <ImageIcon className="w-6 h-6 mb-1" />
          No image
        </div>
      )}
    </div>
  );
};

const SectionShell = ({ title, subtitle, onSave, onReset, saving, children }) => (
  <div className="bg-white rounded-3xl border border-[#0a5f3d]/10 p-7">
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="font-display text-2xl font-bold text-[#0a3d29]">{title}</h3>
        {subtitle && <p className="text-[13px] text-[#1c2a24]/60 mt-1">{subtitle}</p>}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" onClick={onReset} className="rounded-full h-10 border-[#0a5f3d]/20 text-[#0a5f3d] hover:bg-[#0a5f3d]/8">
          <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reset
        </Button>
        <Button onClick={onSave} disabled={saving} className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-10 px-5 font-semibold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-2" /> Save</>}
        </Button>
      </div>
    </div>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">{label}</label>
    <div className="mt-1.5">{children}</div>
  </div>
);

// Size chooser with 3 or 4 pill options and a live preview number
const SizeChooser = ({ label, hint, value, onChange, options, previewMap, previewUnit = "px" }) => (
  <div className="bg-[#f5f2ea] rounded-2xl border border-[#0a5f3d]/10 p-5">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <div className="font-display text-[17px] font-semibold text-[#0a3d29]">{label}</div>
        {hint && <div className="text-[12px] text-[#1c2a24]/60 mt-1">{hint}</div>}
      </div>
      {previewMap && (
        <div className="text-right shrink-0">
          <div className="text-[10px] tracking-[0.2em] uppercase text-[#0a5f3d]/60 font-semibold">Preview</div>
          <div className="font-display text-lg font-bold text-[#0a3d29] mt-0.5">
            {previewMap[value] || previewMap.md}{previewUnit}
          </div>
        </div>
      )}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`h-11 rounded-full text-[13px] font-semibold border transition-all ${
            value === opt.key
              ? "bg-[#0a3d29] text-[#fff9e6] border-[#0a3d29] shadow-md shadow-[#0a3d29]/25"
              : "bg-white text-[#0a3d29] border-[#0a5f3d]/15 hover:border-[#0a5f3d]/40"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const move = (arr, from, to) => {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

// Generate a stable client-side id if the item doesn't already have one
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`);
const withId = (item) => (item && item._id ? item : { ...item, _id: uid() });
const withIds = (arr) => (Array.isArray(arr) ? arr.map(withId) : arr);

const ArrayCard = ({ index, total, onRemove, onMoveUp, onMoveDown, children }) => (
  <div className="bg-[#f5f2ea] rounded-2xl border border-[#0a5f3d]/10 p-5 relative">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-[#0a5f3d]">
        <GripVertical className="w-3.5 h-3.5" /> Item {index + 1} of {total}
      </div>
      <div className="flex gap-1">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="w-7 h-7 rounded-lg bg-white border border-[#0a5f3d]/15 text-[#0a5f3d] flex items-center justify-center text-[11px] hover:bg-[#0a5f3d]/8 disabled:opacity-30"
        >
          ↑
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="w-7 h-7 rounded-lg bg-white border border-[#0a5f3d]/15 text-[#0a5f3d] flex items-center justify-center text-[11px] hover:bg-[#0a5f3d]/8 disabled:opacity-30"
        >
          ↓
        </button>
        <button
          onClick={onRemove}
          className="w-7 h-7 rounded-lg bg-white border border-[#c0392b]/25 text-[#c0392b] flex items-center justify-center hover:bg-[#c0392b]/8"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

// Reusable intro editor for sections that share eyebrow / headline / accent / description
const IntroEditor = ({ label, sectionKey, value, onChange, onSave, hasDescription = true }) => (
  <div className="mb-6 bg-[#f5f2ea] rounded-2xl border border-[#0a5f3d]/10 p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="font-display text-[17px] font-semibold text-[#0a3d29]">{label}</div>
        <div className="text-[12px] text-[#1c2a24]/60 mt-1">Eyebrow, headline and description shown at the top of the section.</div>
      </div>
      <Button onClick={onSave} className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-9 px-4 text-[13px] font-semibold">
        <Save className="w-3.5 h-3.5 mr-2" /> Save intro
      </Button>
    </div>
    <div className="grid md:grid-cols-2 gap-3">
      <Field label="Eyebrow"><Input value={value.eyebrow || ""} onChange={(e) => onChange({ ...value, eyebrow: e.target.value })} className="h-10 rounded-xl" /></Field>
      <div className="hidden md:block" />
      <Field label="Headline — main"><Input value={value.title_main || ""} onChange={(e) => onChange({ ...value, title_main: e.target.value })} className="h-10 rounded-xl" /></Field>
      <Field label="Headline — accent (italic gold)"><Input value={value.title_accent || ""} onChange={(e) => onChange({ ...value, title_accent: e.target.value })} className="h-10 rounded-xl" /></Field>
      {hasDescription && (
        <div className="md:col-span-2">
          <Field label="Description"><Textarea rows={3} value={value.description || ""} onChange={(e) => onChange({ ...value, description: e.target.value })} className="rounded-xl" /></Field>
        </div>
      )}
    </div>
  </div>
);

const SECTIONS = [
  { key: "school_info", label: "School Info" },
  { key: "theme", label: "Theme Colors" },
  { key: "display", label: "Sizes & Display" },
  { key: "hero_slides", label: "Hero Slides" },
  { key: "stats", label: "Statistics" },
  { key: "marquee", label: "Scrolling Band" },
  { key: "about_highlights", label: "About" },
  { key: "principal", label: "Principal" },
  { key: "programs", label: "Academics" },
  { key: "facilities_list", label: "Facilities" },
  { key: "gallery", label: "Gallery" },
  { key: "testimonials", label: "Testimonials" },
  { key: "admission_steps", label: "Admissions" },
  { key: "fee_structure", label: "Fees" },
  { key: "calendar_events", label: "Calendar" },
  { key: "mobile_app", label: "Mobile App" },
  { key: "careers", label: "Careers" },
  { key: "mission_vision_purpose", label: "Mission / Vision / Purpose" },
  { key: "awards", label: "Awards" },
  { key: "transport_policies", label: "Transport" },
  { key: "brochure", label: "Brochure" },
  { key: "curriculum", label: "Curriculum" },
  { key: "current_notices", label: "Current Notices" },
  { key: "email_settings", label: "Email Alerts" },
  { key: "footer", label: "Footer & Socials" },
  { key: "privacy_policy", label: "Privacy Policy" },
  { key: "terms_of_use", label: "Terms of Use" },
];

// Icons available in the Facilities editor icon dropdown
const FACILITY_ICONS = [
  "MonitorPlay", "FlaskConical", "Laptop", "BookOpen", "Trophy", "Music",
  "Bus", "HeartPulse", "Utensils", "GraduationCap", "Palette", "Users",
  "Wifi", "ShieldCheck", "Building2", "TreePine", "Microscope", "Camera",
];

const ContentEditor = ({ onSaved }) => {
  const { toast } = useToast();
  const [tab, setTab] = useState("school_info");
  const [content, setContent] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetchContent();
      // Assign stable client-side ids to array items so React keys stay put across reorders
      const data = { ...r.data };
      ["hero_slides", "gallery", "testimonials", "fee_structure", "calendar_events",
       "about_highlights", "programs", "facilities_list", "admission_steps", "stats"].forEach((k) => {
        if (Array.isArray(data[k])) data[k] = withIds(data[k]);
      });
      // Nested arrays inside object sections
      if (data.mission_vision_purpose?.cards) data.mission_vision_purpose = { ...data.mission_vision_purpose, cards: withIds(data.mission_vision_purpose.cards) };
      if (data.awards?.items) data.awards = { ...data.awards, items: withIds(data.awards.items) };
      if (data.transport_policies?.policies) data.transport_policies = { ...data.transport_policies, policies: withIds(data.transport_policies.policies) };
      if (data.careers?.jobs) data.careers = { ...data.careers, jobs: withIds(data.careers.jobs) };
      if (data.theme?.seasonal_themes) data.theme = { ...data.theme, seasonal_themes: withIds(data.theme.seasonal_themes) };
      if (data.current_notices?.notices) data.current_notices = { ...data.current_notices, notices: withIds(data.current_notices.notices) };
      if (data.curriculum?.classes) data.curriculum = { ...data.curriculum, classes: withIds(data.curriculum.classes) };
      setContent(data);
    } catch (err) {
      logError("Failed to load content:", err);
      toast({ title: "Failed to load content", description: err.message });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (section, data) => {
    setSaving(true);
    try {
      await updateContent(section, data);
      toast({ title: "Saved", description: "Public site has been updated." });
      onSaved && onSaved();
      await load();
    } catch (err) {
      toast({ title: "Save failed", description: err?.response?.data?.detail || err.message });
    }
    setSaving(false);
  };

  const reset = async (section) => {
    if (!window.confirm(`Reset "${section}" back to the default content?`)) return;
    setSaving(true);
    try {
      await resetContent(section);
      toast({ title: "Reset to defaults" });
      onSaved && onSaved();
      await load();
    } catch (err) {
      toast({ title: "Reset failed", description: err.message });
    }
    setSaving(false);
  };

  const setSection = (key, updater) => {
    setContent((c) => {
      const cur = c[key];
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...c, [key]: next };
    });
  };

  if (!content) return <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin inline text-[#0a5f3d]" /></div>;

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key)}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold border transition ${
              tab === s.key
                ? "bg-[#0a3d29] text-[#fff9e6] border-[#0a3d29]"
                : "bg-white text-[#0a3d29] border-[#0a5f3d]/15 hover:border-[#0a5f3d]/40"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Display / Sizes */}
      {tab === "display" && (
        <SectionShell
          title="Sizes & Display"
          subtitle="Fine-tune how big the logo, school name and images appear on the public site."
          saving={saving}
          onSave={() => save("display", content.display || {})}
          onReset={() => reset("display")}
        >
          <div className="flex items-start gap-3 mb-6 p-4 rounded-2xl bg-[#c99f3b]/10 border border-[#c99f3b]/30 text-[13px] text-[#8a6b1e]">
            <Ruler className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              Pick a size for each element below and hit <strong>Save</strong>. Changes go live on the public site immediately.
              Extra Large is best for schools with short names — long names auto-wrap gracefully.
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <SizeChooser
              label="School Logo Size"
              hint="How large the logo tile appears in the header and footer."
              value={(content.display && content.display.logo_size) || "md"}
              onChange={(v) => setSection("display", (d) => ({ ...(d || {}), logo_size: v }))}
              options={SIZE_OPTIONS_4}
              previewMap={LOGO_BOX_PX}
            />
            <SizeChooser
              label="Logo Shape"
              hint="Square, rounded corners, or a perfect circle."
              value={(content.display && content.display.logo_shape) || "circle"}
              onChange={(v) => setSection("display", (d) => ({ ...(d || {}), logo_shape: v }))}
              options={LOGO_SHAPE_OPTIONS}
            />
            <SizeChooser
              label="School Name Font Size"
              hint="Font size of the school name shown in the header, footer and admin pages."
              value={(content.display && content.display.name_size) || "md"}
              onChange={(v) => setSection("display", (d) => ({ ...(d || {}), name_size: v }))}
              options={SIZE_OPTIONS_4}
              previewMap={NAME_SIZE_PX}
            />
            <SizeChooser
              label="Tagline Font Size"
              hint="Small text shown below the school name (e.g. 'Excellence in Education')."
              value={(content.display && content.display.tagline_size) || "md"}
              onChange={(v) => setSection("display", (d) => ({ ...(d || {}), tagline_size: v }))}
              options={SIZE_OPTIONS_4}
              previewMap={TAGLINE_SIZE_PX}
            />
            <SizeChooser
              label="Tagline Letter Case"
              hint="Show the tagline in ALL CAPS or use Normal Case."
              value={(content.display && content.display.tagline_case) || "upper"}
              onChange={(v) => setSection("display", (d) => ({ ...(d || {}), tagline_case: v }))}
              options={TAGLINE_CASE_OPTIONS}
            />
            {/* Name colour picker */}
            <div className="bg-[#f5f2ea] rounded-2xl border border-[#0a5f3d]/10 p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="font-display text-[17px] font-semibold text-[#0a3d29]">School Name Colour</div>
                  <div className="text-[12px] text-[#1c2a24]/60 mt-1">Colour of the school name text in the header.</div>
                </div>
                <div
                  className="w-11 h-11 rounded-xl border-2 border-white shadow"
                  style={{ backgroundColor: (content.display && content.display.name_color) || "#0a3d29" }}
                />
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {NAME_COLOR_PRESETS.map((p) => (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => setSection("display", (d) => ({ ...(d || {}), name_color: p.color }))}
                    className={`flex items-center gap-2 px-3 h-9 rounded-full text-[12px] font-semibold border transition-all ${
                      ((content.display && content.display.name_color) || "#0a3d29").toLowerCase() === p.color.toLowerCase()
                        ? "bg-white border-[#0a3d29] shadow"
                        : "bg-white/70 border-[#0a5f3d]/15 hover:border-[#0a5f3d]/40"
                    }`}
                    title={p.label}
                  >
                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(content.display && content.display.name_color) || "#0a3d29"}
                  onChange={(e) => setSection("display", (d) => ({ ...(d || {}), name_color: e.target.value }))}
                  className="w-11 h-11 rounded-lg border border-[#0a5f3d]/20 cursor-pointer bg-white"
                />
                <Input
                  value={(content.display && content.display.name_color) || "#0a3d29"}
                  onChange={(e) => setSection("display", (d) => ({ ...(d || {}), name_color: e.target.value }))}
                  className="h-11 rounded-xl uppercase"
                  placeholder="#0a3d29"
                />
              </div>
            </div>
            {/* Font style chooser */}
            <div className="bg-[#f5f2ea] rounded-2xl border border-[#0a5f3d]/10 p-5 md:col-span-2">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="font-display text-[17px] font-semibold text-[#0a3d29]">School Name Font Style</div>
                  <div className="text-[12px] text-[#1c2a24]/60 mt-1">Pick a typeface for your school name. Each option is previewed in its actual font.</div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {NAME_FONT_PRESETS.map((f) => {
                  const active = ((content.display && content.display.name_font) || "fraunces") === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setSection("display", (d) => ({ ...(d || {}), name_font: f.key }))}
                      className={`rounded-2xl border transition-all px-4 py-3 text-left ${
                        active
                          ? "bg-white border-[#0a3d29] shadow-md shadow-[#0a3d29]/20"
                          : "bg-white/70 border-[#0a5f3d]/15 hover:border-[#0a5f3d]/40"
                      }`}
                    >
                      <div className="text-[10px] tracking-[0.2em] uppercase text-[#0a5f3d]/70 font-semibold">{f.label}</div>
                      <div
                        className="mt-1 text-[22px] font-bold text-[#0a3d29] leading-tight truncate"
                        style={{ fontFamily: f.family }}
                      >
                        {content.school_info?.name || "Junior DPS"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <SizeChooser
              label="Hero Section Height"
              hint="How tall the hero (top) section is on the home page."
              value={(content.display && content.display.hero_height) || "md"}
              onChange={(v) => setSection("display", (d) => ({ ...(d || {}), hero_height: v }))}
              options={SIZE_OPTIONS_3}
              previewMap={HERO_MIN_VH}
              previewUnit="vh"
            />
            <SizeChooser
              label="Gallery Photo Size"
              hint="Row height of the photo gallery grid on the home page."
              value={(content.display && content.display.gallery_size) || "md"}
              onChange={(v) => setSection("display", (d) => ({ ...(d || {}), gallery_size: v }))}
              options={GALLERY_OPTIONS_3}
              previewMap={GALLERY_ROW_PX}
            />
          </div>

          {/* Live mini preview */}
          <div className="mt-8 p-6 rounded-2xl border border-[#0a5f3d]/10 bg-white">
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/60 font-semibold mb-3">Live Preview — Header Brand</div>
            <div className="flex items-center gap-3">
              {content.school_info?.logo ? (
                <div
                  className={`${LOGO_RADIUS_CLASS[(content.display || {}).logo_shape] || LOGO_RADIUS_CLASS.circle} bg-white shadow border border-[#0a5f3d]/10 flex items-center justify-center overflow-hidden p-1`}
                  style={{ width: pick(LOGO_BOX_PX, content.display?.logo_size), height: pick(LOGO_BOX_PX, content.display?.logo_size) }}
                >
                  <img
                    src={content.school_info.logo}
                    alt="Logo"
                    className={`w-full h-full object-cover ${LOGO_RADIUS_CLASS[(content.display || {}).logo_shape] || LOGO_RADIUS_CLASS.circle}`}
                  />
                </div>
              ) : (
                <div
                  className={`${LOGO_RADIUS_CLASS[(content.display || {}).logo_shape] || LOGO_RADIUS_CLASS.circle} bg-[#0a5f3d] flex items-center justify-center text-[#fff9e6] font-display font-bold`}
                  style={{
                    width: pick(LOGO_BOX_PX, content.display?.logo_size),
                    height: pick(LOGO_BOX_PX, content.display?.logo_size),
                    fontSize: pick(LOGO_BOX_PX, content.display?.logo_size) * 0.4,
                  }}
                >
                  JD
                </div>
              )}
              <div className="leading-tight">
                <div
                  className="font-bold tracking-tight"
                  style={{
                    fontSize: pick(NAME_SIZE_PX, content.display?.name_size),
                    lineHeight: 1.05,
                    color: (content.display && content.display.name_color) || "#0a3d29",
                    fontFamily: fontFamilyFor(content.display?.name_font),
                  }}
                >
                  {content.school_info?.name || "Junior DPS Darbhanga"}
                </div>
                {content.school_info?.tagline && (
                  <div
                    className="tracking-[0.22em] text-[#0a5f3d]/70 font-semibold mt-1"
                    style={{
                      fontSize: pick(TAGLINE_SIZE_PX, content.display?.tagline_size || content.display?.name_size),
                      textTransform: content.display?.tagline_case === "normal" ? "none" : "uppercase",
                    }}
                  >
                    {content.school_info.tagline}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionShell>
      )}

      {/* Theme Colors */}
      {tab === "theme" && (
        <SectionShell
          title="Theme Colors"
          subtitle="Pick a preset palette or fine-tune each slot. Changes apply across the entire site instantly after Save."
          saving={saving}
          onSave={() => save("theme", content.theme || DEFAULT_THEME)}
          onReset={() => reset("theme")}
        >
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Presets</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {THEME_PRESETS.map((p) => {
              const active = (content.theme?.preset || "emerald_gold") === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  data-testid={`theme-preset-${p.key}`}
                  onClick={() => setSection("theme", () => ({ preset: p.key, ...p.colors }))}
                  className={`text-left rounded-2xl border p-4 transition ${active ? "border-[#0a5f3d] ring-2 ring-[#0a5f3d]/25" : "border-[#0a5f3d]/15 hover:border-[#0a5f3d]/40"} bg-white`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {["primary", "primary_dark", "accent", "accent_dark", "cream_light", "cream_bg"].map((k) => (
                      <span key={k} className="w-6 h-6 rounded-full border border-black/10" style={{ background: p.colors[k] }} />
                    ))}
                  </div>
                  <div className="font-semibold text-[13.5px] text-[#0a3d29]">{p.label}</div>
                  {active && <div className="mt-1 text-[11px] tracking-widest uppercase text-[#c99f3b] font-bold">Active</div>}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Custom colors</div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { key: "primary", label: "Primary (main green)" },
              { key: "primary_dark", label: "Primary dark (hero / headings background)" },
              { key: "primary_darker", label: "Primary darker (button hover)" },
              { key: "accent", label: "Accent (gold highlight)" },
              { key: "accent_dark", label: "Accent dark (dark accent text)" },
              { key: "cream_light", label: "Cream light (text on dark bg)" },
              { key: "cream_bg", label: "Page background" },
              { key: "cream_neutral", label: "Secondary background" },
            ].map((slot) => (
              <Field key={slot.key} label={slot.label}>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={content.theme?.[slot.key] || DEFAULT_THEME[slot.key]}
                    onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), [slot.key]: e.target.value, preset: "custom" }))}
                    className="w-12 h-11 rounded-xl border border-[#0a5f3d]/20 cursor-pointer"
                    data-testid={`theme-picker-${slot.key}`}
                  />
                  <Input
                    value={content.theme?.[slot.key] || DEFAULT_THEME[slot.key]}
                    onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), [slot.key]: e.target.value, preset: "custom" }))}
                    className="h-11 rounded-xl font-mono uppercase text-[13px]"
                    placeholder="#0a5f3d"
                  />
                </div>
              </Field>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-[#c99f3b]/10 border border-[#c99f3b]/30 text-[12.5px] text-[#8a6b1e] leading-relaxed">
            <b>Live preview:</b> the palette bar below reflects the currently-picked colors. Click <b>Save</b> to publish them across every page. Use <b>Reset</b> to restore the original Emerald &amp; Gold palette.
          </div>
          <div className="mt-3 flex items-center gap-2 p-4 rounded-2xl bg-white border border-[#0a5f3d]/15">
            {["primary", "primary_dark", "primary_darker", "accent", "accent_dark", "cream_light", "cream_bg", "cream_neutral"].map((k) => (
              <div key={k} className="flex flex-col items-center gap-1 flex-1">
                <span className="w-10 h-10 rounded-full border border-black/10 shadow-sm" style={{ background: content.theme?.[k] || DEFAULT_THEME[k] }} />
                <span className="text-[10.5px] text-[#1c2a24]/60 font-mono uppercase">{content.theme?.[k] || DEFAULT_THEME[k]}</span>
              </div>
            ))}
          </div>

          {/* Seasonal Themes */}
          <div className="mt-10 pt-8 border-t border-[#0a5f3d]/10">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-[#0a3d29]">Seasonal Themes</h3>
                <p className="text-[13.5px] text-[#1c2a24]/65 mt-1 max-w-2xl">Auto-swap the palette to a festive one on specific dates every year (Diwali, Independence Day, Founder's Day, etc.). Overrides the base palette while the window is active.</p>
              </div>
              <label className="flex items-center gap-2 shrink-0 mt-2 text-[13px] text-[#0a3d29] font-semibold">
                <input
                  type="checkbox"
                  checked={content.theme?.seasonal_enabled !== false}
                  onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), seasonal_enabled: e.target.checked }))}
                  className="w-4 h-4"
                  data-testid="seasonal-enabled-toggle"
                />
                <span>{content.theme?.seasonal_enabled !== false ? "Enabled" : "Disabled"}</span>
              </label>
            </div>

            <div className="space-y-3">
              {(content.theme?.seasonal_themes || []).map((s, i, arr) => (
                <ArrayCard
                  key={s._id || i}
                  index={i}
                  total={arr.length}
                  onRemove={() => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: (x?.seasonal_themes || []).filter((_, k) => k !== i) }))}
                  onMoveUp={() => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: move(x?.seasonal_themes || [], i, i - 1) }))}
                  onMoveDown={() => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: move(x?.seasonal_themes || [], i, i + 1) }))}
                >
                  <div className="grid md:grid-cols-4 gap-3 items-end">
                    <div className="md:col-span-2">
                      <Field label="Festival name">
                        <Input
                          value={s.name || ""}
                          onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: (x?.seasonal_themes || []).map((it, k) => k === i ? { ...it, name: e.target.value } : it) }))}
                          className="h-10 rounded-xl"
                          placeholder="Diwali"
                        />
                      </Field>
                    </div>
                    <Field label="Priority (higher wins)">
                      <Input
                        type="number"
                        value={s.priority ?? 0}
                        onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: (x?.seasonal_themes || []).map((it, k) => k === i ? { ...it, priority: Number(e.target.value) } : it) }))}
                        className="h-10 rounded-xl"
                      />
                    </Field>
                    <label className="flex items-center gap-2 pb-2 text-[13px] font-semibold text-[#0a3d29]">
                      <input
                        type="checkbox"
                        checked={s.enabled !== false}
                        onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: (x?.seasonal_themes || []).map((it, k) => k === i ? { ...it, enabled: e.target.checked } : it) }))}
                        className="w-4 h-4"
                      />
                      Enabled
                    </label>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Start month">
                      <Input type="number" min="1" max="12" value={s.start_month ?? ""} onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: (x?.seasonal_themes || []).map((it, k) => k === i ? { ...it, start_month: Number(e.target.value) } : it) }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Start day">
                      <Input type="number" min="1" max="31" value={s.start_day ?? ""} onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: (x?.seasonal_themes || []).map((it, k) => k === i ? { ...it, start_day: Number(e.target.value) } : it) }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="End month">
                      <Input type="number" min="1" max="12" value={s.end_month ?? ""} onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: (x?.seasonal_themes || []).map((it, k) => k === i ? { ...it, end_month: Number(e.target.value) } : it) }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="End day">
                      <Input type="number" min="1" max="31" value={s.end_day ?? ""} onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: (x?.seasonal_themes || []).map((it, k) => k === i ? { ...it, end_day: Number(e.target.value) } : it) }))} className="h-10 rounded-xl" />
                    </Field>
                  </div>

                  <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mt-1">Festive palette</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { k: "primary", label: "Primary" },
                      { k: "primary_dark", label: "Primary dark" },
                      { k: "primary_darker", label: "Primary darker" },
                      { k: "accent", label: "Accent" },
                      { k: "accent_dark", label: "Accent dark" },
                      { k: "cream_light", label: "Cream light" },
                      { k: "cream_bg", label: "Page bg" },
                      { k: "cream_neutral", label: "Secondary bg" },
                    ].map(({ k, label }) => (
                      <Field key={k} label={label}>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={s[k] || DEFAULT_THEME[k]}
                            onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: (x?.seasonal_themes || []).map((it, kk) => kk === i ? { ...it, [k]: e.target.value } : it) }))}
                            className="w-10 h-10 rounded-lg border border-[#0a5f3d]/20 cursor-pointer shrink-0"
                          />
                          <Input
                            value={s[k] || DEFAULT_THEME[k]}
                            onChange={(e) => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: (x?.seasonal_themes || []).map((it, kk) => kk === i ? { ...it, [k]: e.target.value } : it) }))}
                            className="h-10 rounded-xl font-mono text-[12px] uppercase"
                          />
                        </div>
                      </Field>
                    ))}
                  </div>
                </ArrayCard>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => setSection("theme", (x) => ({ ...(x || {}), seasonal_themes: [...((x?.seasonal_themes) || []), { _id: uid(), name: "New Festival", enabled: true, start_month: 1, start_day: 1, end_month: 1, end_day: 1, priority: 0, ...DEFAULT_THEME }] }))}
              className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Festival
            </Button>

            <div className="mt-4 text-[12px] text-[#1c2a24]/60 leading-relaxed">
              Dates use MM/DD and recur yearly. For festivals like Diwali whose dates shift each year, update the range before the festival window each year. Priority breaks ties when two windows overlap — higher number wins.
            </div>
          </div>
        </SectionShell>
      )}

      {/* School Info */}
      {tab === "school_info" && (
        <SectionShell
          title="School Info"
          subtitle="Logo, name, address, phone, email — appears in header, footer and contact page."
          saving={saving}
          onSave={() => save("school_info", content.school_info)}
          onReset={() => reset("school_info")}
        >
          <div className="mb-6">
            <Field label="School Logo (transparent PNG recommended)">
              <div className="grid md:grid-cols-[220px_1fr] gap-5 items-start">
                <div className="w-full">
                  <ImagePicker
                    value={content.school_info.logo || ""}
                    onChange={(v) => setSection("school_info", (s) => ({ ...s, logo: v }))}
                    aspect="aspect-square"
                  />
                </div>
                <div className="text-[13px] text-[#1c2a24]/65 leading-relaxed pt-2">
                  <p>Upload your school logo — it will appear next to the school name in the header, footer, admin login and back-to-top brand block.</p>
                  <p className="mt-2">Ideal size: square (e.g. 512×512 px). PNG with transparent background looks best. Leave empty to use the default graduation-cap icon.</p>
                </div>
              </div>
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[
              ["name", "School Name"],
              ["tagline", "Tagline"],
              ["fullName", "Full Name"],
              ["affiliation", "Affiliation"],
              ["hero_eyebrow", "Hero Pill (top of home page)"],
              ["phone", "Primary Phone"],
              ["altPhone", "Alt Phone"],
              ["email", "Email"],
              ["timings", "School Timings"],
              ["cbse_number", "CBSE Affiliation No."],
              ["udise_number", "UDISE Number"],
            ].map(([k, l]) => (
              <Field key={k} label={l}>
                <Input
                  value={content.school_info[k] || ""}
                  onChange={(e) => setSection("school_info", (s) => ({ ...s, [k]: e.target.value }))}
                  className="h-11 rounded-xl"
                />
              </Field>
            ))}
            <div className="md:col-span-2">
              <Field label="Address">
                <Textarea
                  rows={2}
                  value={content.school_info.address || ""}
                  onChange={(e) => setSection("school_info", (s) => ({ ...s, address: e.target.value }))}
                  className="rounded-xl"
                />
              </Field>
            </div>
          </div>
        </SectionShell>
      )}

      {/* Hero Slides */}
      {tab === "hero_slides" && (
        <SectionShell
          title="Hero Slides"
          subtitle="The rotating photos and headlines at the top of the home page."
          saving={saving}
          onSave={() => save("hero_slides", content.hero_slides)}
          onReset={() => reset("hero_slides")}
        >
          {/* Hero intro editor */}
          <div className="mb-6 bg-[#f5f2ea] rounded-2xl border border-[#0a5f3d]/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display text-[17px] font-semibold text-[#0a3d29]">Hero Headline & Description</div>
                <div className="text-[12px] text-[#1c2a24]/60 mt-1">Large headline, description paragraph and button labels shown on the left of the hero.</div>
              </div>
              <Button
                onClick={() => save("hero_intro", content.hero_intro || {})}
                className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-9 px-4 text-[13px] font-semibold"
              >
                <Save className="w-3.5 h-3.5 mr-2" /> Save intro
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Headline — main line">
                <Input
                  value={content.hero_intro?.title_main || ""}
                  onChange={(e) => setSection("hero_intro", (x) => ({ ...(x || {}), title_main: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="Where curiosity"
                />
              </Field>
              <Field label="Headline — accent line (gradient)">
                <Input
                  value={content.hero_intro?.title_accent || ""}
                  onChange={(e) => setSection("hero_intro", (x) => ({ ...(x || {}), title_accent: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="meets excellence."
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Description paragraph">
                  <Textarea
                    rows={3}
                    value={content.hero_intro?.description || ""}
                    onChange={(e) => setSection("hero_intro", (x) => ({ ...(x || {}), description: e.target.value }))}
                    className="rounded-xl"
                  />
                </Field>
              </div>
              <Field label="Primary button label">
                <Input
                  value={content.hero_intro?.cta_primary || ""}
                  onChange={(e) => setSection("hero_intro", (x) => ({ ...(x || {}), cta_primary: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="Book a Campus Visit"
                />
              </Field>
              <Field label="Secondary link label">
                <Input
                  value={content.hero_intro?.cta_secondary || ""}
                  onChange={(e) => setSection("hero_intro", (x) => ({ ...(x || {}), cta_secondary: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="Discover our story"
                />
              </Field>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Hero Photo Slides</div>
          <div className="space-y-4">
            {(content.hero_slides || []).map((s, i, arr) => (
              <ArrayCard
                key={s._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("hero_slides", (x) => x.filter((_, k) => k !== i))}
                onMoveUp={() => setSection("hero_slides", (x) => move(x, i, i - 1))}
                onMoveDown={() => setSection("hero_slides", (x) => move(x, i, i + 1))}
              >
                <Field label="Image">
                  <ImagePicker
                    value={s.image}
                    onChange={(v) => setSection("hero_slides", (x) => x.map((it, k) => (k === i ? { ...it, image: v } : it)))}
                    aspect="aspect-[16/8]"
                  />
                </Field>
                <Field label="Title">
                  <Input
                    value={s.title || ""}
                    onChange={(e) => setSection("hero_slides", (x) => x.map((it, k) => (k === i ? { ...it, title: e.target.value } : it)))}
                    className="h-11 rounded-xl"
                  />
                </Field>
                <Field label="Subtitle">
                  <Textarea
                    rows={2}
                    value={s.subtitle || ""}
                    onChange={(e) => setSection("hero_slides", (x) => x.map((it, k) => (k === i ? { ...it, subtitle: e.target.value } : it)))}
                    className="rounded-xl"
                  />
                </Field>
              </ArrayCard>
            ))}
            <Button
              variant="outline"
              onClick={() => setSection("hero_slides", (x) => [...x, { _id: uid(), image: "", title: "New Slide", subtitle: "" }])}
              className="rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Slide
            </Button>
          </div>
        </SectionShell>
      )}

      {/* Principal */}
      {tab === "principal" && (
        <SectionShell
          title="Principal's Message"
          subtitle="Shown in the About section on the home page."
          saving={saving}
          onSave={() => save("principal", content.principal)}
          onReset={() => reset("principal")}
        >
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Field label="Photo">
                <ImagePicker
                  value={content.principal.photo}
                  onChange={(v) => setSection("principal", (p) => ({ ...p, photo: v }))}
                  aspect="aspect-[4/5]"
                />
              </Field>
            </div>
            <div className="space-y-4">
              <Field label="Name">
                <Input
                  value={content.principal.name || ""}
                  onChange={(e) => setSection("principal", (p) => ({ ...p, name: e.target.value }))}
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label="Title / Designation">
                <Input
                  value={content.principal.title || ""}
                  onChange={(e) => setSection("principal", (p) => ({ ...p, title: e.target.value }))}
                  className="h-11 rounded-xl"
                />
              </Field>
              <Field label="Message">
                <Textarea
                  rows={9}
                  value={content.principal.message || ""}
                  onChange={(e) => setSection("principal", (p) => ({ ...p, message: e.target.value }))}
                  className="rounded-xl"
                />
              </Field>
            </div>
          </div>
        </SectionShell>
      )}

      {/* Gallery */}
      {tab === "gallery" && (
        <SectionShell
          title="Photo Gallery"
          subtitle="Section intro plus the photos shown in the 'Life at School' grid."
          saving={saving}
          onSave={() => save("gallery", content.gallery)}
          onReset={() => reset("gallery")}
        >
          <IntroEditor
            label="Section Intro"
            sectionKey="gallery_intro"
            value={content.gallery_intro || {}}
            onChange={(v) => setSection("gallery_intro", () => v)}
            onSave={() => save("gallery_intro", content.gallery_intro || {})}
            hasDescription={false}
          />
          <div className="text-[12.5px] text-[#1c2a24]/60 mb-3">
            Tip: The filter chips (All, Events, Academics, Library, Sports…) come from the <strong>Tag</strong> field of each photo below. Change or add a tag to instantly get a new filter chip on the site.
          </div>
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Photos</div>
          <div className="grid md:grid-cols-2 gap-4">
            {(content.gallery || []).map((g, i, arr) => (
              <ArrayCard
                key={g._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("gallery", (x) => x.filter((_, k) => k !== i))}
                onMoveUp={() => setSection("gallery", (x) => move(x, i, i - 1))}
                onMoveDown={() => setSection("gallery", (x) => move(x, i, i + 1))}
              >
                <Field label="Photo">
                  <ImagePicker
                    value={g.src}
                    onChange={(v) => setSection("gallery", (x) => x.map((it, k) => (k === i ? { ...it, src: v } : it)))}
                    aspect="aspect-[4/3]"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Caption">
                    <Input
                      value={g.caption || ""}
                      onChange={(e) => setSection("gallery", (x) => x.map((it, k) => (k === i ? { ...it, caption: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                    />
                  </Field>
                  <Field label="Tag">
                    <Input
                      value={g.tag || ""}
                      onChange={(e) => setSection("gallery", (x) => x.map((it, k) => (k === i ? { ...it, tag: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                      placeholder="e.g. Sports"
                    />
                  </Field>
                </div>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("gallery", (x) => [...x, { _id: uid(), src: "", caption: "New photo", tag: "Events" }])}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Photo
          </Button>
        </SectionShell>
      )}

      {/* Testimonials */}
      {tab === "testimonials" && (
        <SectionShell
          title="Testimonials"
          subtitle="Quotes from parents, students and alumni shown on the home page."
          saving={saving}
          onSave={() => save("testimonials", content.testimonials)}
          onReset={() => reset("testimonials")}
        >
          <div className="grid md:grid-cols-2 gap-4">
            {(content.testimonials || []).map((t, i, arr) => (
              <ArrayCard
                key={t._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("testimonials", (x) => x.filter((_, k) => k !== i))}
                onMoveUp={() => setSection("testimonials", (x) => move(x, i, i - 1))}
                onMoveDown={() => setSection("testimonials", (x) => move(x, i, i + 1))}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name">
                    <Input
                      value={t.name || ""}
                      onChange={(e) => setSection("testimonials", (x) => x.map((it, k) => (k === i ? { ...it, name: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                    />
                  </Field>
                  <Field label="Role">
                    <Input
                      value={t.role || ""}
                      onChange={(e) => setSection("testimonials", (x) => x.map((it, k) => (k === i ? { ...it, role: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                      placeholder="Parent, Class IV"
                    />
                  </Field>
                </div>
                <Field label="Quote">
                  <Textarea
                    rows={4}
                    value={t.quote || ""}
                    onChange={(e) => setSection("testimonials", (x) => x.map((it, k) => (k === i ? { ...it, quote: e.target.value } : it)))}
                    className="rounded-xl"
                  />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("testimonials", (x) => [...x, { _id: uid(), name: "New Parent", role: "Parent", quote: "" }])}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Testimonial
          </Button>
        </SectionShell>
      )}

      {/* Fees */}
      {tab === "fee_structure" && (
        <SectionShell
          title="Fee Structure"
          subtitle="Section intro, class-wise fee amounts, policy notes and payment methods block on the /fees page."
          saving={saving}
          onSave={() => save("fee_structure", content.fee_structure)}
          onReset={() => reset("fee_structure")}
        >
          {/* Intro + Notes + Payment editor */}
          <div className="mb-6 bg-[#f5f2ea] rounded-2xl border border-[#0a5f3d]/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display text-[17px] font-semibold text-[#0a3d29]">Intro, Policy Notes & Payment Methods</div>
                <div className="text-[12px] text-[#1c2a24]/60 mt-1">Everything on the /fees page except the class-wise table below.</div>
              </div>
              <Button
                onClick={() => save("fees_extras", content.fees_extras || {})}
                className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-9 px-4 text-[13px] font-semibold"
              >
                <Save className="w-3.5 h-3.5 mr-2" /> Save extras
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Eyebrow"><Input value={content.fees_extras?.eyebrow || ""} onChange={(e) => setSection("fees_extras", (x) => ({ ...(x || {}), eyebrow: e.target.value }))} className="h-10 rounded-xl" /></Field>
              <div />
              <Field label="Headline — main"><Input value={content.fees_extras?.title_main || ""} onChange={(e) => setSection("fees_extras", (x) => ({ ...(x || {}), title_main: e.target.value }))} className="h-10 rounded-xl" /></Field>
              <Field label="Headline — accent (italic gold)"><Input value={content.fees_extras?.title_accent || ""} onChange={(e) => setSection("fees_extras", (x) => ({ ...(x || {}), title_accent: e.target.value }))} className="h-10 rounded-xl" /></Field>
              <div className="md:col-span-2">
                <Field label="Intro paragraph"><Textarea rows={3} value={content.fees_extras?.intro || ""} onChange={(e) => setSection("fees_extras", (x) => ({ ...(x || {}), intro: e.target.value }))} className="rounded-xl" /></Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Policy Notes Card — Title"><Input value={content.fees_extras?.notes_title || ""} onChange={(e) => setSection("fees_extras", (x) => ({ ...(x || {}), notes_title: e.target.value }))} className="h-10 rounded-xl" /></Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Policy Notes (one per line)">
                  <Textarea
                    rows={6}
                    value={((content.fees_extras && content.fees_extras.notes) || []).join("\n")}
                    onChange={(e) => setSection("fees_extras", (x) => ({ ...(x || {}), notes: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }))}
                    className="rounded-xl"
                    placeholder={"Admission fee is a one-time payment...\nTuition fee is billed monthly..."}
                  />
                </Field>
              </div>
              <Field label="Payment Card — Title"><Input value={content.fees_extras?.payment_title || ""} onChange={(e) => setSection("fees_extras", (x) => ({ ...(x || {}), payment_title: e.target.value }))} className="h-10 rounded-xl" /></Field>
              <Field label="Payment Card — Button Label"><Input value={content.fees_extras?.payment_cta || ""} onChange={(e) => setSection("fees_extras", (x) => ({ ...(x || {}), payment_cta: e.target.value }))} className="h-10 rounded-xl" /></Field>
              <div className="md:col-span-2">
                <Field label="Payment Card — Description"><Textarea rows={3} value={content.fees_extras?.payment_body || ""} onChange={(e) => setSection("fees_extras", (x) => ({ ...(x || {}), payment_body: e.target.value }))} className="rounded-xl" /></Field>
              </div>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Class-wise Fee Table</div>
          <div className="space-y-3">
            {(content.fee_structure || []).map((r, i, arr) => (
              <ArrayCard
                key={r._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("fee_structure", (x) => x.filter((_, k) => k !== i))}
                onMoveUp={() => setSection("fee_structure", (x) => move(x, i, i - 1))}
                onMoveDown={() => setSection("fee_structure", (x) => move(x, i, i + 1))}
              >
                <div className="grid md:grid-cols-5 gap-3">
                  <div className="md:col-span-1">
                    <Field label="Class">
                      <Input
                        value={r.class || ""}
                        onChange={(e) => setSection("fee_structure", (x) => x.map((it, k) => (k === i ? { ...it, class: e.target.value } : it)))}
                        className="h-10 rounded-xl"
                      />
                    </Field>
                  </div>
                  {[
                    ["admission", "Admission (₹)"],
                    ["annual", "Annual (₹)"],
                    ["tuition", "Tuition/mo (₹)"],
                    ["transport", "Transport (₹)"],
                  ].map(([k, l]) => (
                    <Field key={k} label={l}>
                      <Input
                        type="number"
                        value={r[k] ?? 0}
                        onChange={(e) => setSection("fee_structure", (x) => x.map((it, kk) => (kk === i ? { ...it, [k]: Number(e.target.value) } : it)))}
                        className="h-10 rounded-xl"
                      />
                    </Field>
                  ))}
                </div>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("fee_structure", (x) => [...x, { _id: uid(), class: "New Class", admission: 0, annual: 0, tuition: 0, transport: 0 }])}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Class Row
          </Button>
        </SectionShell>
      )}

      {/* Calendar */}
      {tab === "calendar_events" && (
        <SectionShell
          title="School Calendar"
          subtitle="Events shown on the /calendar page. Types: Academic, Holiday, Break, Event, Exam."
          saving={saving}
          onSave={() => save("calendar_events", content.calendar_events)}
          onReset={() => reset("calendar_events")}
        >
          <div className="space-y-3">
            {(content.calendar_events || []).map((ev, i, arr) => (
              <ArrayCard
                key={ev._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("calendar_events", (x) => x.filter((_, k) => k !== i))}
                onMoveUp={() => setSection("calendar_events", (x) => move(x, i, i - 1))}
                onMoveDown={() => setSection("calendar_events", (x) => move(x, i, i + 1))}
              >
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="Date (YYYY-MM-DD)">
                    <Input
                      type="date"
                      value={ev.date || ""}
                      onChange={(e) => setSection("calendar_events", (x) => x.map((it, k) => (k === i ? { ...it, date: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                    />
                  </Field>
                  <Field label="Type">
                    <select
                      value={ev.type || "Event"}
                      onChange={(e) => setSection("calendar_events", (x) => x.map((it, k) => (k === i ? { ...it, type: e.target.value } : it)))}
                      className="h-10 rounded-xl w-full border border-[#0a5f3d]/15 bg-white px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0a5f3d]"
                    >
                      {["Academic", "Holiday", "Break", "Event", "Exam"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Title">
                    <Input
                      value={ev.title || ""}
                      onChange={(e) => setSection("calendar_events", (x) => x.map((it, k) => (k === i ? { ...it, title: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                    />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea
                    rows={2}
                    value={ev.desc || ""}
                    onChange={(e) => setSection("calendar_events", (x) => x.map((it, k) => (k === i ? { ...it, desc: e.target.value } : it)))}
                    className="rounded-xl"
                  />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("calendar_events", (x) => [...x, { _id: uid(), date: new Date().toISOString().slice(0, 10), title: "New Event", type: "Event", desc: "" }])}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </Button>
        </SectionShell>
      )}

      {/* Marquee Band */}
      {tab === "marquee" && (
        <SectionShell
          title="Scrolling Band (Marquee)"
          subtitle="The dark green band right below the hero with continuously scrolling highlight text."
          saving={saving}
          onSave={() => save("marquee", content.marquee || {})}
          onReset={() => reset("marquee")}
        >
          <div className="text-[13px] text-[#1c2a24]/70 mb-4 leading-relaxed">
            Add one highlight per line — each item scrolls across the dark green band on the home page.
            Tip: keep each item short (2–4 words) so the band stays elegant.
          </div>
          <Field label="Highlights (one per line)">
            <Textarea
              rows={10}
              value={((content.marquee && content.marquee.items) || []).join("\n")}
              onChange={(e) => setSection("marquee", (m) => ({ ...(m || {}), items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }))}
              className="rounded-xl font-mono text-[14px]"
              placeholder={"CBSE Affiliated\nNursery – Class X\nAir-Conditioned Campus\n24×7 CCTV Surveillance"}
            />
          </Field>
          <div className="mt-6">
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Live Preview</div>
            <div className="bg-[#0a3d29] text-[#fff9e6] py-4 rounded-xl overflow-hidden">
              <div className="flex flex-wrap items-center gap-x-10 gap-y-2 px-6">
                {((content.marquee && content.marquee.items) || []).map((b, i) => (
                  <span key={i} className="font-display text-lg italic flex items-center gap-4">
                    {b}
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c99f3b]" />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </SectionShell>
      )}

      {/* Statistics */}
      {tab === "stats" && (
        <SectionShell
          title="Statistics"
          subtitle="Numbers shown in the hero trust-row (first 3), the About counter strip, and the floating hero badge."
          saving={saving}
          onSave={() => save("stats", content.stats)}
          onReset={() => reset("stats")}
        >
          {/* Hero floating badge */}
          <div className="mb-6 bg-[#f5f2ea] rounded-2xl border border-[#0a5f3d]/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display text-[17px] font-semibold text-[#0a3d29]">Hero Floating Badge</div>
                <div className="text-[12px] text-[#1c2a24]/60 mt-1">The small card floating on the hero image (e.g. "98% Pass — CBSE Board 2025").</div>
              </div>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={content.hero_badge?.enabled !== false}
                  onChange={(e) => setSection("hero_badge", (b) => ({ ...(b || {}), enabled: e.target.checked }))}
                  className="w-4 h-4 accent-[#0a5f3d]"
                />
                Show badge
              </label>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Value">
                <Input
                  value={content.hero_badge?.value || ""}
                  onChange={(e) => setSection("hero_badge", (b) => ({ ...(b || {}), value: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="98% Pass"
                />
              </Field>
              <Field label="Sub-label">
                <Input
                  value={content.hero_badge?.label || ""}
                  onChange={(e) => setSection("hero_badge", (b) => ({ ...(b || {}), label: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="CBSE Board 2025"
                />
              </Field>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                onClick={() => save("hero_badge", content.hero_badge || {})}
                className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-9 px-4 text-[13px] font-semibold"
              >
                <Save className="w-3.5 h-3.5 mr-2" /> Save badge
              </Button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Stat Cards</div>
          <div className="grid md:grid-cols-2 gap-4">
            {(content.stats || []).map((s, i, arr) => (
              <ArrayCard
                key={s._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("stats", (x) => x.filter((_, k) => k !== i))}
                onMoveUp={() => setSection("stats", (x) => move(x, i, i - 1))}
                onMoveDown={() => setSection("stats", (x) => move(x, i, i + 1))}
              >
                <Field label="Label">
                  <Input
                    value={s.label || ""}
                    onChange={(e) => setSection("stats", (x) => x.map((it, k) => (k === i ? { ...it, label: e.target.value } : it)))}
                    className="h-10 rounded-xl"
                    placeholder="Happy Students"
                  />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Field label="Value (number)">
                      <Input
                        type="number"
                        value={s.value ?? 0}
                        onChange={(e) => setSection("stats", (x) => x.map((it, k) => (k === i ? { ...it, value: Number(e.target.value) } : it)))}
                        className="h-10 rounded-xl"
                      />
                    </Field>
                  </div>
                  <Field label="Suffix">
                    <Input
                      value={s.suffix ?? ""}
                      onChange={(e) => setSection("stats", (x) => x.map((it, k) => (k === i ? { ...it, suffix: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                      placeholder="+"
                    />
                  </Field>
                </div>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("stats", (x) => [...(x || []), { _id: uid(), label: "New Stat", value: 0, suffix: "+" }])}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Stat
          </Button>
          <div className="mt-4 text-[12px] text-[#1c2a24]/60">
            Tip: The first 3 stats appear in the hero trust row (Years / Students / Faculty). All 4 appear in the counter strip below the About section.
          </div>
        </SectionShell>
      )}

      {/* About Highlights */}
      {tab === "about_highlights" && (
        <SectionShell
          title="About — Section Intro & Highlights"
          subtitle="Section eyebrow, headline and description plus the four value cards shown below."
          saving={saving}
          onSave={() => save("about_highlights", content.about_highlights)}
          onReset={() => reset("about_highlights")}
        >
          {/* Intro editor */}
          <div className="mb-6 bg-[#f5f2ea] rounded-2xl border border-[#0a5f3d]/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display text-[17px] font-semibold text-[#0a3d29]">Section Intro</div>
                <div className="text-[12px] text-[#1c2a24]/60 mt-1">Eyebrow, big headline and description at the top of the About section.</div>
              </div>
              <Button
                onClick={() => save("about_intro", content.about_intro || {})}
                className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-9 px-4 text-[13px] font-semibold"
              >
                <Save className="w-3.5 h-3.5 mr-2" /> Save intro
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Eyebrow (small caps line)">
                <Input
                  value={content.about_intro?.eyebrow || ""}
                  onChange={(e) => setSection("about_intro", (x) => ({ ...(x || {}), eyebrow: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="About the school"
                />
              </Field>
              <div className="hidden md:block" />
              <Field label="Headline — main text">
                <Input
                  value={content.about_intro?.title_main || ""}
                  onChange={(e) => setSection("about_intro", (x) => ({ ...(x || {}), title_main: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="A decade of joyful learning,"
                />
              </Field>
              <Field label="Headline — accent text (gold italic)">
                <Input
                  value={content.about_intro?.title_accent || ""}
                  onChange={(e) => setSection("about_intro", (x) => ({ ...(x || {}), title_accent: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="deep-rooted values."
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Description paragraph">
                  <Textarea
                    rows={4}
                    value={content.about_intro?.description || ""}
                    onChange={(e) => setSection("about_intro", (x) => ({ ...(x || {}), description: e.target.value }))}
                    className="rounded-xl"
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Highlight Cards</div>
          <div className="grid md:grid-cols-2 gap-4">
            {(content.about_highlights || []).map((h, i, arr) => (
              <ArrayCard
                key={h._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("about_highlights", (x) => x.filter((_, k) => k !== i))}
                onMoveUp={() => setSection("about_highlights", (x) => move(x, i, i - 1))}
                onMoveDown={() => setSection("about_highlights", (x) => move(x, i, i + 1))}
              >
                <Field label="Title">
                  <Input
                    value={h.title || ""}
                    onChange={(e) => setSection("about_highlights", (x) => x.map((it, k) => (k === i ? { ...it, title: e.target.value } : it)))}
                    className="h-10 rounded-xl"
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    rows={3}
                    value={h.desc || ""}
                    onChange={(e) => setSection("about_highlights", (x) => x.map((it, k) => (k === i ? { ...it, desc: e.target.value } : it)))}
                    className="rounded-xl"
                  />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("about_highlights", (x) => [...(x || []), { _id: uid(), title: "New highlight", desc: "" }])}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Highlight
          </Button>
        </SectionShell>
      )}

      {/* Academic Programs */}
      {tab === "programs" && (
        <SectionShell
          title="Academic Programs"
          subtitle="Section intro plus class-level programs shown as tabs on the home page."
          saving={saving}
          onSave={() => save("programs", content.programs)}
          onReset={() => reset("programs")}
        >
          <IntroEditor
            label="Section Intro"
            sectionKey="academics_intro"
            value={content.academics_intro || {}}
            onChange={(v) => setSection("academics_intro", () => v)}
            onSave={() => save("academics_intro", content.academics_intro || {})}
          />
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Program Cards</div>
          <div className="space-y-4">
            {(content.programs || []).map((p, i, arr) => (
              <ArrayCard
                key={p._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("programs", (x) => x.filter((_, k) => k !== i))}
                onMoveUp={() => setSection("programs", (x) => move(x, i, i - 1))}
                onMoveDown={() => setSection("programs", (x) => move(x, i, i + 1))}
              >
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="Level Name">
                    <Input
                      value={p.level || ""}
                      onChange={(e) => setSection("programs", (x) => x.map((it, k) => (k === i ? { ...it, level: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                      placeholder="Primary"
                    />
                  </Field>
                  <Field label="Grades">
                    <Input
                      value={p.grades || ""}
                      onChange={(e) => setSection("programs", (x) => x.map((it, k) => (k === i ? { ...it, grades: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                      placeholder="Class I – V"
                    />
                  </Field>
                  <Field label="Age Range">
                    <Input
                      value={p.ageRange || ""}
                      onChange={(e) => setSection("programs", (x) => x.map((it, k) => (k === i ? { ...it, ageRange: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                      placeholder="6 – 10 years"
                    />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea
                    rows={2}
                    value={p.desc || ""}
                    onChange={(e) => setSection("programs", (x) => x.map((it, k) => (k === i ? { ...it, desc: e.target.value } : it)))}
                    className="rounded-xl"
                  />
                </Field>
                <Field label="Highlights (one per line)">
                  <Textarea
                    rows={3}
                    value={(p.highlights || []).join("\n")}
                    onChange={(e) => setSection("programs", (x) => x.map((it, k) => (k === i ? { ...it, highlights: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) } : it)))}
                    className="rounded-xl"
                    placeholder={"CBSE aligned curriculum\nReading & writing labs"}
                  />
                </Field>
                <Field label="Photo">
                  <ImagePicker
                    value={p.image || ""}
                    onChange={(v) => setSection("programs", (x) => x.map((it, k) => (k === i ? { ...it, image: v } : it)))}
                    aspect="aspect-[4/5]"
                  />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("programs", (x) => [...(x || []), { _id: uid(), level: "New Program", grades: "", ageRange: "", desc: "", highlights: [], image: "" }])}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Program
          </Button>
        </SectionShell>
      )}

      {/* Facilities */}
      {tab === "facilities_list" && (
        <SectionShell
          title="Campus Facilities"
          subtitle="Section intro plus the facility cards on the home page."
          saving={saving}
          onSave={() => save("facilities_list", content.facilities_list)}
          onReset={() => reset("facilities_list")}
        >
          <IntroEditor
            label="Section Intro"
            sectionKey="facilities_intro"
            value={content.facilities_intro || {}}
            onChange={(v) => setSection("facilities_intro", () => v)}
            onSave={() => save("facilities_intro", content.facilities_intro || {})}
          />
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Facility Cards</div>
          <div className="grid md:grid-cols-2 gap-4">
            {(content.facilities_list || []).map((f, i, arr) => (
              <ArrayCard
                key={f._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("facilities_list", (x) => x.filter((_, k) => k !== i))}
                onMoveUp={() => setSection("facilities_list", (x) => move(x, i, i - 1))}
                onMoveDown={() => setSection("facilities_list", (x) => move(x, i, i + 1))}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name">
                    <Input
                      value={f.name || ""}
                      onChange={(e) => setSection("facilities_list", (x) => x.map((it, k) => (k === i ? { ...it, name: e.target.value } : it)))}
                      className="h-10 rounded-xl"
                    />
                  </Field>
                  <Field label="Icon">
                    <select
                      value={f.icon || "BookOpen"}
                      onChange={(e) => setSection("facilities_list", (x) => x.map((it, k) => (k === i ? { ...it, icon: e.target.value } : it)))}
                      className="h-10 rounded-xl w-full border border-[#0a5f3d]/15 bg-white px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0a5f3d]"
                    >
                      {FACILITY_ICONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea
                    rows={2}
                    value={f.desc || ""}
                    onChange={(e) => setSection("facilities_list", (x) => x.map((it, k) => (k === i ? { ...it, desc: e.target.value } : it)))}
                    className="rounded-xl"
                  />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("facilities_list", (x) => [...(x || []), { _id: uid(), name: "New Facility", icon: "BookOpen", desc: "" }])}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Facility
          </Button>
        </SectionShell>
      )}

      {/* Admission Steps */}
      {tab === "admission_steps" && (
        <SectionShell
          title="Admission Steps"
          subtitle="Section intro text (heading, description, buttons) and the four cards guiding parents through your admission process."
          saving={saving}
          onSave={() => save("admission_steps", content.admission_steps)}
          onReset={() => reset("admission_steps")}
        >
          {/* Intro editor */}
          <div className="mb-6 bg-[#f5f2ea] rounded-2xl border border-[#0a5f3d]/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display text-[17px] font-semibold text-[#0a3d29]">Section Intro</div>
                <div className="text-[12px] text-[#1c2a24]/60 mt-1">Eyebrow, headline, description and button labels shown above the step cards.</div>
              </div>
              <Button
                onClick={() => save("admissions_intro", content.admissions_intro || {})}
                className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-9 px-4 text-[13px] font-semibold"
              >
                <Save className="w-3.5 h-3.5 mr-2" /> Save intro
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Eyebrow (small caps line)">
                <Input
                  value={content.admissions_intro?.eyebrow || ""}
                  onChange={(e) => setSection("admissions_intro", (x) => ({ ...(x || {}), eyebrow: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="Admissions Open"
                />
              </Field>
              <Field label="Headline — main text">
                <Input
                  value={content.admissions_intro?.title_main || ""}
                  onChange={(e) => setSection("admissions_intro", (x) => ({ ...(x || {}), title_main: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="Join the class of"
                />
              </Field>
              <Field label="Headline — accent text (gold)">
                <Input
                  value={content.admissions_intro?.title_accent || ""}
                  onChange={(e) => setSection("admissions_intro", (x) => ({ ...(x || {}), title_accent: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="2025-26."
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Description">
                  <Textarea
                    rows={3}
                    value={content.admissions_intro?.description || ""}
                    onChange={(e) => setSection("admissions_intro", (x) => ({ ...(x || {}), description: e.target.value }))}
                    className="rounded-xl"
                  />
                </Field>
              </div>
              <Field label="Primary Button Label">
                <Input
                  value={content.admissions_intro?.cta_primary || ""}
                  onChange={(e) => setSection("admissions_intro", (x) => ({ ...(x || {}), cta_primary: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="Start Application"
                />
              </Field>
              <Field label="Secondary Button Label">
                <Input
                  value={content.admissions_intro?.cta_secondary || ""}
                  onChange={(e) => setSection("admissions_intro", (x) => ({ ...(x || {}), cta_secondary: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="Visit Campus"
                />
              </Field>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Step Cards</div>
          <div className="grid md:grid-cols-2 gap-4">
            {(content.admission_steps || []).map((s, i, arr) => (
              <ArrayCard
                key={s._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("admission_steps", (x) => x.filter((_, k) => k !== i))}
                onMoveUp={() => setSection("admission_steps", (x) => move(x, i, i - 1))}
                onMoveDown={() => setSection("admission_steps", (x) => move(x, i, i + 1))}
              >
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Step No.">
                    <Input
                      type="number"
                      value={s.step ?? i + 1}
                      onChange={(e) => setSection("admission_steps", (x) => x.map((it, k) => (k === i ? { ...it, step: Number(e.target.value) } : it)))}
                      className="h-10 rounded-xl"
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Title">
                      <Input
                        value={s.title || ""}
                        onChange={(e) => setSection("admission_steps", (x) => x.map((it, k) => (k === i ? { ...it, title: e.target.value } : it)))}
                        className="h-10 rounded-xl"
                      />
                    </Field>
                  </div>
                </div>
                <Field label="Description">
                  <Textarea
                    rows={2}
                    value={s.desc || ""}
                    onChange={(e) => setSection("admission_steps", (x) => x.map((it, k) => (k === i ? { ...it, desc: e.target.value } : it)))}
                    className="rounded-xl"
                  />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("admission_steps", (x) => [...(x || []), { _id: uid(), step: (x?.length || 0) + 1, title: "New Step", desc: "" }])}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Step
          </Button>
        </SectionShell>
      )}

      {/* Mobile App */}
      {tab === "mobile_app" && (
        <SectionShell
          title="Mobile App Section"
          subtitle="A promo band with your Play Store & App Store links. Shows on the home page only when enabled."
          saving={saving}
          onSave={() => save("mobile_app", content.mobile_app || {})}
          onReset={() => reset("mobile_app")}
        >
          <div className="space-y-5">
            <label className="flex items-center gap-3 cursor-pointer bg-[#f5f2ea] border border-[#0a5f3d]/10 rounded-2xl p-4">
              <input
                type="checkbox"
                checked={!!(content.mobile_app && content.mobile_app.enabled)}
                onChange={(e) => setSection("mobile_app", (m) => ({ ...(m || {}), enabled: e.target.checked }))}
                className="w-5 h-5 accent-[#0a5f3d]"
              />
              <div>
                <div className="font-display text-[16px] font-semibold text-[#0a3d29]">Show Mobile App Promo on the home page</div>
                <div className="text-[12.5px] text-[#1c2a24]/60">Turn this on once you have your app ready and paste the store links below.</div>
              </div>
            </label>

            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Headline">
                <Input
                  value={(content.mobile_app && content.mobile_app.headline) || ""}
                  onChange={(e) => setSection("mobile_app", (m) => ({ ...(m || {}), headline: e.target.value }))}
                  className="h-11 rounded-xl"
                  placeholder="Get the Junior DPS Parent App"
                />
              </Field>
              <Field label="Google Play Store URL">
                <Input
                  value={(content.mobile_app && content.mobile_app.play_store_url) || ""}
                  onChange={(e) => setSection("mobile_app", (m) => ({ ...(m || {}), play_store_url: e.target.value }))}
                  className="h-11 rounded-xl"
                  placeholder="https://play.google.com/store/apps/details?id=..."
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Sub-heading / Description">
                  <Textarea
                    rows={2}
                    value={(content.mobile_app && content.mobile_app.subhead) || ""}
                    onChange={(e) => setSection("mobile_app", (m) => ({ ...(m || {}), subhead: e.target.value }))}
                    className="rounded-xl"
                    placeholder="A short sentence about what the app does for parents."
                  />
                </Field>
              </div>
              <Field label="Apple App Store URL">
                <Input
                  value={(content.mobile_app && content.mobile_app.app_store_url) || ""}
                  onChange={(e) => setSection("mobile_app", (m) => ({ ...(m || {}), app_store_url: e.target.value }))}
                  className="h-11 rounded-xl"
                  placeholder="https://apps.apple.com/app/..."
                />
              </Field>
              <Field label="Web / PWA URL (optional)">
                <Input
                  value={(content.mobile_app && content.mobile_app.website_url) || ""}
                  onChange={(e) => setSection("mobile_app", (m) => ({ ...(m || {}), website_url: e.target.value }))}
                  className="h-11 rounded-xl"
                  placeholder="https://app.juniordpsdarbhanga.com"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="App Screenshot / Phone Mockup (optional)">
                  <ImagePicker
                    value={(content.mobile_app && content.mobile_app.screenshot) || ""}
                    onChange={(v) => setSection("mobile_app", (m) => ({ ...(m || {}), screenshot: v }))}
                    aspect="aspect-[9/16]"
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Key Features (one per line)">
                  <Textarea
                    rows={4}
                    value={((content.mobile_app && content.mobile_app.features) || []).join("\n")}
                    onChange={(e) => setSection("mobile_app", (m) => ({ ...(m || {}), features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }))}
                    className="rounded-xl"
                    placeholder={"Attendance & homework alerts\nFee statements and receipts\nDirect chat with class teachers"}
                  />
                </Field>
              </div>
            </div>
          </div>
        </SectionShell>
      )}
      {/* Careers */}
      {tab === "careers" && (
        <SectionShell
          title="Careers Page"
          subtitle="Editable /careers page — intro text plus job listings. Linked from the footer quick links."
          saving={saving}
          onSave={() => save("careers", content.careers || {})}
          onReset={() => reset("careers")}
        >
          <div className="grid md:grid-cols-2 gap-3 mb-6">
            <Field label="Eyebrow"><Input value={content.careers?.eyebrow || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), eyebrow: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <Field label="Careers Email"><Input value={content.careers?.contact_email || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), contact_email: e.target.value }))} className="h-10 rounded-xl" placeholder="careers@school.com" /></Field>
            <Field label="Headline — main"><Input value={content.careers?.title_main || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), title_main: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <Field label="Headline — accent (italic gold)"><Input value={content.careers?.title_accent || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), title_accent: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="md:col-span-2">
              <Field label="Intro description"><Textarea rows={3} value={content.careers?.description || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), description: e.target.value }))} className="rounded-xl" /></Field>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Job Openings</div>
          <div className="space-y-3">
            {(content.careers?.jobs || []).map((j, i, arr) => (
              <ArrayCard
                key={j._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("careers", (x) => ({ ...(x || {}), jobs: (x?.jobs || []).filter((_, k) => k !== i) }))}
                onMoveUp={() => setSection("careers", (x) => ({ ...(x || {}), jobs: move(x?.jobs || [], i, i - 1) }))}
                onMoveDown={() => setSection("careers", (x) => ({ ...(x || {}), jobs: move(x?.jobs || [], i, i + 1) }))}
              >
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Job Title">
                    <Input value={j.title || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), jobs: (x?.jobs || []).map((it, k) => k === i ? { ...it, title: e.target.value } : it) }))} className="h-10 rounded-xl" />
                  </Field>
                  <Field label="Department">
                    <Input value={j.department || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), jobs: (x?.jobs || []).map((it, k) => k === i ? { ...it, department: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="Academics" />
                  </Field>
                  <Field label="Type">
                    <Input value={j.type || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), jobs: (x?.jobs || []).map((it, k) => k === i ? { ...it, type: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="Full-time" />
                  </Field>
                  <Field label="Location">
                    <Input value={j.location || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), jobs: (x?.jobs || []).map((it, k) => k === i ? { ...it, location: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="Darbhanga" />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea rows={3} value={j.description || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), jobs: (x?.jobs || []).map((it, k) => k === i ? { ...it, description: e.target.value } : it) }))} className="rounded-xl" />
                </Field>
                <Field label="Apply URL (optional — leave blank to email CV)">
                  <Input value={j.apply_url || ""} onChange={(e) => setSection("careers", (x) => ({ ...(x || {}), jobs: (x?.jobs || []).map((it, k) => k === i ? { ...it, apply_url: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="https://forms.gle/..." />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("careers", (x) => ({ ...(x || {}), jobs: [...((x?.jobs) || []), { _id: uid(), title: "New Position", department: "Academics", type: "Full-time", location: "Darbhanga", description: "", apply_url: "" }] }))}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Job Opening
          </Button>
        </SectionShell>
      )}

      {/* Mission / Vision / Purpose */}
      {tab === "mission_vision_purpose" && (
        <SectionShell
          title="Mission, Vision & Purpose"
          subtitle="Three pillar cards shown on the home page — edit the intro, headline and each card."
          saving={saving}
          onSave={() => save("mission_vision_purpose", content.mission_vision_purpose || {})}
          onReset={() => reset("mission_vision_purpose")}
        >
          <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-[#c99f3b]/10 border border-[#c99f3b]/30 text-[13px] text-[#8a6b1e]">
            <input
              type="checkbox"
              checked={content.mission_vision_purpose?.enabled !== false}
              onChange={(e) => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), enabled: e.target.checked }))}
              className="w-4 h-4"
              data-testid="mvp-enabled-toggle"
            />
            <span>Show this section on the home page</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-6">
            <Field label="Eyebrow"><Input value={content.mission_vision_purpose?.eyebrow || ""} onChange={(e) => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), eyebrow: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="hidden md:block" />
            <Field label="Headline — main"><Input value={content.mission_vision_purpose?.title_main || ""} onChange={(e) => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), title_main: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <Field label="Headline — accent (italic gold)"><Input value={content.mission_vision_purpose?.title_accent || ""} onChange={(e) => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), title_accent: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="md:col-span-2">
              <Field label="Description"><Textarea rows={3} value={content.mission_vision_purpose?.description || ""} onChange={(e) => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), description: e.target.value }))} className="rounded-xl" /></Field>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Pillar Cards</div>
          <div className="space-y-3">
            {(content.mission_vision_purpose?.cards || []).map((c, i, arr) => (
              <ArrayCard
                key={c._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), cards: (x?.cards || []).filter((_, k) => k !== i) }))}
                onMoveUp={() => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), cards: move(x?.cards || [], i, i - 1) }))}
                onMoveDown={() => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), cards: move(x?.cards || [], i, i + 1) }))}
              >
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="Kind (icon)">
                    <select
                      value={c.kind || "mission"}
                      onChange={(e) => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), cards: (x?.cards || []).map((it, k) => k === i ? { ...it, kind: e.target.value } : it) }))}
                      className="h-10 w-full rounded-xl border border-[#0a5f3d]/15 bg-white px-3 text-[13px]"
                    >
                      <option value="mission">Mission (compass)</option>
                      <option value="vision">Vision (eye)</option>
                      <option value="purpose">Purpose (sparkle)</option>
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Card Title">
                      <Input value={c.title || ""} onChange={(e) => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), cards: (x?.cards || []).map((it, k) => k === i ? { ...it, title: e.target.value } : it) }))} className="h-10 rounded-xl" />
                    </Field>
                  </div>
                </div>
                <Field label="Body">
                  <Textarea rows={4} value={c.body || ""} onChange={(e) => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), cards: (x?.cards || []).map((it, k) => k === i ? { ...it, body: e.target.value } : it) }))} className="rounded-xl" />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("mission_vision_purpose", (x) => ({ ...(x || {}), cards: [...((x?.cards) || []), { _id: uid(), kind: "purpose", title: "New Pillar", body: "" }] }))}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Card
          </Button>
        </SectionShell>
      )}

      {/* Awards */}
      {tab === "awards" && (
        <SectionShell
          title="Awards & Achievements"
          subtitle="Trophy shelf shown on the home page. Add awards with photo, year, presenter and a short description."
          saving={saving}
          onSave={() => save("awards", content.awards || {})}
          onReset={() => reset("awards")}
        >
          <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-[#c99f3b]/10 border border-[#c99f3b]/30 text-[13px] text-[#8a6b1e]">
            <input
              type="checkbox"
              checked={content.awards?.enabled !== false}
              onChange={(e) => setSection("awards", (x) => ({ ...(x || {}), enabled: e.target.checked }))}
              className="w-4 h-4"
              data-testid="awards-enabled-toggle"
            />
            <span>Show this section on the home page</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-6">
            <Field label="Eyebrow"><Input value={content.awards?.eyebrow || ""} onChange={(e) => setSection("awards", (x) => ({ ...(x || {}), eyebrow: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="hidden md:block" />
            <Field label="Headline — main"><Input value={content.awards?.title_main || ""} onChange={(e) => setSection("awards", (x) => ({ ...(x || {}), title_main: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <Field label="Headline — accent (italic gold)"><Input value={content.awards?.title_accent || ""} onChange={(e) => setSection("awards", (x) => ({ ...(x || {}), title_accent: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="md:col-span-2">
              <Field label="Description"><Textarea rows={3} value={content.awards?.description || ""} onChange={(e) => setSection("awards", (x) => ({ ...(x || {}), description: e.target.value }))} className="rounded-xl" /></Field>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Awards</div>
          <div className="space-y-3">
            {(content.awards?.items || []).map((a, i, arr) => (
              <ArrayCard
                key={a._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("awards", (x) => ({ ...(x || {}), items: (x?.items || []).filter((_, k) => k !== i) }))}
                onMoveUp={() => setSection("awards", (x) => ({ ...(x || {}), items: move(x?.items || [], i, i - 1) }))}
                onMoveDown={() => setSection("awards", (x) => ({ ...(x || {}), items: move(x?.items || [], i, i + 1) }))}
              >
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Award Title">
                    <Input value={a.title || ""} onChange={(e) => setSection("awards", (x) => ({ ...(x || {}), items: (x?.items || []).map((it, k) => k === i ? { ...it, title: e.target.value } : it) }))} className="h-10 rounded-xl" />
                  </Field>
                  <Field label="Year">
                    <Input value={a.year || ""} onChange={(e) => setSection("awards", (x) => ({ ...(x || {}), items: (x?.items || []).map((it, k) => k === i ? { ...it, year: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="2024" />
                  </Field>
                  <Field label="Awarded By">
                    <Input value={a.awarded_by || ""} onChange={(e) => setSection("awards", (x) => ({ ...(x || {}), items: (x?.items || []).map((it, k) => k === i ? { ...it, awarded_by: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="Board / Body name" />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea rows={3} value={a.description || ""} onChange={(e) => setSection("awards", (x) => ({ ...(x || {}), items: (x?.items || []).map((it, k) => k === i ? { ...it, description: e.target.value } : it) }))} className="rounded-xl" />
                </Field>
                <Field label="Photo (optional)">
                  <ImagePicker
                    value={a.image}
                    onChange={(v) => setSection("awards", (x) => ({ ...(x || {}), items: (x?.items || []).map((it, k) => k === i ? { ...it, image: v } : it) }))}
                    aspect="aspect-[4/3]"
                  />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("awards", (x) => ({ ...(x || {}), items: [...((x?.items) || []), { _id: uid(), title: "New Award", year: "", awarded_by: "", description: "", image: "" }] }))}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Award
          </Button>
        </SectionShell>
      )}

      {/* Transport Policies */}
      {tab === "transport_policies" && (
        <SectionShell
          title="Transport Policies"
          subtitle="Editable /transport page — hero intro plus policy tiles."
          saving={saving}
          onSave={() => save("transport_policies", content.transport_policies || {})}
          onReset={() => reset("transport_policies")}
        >
          <div className="grid md:grid-cols-2 gap-3 mb-6">
            <Field label="Eyebrow"><Input value={content.transport_policies?.eyebrow || ""} onChange={(e) => setSection("transport_policies", (x) => ({ ...(x || {}), eyebrow: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="hidden md:block" />
            <Field label="Headline — main"><Input value={content.transport_policies?.title_main || ""} onChange={(e) => setSection("transport_policies", (x) => ({ ...(x || {}), title_main: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <Field label="Headline — accent (italic gold)"><Input value={content.transport_policies?.title_accent || ""} onChange={(e) => setSection("transport_policies", (x) => ({ ...(x || {}), title_accent: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="md:col-span-2">
              <Field label="Intro description"><Textarea rows={3} value={content.transport_policies?.description || ""} onChange={(e) => setSection("transport_policies", (x) => ({ ...(x || {}), description: e.target.value }))} className="rounded-xl" /></Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Contact note (shown at the bottom in a gold callout)"><Textarea rows={2} value={content.transport_policies?.contact_note || ""} onChange={(e) => setSection("transport_policies", (x) => ({ ...(x || {}), contact_note: e.target.value }))} className="rounded-xl" /></Field>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Policy Tiles</div>
          <div className="space-y-3">
            {(content.transport_policies?.policies || []).map((p, i, arr) => (
              <ArrayCard
                key={p._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("transport_policies", (x) => ({ ...(x || {}), policies: (x?.policies || []).filter((_, k) => k !== i) }))}
                onMoveUp={() => setSection("transport_policies", (x) => ({ ...(x || {}), policies: move(x?.policies || [], i, i - 1) }))}
                onMoveDown={() => setSection("transport_policies", (x) => ({ ...(x || {}), policies: move(x?.policies || [], i, i + 1) }))}
              >
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="Icon (Lucide name)">
                    <Input value={p.icon || ""} onChange={(e) => setSection("transport_policies", (x) => ({ ...(x || {}), policies: (x?.policies || []).map((it, k) => k === i ? { ...it, icon: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="MapPin, Clock, ShieldCheck..." />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Title">
                      <Input value={p.title || ""} onChange={(e) => setSection("transport_policies", (x) => ({ ...(x || {}), policies: (x?.policies || []).map((it, k) => k === i ? { ...it, title: e.target.value } : it) }))} className="h-10 rounded-xl" />
                    </Field>
                  </div>
                </div>
                <Field label="Body">
                  <Textarea rows={3} value={p.body || ""} onChange={(e) => setSection("transport_policies", (x) => ({ ...(x || {}), policies: (x?.policies || []).map((it, k) => k === i ? { ...it, body: e.target.value } : it) }))} className="rounded-xl" />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("transport_policies", (x) => ({ ...(x || {}), policies: [...((x?.policies) || []), { _id: uid(), icon: "MapPin", title: "New Policy", body: "" }] }))}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Policy
          </Button>
          <div className="mt-4 text-[12px] text-[#1c2a24]/60">
            Tip: any Lucide icon name works (see <a href="https://lucide.dev/icons/" target="_blank" rel="noreferrer" className="underline">lucide.dev/icons</a>). Examples: MapPin, ShieldCheck, Clock, Phone, AlertTriangle, Wallet, Ban, CalendarX, Bus.
          </div>
        </SectionShell>
      )}

      {/* Brochure */}
      {tab === "brochure" && (
        <SectionShell
          title="Download Brochure"
          subtitle="Small dark band shown on the home page with a downloadable PDF link."
          saving={saving}
          onSave={() => save("brochure", content.brochure || {})}
          onReset={() => reset("brochure")}
        >
          <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-[#c99f3b]/10 border border-[#c99f3b]/30 text-[13px] text-[#8a6b1e]">
            <input
              type="checkbox"
              checked={content.brochure?.enabled !== false}
              onChange={(e) => setSection("brochure", (x) => ({ ...(x || {}), enabled: e.target.checked }))}
              className="w-4 h-4"
              data-testid="brochure-enabled-toggle"
            />
            <span>Show this section on the home page</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mb-6">
            <Field label="Eyebrow"><Input value={content.brochure?.eyebrow || ""} onChange={(e) => setSection("brochure", (x) => ({ ...(x || {}), eyebrow: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <Field label="Button label"><Input value={content.brochure?.button_label || ""} onChange={(e) => setSection("brochure", (x) => ({ ...(x || {}), button_label: e.target.value }))} className="h-10 rounded-xl" placeholder="Download Brochure" /></Field>
            <Field label="Headline — main"><Input value={content.brochure?.title_main || ""} onChange={(e) => setSection("brochure", (x) => ({ ...(x || {}), title_main: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <Field label="Headline — accent (italic gold)"><Input value={content.brochure?.title_accent || ""} onChange={(e) => setSection("brochure", (x) => ({ ...(x || {}), title_accent: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="md:col-span-2">
              <Field label="Description"><Textarea rows={3} value={content.brochure?.description || ""} onChange={(e) => setSection("brochure", (x) => ({ ...(x || {}), description: e.target.value }))} className="rounded-xl" /></Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Secondary note (small text below description)"><Textarea rows={2} value={content.brochure?.secondary_note || ""} onChange={(e) => setSection("brochure", (x) => ({ ...(x || {}), secondary_note: e.target.value }))} className="rounded-xl" /></Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Brochure URL (link to PDF)">
                <Input value={content.brochure?.brochure_url || ""} onChange={(e) => setSection("brochure", (x) => ({ ...(x || {}), brochure_url: e.target.value }))} className="h-10 rounded-xl" placeholder="https://your-drive-link.pdf" data-testid="brochure-url-input" />
              </Field>
              <div className="mt-2 text-[12px] text-[#1c2a24]/60">
                Upload your PDF to Google Drive (share as anyone-with-link), Dropbox or your own storage, then paste the public URL here.
              </div>
            </div>
            <Field label="File size caption (optional)"><Input value={content.brochure?.brochure_size || ""} onChange={(e) => setSection("brochure", (x) => ({ ...(x || {}), brochure_size: e.target.value }))} className="h-10 rounded-xl" placeholder="PDF • 3.4 MB" /></Field>
          </div>
        </SectionShell>
      )}

      {/* Curriculum */}
      {tab === "curriculum" && (
        <SectionShell
          title="Curriculum"
          subtitle="Class-wise subject blocks and co-curricular activities. Renders as an interactive tabbed panel near the footer."
          saving={saving}
          onSave={() => save("curriculum", content.curriculum || {})}
          onReset={() => reset("curriculum")}
        >
          <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-[#c99f3b]/10 border border-[#c99f3b]/30 text-[13px] text-[#8a6b1e]">
            <input
              type="checkbox"
              checked={content.curriculum?.enabled !== false}
              onChange={(e) => setSection("curriculum", (x) => ({ ...(x || {}), enabled: e.target.checked }))}
              className="w-4 h-4"
              data-testid="curriculum-enabled-toggle"
            />
            <span>Show curriculum section on the home page</span>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-6">
            <Field label="Eyebrow"><Input value={content.curriculum?.eyebrow || ""} onChange={(e) => setSection("curriculum", (x) => ({ ...(x || {}), eyebrow: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="hidden md:block" />
            <Field label="Headline — main"><Input value={content.curriculum?.title_main || ""} onChange={(e) => setSection("curriculum", (x) => ({ ...(x || {}), title_main: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <Field label="Headline — accent (italic gold)"><Input value={content.curriculum?.title_accent || ""} onChange={(e) => setSection("curriculum", (x) => ({ ...(x || {}), title_accent: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="md:col-span-2">
              <Field label="Description"><Textarea rows={3} value={content.curriculum?.description || ""} onChange={(e) => setSection("curriculum", (x) => ({ ...(x || {}), description: e.target.value }))} className="rounded-xl" /></Field>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Class Cards</div>
          <div className="space-y-3">
            {(content.curriculum?.classes || []).map((c, i, arr) => (
              <ArrayCard
                key={c._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("curriculum", (x) => ({ ...(x || {}), classes: (x?.classes || []).filter((_, k) => k !== i) }))}
                onMoveUp={() => setSection("curriculum", (x) => ({ ...(x || {}), classes: move(x?.classes || [], i, i - 1) }))}
                onMoveDown={() => setSection("curriculum", (x) => ({ ...(x || {}), classes: move(x?.classes || [], i, i + 1) }))}
              >
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Grade / class label (e.g. 'Class III – V')">
                    <Input value={c.grade || ""} onChange={(e) => setSection("curriculum", (x) => ({ ...(x || {}), classes: (x?.classes || []).map((it, k) => k === i ? { ...it, grade: e.target.value } : it) }))} className="h-10 rounded-xl" />
                  </Field>
                  <Field label="Level (badge label, e.g. 'Primary')">
                    <Input value={c.level || ""} onChange={(e) => setSection("curriculum", (x) => ({ ...(x || {}), classes: (x?.classes || []).map((it, k) => k === i ? { ...it, level: e.target.value } : it) }))} className="h-10 rounded-xl" />
                  </Field>
                </div>
                <Field label="Subjects (comma-separated)">
                  <Textarea rows={2} value={Array.isArray(c.subjects) ? c.subjects.join(", ") : (c.subjects || "")} onChange={(e) => setSection("curriculum", (x) => ({ ...(x || {}), classes: (x?.classes || []).map((it, k) => k === i ? { ...it, subjects: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : it) }))} className="rounded-xl" placeholder="English, Hindi, Mathematics, ..." />
                </Field>
                <Field label="Co-curricular (short description)">
                  <Input value={c.cocurricular || ""} onChange={(e) => setSection("curriculum", (x) => ({ ...(x || {}), classes: (x?.classes || []).map((it, k) => k === i ? { ...it, cocurricular: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="Yoga, music, art, storytelling club" />
                </Field>
                <Field label="Note (small callout, optional)">
                  <Textarea rows={2} value={c.note || ""} onChange={(e) => setSection("curriculum", (x) => ({ ...(x || {}), classes: (x?.classes || []).map((it, k) => k === i ? { ...it, note: e.target.value } : it) }))} className="rounded-xl" />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("curriculum", (x) => ({ ...(x || {}), classes: [...((x?.classes) || []), { _id: uid(), grade: "New Class", level: "CBSE", subjects: [], cocurricular: "", note: "" }] }))}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Class
          </Button>
        </SectionShell>
      )}

      {/* Current Notices */}
      {tab === "current_notices" && (
        <SectionShell
          title="Current Notices"
          subtitle="Announcements shown near the footer. Mark urgent notices with the red flag. Add or remove notices anytime."
          saving={saving}
          onSave={() => save("current_notices", content.current_notices || {})}
          onReset={() => reset("current_notices")}
        >
          <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-[#c99f3b]/10 border border-[#c99f3b]/30 text-[13px] text-[#8a6b1e]">
            <input
              type="checkbox"
              checked={content.current_notices?.enabled !== false}
              onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), enabled: e.target.checked }))}
              className="w-4 h-4"
              data-testid="notices-enabled-toggle"
            />
            <span>Show current notices on the home page</span>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-6">
            <Field label="Eyebrow"><Input value={content.current_notices?.eyebrow || ""} onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), eyebrow: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="hidden md:block" />
            <Field label="Headline — main"><Input value={content.current_notices?.title_main || ""} onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), title_main: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <Field label="Headline — accent (italic gold)"><Input value={content.current_notices?.title_accent || ""} onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), title_accent: e.target.value }))} className="h-10 rounded-xl" /></Field>
            <div className="md:col-span-2">
              <Field label="Description"><Textarea rows={3} value={content.current_notices?.description || ""} onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), description: e.target.value }))} className="rounded-xl" /></Field>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Notices</div>
          <div className="space-y-3">
            {(content.current_notices?.notices || []).map((n, i, arr) => (
              <ArrayCard
                key={n._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection("current_notices", (x) => ({ ...(x || {}), notices: (x?.notices || []).filter((_, k) => k !== i) }))}
                onMoveUp={() => setSection("current_notices", (x) => ({ ...(x || {}), notices: move(x?.notices || [], i, i - 1) }))}
                onMoveDown={() => setSection("current_notices", (x) => ({ ...(x || {}), notices: move(x?.notices || [], i, i + 1) }))}
              >
                <div className="grid md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2">
                    <Field label="Notice title">
                      <Input value={n.title || ""} onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), notices: (x?.notices || []).map((it, k) => k === i ? { ...it, title: e.target.value } : it) }))} className="h-10 rounded-xl" />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 pb-2 text-[13px] font-semibold text-[#0a3d29]">
                    <input
                      type="checkbox"
                      checked={!!n.urgent}
                      onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), notices: (x?.notices || []).map((it, k) => k === i ? { ...it, urgent: e.target.checked } : it) }))}
                      className="w-4 h-4 accent-red-600"
                    />
                    <span className={n.urgent ? "text-red-700" : ""}>Mark as urgent</span>
                  </label>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Date (free text)">
                    <Input value={n.date || ""} onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), notices: (x?.notices || []).map((it, k) => k === i ? { ...it, date: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="12 Sep 2026" />
                  </Field>
                  <Field label="Category (short label)">
                    <Input value={n.category || ""} onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), notices: (x?.notices || []).map((it, k) => k === i ? { ...it, category: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="Examinations, PTM, Holidays..." />
                  </Field>
                </div>
                <Field label="Body">
                  <Textarea rows={3} value={n.body || ""} onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), notices: (x?.notices || []).map((it, k) => k === i ? { ...it, body: e.target.value } : it) }))} className="rounded-xl" />
                </Field>
                <Field label="Read-more link (optional)">
                  <Input value={n.link_url || ""} onChange={(e) => setSection("current_notices", (x) => ({ ...(x || {}), notices: (x?.notices || []).map((it, k) => k === i ? { ...it, link_url: e.target.value } : it) }))} className="h-10 rounded-xl" placeholder="https://..." />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection("current_notices", (x) => ({ ...(x || {}), notices: [...((x?.notices) || []), { _id: uid(), title: "New Notice", date: "", category: "", body: "", link_url: "", urgent: false }] }))}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Notice
          </Button>
        </SectionShell>
      )}

      {/* Email Alerts */}
      {tab === "email_settings" && (
        <SectionShell
          title="Admission Enquiry Email Alerts"
          subtitle="When a parent submits the admission enquiry form, an email is sent to the addresses below via Resend."
          saving={saving}
          onSave={() => save("email_settings", content.email_settings || {})}
          onReset={() => reset("email_settings")}
        >
          <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl bg-[#c99f3b]/10 border border-[#c99f3b]/30 text-[13px] text-[#8a6b1e]">
            <input
              type="checkbox"
              checked={content.email_settings?.enabled !== false}
              onChange={(e) => setSection("email_settings", (x) => ({ ...(x || {}), enabled: e.target.checked }))}
              className="w-4 h-4"
              data-testid="email-enabled-toggle"
            />
            <span>Send an email alert to the admin every time a parent submits the form</span>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-6">
            <div className="md:col-span-2">
              <Field label="Recipient email(s) — comma separated">
                <Input
                  value={content.email_settings?.recipients || ""}
                  onChange={(e) => setSection("email_settings", (x) => ({ ...(x || {}), recipients: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="admissions@school.com, principal@school.com"
                  data-testid="email-recipients-input"
                />
              </Field>
            </div>
            <Field label="From address (must be a Resend-verified sender)">
              <Input
                value={content.email_settings?.from_email || ""}
                onChange={(e) => setSection("email_settings", (x) => ({ ...(x || {}), from_email: e.target.value }))}
                className="h-10 rounded-xl"
                placeholder="onboarding@resend.dev"
              />
            </Field>
            <Field label="Reply-to (leave blank to use parent's email)">
              <Input
                value={content.email_settings?.reply_to || ""}
                onChange={(e) => setSection("email_settings", (x) => ({ ...(x || {}), reply_to: e.target.value }))}
                className="h-10 rounded-xl"
                placeholder="Leave blank to reply directly to the parent"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Subject line (supports {name} and {grade} placeholders)">
                <Input
                  value={content.email_settings?.subject || ""}
                  onChange={(e) => setSection("email_settings", (x) => ({ ...(x || {}), subject: e.target.value }))}
                  className="h-10 rounded-xl"
                  placeholder="New Admission Enquiry — {name}"
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Intro line (shown at the top of the email)">
                <Textarea
                  rows={3}
                  value={content.email_settings?.intro || ""}
                  onChange={(e) => setSection("email_settings", (x) => ({ ...(x || {}), intro: e.target.value }))}
                  className="rounded-xl"
                />
              </Field>
            </div>
          </div>

          <div className="mt-2 p-5 rounded-2xl bg-white border border-[#0a5f3d]/10">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={!!content.email_settings?.send_parent_ack}
                onChange={(e) => setSection("email_settings", (x) => ({ ...(x || {}), send_parent_ack: e.target.checked }))}
                className="w-4 h-4 mt-1"
                data-testid="parent-ack-toggle"
              />
              <div className="flex-1">
                <div className="font-semibold text-[#0a3d29] text-[14px]">Also send a thank-you email to the parent</div>
                <div className="text-[12.5px] text-[#1c2a24]/60 mt-1">A short branded acknowledgement is sent to the parent's email confirming that we received their enquiry.</div>
                {content.email_settings?.send_parent_ack && (
                  <div className="mt-3">
                    <Field label="Thank-you subject">
                      <Input
                        value={content.email_settings?.parent_ack_subject || ""}
                        onChange={(e) => setSection("email_settings", (x) => ({ ...(x || {}), parent_ack_subject: e.target.value }))}
                        className="h-10 rounded-xl"
                        placeholder="Thank you for your enquiry — Junior DPS Darbhanga"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 p-5 rounded-2xl bg-[#0a3d29] text-[#fff9e6] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="font-semibold text-[15px]">Send a test email</div>
              <div className="text-[12.5px] text-[#fff9e6]/70 mt-1">Save your settings first, then click below. A sample enquiry email is sent to your recipient list.</div>
            </div>
            <Button
              onClick={async () => {
                try {
                  const r = await sendTestEnquiryEmail();
                  const oc = r.data?.outcome || {};
                  toast({ title: "Test email dispatched", description: `Admin: ${oc.sent_to_admin ? "sent" : "not sent"} | Parent: ${oc.sent_to_parent ? "sent" : "skipped"}` });
                } catch (err) {
                  toast({ title: "Test failed", description: err?.response?.data?.detail || "Check backend logs.", variant: "destructive" });
                }
              }}
              className="rounded-full bg-[#c99f3b] hover:bg-[#b48c2b] text-[#0a3d29] font-semibold px-6 h-11"
              data-testid="send-test-email-btn"
            >
              Send test email
            </Button>
          </div>

          <div className="mt-4 text-[12.5px] text-[#1c2a24]/60 leading-relaxed">
            <b>Note:</b> While Resend is in test mode (before you verify your own domain at resend.com), emails can only be delivered to the email address that owns the Resend account. To send to any recipient, verify your school's domain in Resend → Domains and then update the "From address" above to <code>admissions@yourschool.com</code>.
          </div>
        </SectionShell>
      )}

      {/* Footer & Socials */}
      {tab === "footer" && (
        <SectionShell
          title="Footer & Social Links"
          subtitle="Short school description, quick links and social-media URLs shown in the site footer."
          saving={saving}
          onSave={() => save("footer", content.footer || {})}
          onReset={() => reset("footer")}
        >
          <div className="space-y-5">
            <Field label="Footer description">
              <Textarea
                rows={3}
                value={content.footer?.description || ""}
                onChange={(e) => setSection("footer", (x) => ({ ...(x || {}), description: e.target.value }))}
                className="rounded-xl"
                placeholder="Nurturing curious minds and kind hearts since 2015..."
              />
            </Field>

            <div>
              <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Social Media URLs</div>
              <div className="text-[12.5px] text-[#1c2a24]/60 mb-3">Paste the full URL for any platform you use. Leave blank to hide that icon.</div>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  ["facebook", "Facebook"],
                  ["instagram", "Instagram"],
                  ["youtube", "YouTube"],
                  ["linkedin", "LinkedIn"],
                  ["twitter", "Twitter / X"],
                  ["whatsapp", "WhatsApp"],
                ].map(([k, l]) => (
                  <Field key={k} label={l}>
                    <Input
                      value={(content.footer?.socials || {})[k] || ""}
                      onChange={(e) => setSection("footer", (x) => ({ ...(x || {}), socials: { ...((x && x.socials) || {}), [k]: e.target.value } }))}
                      className="h-10 rounded-xl"
                      placeholder={`https://${k === "whatsapp" ? "wa.me/91XXXXXXXXXX" : k + ".com/juniordpsdarbhanga"}`}
                    />
                  </Field>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Quick Links</div>
              <div className="space-y-3">
                {(content.footer?.quick_links || []).map((l, i, arr) => (
                  <ArrayCard
                    key={l._id || i}
                    index={i}
                    total={arr.length}
                    onRemove={() => setSection("footer", (x) => ({ ...(x || {}), quick_links: (x?.quick_links || []).filter((_, k) => k !== i) }))}
                    onMoveUp={() => setSection("footer", (x) => ({ ...(x || {}), quick_links: move(x?.quick_links || [], i, i - 1) }))}
                    onMoveDown={() => setSection("footer", (x) => ({ ...(x || {}), quick_links: move(x?.quick_links || [], i, i + 1) }))}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Label">
                        <Input
                          value={l.label || ""}
                          onChange={(e) => setSection("footer", (x) => ({ ...(x || {}), quick_links: (x?.quick_links || []).map((it, k) => k === i ? { ...it, label: e.target.value } : it) }))}
                          className="h-10 rounded-xl"
                        />
                      </Field>
                      <Field label="URL (starts with / for internal)">
                        <Input
                          value={l.href || ""}
                          onChange={(e) => setSection("footer", (x) => ({ ...(x || {}), quick_links: (x?.quick_links || []).map((it, k) => k === i ? { ...it, href: e.target.value } : it) }))}
                          className="h-10 rounded-xl"
                          placeholder="/fees or https://..."
                        />
                      </Field>
                    </div>
                  </ArrayCard>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => setSection("footer", (x) => ({ ...(x || {}), quick_links: [...((x?.quick_links) || []), { _id: uid(), label: "New Link", href: "#" }] }))}
                className="mt-3 rounded-full h-10 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Quick Link
              </Button>
            </div>
          </div>
        </SectionShell>
      )}

      {/* Privacy & Terms use the same structure — render both from a single helper */}
      {(tab === "privacy_policy" || tab === "terms_of_use") && (
        <SectionShell
          title={tab === "privacy_policy" ? "Privacy Policy" : "Terms of Use"}
          subtitle={tab === "privacy_policy"
            ? "Editable Privacy Policy shown at /privacy. Defaults follow CBSE-aligned best practices."
            : "Editable Terms of Use shown at /terms. Defaults reference CBSE guidelines and Indian law."}
          saving={saving}
          onSave={() => save(tab, content[tab])}
          onReset={() => reset(tab)}
        >
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Field label="Page Title">
              <Input
                value={content[tab]?.title || ""}
                onChange={(e) => setSection(tab, (x) => ({ ...(x || {}), title: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Last Updated (display date)">
              <Input
                value={content[tab]?.updated || ""}
                onChange={(e) => setSection(tab, (x) => ({ ...(x || {}), updated: e.target.value }))}
                className="h-11 rounded-xl"
                placeholder="01 July 2025"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Intro paragraph">
                <Textarea
                  rows={3}
                  value={content[tab]?.intro || ""}
                  onChange={(e) => setSection(tab, (x) => ({ ...(x || {}), intro: e.target.value }))}
                  className="rounded-xl"
                />
              </Field>
            </div>
          </div>

          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Sections</div>
          <div className="space-y-4">
            {(content[tab]?.sections || []).map((s, i, arr) => (
              <ArrayCard
                key={s._id || i}
                index={i}
                total={arr.length}
                onRemove={() => setSection(tab, (x) => ({ ...(x || {}), sections: (x?.sections || []).filter((_, k) => k !== i) }))}
                onMoveUp={() => setSection(tab, (x) => ({ ...(x || {}), sections: move(x?.sections || [], i, i - 1) }))}
                onMoveDown={() => setSection(tab, (x) => ({ ...(x || {}), sections: move(x?.sections || [], i, i + 1) }))}
              >
                <Field label="Heading">
                  <Input
                    value={s.heading || ""}
                    onChange={(e) => setSection(tab, (x) => ({
                      ...(x || {}),
                      sections: (x?.sections || []).map((it, k) => k === i ? { ...it, heading: e.target.value } : it),
                    }))}
                    className="h-10 rounded-xl"
                  />
                </Field>
                <Field label="Body">
                  <Textarea
                    rows={5}
                    value={s.body || ""}
                    onChange={(e) => setSection(tab, (x) => ({
                      ...(x || {}),
                      sections: (x?.sections || []).map((it, k) => k === i ? { ...it, body: e.target.value } : it),
                    }))}
                    className="rounded-xl"
                  />
                </Field>
              </ArrayCard>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setSection(tab, (x) => ({
              ...(x || {}),
              sections: [...((x?.sections) || []), { _id: uid(), heading: "New section", body: "" }],
            }))}
            className="mt-5 rounded-full h-11 border-dashed border-[#0a5f3d]/30 text-[#0a5f3d] hover:bg-[#0a5f3d]/8"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Section
          </Button>
          <div className="mt-4 text-[12px] text-[#1c2a24]/60">
            Tip: Paragraph breaks inside the Body field are preserved on the public page.
          </div>
        </SectionShell>
      )}
    </div>
  );
};

export default ContentEditor;
