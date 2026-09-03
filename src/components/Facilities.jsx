import React from "react";
import { facilities as fallbackFacilities } from "../mock";
import { useContent } from "../lib/ContentContext";
import {
  MonitorPlay, FlaskConical, Laptop, BookOpen, Trophy, Music, Bus, HeartPulse, Utensils,
} from "lucide-react";

const iconMap = { MonitorPlay, FlaskConical, Laptop, BookOpen, Trophy, Music, Bus, HeartPulse, Utensils };

const Facilities = () => {
  const { content } = useContent();
  const facilities = (content.facilities_list && content.facilities_list.length ? content.facilities_list : fallbackFacilities);
  const intro = content.facilities_intro || {};
  return (
    <section id="facilities" className="relative py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="text-[12px] tracking-[0.3em] uppercase text-[#0a5f3d] font-semibold">{intro.eyebrow || "Campus Facilities"}</div>
          <h2 className="font-display mt-3 text-[38px] md:text-[52px] leading-[1.05] font-bold text-[#0a3d29]">
            {intro.title_main || "Thoughtfully designed spaces"}
            <span className="italic text-[#c99f3b] font-medium"> {intro.title_accent || "that inspire."}</span>
          </h2>
          <p className="mt-6 text-[16px] text-[#1c2a24]/70">
            {intro.description || "Every corner of our campus is built with the child in mind — bright, safe, engaging and fully equipped for exploration."}
          </p>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {facilities.map((f, i) => {
            const Icon = iconMap[f.icon] || BookOpen;
            return (
              <div
                key={i}
                className="lift group relative bg-white rounded-3xl p-7 border border-[#0a5f3d]/10 overflow-hidden"
              >
                <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#0a5f3d]/5 group-hover:bg-[#c99f3b]/15 transition-colors" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-[#0a5f3d] group-hover:bg-[#c99f3b] flex items-center justify-center transition-colors shadow-lg shadow-[#0a5f3d]/20">
                    <Icon className="w-6 h-6 text-[#fff9e6]" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#0a3d29] mt-6">{f.name}</h3>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-[#1c2a24]/70">{f.desc}</p>
                  <div className="mt-6 flex items-center gap-2 text-[13px] font-semibold text-[#0a5f3d]">
                    <span>Explore</span>
                    <span className="w-8 h-[1px] bg-[#0a5f3d] transition-all group-hover:w-14"></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Facilities;
