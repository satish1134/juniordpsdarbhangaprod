import React from "react";
import { useContent } from "../lib/ContentContext";
import { ShieldCheck, Calendar as CalIcon } from "lucide-react";

// Generic policy page — reused by both Privacy and Terms
const PolicyPage = ({ sectionKey, fallbackTitle, Icon = ShieldCheck }) => {
  const { content } = useContent();
  const doc = content[sectionKey] || {};
  const sections = Array.isArray(doc.sections) ? doc.sections : [];

  return (
    <div className="pb-24 bg-[#fbfaf6]">
      <section className="relative bg-[#0a3d29] text-[#fff9e6] py-24 overflow-hidden">
        <div className="blob w-[400px] h-[400px] bg-[#c99f3b] -top-40 -right-40 opacity-25" />
        <div className="dots-bg absolute inset-0 opacity-25" />
        <div className="relative max-w-4xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fff9e6]/10 border border-[#fff9e6]/15 text-[#c99f3b] text-[11px] font-bold tracking-widest uppercase">
            <Icon className="w-3.5 h-3.5" /> Legal
          </div>
          <h1 className="font-display mt-4 text-[42px] md:text-[58px] leading-[1.05] font-bold">
            {doc.title || fallbackTitle}
          </h1>
          {doc.updated && (
            <div className="mt-6 flex items-center gap-2 text-[13px] text-[#fff9e6]/70">
              <CalIcon className="w-4 h-4" /> Last updated: {doc.updated}
            </div>
          )}
          {doc.intro && (
            <p className="mt-6 text-[16px] leading-relaxed text-[#fff9e6]/85">
              {doc.intro}
            </p>
          )}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 mt-14">
        {sections.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#0a5f3d]/10 py-20 text-center text-[#1c2a24]/50">
            This policy is being updated. Please check back shortly.
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((s, i) => (
              <article key={i} className="bg-white border border-[#0a5f3d]/10 rounded-3xl p-8">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#0a5f3d] text-[#fff9e6] flex items-center justify-center font-display font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display text-[22px] md:text-[26px] font-bold text-[#0a3d29] leading-snug">
                      {s.heading}
                    </h2>
                    <p className="mt-3 text-[15px] leading-[1.85] text-[#1c2a24]/80 whitespace-pre-line">
                      {s.body}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PolicyPage;
