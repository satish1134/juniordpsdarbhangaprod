import React from "react";
import { useContent } from "../lib/ContentContext";
import { Compass, Eye, Sparkles } from "lucide-react";

const iconFor = (kind) => {
  if (kind === "vision") return Eye;
  if (kind === "purpose") return Sparkles;
  return Compass;
};

const MissionVisionPurpose = () => {
  const { content } = useContent();
  const data = content.mission_vision_purpose || {};
  if (data.enabled === false) return null;
  const cards = Array.isArray(data.cards) ? data.cards : [];
  if (!cards.length) return null;

  return (
    <section
      id="mission-vision"
      data-testid="mission-vision-section"
      className="relative py-24 bg-[#f5f2ea] overflow-hidden"
    >
      <div className="blob w-[420px] h-[420px] bg-[#c99f3b] -top-40 -left-40 opacity-20" />
      <div className="dots-bg absolute inset-0 opacity-25" />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <div className="text-[12px] tracking-[0.3em] uppercase text-[#0a5f3d] font-semibold">
              {data.eyebrow || "Who we are"}
            </div>
            <h2 className="font-display mt-3 text-[38px] md:text-[52px] leading-[1.05] font-bold text-[#0a3d29]">
              {data.title_main || "Mission, vision and"}
              <span className="italic text-[#c99f3b] font-medium"> {data.title_accent || "our purpose."}</span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[16px] leading-relaxed text-[#1c2a24]/75">
              {data.description}
            </p>
          </div>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {cards.map((c, i) => {
            const Icon = iconFor(c.kind);
            return (
              <article
                key={c.title || `${c.kind || "card"}-${i}`}
                data-testid={`mvp-card-${i}`}
                className="lift bg-white border border-[#0a5f3d]/10 rounded-[28px] p-8 relative group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#0a5f3d]/8 flex items-center justify-center mb-6 group-hover:bg-[#0a5f3d] transition">
                  <Icon className="w-6 h-6 text-[#0a5f3d] group-hover:text-[#fff9e6]" />
                </div>
                <div className="text-[11px] tracking-[0.28em] uppercase text-[#c99f3b] font-bold">
                  {(c.kind || "").toString().toUpperCase() || "PILLAR"}
                </div>
                <h3 className="font-display mt-2 text-2xl font-bold text-[#0a3d29]">
                  {c.title}
                </h3>
                <p className="mt-4 text-[15px] leading-[1.75] text-[#1c2a24]/75">
                  {c.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MissionVisionPurpose;
