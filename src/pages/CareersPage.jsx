import React from "react";
import { useContent } from "../lib/ContentContext";
import { Briefcase, MapPin, ArrowRight, Mail } from "lucide-react";
import { Button } from "../components/ui/button";

const CareersPage = () => {
  const { content } = useContent();
  const careers = content.careers || {};
  const jobs = Array.isArray(careers.jobs) ? careers.jobs : [];

  return (
    <div className="pb-24 bg-[#fbfaf6]">
      <section className="relative bg-[#0a3d29] text-[#fff9e6] py-24 overflow-hidden">
        <div className="blob w-[400px] h-[400px] bg-[#c99f3b] -top-40 -right-40 opacity-25" />
        <div className="dots-bg absolute inset-0 opacity-25" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fff9e6]/10 border border-[#fff9e6]/15 text-[#c99f3b] text-[11px] font-bold tracking-widest uppercase">
            <Briefcase className="w-3.5 h-3.5" /> {careers.eyebrow || "Careers"}
          </div>
          <h1 className="font-display mt-4 text-[42px] md:text-[58px] leading-[1.05] font-bold">
            {careers.title_main || "Grow with a school that"}
            <span className="italic text-[#c99f3b] font-medium"> {careers.title_accent || "grows children."}</span>
          </h1>
          <p className="mt-6 text-[16px] leading-relaxed text-[#fff9e6]/85 max-w-2xl">
            {careers.description || "We are always looking for warm, curious educators who share our belief that every child deserves an inspiring school day."}
          </p>
          {careers.contact_email && (
            <a
              href={`mailto:${careers.contact_email}`}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#c99f3b] hover:bg-[#b48c2b] text-[#0a3d29] h-11 px-6 font-semibold text-[14px] shadow-lg"
            >
              <Mail className="w-4 h-4" /> Send your CV to {careers.contact_email}
            </a>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 mt-14">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-[#0a3d29] mb-6">Current Openings</h2>
        {jobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#0a5f3d]/10 py-20 text-center text-[#1c2a24]/50">
            No openings listed at the moment — send us your CV and we'll reach out when a role opens up.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((j, i) => (
              <article key={i} className="lift bg-white rounded-3xl border border-[#0a5f3d]/10 p-7">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-xl md:text-2xl font-semibold text-[#0a3d29]">{j.title}</h3>
                      {j.type && <span className="px-2.5 py-0.5 rounded-full bg-[#0a5f3d]/10 text-[#0a5f3d] text-[10.5px] font-bold tracking-widest uppercase">{j.type}</span>}
                      {j.department && <span className="text-[11px] tracking-widest uppercase text-[#c99f3b] font-semibold">{j.department}</span>}
                    </div>
                    {j.location && (
                      <div className="mt-2 flex items-center gap-1.5 text-[13px] text-[#1c2a24]/65">
                        <MapPin className="w-3.5 h-3.5" /> {j.location}
                      </div>
                    )}
                    {j.description && (
                      <p className="mt-4 text-[14.5px] leading-relaxed text-[#1c2a24]/75">{j.description}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {j.apply_url ? (
                      <a href={j.apply_url} target="_blank" rel="noreferrer">
                        <Button className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-11 px-6 font-semibold">
                          Apply <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </a>
                    ) : careers.contact_email ? (
                      <a href={`mailto:${careers.contact_email}?subject=Application: ${encodeURIComponent(j.title)}`}>
                        <Button className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-11 px-6 font-semibold">
                          Email CV <Mail className="w-4 h-4 ml-2" />
                        </Button>
                      </a>
                    ) : null}
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

export default CareersPage;
