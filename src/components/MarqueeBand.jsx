import React from "react";
import { useContent } from "../lib/ContentContext";

const DEFAULT_BITS = [
  "CBSE Affiliated",
  "Nursery – Class X",
  "Air-Conditioned Campus",
  "24×7 CCTV Surveillance",
  "GPS-Tracked Transport",
  "Career Counselling from Class V",
  "STEM & Robotics Program",
  "Music • Art • Sports",
];

const MarqueeBand = () => {
  const { content } = useContent();
  const items = (content.marquee && Array.isArray(content.marquee.items) && content.marquee.items.length)
    ? content.marquee.items
    : DEFAULT_BITS;
  if (items.length === 0) return null;

  return (
    <div className="bg-[#0a3d29] text-[#fff9e6] py-4 border-y border-[#0a5f3d]/40 overflow-hidden">
      <div className="marquee-track flex whitespace-nowrap gap-14 will-change-transform">
        {[...items, ...items, ...items].map((b, i) => (
          <span key={i} className="flex items-center gap-14 font-display text-lg md:text-xl italic">
            <span>{b}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#c99f3b]" />
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeBand;
