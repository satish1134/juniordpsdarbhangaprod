import React from "react";
import { useContent } from "../lib/ContentContext";
import { Download, FileText } from "lucide-react";
import { Button } from "./ui/button";

const BrochureBand = () => {
  const { content } = useContent();
  const data = content.brochure || {};
  if (data.enabled === false) return null;

  return (
    <section
      id="brochure"
      data-testid="brochure-section"
      className="relative py-20 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="relative rounded-[36px] bg-[#0a3d29] text-[#fff9e6] p-10 md:p-14 overflow-hidden">
          <div className="blob w-[380px] h-[380px] bg-[#c99f3b] -top-40 -right-40 opacity-30" />
          <div className="dots-bg absolute inset-0 opacity-25" />
          <div className="relative grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fff9e6]/10 border border-[#fff9e6]/15 text-[#c99f3b] text-[11px] font-bold tracking-widest uppercase">
                <FileText className="w-3.5 h-3.5" /> {data.eyebrow || "Prospectus"}
              </div>
              <h2 className="font-display mt-4 text-[34px] md:text-[46px] leading-[1.05] font-bold">
                {data.title_main || "Download the school"}
                <span className="italic text-[#c99f3b] font-medium"> {data.title_accent || "brochure."}</span>
              </h2>
              {data.description && (
                <p className="mt-5 text-[15.5px] leading-relaxed text-[#fff9e6]/85 max-w-2xl">
                  {data.description}
                </p>
              )}
              {data.secondary_note && (
                <p className="mt-3 text-[13px] text-[#fff9e6]/60 max-w-2xl">
                  {data.secondary_note}
                </p>
              )}
            </div>
            <div className="lg:col-span-4 flex flex-col items-start lg:items-end gap-2">
              {data.brochure_url ? (
                <a
                  href={data.brochure_url}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="brochure-download-btn"
                >
                  <Button className="bg-[#c99f3b] hover:bg-[#b48c2b] text-[#0a3d29] rounded-full h-12 px-7 font-semibold text-[14.5px] shadow-lg">
                    <Download className="w-4 h-4 mr-2" /> {data.button_label || "Download Brochure"}
                  </Button>
                </a>
              ) : (
                <Button
                  disabled
                  data-testid="brochure-download-btn-disabled"
                  className="bg-[#c99f3b]/40 text-[#0a3d29]/60 rounded-full h-12 px-7 font-semibold text-[14.5px] cursor-not-allowed"
                >
                  <Download className="w-4 h-4 mr-2" /> {data.button_label || "Download Brochure"}
                </Button>
              )}
              {data.brochure_size && (
                <div className="text-[11px] tracking-[0.25em] uppercase text-[#fff9e6]/60 font-semibold">
                  {data.brochure_size}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrochureBand;
