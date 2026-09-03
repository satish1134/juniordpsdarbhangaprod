import React, { useEffect, useState } from "react";
import { fetchNews, resolveImageUrl } from "../lib/api";
import { useContent } from "../lib/ContentContext";
import { Calendar, ArrowUpRight, Quote } from "lucide-react";

const NewsTestimonials = () => {
  const [news, setNews] = useState([]);
  const { content } = useContent();
  const testimonials = Array.isArray(content?.testimonials) ? content.testimonials : [];

  useEffect(() => {
    fetchNews()
      .then((r) => {
        if (Array.isArray(r?.data)) {
          setNews(r.data);
        } else {
          setNews([]);
        }
      })
      .catch(() => setNews([]));
  }, []);

  const safeNews = Array.isArray(news) ? news : [];

  return (
    <section className="relative py-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* News */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-[12px] tracking-[0.3em] uppercase text-[#0a5f3d] font-semibold">Latest at Junior DPS</div>
            <h2 className="font-display mt-3 text-[36px] md:text-[46px] leading-[1.05] font-bold text-[#0a3d29]">
              News, notices & <span className="italic text-[#c99f3b] font-medium">events.</span>
            </h2>
          </div>
        </div>

        {safeNews.length === 0 ? (
          <div className="mt-12 text-center py-16 text-[#1c2a24]/50 text-sm">
            No updates published yet — check back soon.
          </div>
        ) : (
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {safeNews.slice(0, 3).map((n, i) => (
              <article
                key={n.id || i}
                className="lift group bg-white rounded-3xl border border-[#0a5f3d]/10 flex flex-col overflow-hidden"
              >
                {n.cover_image ? (
                  <div className="h-44 overflow-hidden zoom-parent bg-[#0a3d29]">
                    <img
                      src={resolveImageUrl(n.cover_image)}
                      alt={n.title || "News cover"}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-[#0a5f3d] to-[#0a3d29]" />
                )}
                <div className="p-7 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0a5f3d]/8 text-[#0a5f3d] text-[11px] font-semibold tracking-widest uppercase">
                      {n.tag}
                    </span>
                    <span className="flex items-center gap-1.5 text-[12px] text-[#1c2a24]/60">
                      <Calendar className="w-3.5 h-3.5" /> {n.date}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#0a3d29] mt-5 leading-snug">
                    {n.title}
                  </h3>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-[#1c2a24]/70 flex-1">{n.excerpt}</p>
                  <div className="mt-6 flex items-center gap-2 text-[13px] font-semibold text-[#0a5f3d]">
                    <span>Read more</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Testimonials */}
        <div className="mt-24">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-[12px] tracking-[0.3em] uppercase text-[#0a5f3d] font-semibold">Voices of our community</div>
            <h2 className="font-display mt-3 text-[36px] md:text-[46px] leading-[1.05] font-bold text-[#0a3d29]">
              Loved by parents, remembered by <span className="italic text-[#c99f3b] font-medium">alumni.</span>
            </h2>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="lift bg-[#0a3d29] text-[#fff9e6] rounded-3xl p-8 relative overflow-hidden">
                <Quote className="w-10 h-10 text-[#c99f3b] mb-6" strokeWidth={2.5} />
                <p className="text-[15.5px] leading-[1.8] text-[#fff9e6]/90 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-8 pt-6 border-t border-[#fff9e6]/15">
                  <div className="font-display text-lg font-semibold">{t.name}</div>
                  <div className="text-[12.5px] text-[#c99f3b] mt-0.5">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsTestimonials;
