import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { fetchContent } from "./api";
import { logError } from "./logger";
import * as mock from "../mock";

const CACHE_KEY = "jdps_content_store_v2";

const DEFAULTS = {
  school_info: mock.schoolInfo || {},
  stats: mock.stats || [],
  hero_slides: [],
  about_highlights: mock.aboutHighlights || [],
  programs: mock.programs || [],
  facilities_list: mock.facilities || [],
  principal: mock.principalMessage || {},
  gallery: [],
  testimonials: mock.testimonials || [],
  admission_steps: mock.admissionSteps || [],
  fee_structure: mock.feeStructure || [],
  fee_notes: mock.feeNotes || [],
  calendar_events: mock.calendarEvents || [],
  awards: { enabled: true, eyebrow: "Awards & Achievements", title_main: "Honours we wear", title_accent: "with pride.", description: "Celebrating the dedication of our faculty, students and leadership across academic, cultural and co-curricular domains.", items: [] },
  marquee: { items: ["CBSE Affiliated", "Nursery – Class X", "Air-Conditioned Campus", "24×7 CCTV Surveillance", "GPS-Tracked Transport", "Career Counselling from Class V", "STEM & Robotics Program", "Music • Art • Sports"] },
  mission_vision_purpose: { enabled: true, eyebrow: "Who we are", title_main: "Mission, vision and", title_accent: "our purpose.", description: "Guided by our core philosophy to nurture academic excellence and integrity in every child.", cards: [] },
  current_notices: { enabled: true, eyebrow: "Notices", title_main: "Current", title_accent: "notices.", description: "Important announcements and updates from the school administration.", notices: [] },
  mobile_app: { enabled: false },
  brochure: { enabled: false },
  display: {},
  theme: {},
  footer: { quick_links: [{ label: "Fee Structure", href: "/fees" }, { label: "School Calendar", href: "/calendar" }] },
  transport_policies: { eyebrow: "Transport", title_main: "Safe, punctual and", title_accent: "parent-friendly transport.", description: "Our bus fleet connects major residential zones of Darbhanga with live GPS tracking and female attendants on all routes.", policies: [] },
  careers: { eyebrow: "Careers", title_main: "Grow with a school that", title_accent: "grows children.", description: "We are always looking for warm, curious educators who share our belief that every child deserves an inspiring school day.", jobs: [] },
};

function getInitialContent() {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...DEFAULTS, ...parsed };
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return DEFAULTS;
}

const ContentContext = createContext({
  content: DEFAULTS,
  refresh: () => {},
  loading: false,
});

export const useContent = () => useContext(ContentContext);

export const ContentProvider = ({ children }) => {
  const [content, setContent] = useState(getInitialContent);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetchContent();
      if (r && r.data && typeof r.data === "object" && !Array.isArray(r.data) && typeof r.data !== "string") {
        setContent((prev) => ({ ...prev, ...r.data }));
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(r.data));
        } catch {
          // Ignore quota error
        }
      }
    } catch (err) {
      logError("Failed to load site content, using defaults:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Memoize the context value so consumers don't re-render on unrelated state changes
  const value = useMemo(() => ({ content, refresh, loading }), [content, refresh, loading]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
};
