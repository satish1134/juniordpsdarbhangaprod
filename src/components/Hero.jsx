import React, { useEffect, useState } from "react";
import { ArrowRight, Play, Sparkles, ChevronLeft, ChevronRight, GraduationCap } from "lucide-react";
import { useContent } from "../lib/ContentContext";
import { HERO_MIN_VH, pick } from "../lib/displaySizes";
import { resolveImageUrl } from "../lib/api";
import { Button } from "./ui/button";
import { stats as fallbackStats } from "../mock";

const Hero = ({ onEnquiry }) => {
  const { content } = useContent();
  const heroSlides = Array.isArray(content?.hero_slides) && content.hero_slides.length ? content.hero_slides : [];
  const schoolInfo = content?.school_info || {};
  const display = content?.display || {};
  const heroVh = pick(HERO_MIN_VH, display.hero_height);
  const stats = Array.isArray(content?.stats) && content.stats.length ? content.stats : fallbackStats;
  const heroStats = stats.slice(0, 3);
  const heroBadge = content?.hero_badge || {};
  const heroIntro = content?.hero_intro || {};
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (heroSlides.length === 0) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % heroSlides.length), 6000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  const slide = heroSlides[idx] || null;

  return (
    <section id="home" className="relative overflow-hidden bg-[#fbfaf6]" style={{ minHeight: `${heroVh}vh` }}>
      {/* Decorative blobs */}
      <div className="blob bg-[#c99f3b] w-[420px] h-[420px] -top-24 -right-24" />
      <div className="blob bg-[#0a5f3d] w-[380px] h-[380px] -bottom-32 -left-24 opacity-30" />

      <div className="relative max-w-7xl mx-auto px-6 pt-14 pb-24 grid lg:grid-cols-12 gap-10 items-center">
        {/* Left column - Text */}
        <div className="lg:col-span-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0a5f3d]/8 border border-[#0a5f3d]/15 text-[#0a5f3d] text-[12.5px] font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            {schoolInfo.hero_eyebrow || `${schoolInfo.affiliation || ""} • Est. ${schoolInfo.established || ""}`.trim()}
          </div>

          <h1 className="font-display mt-6 text-[46px] sm:text-[58px] lg:text-[70px] leading-[1.02] font-bold text-[#0a3d29]">
            <span className="block">{heroIntro.title_main || "Where curiosity"}</span>
            <span className="block text-gradient-emerald italic font-medium">{heroIntro.title_accent || "meets excellence."}</span>
          </h1>

          <p className="mt-6 text-[17px] leading-relaxed text-[#1c2a24]/75 max-w-xl">
            {heroIntro.description || "A modern, CBSE-affiliated school in the heart of Darbhanga, committed to shaping confident thinkers, kind humans and lifelong learners."}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button
              onClick={onEnquiry}
              className="group bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-12 px-7 font-semibold text-[15px] shadow-xl shadow-[#0a5f3d]/25"
            >
              {heroIntro.cta_primary || "Book a Campus Visit"}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a
              href="#about"
              className="group flex items-center gap-3 text-[#0a3d29] font-semibold text-[15px]"
            >
              <span className="w-12 h-12 rounded-full border border-[#0a5f3d]/30 flex items-center justify-center group-hover:bg-[#0a5f3d] group-hover:text-[#fff9e6] transition-all">
                <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
              </span>
              {heroIntro.cta_secondary || "Discover our story"}
            </a>
          </div>

          {/* Trust row */}
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
            {heroStats.map((s, i) => (
              <div key={i} className={i === 0 ? "" : "border-l border-[#0a5f3d]/15 pl-6"}>
                <div className="font-display text-3xl font-bold text-[#0a3d29]">
                  {Number(s.value || 0).toLocaleString()}
                  <span className="text-[#c99f3b]">{s.suffix || ""}</span>
                </div>
                <div className="text-xs uppercase tracking-widest text-[#1c2a24]/60 mt-1">
                  {(s.label || "").split(" ").slice(-1)[0]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column - Image with card */}
        <div className="lg:col-span-6 relative">
          <div className="relative">
            {/* Ring */}
            <div className="absolute -inset-3 rounded-[38px] border border-[#0a5f3d]/15" />
            <div className="absolute -inset-6 rounded-[42px] border border-[#c99f3b]/25" />

            <div className="relative rounded-[32px] overflow-hidden shadow-2xl shadow-[#0a3d29]/30 aspect-[4/5] zoom-parent bg-gradient-to-br from-[#0a3d29] via-[#084a30] to-[#042417]">
              {heroSlides.length > 0 ? (
                <>
                  {heroSlides.map((s, i) => (
                    s.image ? (
                      <img
                        key={s._id || i}
                        src={resolveImageUrl(s.image)}
                        alt={s.title || "Hero banner"}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                          i === idx ? "opacity-100" : "opacity-0"
                        }`}
                        crossOrigin="anonymous"
                      />
                    ) : null
                  ))}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a3d29]/80 via-transparent to-transparent" />

                  {/* Slide caption */}
                  {slide && (
                    <div className="absolute bottom-6 left-6 right-6 text-[#fff9e6]">
                      <div className="text-[11px] tracking-[0.3em] uppercase opacity-80">Life at Junior DPS</div>
                      <div className="font-display text-xl md:text-2xl font-semibold mt-1">{slide.title}</div>
                    </div>
                  )}

                  {/* Slide controls */}
                  {heroSlides.length > 1 && (
                    <div className="absolute top-5 right-5 flex gap-2">
                      <button
                        onClick={() => setIdx((i) => (i - 1 + heroSlides.length) % heroSlides.length)}
                        className="w-9 h-9 rounded-full bg-[#fbfaf6]/25 backdrop-blur border border-white/30 text-white flex items-center justify-center hover:bg-[#fbfaf6]/50 transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIdx((i) => (i + 1) % heroSlides.length)}
                        className="w-9 h-9 rounded-full bg-[#fbfaf6]/25 backdrop-blur border border-white/30 text-white flex items-center justify-center hover:bg-[#fbfaf6]/50 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-[#fff9e6] relative">
                  <div className="w-24 h-24 rounded-full border-2 border-[#c99f3b]/40 bg-[#c99f3b]/10 flex items-center justify-center mb-5 shadow-inner">
                    <GraduationCap className="w-12 h-12 text-[#c99f3b]" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.3em] text-[#c99f3b] font-semibold">Junior Darbhanga Premium School</div>
                  <div className="font-display text-2xl font-bold mt-2 text-[#fff9e6]">Darbhanga</div>
                  <div className="text-xs text-[#fff9e6]/75 mt-3 max-w-xs leading-relaxed">
                    Nurturing Minds, Shaping Futures • CBSE Affiliation
                  </div>
                </div>
              )}
            </div>

            {/* Floating stat card */}
            {heroBadge.enabled !== false && (heroBadge.value || heroBadge.label) && (
              <div className="float-y hidden md:block absolute -left-8 bottom-16 bg-[#fbfaf6] rounded-2xl shadow-2xl shadow-[#0a3d29]/20 p-5 w-[240px] border border-[#0a5f3d]/10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#c99f3b]/15 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#c99f3b]" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-[#0a3d29] text-lg">{heroBadge.value || ""}</div>
                    <div className="text-[11px] uppercase tracking-widest text-[#1c2a24]/60">{heroBadge.label || ""}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Slide dots */}
            <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-2">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "bg-[#0a5f3d] w-8" : "bg-[#0a5f3d]/25 w-3"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
