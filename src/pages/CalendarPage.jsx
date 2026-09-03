import React, { useMemo, useState } from "react";
import { useContent } from "../lib/ContentContext";
import { calendarEvents as fallbackCalendarEvents } from "../mock";
import { Calendar as CalIcon, Filter } from "lucide-react";
const typeColors = {
  Academic: { bg: "bg-[#0a5f3d]/10", text: "text-[#0a5f3d]", dot: "bg-[#0a5f3d]" },
  Holiday: { bg: "bg-[#e74c3c]/10", text: "text-[#c0392b]", dot: "bg-[#c0392b]" },
  Break: { bg: "bg-[#c99f3b]/15", text: "text-[#8a6b1e]", dot: "bg-[#c99f3b]" },
  Event: { bg: "bg-[#8a5cf6]/10", text: "text-[#6d3fd6]", dot: "bg-[#6d3fd6]" },
  Exam: { bg: "bg-[#1e3a8a]/10", text: "text-[#1e3a8a]", dot: "bg-[#1e3a8a]" },
};

const monthName = (d) => d.toLocaleString("en-IN", { month: "long", year: "numeric" });

const CalendarPage = () => {
  const { content } = useContent();
  const calendarEvents = useMemo(() => (Array.isArray(content?.calendar_events) && content.calendar_events.length ? content.calendar_events : fallbackCalendarEvents), [content?.calendar_events]);
  const [filter, setFilter] = useState("All");
  const types = useMemo(() => ["All", ...Array.from(new Set(calendarEvents.map((e) => e?.type || "Event")))], [calendarEvents]);

  const grouped = useMemo(() => {
    const data = filter === "All" ? calendarEvents : calendarEvents.filter((e) => e.type === filter);
    const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    const map = new Map();
    sorted.forEach((ev) => {
      const d = new Date(ev.date);
      const key = monthName(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    });
    return Array.from(map.entries());
  }, [filter, calendarEvents]);

  return (
    <div className="pb-24 bg-[#fbfaf6]">
      {/* Hero */}
      <section className="relative bg-[#0a3d29] text-[#fff9e6] py-24 overflow-hidden">
        <div className="blob w-[400px] h-[400px] bg-[#167a51] -bottom-40 -left-40 opacity-40" />
        <div className="dots-bg absolute inset-0 opacity-25" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-[12px] tracking-[0.3em] uppercase text-[#c99f3b] font-semibold">School Calendar</div>
          <h1 className="font-display mt-3 text-[42px] md:text-[62px] leading-[1.05] font-bold">
            Every important date,
            <span className="italic text-[#c99f3b] font-medium"> at a glance.</span>
          </h1>
          <p className="mt-6 text-[16px] leading-relaxed text-[#fff9e6]/80 max-w-2xl">
            Bookmark this page to keep track of exams, events, holidays and vacations throughout
            our academic session. Updated by the school office each term.
          </p>
        </div>
      </section>

      {/* Filter */}
      <section className="max-w-7xl mx-auto px-6 -mt-10 relative z-10">
        <div className="bg-white rounded-2xl border border-[#0a5f3d]/10 shadow-xl p-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[13px] text-[#1c2a24]/70 pr-3 border-r border-[#0a5f3d]/10">
            <Filter className="w-4 h-4" /> Filter by
          </div>
          {types.map((t) => {
            const c = typeColors[t] || { bg: "bg-[#0a3d29]", text: "text-[#fff9e6]", dot: "bg-[#0a3d29]" };
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold border transition-all ${
                  filter === t
                    ? "bg-[#0a3d29] text-[#fff9e6] border-[#0a3d29]"
                    : `bg-white ${c.text} border-[#0a5f3d]/15 hover:border-[#0a5f3d]/40`
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-7xl mx-auto px-6 mt-12">
        {grouped.length === 0 && (
          <div className="text-center py-16 text-[#1c2a24]/50">No events found for this filter.</div>
        )}
        {grouped.map(([month, events]) => (
          <div key={month} className="mb-14">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#0a5f3d] text-[#fff9e6] flex items-center justify-center">
                <CalIcon className="w-5 h-5" />
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[#0a3d29]">{month}</h2>
              <div className="flex-1 h-[1px] bg-[#0a5f3d]/15"></div>
              <span className="text-[13px] text-[#1c2a24]/50">{events.length} events</span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((ev, i) => {
                const d = new Date(ev.date);
                const c = typeColors[ev.type] || typeColors.Event;
                return (
                  <div
                    key={i}
                    className="lift bg-white rounded-3xl border border-[#0a5f3d]/10 p-6 flex gap-5"
                  >
                    <div className="w-16 shrink-0 rounded-2xl bg-[#f5f2ea] flex flex-col items-center justify-center py-3">
                      <div className="text-[10px] tracking-[0.2em] uppercase text-[#0a5f3d] font-semibold">
                        {d.toLocaleString("en-IN", { month: "short" })}
                      </div>
                      <div className="font-display text-3xl font-bold text-[#0a3d29] leading-none mt-1">
                        {d.getDate()}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-[#1c2a24]/50 mt-1">
                        {d.toLocaleString("en-IN", { weekday: "short" })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${c.bg} ${c.text} text-[10.5px] font-bold tracking-widest uppercase`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
                        {ev.type}
                      </span>
                      <h3 className="font-display text-lg font-semibold text-[#0a3d29] mt-3 leading-snug">
                        {ev.title}
                      </h3>
                      <p className="text-[13.5px] text-[#1c2a24]/70 mt-2 leading-relaxed">{ev.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default CalendarPage;
