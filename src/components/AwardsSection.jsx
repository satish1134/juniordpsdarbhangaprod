import React from "react";
import { useContent } from "../lib/ContentContext";
import { resolveImageUrl } from "../lib/api";
import { Trophy, Award } from "lucide-react";

const AwardsSection = () => {
  const { content } = useContent();
  const data = content.awards || {};
  if (data.enabled === false) return null;
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) return null;

  return (
    <section
      id="awards"
      data-testid="awards-section"
      className="relative py-24 bg-[#fbfaf6] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c99f3b]/15 border border-[#c99f3b]/30 text-[#8a6b1e] text-[11px] font-bold tracking-widest uppercase">
            <Trophy className="w-3.5 h-3.5" /> {data.eyebrow || "Awards & Achievements"}
          </div>
          <h2 className="font-display mt-4 text-[38px] md:text-[52px] leading-[1.05] font-bold text-[#0a3d29]">
            {data.title_main || "Honours we wear"}
            <span className="italic text-[#c99f3b] font-medium"> {data.title_accent || "with pride."}</span>
          </h2>
          {data.description && (
            <p className="mt-5 text-[16px] leading-relaxed text-[#1c2a24]/75">
              {data.description}
            </p>
          )}
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((a, i) => (
            <article
              key={`${a.title || "award"}-${a.year || i}`}
              data-testid={`award-card-${i}`}
              className="lift bg-white border border-[#0a5f3d]/10 rounded-3xl overflow-hidden flex flex-col"
            >
              {a.image ? (
                <div className="aspect-[4/3] overflow-hidden bg-[#f5f2ea]">
                  <img
                    src={resolveImageUrl(a.image)}
                    alt={a.title || "Award"}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div className="aspect-[4/3] bg-gradient-to-br from-[#0a3d29] to-[#0a5f3d] flex items-center justify-center">
                  <Award className="w-14 h-14 text-[#c99f3b]" />
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2">
                  {a.year && (
                    <span className="px-2 py-0.5 rounded-full bg-[#0a5f3d]/10 text-[#0a5f3d] text-[10.5px] font-bold tracking-widest uppercase">
                      {a.year}
                    </span>
                  )}
                  {a.awarded_by && (
                    <span className="text-[10.5px] tracking-widest uppercase text-[#c99f3b] font-bold truncate">
                      {a.awarded_by}
                    </span>
                  )}
                </div>
                <h3 className="font-display mt-3 text-lg font-bold text-[#0a3d29] leading-snug">
                  {a.title}
                </h3>
                {a.description && (
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[#1c2a24]/70">
                    {a.description}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AwardsSection;
