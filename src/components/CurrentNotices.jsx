import React, { useState } from "react";
import { useContent } from "../lib/ContentContext";
import { Megaphone, AlertTriangle, Calendar, ArrowUpRight, Bell } from "lucide-react";

const CurrentNotices = () => {
  const { content } = useContent();
  const [expanded, setExpanded] = useState(false);
  const data = content.current_notices || {};
  const notices = Array.isArray(data.notices) ? data.notices : [];
  if (data.enabled === false || !notices.length) return null;
  const shown = expanded ? notices : notices.slice(0, 4);

  return (
    <section
      id="notices"
      data-testid="notices-section"
      className="relative py-20 bg-[#fbfaf6] border-t border-[#0a5f3d]/8"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-10 items-end mb-10">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c99f3b]/15 border border-[#c99f3b]/30 text-[#8a6b1e] text-[11px] font-bold tracking-widest uppercase">
              <Megaphone className="w-3.5 h-3.5" /> {data.eyebrow || "Notices"}
            </div>
            <h2 className="font-display mt-4 text-[34px] md:text-[46px] leading-[1.05] font-bold text-[#0a3d29]">
              {data.title_main || "Current"}
              <span className="italic text-[#c99f3b] font-medium"> {data.title_accent || "notices."}</span>
            </h2>
          </div>
          <div className="lg:col-span-4">
            {data.description && (
              <p className="text-[15px] leading-relaxed text-[#1c2a24]/70">{data.description}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {shown.map((n, i) => (
            <article
              key={`${n.title || "notice"}-${n.date || i}`}
              data-testid={`notice-card-${i}`}
              className={`relative rounded-3xl border p-6 flex flex-col gap-3 transition-all hover:-translate-y-0.5 ${
                n.urgent
                  ? "bg-white border-red-200 ring-1 ring-red-100"
                  : "bg-white border-[#0a5f3d]/10 hover:border-[#0a5f3d]/25"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                {n.urgent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10.5px] font-bold tracking-widest uppercase">
                    <AlertTriangle className="w-3 h-3" /> Urgent
                  </span>
                )}
                {n.category && (
                  <span className="px-2 py-0.5 rounded-full bg-[#0a5f3d]/10 text-[#0a5f3d] border border-[#0a5f3d]/20 text-[10.5px] font-bold tracking-widest uppercase">
                    {n.category}
                  </span>
                )}
                {n.date && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-[#1c2a24]/60 font-semibold">
                    <Calendar className="w-3 h-3" /> {n.date}
                  </span>
                )}
              </div>
              <h3 className="font-display text-[17px] font-bold text-[#0a3d29] leading-snug">{n.title}</h3>
              {n.body && (
                <p className="text-[13.5px] leading-relaxed text-[#1c2a24]/70">{n.body}</p>
              )}
              {n.link_url && (
                <a
                  href={n.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#0a5f3d] hover:text-[#084a30]"
                >
                  Read more <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </article>
          ))}
        </div>

        {notices.length > 4 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0a5f3d] hover:text-[#084a30] px-5 py-2.5 rounded-full border border-[#0a5f3d]/20 hover:border-[#0a5f3d]/40 bg-white"
              data-testid="notices-toggle"
            >
              <Bell className="w-3.5 h-3.5" />
              {expanded ? "Show fewer notices" : `Show all ${notices.length} notices`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default CurrentNotices;
