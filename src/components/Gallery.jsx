import React, { useState, useMemo } from "react";
import { useContent } from "../lib/ContentContext";
import { GALLERY_ROW_PX, pick } from "../lib/displaySizes";
import { resolveImageUrl } from "../lib/api";
import { galleryImages as fallbackGallery } from "../mock";
import { Dialog, DialogContent } from "./ui/dialog";
import { Image as ImageIcon, X } from "lucide-react";

const Gallery = () => {
  const { content } = useContent();
  const galleryImages = useMemo(() => (Array.isArray(content?.gallery) && content.gallery.length ? content.gallery : fallbackGallery), [content?.gallery]);
  const display = content?.display || {};
  const rowHeight = pick(GALLERY_ROW_PX, display.gallery_size);
  const tags = useMemo(() => ["All", ...Array.from(new Set(galleryImages.map((g) => g?.tag || "General")))], [galleryImages]);
  const intro = content.gallery_intro || {};
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const filtered = useMemo(() => {
    return filter === "All" ? galleryImages : galleryImages.filter((g) => (g.tag || "General") === filter);
  }, [filter, galleryImages]);

  return (
    <section id="gallery" className="relative py-24 bg-[#f5f2ea]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <div className="text-[12px] tracking-[0.3em] uppercase text-[#0a5f3d] font-semibold">{intro.eyebrow || "Life at School"}</div>
            <h2 className="font-display mt-3 text-[38px] md:text-[52px] leading-[1.05] font-bold text-[#0a3d29]">
              {intro.title_main || "Moments that make"}
              <span className="italic text-[#c99f3b] font-medium"> {intro.title_accent || "our story."}</span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all border ${
                  filter === t
                    ? "bg-[#0a3d29] text-[#fff9e6] border-[#0a3d29]"
                    : "bg-white text-[#0a3d29] border-[#0a5f3d]/15 hover:border-[#0a5f3d]/50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          style={{ gridAutoRows: `${rowHeight}px` }}
        >
          {filtered.map((g, i) => {
            const spans = ["md:row-span-2", "", "", "md:col-span-2", "", "", "md:row-span-2", ""];
            const imgSrc = resolveImageUrl(g.src);
            return (
              <button
                key={g._id || i}
                onClick={() => { setCurrent(g); setOpen(true); }}
                className={`group relative rounded-2xl overflow-hidden zoom-parent bg-[#0a3d29]/10 ${spans[i % spans.length]}`}
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={g.caption || "School gallery image"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      if (e?.target) {
                        e.target.style.display = "none";
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#0a5f3d]/40">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-xs">{g.caption || "Image"}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a3d29]/85 via-[#0a3d29]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute left-4 bottom-4 right-4 text-left text-[#fff9e6] translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-[#c99f3b]">{g.tag}</div>
                  <div className="font-display text-lg font-semibold mt-1">{g.caption}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl bg-[#0a3d29] border-[#0a3d29] p-0 overflow-hidden rounded-3xl">
          {current && (
            <div className="relative">
              <img
                src={resolveImageUrl(current.src)}
                alt={current.caption || "Enlarged view"}
                className="w-full max-h-[80vh] object-contain bg-black"
                crossOrigin="anonymous"
              />
              <div className="p-5 text-[#fff9e6]">
                <div className="text-[11px] tracking-[0.3em] uppercase text-[#c99f3b]">{current.tag}</div>
                <div className="font-display text-2xl font-semibold mt-1">{current.caption}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Gallery;

