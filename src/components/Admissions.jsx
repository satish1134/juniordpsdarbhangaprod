import React from "react";
import { admissionSteps as fallbackSteps } from "../mock";
import { useContent } from "../lib/ContentContext";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";

const Admissions = ({ onEnquiry }) => {
  const { content } = useContent();
  const admissionSteps = (content.admission_steps && content.admission_steps.length ? content.admission_steps : fallbackSteps);
  const intro = content.admissions_intro || {};
  return (
    <section id="admissions" className="relative py-24 bg-[#0a3d29] text-[#fff9e6] overflow-hidden">
      <div className="blob w-[500px] h-[500px] bg-[#c99f3b] -top-40 -right-40 opacity-25" />
      <div className="blob w-[400px] h-[400px] bg-[#167a51] -bottom-40 -left-40 opacity-40" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <div className="text-[12px] tracking-[0.3em] uppercase text-[#c99f3b] font-semibold">{intro.eyebrow || "Admissions Open"}</div>
            <h2 className="font-display mt-3 text-[38px] md:text-[54px] leading-[1.05] font-bold">
              {intro.title_main || "Join the class of"}
              <span className="italic text-[#c99f3b] font-medium"> {intro.title_accent || "2025-26."}</span>
            </h2>
            <p className="mt-6 text-[16px] leading-relaxed text-[#fff9e6]/80 max-w-md">
              {intro.description || "Seats are filling quickly. Our simple process makes enrolling your child a warm and welcoming experience."}
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button
                onClick={onEnquiry}
                className="group bg-[#c99f3b] hover:bg-[#b48c2b] text-[#0a3d29] rounded-full h-12 px-7 font-semibold text-[15px] shadow-lg"
              >
                {intro.cta_primary || "Start Application"}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <a
                href="#contact"
                className="rounded-full h-12 px-7 flex items-center border border-[#fff9e6]/25 hover:border-[#c99f3b] text-[#fff9e6] font-semibold text-[15px] transition"
              >
                {intro.cta_secondary || "Visit Campus"}
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid sm:grid-cols-2 gap-5">
              {admissionSteps.map((s) => (
                <div
                  key={s.step}
                  className="relative bg-[#fff9e6]/5 backdrop-blur-sm border border-[#fff9e6]/10 rounded-3xl p-7 hover:bg-[#fff9e6]/10 hover:border-[#c99f3b]/40 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#c99f3b] text-[#0a3d29] flex items-center justify-center font-display text-xl font-bold shadow-lg">
                      {s.step}
                    </div>
                    <h3 className="font-display text-lg font-semibold flex-1">{s.title}</h3>
                  </div>
                  <p className="mt-5 text-[14px] leading-relaxed text-[#fff9e6]/75">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Admissions;
