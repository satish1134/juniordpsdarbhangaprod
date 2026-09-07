import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, LogOut, Inbox, Newspaper, Loader2, Trash2, Edit3, Plus, X,
  CheckCircle2, Clock, Mail, Phone, User, Calendar as CalIcon, Filter, ExternalLink,
  Palette, ShieldCheck, ScrollText, Timer,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useToast } from "../hooks/use-toast";
import ContentEditor from "../components/ContentEditor";
import TwoFactorPanel from "../components/TwoFactorPanel";
import AuditLogPanel from "../components/AuditLogPanel";
import AdminSessionWarning from "../components/AdminSessionWarning";
import SystemHealthModal from "../components/SystemHealthModal";
import { useAdminInactivity } from "../hooks/useAdminInactivity";
import { isSessionExpired, clearAdminSession } from "../lib/sessionManager";
import { useContent } from "../lib/ContentContext";
import { LOGO_RADIUS_CLASS, fontFamilyFor } from "../lib/displaySizes";
import { logError } from "../lib/logger";
import {
  adminMe, adminLogout, listEnquiries, updateEnquiryStatus, deleteEnquiry,
  listAllNews, createNews, updateNews, deleteNews, fetchDbStatus, getAdminPath,
} from "../lib/api";

const statusColors = {
  new: "bg-[#c99f3b]/15 text-[#8a6b1e] border-[#c99f3b]/40",
  contacted: "bg-[#0a5f3d]/10 text-[#0a5f3d] border-[#0a5f3d]/30",
  closed: "bg-[#1c2a24]/8 text-[#1c2a24]/60 border-[#1c2a24]/20",
};

