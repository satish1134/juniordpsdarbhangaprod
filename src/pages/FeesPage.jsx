import React from "react";
import { useContent } from "../lib/ContentContext";
import { feeStructure as fallbackFeeStructure, feeNotes as fallbackNotes } from "../mock";
import { Info, IndianRupee, ArrowRight, Download, CreditCard } from "lucide-react";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

const inr = (n) => Number(n || 0).toLocaleString("en-IN");

const FeesPage = () => {
  const { content } = useContent();
  const feeStructure = Array.isArray(content?.fee_structure) && content.fee_structure.length ? content.fee_structure : fallbackFeeStructure;
  const schoolInfo = content?.school_info || {};
  const extras = content?.fees_extras || {};
  const notes = Array.isArray(extras?.notes) && extras.notes.length ? extras.notes : (Array.isArray(content?.fee_notes) && content.fee_notes.length ? content.fee_notes : fallbackNotes);
  return (
    <div className="pt-6 pb-24 bg-[#fbfaf6]">
      {/* Hero band */}
      <section className="relative bg-[#0a3d29] text-[#fff9e6] py-24 overflow-hidden">
        <div className="blob w-[400px] h-[400px] bg-[#c99f3b] -top-40 -right-40 opacity-25" />
        <div className="dots-bg absolute inset-0 opacity-25" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-[12px] tracking-[0.3em] uppercase text-[#c99f3b] font-semibold">{extras.eyebrow || "Fee Structure"}</div>
          <h1 className="font-display mt-3 text-[42px] md:text-[62px] leading-[1.05] font-bold">
            {extras.title_main || "A transparent"}
            <span className="italic text-[#c99f3b] font-medium"> {extras.title_accent || "fee structure."}</span>
          </h1>
          <p className="mt-6 text-[16px] leading-relaxed text-[#fff9e6]/80 max-w-2xl">
            {extras.intro || `Session fee particulars for ${schoolInfo.name || "the school"}. All amounts are in Indian Rupees (₹).`}
          </p>
        </div>
      </section>

      {/* Fee Table */}
      <section className="max-w-7xl mx-auto px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl shadow-[#0a3d29]/15 border border-[#0a5f3d]/10 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-0 bg-[#0a5f3d] text-[#fff9e6] text-[12px] tracking-[0.2em] uppercase font-semibold">
            <div className="p-5 md:col-span-1">Class</div>
            <div className="p-5 hidden md:block">Admission Fee</div>
            <div className="p-5 hidden md:block">Annual Charges</div>
            <div className="p-5 hidden md:block">Monthly Tuition</div>
            <div className="p-5 hidden md:block">Transport (Base)</div>
          </div>
          {feeStructure.map((row, i) => (
            <div
              key={i}
              className={`grid grid-cols-2 md:grid-cols-5 gap-y-2 md:gap-y-0 border-b border-[#0a5f3d]/10 last:border-b-0 hover:bg-[#f5f2ea] transition-colors`}
            >
              <div className="p-5 md:col-span-1 flex items-center">
                <div>
                  <div className="font-display text-lg font-semibold text-[#0a3d29]">{row.class}</div>
                  <div className="text-xs text-[#1c2a24]/50 md:hidden mt-1">Tap for details below</div>
                </div>
              </div>
              {[
                { label: "Admission Fee", value: row.admission, once: "One-time" },
                { label: "Annual Charges", value: row.annual, once: "Per year" },
                { label: "Monthly Tuition", value: row.tuition, once: "Per month" },
                { label: "Transport", value: row.transport, once: "Per month" },
              ].map((c, k) => (
                <div key={k} className="p-5 md:border-l md:border-[#0a5f3d]/10">
                  <div className="md:hidden text-[10px] tracking-[0.2em] uppercase text-[#0a5f3d] font-semibold mb-1">{c.label}</div>
                  <div className="flex items-baseline gap-1">
                    <IndianRupee className="w-4 h-4 text-[#0a5f3d]" strokeWidth={2.5} />
                    <span className="font-display text-xl font-bold text-[#0a3d29]">{inr(c.value)}</span>
                  </div>
                  <div className="text-[11px] text-[#1c2a24]/50 mt-1">{c.once}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="mt-12 grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white border border-[#0a5f3d]/10 rounded-3xl p-8">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#0a5f3d]/10 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-[#0a5f3d]" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-[#0a3d29]">{extras.notes_title || "Fee policy notes"}</h2>
                <ul className="mt-4 space-y-3">
                  {notes.map((n, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14.5px] text-[#1c2a24]/75 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c99f3b] mt-2 shrink-0"></span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-[#0a3d29] text-[#fff9e6] rounded-3xl p-8 flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#c99f3b]/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#c99f3b]" />
              </div>
              <h3 className="font-display text-xl font-semibold mt-5">{extras.payment_title || "Payment methods"}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#fff9e6]/75">
                {extras.payment_body || "Fees can be paid via bank transfer, UPI, cheque or in cash at the school office."}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button className="bg-[#c99f3b] hover:bg-[#b48c2b] text-[#0a3d29] rounded-full h-11 font-semibold justify-center">
                <Download className="w-4 h-4 mr-2" /> {extras.payment_cta || "Download Fee Brochure"}
              </Button>
              <Link to="/#contact" className="text-[13px] text-[#fff9e6]/80 hover:text-[#c99f3b] flex items-center justify-center gap-2">
                Talk to accounts <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FeesPage;
