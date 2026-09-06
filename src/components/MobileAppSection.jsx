import React from "react";
import { useContent } from "../lib/ContentContext";
import { Smartphone, CheckCircle2, ExternalLink, Mail } from "lucide-react";

// Rendered on the home page only if `mobile_app.enabled` is true AND at least one link is set.
const MobileAppSection = () => {
  const { content } = useContent();
  const app = content.mobile_app || {};
  const hasLink = app.play_store_url || app.app_store_url || app.website_url;
  if (!app.enabled || !hasLink) return null;

  const features = Array.isArray(app.features) ? app.features : [];

  return (
    <section id="app" className="relative py-24 bg-[#f5f2ea] overflow-hidden">
      <div className="blob w-[420px] h-[420px] bg-[#0a5f3d] -top-40 -left-40 opacity-20" />
      <div className="blob w-[380px] h-[380px] bg-[#c99f3b] -bottom-40 -right-40 opacity-25" />

      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-10 items-center">
        {/* Text side */}
        <div className="lg:col-span-7 order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a5f3d]/10 text-[#0a5f3d] text-[11px] font-bold tracking-widest uppercase">
            <Smartphone className="w-3.5 h-3.5" /> Parent App
          </div>
          <h2 className="font-display mt-4 text-[36px] md:text-[52px] leading-[1.05] font-bold text-[#0a3d29]">
            {app.headline || "Get the Parent App"}
          </h2>
          {app.subhead && (
            <p className="mt-5 text-[16px] leading-relaxed text-[#1c2a24]/75 max-w-xl">
              {app.subhead}
            </p>
          )}

          {features.length > 0 && (
            <ul className="mt-8 grid sm:grid-cols-2 gap-3 max-w-xl">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-[14.5px] text-[#1c2a24]/80">
                  <CheckCircle2 className="w-4 h-4 text-[#0a5f3d] mt-1 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Download buttons */}
          <div className="mt-9 flex flex-wrap gap-4">
            {app.play_store_url && (
              <a
                href={app.play_store_url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-2xl bg-[#0a3d29] hover:bg-[#084a30] text-[#fff9e6] px-5 py-3 shadow-xl shadow-[#0a3d29]/25 transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" aria-hidden="true">
                  <path d="M3.6 2.3c-.4.4-.6.9-.6 1.5v16.4c0 .6.2 1.1.6 1.5l.1.1L13 12.2v-.2L3.7 2.2l-.1.1zM17.2 15.5l-3-3v-.2l3-3 .1.1 3.6 2c1 .6 1 1.6 0 2.2l-3.6 2-.1-.1zM14.3 14.4l-3.1-3.1L4 20.9c.4.4 1 .4 1.7.1l8.6-4.9-.9-.7zM4 3l7.2 9.6 3-3.1L5.7 2.9c-.7-.4-1.3-.3-1.7 0z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] tracking-widest uppercase opacity-80">Get it on</div>
                  <div className="font-display text-lg font-bold leading-tight">Google Play</div>
                </div>
              </a>
            )}
            {app.app_store_url && (
              <a
                href={app.app_store_url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 rounded-2xl bg-black hover:bg-[#111] text-white px-5 py-3 shadow-xl shadow-black/20 transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" aria-hidden="true">
                  <path d="M17.05 12.5c-.03-2.9 2.36-4.3 2.47-4.36-1.35-1.97-3.45-2.24-4.19-2.27-1.79-.18-3.49 1.05-4.4 1.05-.91 0-2.31-1.03-3.79-1-1.95.03-3.75 1.13-4.75 2.87-2.02 3.5-.52 8.67 1.45 11.51.96 1.39 2.11 2.95 3.6 2.89 1.45-.06 2-.94 3.75-.94 1.74 0 2.24.94 3.79.91 1.56-.03 2.55-1.41 3.51-2.81 1.1-1.61 1.56-3.17 1.59-3.25-.03-.02-3.05-1.18-3.08-4.68zM14.28 3.94c.8-.98 1.35-2.34 1.2-3.7-1.16.05-2.57.78-3.4 1.75-.74.86-1.4 2.24-1.22 3.57 1.29.1 2.61-.65 3.42-1.62z"/>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] tracking-widest uppercase opacity-80">Download on</div>
                  <div className="font-display text-lg font-bold leading-tight">App Store</div>
                </div>
              </a>
            )}
            {app.website_url && (
              <a
                href={app.website_url}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2 rounded-2xl bg-white border border-[#0a5f3d]/20 hover:border-[#0a5f3d] text-[#0a3d29] px-5 py-3 font-semibold transition-all"
              >
                <ExternalLink className="w-4 h-4" /> Open in browser
              </a>
            )}
            <a
              href="https://mail.zoho.com"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2.5 rounded-2xl bg-[#c99f3b] hover:bg-[#dfb552] text-[#0a3d29] px-5 py-3 font-bold transition-all shadow-md"
              title="Official School Staff Webmail Login"
            >
              <Mail className="w-4 h-4" /> Webmail Login ↗
            </a>
          </div>
        </div>

        {/* Phone mockup side */}
        <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center">
          {app.screenshot ? (
            <div className="relative">
              <div className="absolute -inset-3 rounded-[52px] border border-[#0a5f3d]/15" />
              <div className="absolute -inset-6 rounded-[58px] border border-[#c99f3b]/25" />
              <div className="relative w-[280px] h-[560px] rounded-[42px] bg-[#0a3d29] p-3 shadow-2xl shadow-[#0a3d29]/40">
                <div className="w-full h-full rounded-[32px] overflow-hidden bg-white">
                  <img src={app.screenshot} alt="App preview" className="w-full h-full object-cover" />
                </div>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full bg-[#0a3d29]" />
              </div>
            </div>
          ) : (
            <div className="relative w-[260px] h-[520px] rounded-[42px] bg-[#0a3d29] p-3 shadow-2xl shadow-[#0a3d29]/40 flex flex-col items-center justify-center">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full bg-black" />
              <div className="w-full h-full rounded-[32px] bg-gradient-to-br from-[#0a5f3d] to-[#0a3d29] flex flex-col items-center justify-center text-[#fff9e6] p-8">
                <Smartphone className="w-14 h-14 text-[#c99f3b] mb-4" />
                <div className="font-display text-2xl font-bold text-center leading-tight">{content.school_info?.name || "Junior DPS"}</div>
                <div className="text-[11px] tracking-[0.25em] uppercase text-[#c99f3b] mt-2">Parent App</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MobileAppSection;