const AdminDashboard = () => {
  const [tab, setTab] = useState("enquiries");
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enquiries, setEnquiries] = useState([]);
  const [news, setNews] = useState([]);
  const [dbStatus, setDbStatus] = useState(null);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { content, refresh: refreshPublic } = useContent();
  const schoolInfo = content.school_info || {};
  const logoRadius = LOGO_RADIUS_CLASS[(content.display || {}).logo_shape] || LOGO_RADIUS_CLASS.circle;
  const nameFont = fontFamilyFor((content.display || {}).name_font);

  // Inactivity auto-logout handler (5 minutes timeout)
  const adminPath = getAdminPath();

  const handleAutoLogout = useCallback(async () => {
    try {
      await adminLogout();
    } catch (err) {
      logError("Auto-logout request failed:", err);
    }
    clearAdminSession();
    toast({
      title: "Session Expired",
      description: "You were logged out automatically due to 5 minutes of inactivity.",
    });
    navigate(`${adminPath}/login?reason=idle_timeout`);
  }, [adminPath, navigate, toast]);

  const { showWarning, remainingSeconds, resetActivity } = useAdminInactivity({
    onTimeout: handleAutoLogout,
    enabled: true,
  });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [e, n, db] = await Promise.allSettled([
        listEnquiries(),
        listAllNews(),
        fetchDbStatus(),
      ]);
      if (e.status === "fulfilled") setEnquiries(e.value.data || []);
      if (n.status === "fulfilled") setNews(n.value.data || []);
      if (db.status === "fulfilled") setDbStatus(db.value.data || null);
    } catch (err) {
      logError("Failed to refresh admin data:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isSessionExpired()) {
      clearAdminSession();
      toast({
        title: "Session Expired",
        description: "Your session expired after 5 minutes of inactivity. Please sign in again.",
      });
      navigate(`${adminPath}/login?reason=idle_timeout`);
      return;
    }

    adminMe()
      .then(() => refresh())
      .catch(() => {
        clearAdminSession();
        navigate(`${adminPath}/login`);
      });
  }, [adminPath, navigate, refresh, toast]);

  const logout = async () => {
    try { await adminLogout(); } catch (err) { logError("Logout failed:", err); }
    clearAdminSession();
    navigate(`${adminPath}/login`);
  };

  const setStatus = async (id, status) => {
    await updateEnquiryStatus(id, status);
    toast({ title: "Status updated" });
    refresh();
  };

  const removeEnquiry = async (id) => {
    if (!window.confirm("Delete this enquiry permanently?")) return;
    await deleteEnquiry(id);
    toast({ title: "Enquiry deleted" });
    refresh();
  };

  const filtered = filter === "all" ? enquiries : enquiries.filter((e) => e.status === filter);
  const counts = {
    all: enquiries.length,
    new: enquiries.filter((e) => e.status === "new").length,
    contacted: enquiries.filter((e) => e.status === "contacted").length,
    closed: enquiries.filter((e) => e.status === "closed").length,
  };

  const openEditor = (item = null) => {
    setEditing(item ? { ...item } : {
      title: "", excerpt: "", body: "", tag: "General",
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      cover_image: "", published: true,
    });
    setShowEditor(true);
  };

  const saveNews = async () => {
    if (!editing.title || !editing.excerpt || !editing.date) {
      toast({ title: "Title, excerpt and date are required" });
      return;
    }
    try {
      if (editing.id) {
        await updateNews(editing.id, editing);
        toast({ title: "News updated" });
      } else {
        await createNews(editing);
        toast({ title: "News published" });
      }
      setShowEditor(false);
      refresh();
    } catch (err) {
      toast({ title: "Save failed", description: err?.response?.data?.detail || err.message });
    }
  };

  const removeNews = async (id) => {
    if (!window.confirm("Delete this post permanently?")) return;
    await deleteNews(id);
    toast({ title: "News deleted" });
    refresh();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      toast({ title: "Image too large", description: "Please pick an image smaller than 800KB, or paste a URL." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setEditing({ ...editing, cover_image: ev.target.result });
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#fbfaf6]">
      {/* Top bar */}
      <header className="bg-[#0a3d29] text-[#fff9e6] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {schoolInfo.logo ? (
              <div className={`w-11 h-11 ${logoRadius} bg-[#fff9e6] flex items-center justify-center overflow-hidden p-1`}>
                <img src={schoolInfo.logo} alt="School logo" className={`w-full h-full object-cover ${logoRadius}`} />
              </div>
            ) : (
              <div className={`w-11 h-11 ${logoRadius} bg-[#c99f3b] flex items-center justify-center`}>
                <GraduationCap className="w-6 h-6 text-[#0a3d29]" />
              </div>
            )}
            <div className="leading-tight">
              <div className="font-bold text-[20px] tracking-tight" style={{ fontFamily: nameFont }}>
                {schoolInfo.name || "Junior DPS Darbhanga"}
              </div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-[#c99f3b]">Admin Console</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border bg-[#fff9e6]/10 text-[#fff9e6]/90 border-[#fff9e6]/20"
              title="Security: Automatic logout if inactive for 5 minutes"
            >
              <Clock className="w-3.5 h-3.5 text-[#c99f3b]" />
              <span>Auto-Logout: 5m idle</span>
            </div>
            {dbStatus && (
              <button
                type="button"
                onClick={() => setShowHealthModal(true)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border cursor-pointer transition shadow-sm ${
                  dbStatus.connected
                    ? "bg-[#0a5f3d]/40 text-[#fff9e6] border-[#0a5f3d]/80 hover:bg-[#0a5f3d]/60"
                    : "bg-[#c99f3b]/20 text-[#c99f3b] border-[#c99f3b]/40 hover:bg-[#c99f3b]/30"
                }`}
                title="Click to view real-time Production VPS & System Health observability"
              >
                <span className={`w-2 h-2 rounded-full ${dbStatus.connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                <span>{dbStatus.connected ? "VPS & MongoDB Live ↗" : "In-Memory Mode ↗"}</span>
              </button>
            )}
            <a
              href="https://www.zoho.com/mail/login.html"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#c99f3b] text-[#0a3d29] font-bold text-[12px] hover:bg-[#dfb552] transition shadow-md"
              title="Open Official Zoho Webmail in a new tab"
            >
              <Mail className="w-3.5 h-3.5" /> Webmail Login ↗
            </a>
            <Link to="/" className="hidden sm:flex items-center gap-2 text-[13px] text-[#fff9e6]/80 hover:text-[#c99f3b]">
              <ExternalLink className="w-3.5 h-3.5" /> View site
            </Link>
            <Button onClick={logout} variant="outline" className="rounded-full border-[#fff9e6]/30 bg-transparent text-[#fff9e6] hover:bg-[#fff9e6]/10 hover:text-[#fff9e6]">
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {[
            { key: "enquiries", label: "Admission Enquiries", icon: Inbox, count: counts.new ? `${counts.new} new` : counts.all },
            { key: "news", label: "News & Notices", icon: Newspaper, count: news.length },
            { key: "content", label: "Site Content", icon: Palette },
            { key: "security", label: "Security & 2FA", icon: ShieldCheck },
            { key: "audit", label: "Audit Log & Metrics", icon: ScrollText },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 rounded-2xl flex items-center gap-3 font-semibold text-[14px] transition-all border ${
                tab === t.key
                  ? "bg-[#0a3d29] text-[#fff9e6] border-[#0a3d29] shadow-lg shadow-[#0a3d29]/20"
                  : "bg-white text-[#0a3d29] border-[#0a5f3d]/10 hover:border-[#0a5f3d]/30"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${tab === t.key ? "bg-[#c99f3b] text-[#0a3d29]" : "bg-[#0a5f3d]/10 text-[#0a5f3d]"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && tab !== "content" && tab !== "security" && tab !== "audit" && (
          <div className="text-center py-24"><Loader2 className="w-6 h-6 animate-spin inline text-[#0a5f3d]" /></div>
        )}

        {/* Site Content */}
        {tab === "content" && (
          <ContentEditor onSaved={refreshPublic} />
        )}

        {/* Security */}
        {tab === "security" && <TwoFactorPanel />}

        {/* Audit Log */}
        {tab === "audit" && <AuditLogPanel />}

        {/* Enquiries */}
        {!loading && tab === "enquiries" && (
          <>
            <div className="bg-white rounded-2xl border border-[#0a5f3d]/10 p-4 mb-6 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-[13px] text-[#1c2a24]/70 pr-3 border-r border-[#0a5f3d]/10">
                <Filter className="w-4 h-4" /> Filter
              </div>
              {[
                { k: "all", l: "All" },
                { k: "new", l: "New" },
                { k: "contacted", l: "Contacted" },
                { k: "closed", l: "Closed" },
              ].map((f) => (
                <button
                  key={f.k}
                  onClick={() => setFilter(f.k)}
                  className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold border transition ${
                    filter === f.k ? "bg-[#0a3d29] text-[#fff9e6] border-[#0a3d29]" : "bg-white text-[#0a3d29] border-[#0a5f3d]/15 hover:border-[#0a5f3d]/40"
                  }`}
                >
                  {f.l} <span className="opacity-60">({counts[f.k]})</span>
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#0a5f3d]/10 py-20 text-center text-[#1c2a24]/50">
                <Inbox className="w-8 h-8 mx-auto mb-3 opacity-40" />
                No enquiries in this view yet.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((e) => (
                  <div key={e.id} className="bg-white rounded-3xl border border-[#0a5f3d]/10 p-6 lift">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-display text-xl font-semibold text-[#0a3d29]">{e.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10.5px] tracking-widest uppercase font-bold ${statusColors[e.status] || statusColors.new}`}>
                            {e.status}
                          </span>
                          {e.grade && (
                            <span className="text-[11px] tracking-widest uppercase text-[#0a5f3d]/70 font-semibold">
                              Grade: {e.grade}
                            </span>
                          )}
                        </div>
                        <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[13.5px] text-[#1c2a24]/75">
                          <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[#0a5f3d]" /> {e.email}</div>
                          <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[#0a5f3d]" /> {e.phone}</div>
                          <div className="flex items-center gap-2 sm:col-span-2"><CalIcon className="w-3.5 h-3.5 text-[#0a5f3d]" /> {new Date(e.created_at).toLocaleString("en-IN")}</div>
                        </div>
                        {e.message && (
                          <p className="mt-4 text-[14px] text-[#1c2a24]/75 leading-relaxed bg-[#f5f2ea] rounded-xl p-4 border border-[#0a5f3d]/5">
                            {e.message}
                          </p>
                        )}
                      </div>
                      <div className="flex md:flex-col gap-2 shrink-0">
                        <select
                          value={e.status}
                          onChange={(ev) => setStatus(e.id, ev.target.value)}
                          className="rounded-full border border-[#0a5f3d]/20 bg-white px-4 h-9 text-[13px] font-semibold text-[#0a3d29] focus:outline-none focus:ring-2 focus:ring-[#0a5f3d]"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Closed</option>
                        </select>
                        <Button
                          onClick={() => removeEnquiry(e.id)}
                          variant="outline"
                          className="rounded-full h-9 border-[#c0392b]/25 text-[#c0392b] hover:bg-[#c0392b]/8"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* News */}
        {!loading && tab === "news" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#0a3d29]">News & Notices</h2>
                <p className="text-[13px] text-[#1c2a24]/60 mt-1">Manage the news items shown on the public site.</p>
              </div>
              <Button
                onClick={() => openEditor()}
                className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-11 px-5 font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" /> New Post
              </Button>
            </div>

            {news.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#0a5f3d]/10 py-20 text-center text-[#1c2a24]/50">
                <Newspaper className="w-8 h-8 mx-auto mb-3 opacity-40" />
                No news yet — create your first post.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {news.map((n) => (
                  <div key={n.id} className="bg-white rounded-3xl border border-[#0a5f3d]/10 overflow-hidden lift">
                    {n.cover_image && <img src={n.cover_image} alt={n.title} className="w-full h-40 object-cover" />}
                    <div className="p-6">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#0a5f3d]/10 text-[#0a5f3d] font-bold tracking-widest uppercase">{n.tag}</span>
                        <span className="text-[#1c2a24]/50">{n.date}</span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-[#0a3d29] mt-3 leading-snug">{n.title}</h3>
                      <p className="text-[13.5px] text-[#1c2a24]/70 mt-2 line-clamp-2">{n.excerpt}</p>
                      <div className="mt-4 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${n.published ? "bg-[#0a5f3d]/10 text-[#0a5f3d]" : "bg-[#c99f3b]/15 text-[#8a6b1e]"}`}>
                          {n.published ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {n.published ? "Published" : "Draft"}
                        </span>
                        <div className="ml-auto flex gap-2">
                          <Button variant="outline" onClick={() => openEditor(n)} className="h-9 rounded-full border-[#0a5f3d]/20 text-[#0a5f3d]">
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="outline" onClick={() => removeNews(n.id)} className="h-9 rounded-full border-[#c0392b]/25 text-[#c0392b] hover:bg-[#c0392b]/8">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* News Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-[#0a3d29]">
              {editing?.id ? "Edit Post" : "New Post"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Title *</label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mt-2 rounded-xl h-11" placeholder="Post title" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Tag</label>
                  <Input value={editing.tag} onChange={(e) => setEditing({ ...editing, tag: e.target.value })} className="mt-2 rounded-xl h-11" placeholder="e.g. Achievement" />
                </div>
                <div>
                  <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Display Date *</label>
                  <Input value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className="mt-2 rounded-xl h-11" placeholder="12 Jul 2025" />
                </div>
              </div>
              <div>
                <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Excerpt *</label>
                <Textarea rows={2} value={editing.excerpt} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} className="mt-2 rounded-xl" placeholder="A short one-liner shown in listing." />
              </div>
              <div>
                <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Full Body</label>
                <Textarea rows={5} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className="mt-2 rounded-xl" placeholder="Optional longer content." />
              </div>
              <div>
                <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Cover Image</label>
                <div className="mt-2 flex gap-2">
                  <Input value={editing.cover_image} onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })} className="rounded-xl h-11" placeholder="Paste image URL" />
                  <label className="cursor-pointer flex items-center justify-center h-11 px-4 rounded-xl bg-[#0a5f3d]/8 text-[#0a5f3d] text-[13px] font-semibold hover:bg-[#0a5f3d]/15">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                {editing.cover_image && (
                  <div className="mt-3 relative rounded-xl overflow-hidden">
                    <img src={editing.cover_image} alt="preview" className="w-full h-36 object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, cover_image: "" })}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-[13px] text-[#0a3d29] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.published}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                  className="w-4 h-4 accent-[#0a5f3d]"
                />
                Publish to public site
              </label>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#0a5f3d]/10">
                <Button variant="outline" onClick={() => setShowEditor(false)} className="rounded-full h-11 px-5">Cancel</Button>
                <Button onClick={saveNews} className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-11 px-6 font-semibold">
                  {editing.id ? "Save Changes" : "Publish Post"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 5-minute Inactivity Warning Modal */}
      <AdminSessionWarning
        open={showWarning}
        remainingSeconds={remainingSeconds}
        onExtend={resetActivity}
        onLogout={logout}
      />

      {/* Production VPS & System Health Modal */}
      <SystemHealthModal
        open={showHealthModal}
        onOpenChange={setShowHealthModal}
      />
    </div>
  );
};

export default AdminDashboard;
