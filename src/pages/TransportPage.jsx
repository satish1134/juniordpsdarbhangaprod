import React from "react";
import { useContent } from "../lib/ContentContext";
import { Bus, Mail } from "lucide-react";
import * as Icons from "lucide-react";

const IconByName = ({ name, className }) => {
  const Comp = Icons[name] || Icons.CircleDot;
  return <Comp className={className} />;
};

const TransportPage = () => {
  const { content } = useContent();
  const data = content.transport_policies || {};
  const policies = Array.isArray(data.policies) ? data.policies : [];

  return (
    <div className="pb-24 bg-[#fbfaf6]">
      <section className="relative bg-[#0a3d29] text-[#fff9e6] py-24 overflow-hidden">
        <div className="blob w-[400px] h-[400px] bg-[#c99f3b] -top-40 -right-40 opacity-25" />
        <div className="dots-bg absolute inset-0 opacity-25" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fff9e6]/10 border border-[#fff9e6]/15 text-[#c99f3b] text-[11px] font-bold tracking-widest uppercase">
            <Bus className="w-3.5 h-3.5" /> {data.eyebrow || "Transport"}
          </div>
          <h1 className="font-display mt-4 text-[42px] md:text-[58px] leading-[1.05] font-bold">
            {data.title_main || "Safe, punctual and"}
            <span className="italic text-[#c99f3b] font-medium"> {data.title_accent || "parent-friendly transport."}</span>
          </h1>
          {data.description && (
            <p className="mt-6 text-[16px] leading-relaxed text-[#fff9e6]/85 max-w-2xl">
              {data.description}
            </p>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 mt-14">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-[#0a3d29] mb-6">
          Transport Policies
        </h2>
        {policies.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#0a5f3d]/10 py-16 text-center text-[#1c2a24]/50">
            Transport policies will appear here once added by the school office.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {policies.map((p, i) => (
              <article
                key={i}
                data-testid={`transport-policy-${i}`}
                className="lift bg-white rounded-3xl border border-[#0a5f3d]/10 p-6 flex gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0a5f3d]/8 flex items-center justify-center shrink-0">
                  <IconByName name={p.icon || "CircleDot"} className="w-5 h-5 text-[#0a5f3d]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-semibold text-[#0a3d29]">{p.title}</h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[#1c2a24]/75">{p.body}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {data.contact_note && (
          <div className="mt-10 rounded-3xl bg-[#c99f3b]/10 border border-[#c99f3b]/25 p-6 flex gap-3 items-start">
            <Mail className="w-5 h-5 text-[#8a6b1e] mt-0.5 shrink-0" />
            <p className="text-[14.5px] leading-relaxed text-[#8a6b1e]">
              {data.contact_note}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default TransportPage;
