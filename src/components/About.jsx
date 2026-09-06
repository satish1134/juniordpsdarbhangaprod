import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Quote } from "lucide-react";
import { stats as fallbackStats, aboutHighlights as fallbackHighlights } from "../mock";
import { useContent } from "../lib/ContentContext";
import { resolveImageUrl } from "../lib/api";

const Counter = ({ value, suffix }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1600;
          const start = performance.now();
          const step = (t) => {
            const p = Math.min((t - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setN(Math.round(value * eased));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      });
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="font-display text-4xl md:text-5xl font-bold text-[#fff9e6]">
      {n.toLocaleString()}
      <span className="text-[#c99f3b]">{suffix}</span>
    </span>
  );
};

const About = () => {
  const { content } = useContent();
  const principalMessage = content.principal || {};
  const aboutHighlights = (content.about_highlights && content.about_highlights.length ? content.about_highlights : fallbackHighlights);
  const stats = (content.stats && content.stats.length ? content.stats : fallbackStats);
  const intro = content.about_intro || {};
  return (
    <section id="about" className="relative py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <div className="text-[12px] tracking-[0.3em] uppercase text-[#0a5f3d] font-semibold">{intro.eyebrow || "About the school"}</div>
            <h2 className="font-display mt-3 text-[38px] md:text-[52px] leading-[1.05] font-bold text-[#0a3d29]">
              {intro.title_main || "A decade of joyful learning,"}
              <span className="italic text-[#c99f3b] font-medium"> {intro.title_accent || "deep-rooted values."}</span>
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[16px] leading-relaxed text-[#1c2a24]/75">
              {intro.description || "Since 2015, Junior DPS Darbhanga has been a warm, purposeful home for young learners from Nursery to Class X. We combine a rigorous CBSE curriculum with the arts, sports and civic values that shape truly well-rounded children."}
            </p>
          </div>
        </div>

        {/* Highlights grid */}
        <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {aboutHighlights.map((h, i) => (
            <div
              key={i}
              className="lift bg-white border border-[#0a5f3d]/10 rounded-3xl p-7 group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#0a5f3d]/8 flex items-center justify-center mb-5 group-hover:bg-[#0a5f3d] transition">
                <CheckCircle2 className="w-5 h-5 text-[#0a5f3d] group-hover:text-[#fff9e6]" />
              </div>
              <h3 className="font-display text-lg font-semibold text-[#0a3d29]">{h.title}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#1c2a24]/70">{h.desc}</p>
            </div>
          ))}
        </div>

        {/* Principal message */}
        <div className="mt-24 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[32px] overflow-hidden aspect-[4/5] shadow-2xl shadow-[#0a3d29]/20 zoom-parent bg-[#0a3d29]">
              {principalMessage.photo ? (
                <img
                  src={resolveImageUrl(principalMessage.photo)}
                  alt={principalMessage.name || "Principal"}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#0a3d29] via-[#084a30] to-[#042417] flex flex-col items-center justify-center text-center p-6">
                  <div className="w-24 h-24 rounded-full border-2 border-[#c99f3b]/40 bg-[#c99f3b]/10 flex items-center justify-center mb-4">
                    <span className="font-display text-3xl font-bold text-[#c99f3b]">JDPS</span>
                  </div>
                  <div className="font-display text-xl font-bold text-[#fff9e6]">{principalMessage.name || "Principal's Desk"}</div>
                  <div className="text-xs text-[#c99f3b] tracking-widest uppercase mt-1">Junior DPS Darbhanga</div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a3d29]/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-[#fff9e6]">
                <div className="font-display text-xl font-bold">{principalMessage.name}</div>
                <div className="text-sm opacity-85">{principalMessage.title}</div>
              </div>
            </div>
            <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-[#c99f3b] flex items-center justify-center shadow-xl">
              <Quote className="w-10 h-10 text-[#0a3d29]" strokeWidth={2.5} />
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="text-[12px] tracking-[0.3em] uppercase text-[#0a5f3d] font-semibold">Principal&rsquo;s Message</div>
            <h3 className="font-display mt-3 text-[32px] md:text-[42px] leading-[1.1] font-bold text-[#0a3d29]">
              &ldquo;Every child carries a spark of brilliance.&rdquo;
            </h3>
            <p className="mt-6 text-[16px] leading-[1.85] text-[#1c2a24]/75">
              {principalMessage.message}
            </p>
            <div className="mt-8 pt-6 border-t border-[#0a5f3d]/10">
              <div className="font-display text-lg font-semibold text-[#0a3d29]">{principalMessage.name}</div>
              <div className="text-sm text-[#1c2a24]/60">{principalMessage.title}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-24 rounded-[32px] bg-[#0a3d29] relative overflow-hidden grain">
          <div className="blob w-[420px] h-[420px] bg-[#c99f3b] -top-40 -right-40 opacity-30" />
          <div className="relative grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#fff9e6]/10 text-[#fff9e6]">
            {stats.map((s, i) => (
              <div key={i} className="px-6 py-10 md:py-14 text-center">
                <Counter value={s.value} suffix={s.suffix} />
                <div className="mt-2 text-[12px] tracking-[0.25em] uppercase text-[#fff9e6]/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
