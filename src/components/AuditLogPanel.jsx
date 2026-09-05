import React, { useEffect, useState } from "react";
import { fetchAuditLog } from "../lib/api";
import { Loader2, ChevronLeft, ChevronRight, RefreshCcw, Filter } from "lucide-react";
import { Button } from "./ui/button";

const ACTION_BADGE = {
  "admin.login_success": "bg-[#0a5f3d]/10 text-[#0a5f3d] border-[#0a5f3d]/25",
  "admin.login_failed":  "bg-red-50 text-red-700 border-red-200",
  "admin.logout":        "bg-[#1c2a24]/8 text-[#1c2a24]/70 border-[#1c2a24]/15",
  "admin.2fa_setup_started": "bg-[#c99f3b]/15 text-[#8a6b1e] border-[#c99f3b]/30",
  "admin.2fa_enabled":   "bg-[#0a5f3d]/12 text-[#0a5f3d] border-[#0a5f3d]/25",
  "admin.2fa_disabled":  "bg-red-50 text-red-700 border-red-200",
  "enquiry.created":     "bg-blue-50 text-blue-700 border-blue-200",
  "enquiry.status_updated": "bg-[#c99f3b]/10 text-[#8a6b1e] border-[#c99f3b]/25",
  "enquiry.deleted":     "bg-red-50 text-red-700 border-red-200",
};

const badgeForAction = (a) => {
  if (ACTION_BADGE[a]) return ACTION_BADGE[a];
  if (a.startsWith("content.save.")) return "bg-[#c99f3b]/12 text-[#8a6b1e] border-[#c99f3b]/25";
  if (a.startsWith("content.reset.")) return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-[#0a5f3d]/8 text-[#0a5f3d] border-[#0a5f3d]/20";
};

const ACTION_FILTERS = [
  { key: "", label: "All events" },
  { key: "admin.login_success", label: "Successful logins" },
  { key: "admin.login_failed", label: "Failed logins" },
  { key: "enquiry.created", label: "Enquiries" },
];

const LIMIT = 50;

const AuditLogPanel = () => {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [action, setAction] = useState("");

  const load = async (opts = {}) => {
    setLoading(true);
    try {
      const p = opts.page ?? page;
      const a = opts.action ?? action;
      const r = await fetchAuditLog({ limit: LIMIT, skip: p * LIMIT, action: a || undefined });
      setData(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load({ page, action }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, action]);

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / LIMIT));

  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#0a5f3d]/10 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-5 border-b border-[#0a5f3d]/10 bg-[#f5f2ea]/40">
        <div className="flex items-center gap-2 text-[13px] text-[#0a3d29] font-semibold">
          <Filter className="w-4 h-4" /> Filter
        </div>
        {ACTION_FILTERS.map((f) => (
          <button
            key={f.key}
            data-testid={`audit-filter-${f.key || "all"}`}
            onClick={() => { setPage(0); setAction(f.key); }}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition ${
              action === f.key
                ? "bg-[#0a3d29] text-[#fff9e6] border-[#0a3d29]"
                : "bg-white text-[#0a3d29] border-[#0a5f3d]/20 hover:border-[#0a5f3d]/40"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12.5px] text-[#1c2a24]/60">{data.total} events</span>
          <Button onClick={() => load()} variant="outline" className="rounded-full h-9 px-3.5" data-testid="audit-refresh">
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#1c2a24]/60"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading events…</div>
      ) : data.items.length === 0 ? (
        <div className="py-16 text-center text-[#1c2a24]/50 text-[14px]">No events recorded yet.</div>
      ) : (
        <div className="divide-y divide-[#0a5f3d]/8">
          <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#0a5f3d] bg-[#f5f2ea]/60">
            <div className="col-span-2">Time (IST)</div>
            <div className="col-span-2">Action</div>
            <div className="col-span-2">User</div>
            <div className="col-span-2">IP Address</div>
            <div className="col-span-2">Device / Browser</div>
            <div className="col-span-2">Details</div>
          </div>
          {data.items.map((ev) => (
            <div key={ev.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 px-5 py-3.5 items-start hover:bg-[#f5f2ea]/40 text-[12px]" data-testid={`audit-row-${ev.id}`}>
              <div className="md:col-span-2 text-[#1c2a24]/70 font-mono text-[11.5px]">{fmtDate(ev.timestamp)}</div>
              <div className="md:col-span-2">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide border ${badgeForAction(ev.action)}`}>
                  {ev.action}
                </span>
              </div>
              <div className="md:col-span-2 text-[#0a3d29] font-semibold truncate">{ev.actor}</div>
              <div className="md:col-span-2 text-[#1c2a24]/65 font-mono">{ev.ip || "—"}</div>
              <div className="md:col-span-2 text-[#1c2a24]/75 truncate font-medium" title={ev.device || ev.user_agent || ""}>
                {ev.device || ev.user_agent || "—"}
              </div>
              <div className="md:col-span-2 text-[#1c2a24]/55 truncate" title={JSON.stringify(ev.details || {})}>
                {Object.entries(ev.details || {}).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join(" · ") || "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between p-5 border-t border-[#0a5f3d]/10 bg-[#f5f2ea]/30">
        <div className="text-[12.5px] text-[#1c2a24]/60">
          Page {page + 1} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            variant="outline" className="rounded-full h-9 px-3" data-testid="audit-prev">
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>
          <Button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page + 1 >= totalPages}
            variant="outline" className="rounded-full h-9 px-3" data-testid="audit-next">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPanel;
