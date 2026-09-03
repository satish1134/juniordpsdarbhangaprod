import React, { useState } from "react";
import { useContent } from "../lib/ContentContext";
import { BookOpen, Sparkles, ChevronDown } from "lucide-react";

const Curriculum = () => {
  const { content } = useContent();
  const [openIdx, setOpenIdx] = useState(0);
  const data = content.curriculum || {};
  const classes = Array.isArray(data.classes) ? data.classes : [];
  if (data.enabled === false || !classes.length) return null;

  return (
    <section
      id="curriculum"
      data-testid="curriculum-section"
      className="relative py-24 bg-[#f5f2ea]/60 border-t border-[#0a5f3d]/8 overflow-hidden"
    >
      <div className="blob w-[400px] h-[400px] bg-[#0a5f3d] -top-40 -right-40 opacity-10" />
      <div className="dots-bg absolute inset-0 opacity-15" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a5f3d]/10 border border-[#0a5f3d]/25 text-[#0a5f3d] text-[11px] font-bold tracking-widest uppercase">
            <BookOpen className="w-3.5 h-3.5" /> {data.eyebrow || "Curriculum"}
          </div>
          <h2 className="font-display mt-4 text-[36px] md:text-[48px] leading-[1.05] font-bold text-[#0a3d29]">
            {data.title_main || "What each class"}
            <span className="italic text-[#c99f3b] font-medium"> {data.title_accent || "studies."}</span>
          </h2>
          {data.description && (
            <p className="mt-5 text-[16px] leading-relaxed text-[#1c2a24]/70">
              {data.description}
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-3">
          {/* Left rail — class list */}
          <div className="lg:col-span-1 space-y-2">
            {classes.map((c, i) => (
              <button
                key={c.grade || `class-${i}`}
                onClick={() => setOpenIdx(i)}
                data-testid={`curriculum-tab-${i}`}
                className={`w-full text-left px-5 py-4 rounded-2xl border transition-all ${
                  openIdx === i
                    ? "bg-[#0a3d29] text-[#fff9e6] border-[#0a3d29] shadow-lg shadow-[#0a3d29]/25"
                    : "bg-white text-[#0a3d29] border-[#0a5f3d]/10 hover:border-[#0a5f3d]/30"
                }`}
              >
                <div className={`text-[10.5px] tracking-[0.25em] uppercase font-bold ${openIdx === i ? "text-[#c99f3b]" : "text-[#c99f3b]"}`}>
                  {c.level || "CBSE"}
                </div>
                <div className="font-display text-[18px] font-bold mt-0.5">{c.grade || `Class ${i + 1}`}</div>
              </button>
            ))}
          </div>

          {/* Right — details */}
          <div className="lg:col-span-2">
            {(() => {
              const c = classes[openIdx] || classes[0];
              const subjects = Array.isArray(c.subjects) ? c.subjects : String(c.subjects || "").split(",").map((s) => s.trim()).filter(Boolean);
              return (
                <div className="bg-white rounded-3xl border border-[#0a5f3d]/10 p-8">
                  <div className="text-[11px] tracking-[0.25em] uppercase text-[#c99f3b] font-bold">{c.level}</div>
                  <h3 className="font-display text-[26px] md:text-[32px] font-bold text-[#0a3d29] mt-1">{c.grade}</h3>

                  <div className="mt-6">
                    <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-3">Subjects</div>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((s, k) => (
                        <span key={k} className="px-3 py-1.5 rounded-full bg-[#0a5f3d]/8 text-[#0a3d29] text-[13px] font-semibold">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {c.cocurricular && (
                    <div className="mt-6">
                      <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#c99f3b]" /> Co-curricular
                      </div>
                      <p className="text-[14px] leading-relaxed text-[#1c2a24]/75">{c.cocurricular}</p>
                    </div>
                  )}

                  {c.note && (
                    <div className="mt-6 rounded-2xl bg-[#c99f3b]/10 border border-[#c99f3b]/25 p-4 text-[13.5px] leading-relaxed text-[#8a6b1e]">
                      {c.note}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Curriculum;
