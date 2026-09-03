import React, { useState } from "react";
import { programs as fallbackPrograms } from "../mock";
import { useContent } from "../lib/ContentContext";
import { ArrowUpRight, Sparkles } from "lucide-react";

const Academics = () => {
  const { content } = useContent();
  const programs = (content.programs && content.programs.length ? content.programs : fallbackPrograms);
  const intro = content.academics_intro || {};
  const [active, setActive] = useState(0);

  return (
    <section id="academics" className="relative py-24 bg-[#f5f2ea]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-[12px] tracking-[0.3em] uppercase text-[#0a5f3d] font-semibold">{intro.eyebrow || "Academic Programs"}</div>
            <h2 className="font-display mt-3 text-[38px] md:text-[52px] leading-[1.05] font-bold text-[#0a3d29]">
              {intro.title_main || "A learning path designed"}
              <span className="italic text-[#c99f3b] font-medium"> {intro.title_accent || "for every age."}</span>
            </h2>
          </div>
          <p className="text-[15px] text-[#1c2a24]/70 max-w-md">
            {intro.description || "From playful Nursery mornings to focused Board year preparation, our curriculum grows with your child — thoughtfully, joyfully and rigorously."}
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-12 gap-10">
          {/* Tabs */}
          <div className="lg:col-span-4 space-y-3">
            {programs.map((p, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-full text-left rounded-2xl px-6 py-5 border transition-all ${
                  active === i
                    ? "bg-[#0a3d29] border-[#0a3d29] text-[#fff9e6] shadow-xl shadow-[#0a3d29]/20"
                    : "bg-white border-[#0a5f3d]/10 text-[#0a3d29] hover:border-[#0a5f3d]/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className={`text-[11px] tracking-[0.25em] uppercase ${active === i ? "text-[#c99f3b]" : "text-[#0a5f3d]/70"}`}>
                      {p.grades}
                    </div>
                    <div className="font-display text-xl font-semibold mt-1">{p.level}</div>
                    <div className={`text-[13px] mt-1 ${active === i ? "text-[#fff9e6]/70" : "text-[#1c2a24]/55"}`}>
                      Ages {p.ageRange}
                    </div>
                  </div>
                  <ArrowUpRight className={`w-5 h-5 mt-1 transition-transform ${active === i ? "rotate-0" : "-rotate-45"}`} />
                </div>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="lg:col-span-8">
            {(() => {
              const cur = programs[active] || programs[0] || {};
              const highlights = Array.isArray(cur.highlights) ? cur.highlights : [];
              return (
                <div className="grid md:grid-cols-2 gap-8 items-stretch">
                  <div className="rounded-3xl overflow-hidden aspect-[4/5] zoom-parent shadow-xl">
                    <img src={cur.image} alt={cur.level || "Academic Program"} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#c99f3b]/15 text-[#8a6b1e] text-[11px] font-semibold tracking-widest uppercase">
                      <Sparkles className="w-3 h-3" /> {cur.grades}
                    </div>
                    <h3 className="font-display text-3xl md:text-4xl font-bold text-[#0a3d29] mt-4">
                      {cur.level}
                    </h3>
                    <p className="mt-5 text-[15.5px] leading-relaxed text-[#1c2a24]/75">
                      {cur.desc}
                    </p>
                    <div className="mt-7 space-y-3">
                      {highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#0a5f3d]/10 flex items-center justify-center mt-0.5 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-[#0a5f3d]"></div>
                          </div>
                          <span className="text-[15px] text-[#1c2a24]/80">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Academics;
