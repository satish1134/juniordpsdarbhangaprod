import React, { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Inbox,
  Star,
  Search,
  RefreshCw,
  Archive,
  Trash2,
  Reply,
  ExternalLink,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import {
  fetchOfficialEmails,
  sendOfficialEmail,
  updateOfficialEmailStatus,
  toggleOfficialEmailStar,
  deleteOfficialEmail,
} from "../lib/api";
import { useToast } from "../hooks/use-toast";

const MAILBOXES = [
  {
    key: "info",
    address: "info@juniordpsdarbhanga.com",
    title: "Info & Admissions",
    description: "General queries, admission brochures, campus visits, parent counseling",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotColor: "bg-emerald-600",
  },
  {
    key: "account",
    address: "account@juniordpsdarbhanga.com",
    title: "Accounts & Billing",
    description: "Tuition fees, payment receipts, RTGS/NEFT verification, vendor invoices",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    dotColor: "bg-amber-600",
  },
  {
    key: "principal",
    address: "principal@juniordpsdarbhanga.com",
    title: "Principal Office",
    description: "Official notifications, CBSE compliance, staff applications, executive appointments",
    badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
    dotColor: "bg-purple-600",
  },
];

const QUICK_TEMPLATES = {
  info: [
    {
      title: "Admission Brochure & Fee Structure",
      subject: "Junior DPS Darbhanga — Admission Brochure & Tour Details",
      body: `Dear Parent,\n\nThank you for considering Junior DPS Darbhanga for your child's early education.\n\nWe are pleased to share that admissions for the upcoming academic session are currently open from Nursery to Class V.\n\nKey Highlights:\n• CBSE-aligned experimental curriculum & Activity-based learning\n• Safe, CCTV-monitored smart classrooms & safe transport facility\n• Low student-teacher ratio with individualized child care\n\nYou are warmly invited to visit our campus between 9:00 AM and 2:00 PM on working days for a personalized counseling session and campus walkthrough.\n\nWarm regards,\nAdmissions Office\nJunior DPS Darbhanga\nContact: +91 94312 88410 | info@juniordpsdarbhanga.com`,
    },
    {
      title: "Campus Interaction Confirmation",
      subject: "Confirmation: Campus Visit & Interaction — Junior DPS Darbhanga",
      body: `Dear Parent,\n\nWe have scheduled your campus tour and interaction session as requested. Our admission counselor will be delighted to welcome you and answer all questions regarding curriculum, facilities, and fee installments.\n\nPlease carry a copy of the child's birth certificate and 2 passport-sized photographs if you wish to complete registration on the spot.\n\nWarm regards,\nJunior DPS Admissions Desk`,
    },
  ],
  account: [
    {
      title: "Fee Receipt Acknowledgment",
      subject: "Receipt of Payment Acknowledgment — Junior DPS Darbhanga",
      body: `Dear Parent/Guardian,\n\nWe acknowledge with thanks the receipt of your payment toward school fees. Our accounts department has verified the transaction.\n\nThe official computerized receipt has been generated in our student ledger. You may also collect the printed, signed receipt from the school accounts counter during administrative hours.\n\nFor any billing or installment queries, feel free to reply to this email.\n\nBest regards,\nAccounts Department\nJunior DPS Darbhanga\naccount@juniordpsdarbhanga.com`,
    },
    {
      title: "Vendor Invoice Under Processing",
      subject: "Invoice Received & Under Verification — Junior DPS Accounts",
      body: `Dear Partner,\n\nWe have received your tax invoice. The inventory and purchase order details have been forwarded to the administrative officer for verification.\n\nPayment will be processed via NEFT as per our standard vendor credit terms.\n\nThank you,\nFinance & Accounts Office\nJunior DPS Darbhanga`,
    },
  ],
  principal: [
    {
      title: "Consultation Appointment Granted",
      subject: "Meeting Confirmation with the Principal — Junior DPS Darbhanga",
      body: `Dear Parent/Associate,\n\nThank you for reaching out to the Principal's Office.\n\nAn in-person consultation has been scheduled with the Principal this Wednesday between 12:30 PM and 1:30 PM at the Administrative Wing.\n\nKindly confirm your availability by replying to this email.\n\nSincerely,\nOffice of the Principal\nJunior DPS Darbhanga\nprincipal@juniordpsdarbhanga.com`,
    },
    {
      title: "Official Compliance & Records Notice",
      subject: "Official Communication — Office of the Principal, Junior DPS",
      body: `To Whom It May Concern,\n\nThis is to certify and confirm that the requested documentation/affiliation record has been processed in accordance with the regulatory standards of the Central Board of Secondary Education (CBSE).\n\nOffice of the Principal\nJunior DPS Darbhanga`,
    },
  ],
};

export default function OfficialMailboxPanel() {
  const { toast } = useToast();
  const [activeMailbox, setActiveMailbox] = useState("info");
  const [emails, setEmails] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    info_total: 0,
    info_unread: 0,
    account_total: 0,
    account_unread: 0,
    principal_total: 0,
    principal_unread: 0,
    total_unread: 0,
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showDnsModal, setShowDnsModal] = useState(false);

  // Compose / Reply state
  const [composeData, setComposeData] = useState({
    mailbox: "info",
    to: "",
    subject: "",
    body: "",
    in_reply_to_id: null,
  });
  const [isSending, setIsSending] = useState(false);

  const loadEmails = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchOfficialEmails({
        mailbox: activeMailbox,
        status: statusFilter,
        search: searchQuery,
      });
      if (res.data) {
        setEmails(res.data.emails || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
        // Keep selected email updated
        if (selectedEmail) {
          const updated = (res.data.emails || []).find((m) => m.id === selectedEmail.id);
          if (updated) setSelectedEmail(updated);
        } else if (res.data.emails?.length > 0 && window.innerWidth >= 1024) {
          setSelectedEmail(res.data.emails[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load official emails:", err);
      toast({
        title: "Mailbox sync error",
        description: err?.response?.data?.detail || "Could not retrieve emails from server.",
        variant: "destructive",
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, [activeMailbox, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadEmails();
  };

  const handleSelectEmail = async (email) => {
    setSelectedEmail(email);
    if (email.status === "unread") {
      try {
        await updateOfficialEmailStatus(email.id, "read");
        setEmails((prev) => prev.map((m) => (m.id === email.id ? { ...m, status: "read" } : m)));
        setCounts((prev) => ({
          ...prev,
          [`${email.mailbox}_unread`]: Math.max(0, (prev[`${email.mailbox}_unread`] || 1) - 1),
          total_unread: Math.max(0, (prev.total_unread || 1) - 1),
        }));
      } catch (err) {
        console.error("Failed to mark email read:", err);
      }
    }
  };

  const handleToggleStar = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await toggleOfficialEmailStar(id);
      const isStarred = res.data?.starred;
      setEmails((prev) => prev.map((m) => (m.id === id ? { ...m, starred: isStarred } : m)));
      if (selectedEmail?.id === id) {
        setSelectedEmail((prev) => ({ ...prev, starred: isStarred }));
      }
    } catch (err) {
      toast({ title: "Failed to update star", variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this message record?")) return;
    try {
      await deleteOfficialEmail(id);
      setEmails((prev) => prev.filter((m) => m.id !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
      toast({ title: "Message deleted" });
      loadEmails(true);
    } catch (err) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleOpenReply = (email) => {
    setComposeData({
      mailbox: email.mailbox,
      to: email.from,
      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      body: `\n\n--- In reply to ${email.from} on ${new Date(email.created_at).toLocaleDateString()} ---\n${email.body
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}`,
      in_reply_to_id: email.id,
    });
    setShowComposeModal(true);
  };

  const handleOpenNewCompose = () => {
    setComposeData({
      mailbox: activeMailbox,
      to: "",
      subject: "",
      body: "",
      in_reply_to_id: null,
    });
    setShowComposeModal(true);
  };

  const handleApplyTemplate = (template) => {
    setComposeData((prev) => ({
      ...prev,
      subject: template.subject,
      body: template.body,
    }));
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!composeData.to || !composeData.subject || !composeData.body) {
      toast({ title: "All fields are required", description: "Please enter recipient, subject, and message text." });
      return;
    }
    setIsSending(true);
    try {
      const res = await sendOfficialEmail(composeData);
      toast({
        title: "Message Dispatched",
        description: `Sent successfully from ${composeData.mailbox}@juniordpsdarbhanga.com to ${composeData.to}`,
      });
      setShowComposeModal(false);
      loadEmails(true);
    } catch (err) {
      toast({
        title: "Failed to dispatch email",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const currentMailboxMeta = MAILBOXES.find((m) => m.key === activeMailbox) || MAILBOXES[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-[#0a3d29] via-[#0d4a32] to-[#12583d] rounded-2xl p-6 text-white shadow-lg border border-emerald-900/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold font-serif tracking-tight text-white">
                Official School Communications Hub
              </h2>
            </div>
            <p className="text-emerald-100/90 text-sm max-w-2xl leading-relaxed">
              Unified tracking and direct response for all 3 official domain accounts. Syncs with Zoho Mail free tier,
              staff mobile apps, and automatic website admission enquiries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenNewCompose}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-amber-400/20 flex items-center gap-2 active:scale-95"
            >
              <Send className="w-4 h-4" />
              Compose Official Email
            </button>

            <a
              href="https://mail.zoho.in"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 backdrop-blur-sm"
              title="Open Zoho Webmail portal in a new tab"
            >
              <ExternalLink className="w-4 h-4 text-amber-300" />
              Open Zoho Webmail
            </a>

            <button
              onClick={() => setShowSetupGuide(true)}
              className="px-3.5 py-2.5 bg-emerald-800/80 hover:bg-emerald-700/80 border border-emerald-600/40 text-emerald-100 font-medium rounded-xl text-sm transition-all flex items-center gap-2"
              title="Mobile app login guide for teachers and staff"
            >
              <Smartphone className="w-4 h-4 text-emerald-300" />
              Staff App Guide
            </button>

            <button
              onClick={() => setShowDnsModal(true)}
              className="px-3.5 py-2.5 bg-emerald-800/80 hover:bg-emerald-700/80 border border-emerald-600/40 text-emerald-100 font-medium rounded-xl text-sm transition-all flex items-center gap-2"
              title="View Namecheap DNS configuration records"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              DNS Setup (Zero Cost)
            </button>
          </div>
        </div>

        {/* 3 Mailbox Navigation Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-emerald-800/60">
          {MAILBOXES.map((mb) => {
            const isActive = activeMailbox === mb.key;
            const unreadCount = counts[`${mb.key}_unread`] || 0;
            const totalCount = counts[`${mb.key}_total`] || 0;

            return (
              <button
                key={mb.key}
                onClick={() => {
                  setActiveMailbox(mb.key);
                  setSelectedEmail(null);
                }}
                className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden ${
                  isActive
                    ? "bg-white text-gray-900 border-amber-400 shadow-xl ring-2 ring-amber-400/30"
                    : "bg-emerald-950/40 text-emerald-100 border-emerald-800/60 hover:bg-emerald-900/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${mb.dotColor}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? "text-emerald-800" : "text-amber-300"}`}>
                      {mb.title}
                    </span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-500 text-white shadow-sm">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className={`text-sm font-semibold truncate ${isActive ? "text-gray-900" : "text-white"}`}>
                  {mb.address}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/10 text-xs">
                  <span className={isActive ? "text-gray-500" : "text-emerald-200/70"}>
                    {mb.description.split(",")[0]}
                  </span>
                  <span className={`font-semibold ${isActive ? "text-emerald-700 font-mono" : "text-emerald-300 font-mono"}`}>
                    {totalCount} total
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control & Filter Strip */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status:</span>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "replied", label: "Replied" },
              { id: "archived", label: "Archived" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  statusFilter === f.id
                    ? "bg-white text-emerald-800 font-semibold shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sender, subject..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            />
          </form>

          <button
            onClick={() => loadEmails()}
            className="p-2 text-gray-500 hover:text-emerald-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all"
            title="Refresh mailbox"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Mailbox Interface: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[560px]">
        {/* Left Pane: Email List (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5 text-emerald-700" />
              {currentMailboxMeta.title} ({emails.length} messages)
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              Auto-sync enabled
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[620px]">
            {loading ? (
              <div className="p-12 text-center text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-xs">Fetching communications...</p>
              </div>
            ) : emails.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">No messages found in this folder</p>
                <p className="text-xs text-gray-400 mt-1">Try switching filters or click "Compose" to send a message.</p>
              </div>
            ) : (
              emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                const isUnread = email.status === "unread";

                return (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-4 cursor-pointer transition-all relative ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-l-emerald-700"
                        : isUnread
                        ? "bg-amber-50/20 hover:bg-gray-50 font-semibold"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 ${
                            email.direction === "outbound"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {(email.from_name || email.from || "U")[0]}
                        </div>
                        <span className={`text-xs truncate ${isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                          {email.from_name || email.from}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => handleToggleStar(e, email.id)}
                          className="text-gray-300 hover:text-amber-400 transition-colors p-0.5"
                          title="Star message"
                        >
                          <Star className={`w-3.5 h-3.5 ${email.starred ? "fill-amber-400 text-amber-400" : ""}`} />
                        </button>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(email.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-medium text-gray-900 truncate mb-1 pl-9">
                      {email.direction === "outbound" && (
                        <span className="text-emerald-700 font-semibold mr-1.5">[Sent]</span>
                      )}
                      {email.subject}
                    </div>

                    <p className="text-[11px] text-gray-500 line-clamp-2 pl-9 leading-relaxed">
                      {email.body}
                    </p>

                    <div className="flex items-center gap-2 mt-2.5 pl-9">
                      {isUnread && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500 text-white uppercase">
                          New
                        </span>
                      )}
                      {email.status === "replied" && (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                          <Reply className="w-2.5 h-2.5" /> Replied
                        </span>
                      )}
                      {email.tags?.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 text-[9px] rounded bg-gray-100 text-gray-600 font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Reading & Action View (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
          {selectedEmail ? (
            <div className="flex flex-col h-full">
              {/* Header Details */}
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-800 mb-2">
                      To: {selectedEmail.mailbox}@juniordpsdarbhanga.com
                    </span>
                    <h3 className="text-lg font-bold font-serif text-gray-900 leading-snug">
                      {selectedEmail.subject}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenReply(selectedEmail)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                    <button
                      onClick={() => handleDelete(selectedEmail.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete email record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-200/60">
                  <div>
                    <span className="text-gray-400 font-medium">From:</span>{" "}
                    <strong className="text-gray-900 font-semibold">{selectedEmail.from_name || selectedEmail.from}</strong>
                    <div className="text-gray-500 font-mono text-[11px] truncate">{selectedEmail.from}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium">Received:</span>{" "}
                    <span className="text-gray-700 font-medium">
                      {new Date(selectedEmail.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    {selectedEmail.direction === "outbound" && (
                      <div className="text-emerald-700 font-medium text-[11px]">Sent via Admin Portal</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed font-sans text-sm">
                  {selectedEmail.body}
                </div>
              </div>

              {/* Quick Action Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenReply(selectedEmail)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Quick Reply as {selectedEmail.mailbox}@juniordpsdarbhanga.com
                  </button>

                  <button
                    onClick={async () => {
                      const nextStatus = selectedEmail.status === "archived" ? "read" : "archived";
                      await updateOfficialEmailStatus(selectedEmail.id, nextStatus);
                      setSelectedEmail((prev) => ({ ...prev, status: nextStatus }));
                      setEmails((prev) =>
                        prev.map((m) => (m.id === selectedEmail.id ? { ...m, status: nextStatus } : m))
                      );
                      toast({ title: `Message marked as ${nextStatus}` });
                    }}
                    className="px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5 text-gray-500" />
                    {selectedEmail.status === "archived" ? "Unarchive" : "Archive"}
                  </button>
                </div>

                <div className="text-[11px] text-gray-400">
                  Mailbox ID: <code className="font-mono text-gray-600">{selectedEmail.id}</code>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
              <Mail className="w-12 h-12 text-gray-200 mb-3" />
              <h4 className="text-base font-semibold text-gray-700">Select an email to view</h4>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                Choose any conversation from the list on the left to review its content, or click Compose to draft an official reply.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* COMPOSE / REPLY MODAL */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0a3d29] to-[#12583d] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-base">
                  {composeData.in_reply_to_id ? "Reply to Communication" : "New Official Email"}
                </h3>
              </div>
              <button
                onClick={() => setShowComposeModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              {/* Sender address selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Send From Official Address:
                </label>
                <select
                  value={composeData.mailbox}
                  onChange={(e) => setComposeData({ ...composeData, mailbox: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-semibold bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="info">info@juniordpsdarbhanga.com (Admissions & Info)</option>
                  <option value="account">account@juniordpsdarbhanga.com (Accounts & Billing)</option>
                  <option value="principal">principal@juniordpsdarbhanga.com (Office of Principal)</option>
                </select>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Recipient Email (To):
                </label>
                <input
                  type="email"
                  required
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  placeholder="parent@example.com or vendor@company.com"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subject Line:
                </label>
                <input
                  type="text"
                  required
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  placeholder="e.g. Admission Confirmation — Junior DPS Darbhanga"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Quick Template Picker */}
              {QUICK_TEMPLATES[composeData.mailbox] && (
                <div>
                  <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1 mb-1.5">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Quick School Templates:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TEMPLATES[composeData.mailbox].map((tmpl, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="px-2.5 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium rounded-lg border border-emerald-200 transition-colors"
                      >
                        {tmpl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Message Body:
                </label>
                <textarea
                  rows={8}
                  required
                  value={composeData.body}
                  onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                  placeholder="Write your official response here..."
                  className="w-full p-3 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-sans leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2.5 bg-[#0a3d29] hover:bg-[#0d4a32] text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-amber-300" /> Send Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF & MOBILE APP SETUP GUIDE MODAL */}
      {showSetupGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">Zoho Mail App Setup for Staff & Teachers</h3>
              </div>
              <button
                onClick={() => setShowSetupGuide(false)}
                className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-gray-700 leading-relaxed max-h-[75vh] overflow-y-auto">
              <p className="font-medium text-gray-900">
                Each designated staff member (Admissions Incharge, Accounts Officer, Principal) can use their individual email directly on their smartphones for push alerts:
              </p>

              <div className="space-y-3">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <strong className="text-emerald-900 block text-sm font-semibold mb-1">
                    Step 1: Download the Free Zoho Mail App
                  </strong>
                  <p className="text-gray-600">
                    Search for <strong>"Zoho Mail"</strong> on Google Play Store (Android) or Apple App Store (iOS) and install it on the phone.
                  </p>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <strong className="text-emerald-900 block text-sm font-semibold mb-1">
                    Step 2: Sign In with Custom Email Address
                  </strong>
                  <p className="text-gray-600 mb-2">
                    Open the app and log in with the user's specific credentials:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-gray-800">
                    <li><code>info@juniordpsdarbhanga.com</code> + Password</li>
                    <li><code>account@juniordpsdarbhanga.com</code> + Password</li>
                    <li><code>principal@juniordpsdarbhanga.com</code> + Password</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <strong className="text-emerald-900 block text-sm font-semibold mb-1">
                    Step 3: Webmail Custom Domain Link
                  </strong>
                  <p className="text-gray-600">
                    Staff can also log in from any computer browser at:
                    <br />
                    <span className="font-semibold text-emerald-800 font-mono">https://mail.zoho.in</span> or your custom branded alias <span className="font-semibold text-emerald-800 font-mono">mail.juniordpsdarbhanga.com</span>.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900">
                  <strong>Admin Visibility:</strong> Even if staff use their mobile apps, you (as Master Admin) can review all sent and received messages right here from this Admin Console.
                </p>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowSetupGuide(false)}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-semibold"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZERO COST DNS SETUP MODAL */}
      {showDnsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0a3d29] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-base">Namecheap DNS Records for Zoho Free Mail</h3>
              </div>
              <button
                onClick={() => setShowDnsModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-gray-700 leading-relaxed max-h-[75vh] overflow-y-auto">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-emerald-900 font-semibold">
                  Zero Cost Plan: Zoho Mail Forever Free Tier provides 5 custom mailboxes & 5GB per mailbox at ₹0 forever.
                </span>
              </div>

              <p className="font-medium text-gray-900">
                Add the following records in your <strong>Namecheap Dashboard → Domain List → Manage → Advanced DNS</strong>:
              </p>

              {/* MX Records Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 font-bold text-gray-800 text-[11px] uppercase tracking-wider">
                  1. Mail Exchanger (MX) Records
                </div>
                <table className="w-full text-left font-mono text-[11px] divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="p-2">Type</th>
                      <th className="p-2">Host</th>
                      <th className="p-2">Value</th>
                      <th className="p-2">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    <tr>
                      <td className="p-2 font-bold text-emerald-800">MX</td>
                      <td className="p-2">@</td>
                      <td className="p-2">mx.zoho.in (or mx.zoho.com)</td>
                      <td className="p-2 font-bold">10</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-emerald-800">MX</td>
                      <td className="p-2">@</td>
                      <td className="p-2">mx2.zoho.in (or mx2.zoho.com)</td>
                      <td className="p-2 font-bold">20</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-emerald-800">MX</td>
                      <td className="p-2">@</td>
                      <td className="p-2">mx3.zoho.in (or mx3.zoho.com)</td>
                      <td className="p-2 font-bold">50</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SPF & DKIM Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 font-bold text-gray-800 text-[11px] uppercase tracking-wider">
                  2. Deliverability & Anti-Spam (SPF & DKIM)
                </div>
                <table className="w-full text-left font-mono text-[11px] divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="p-2">Type</th>
                      <th className="p-2">Host</th>
                      <th className="p-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    <tr>
                      <td className="p-2 font-bold text-emerald-800">TXT (SPF)</td>
                      <td className="p-2">@</td>
                      <td className="p-2">v=spf1 include:zoho.in ~all</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-emerald-800">TXT (DKIM)</td>
                      <td className="p-2">zoho._domainkey</td>
                      <td className="p-2">Generated in Zoho Admin Console</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-emerald-800">CNAME</td>
                      <td className="p-2">mail</td>
                      <td className="p-2">custommail.zoho.in</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowDnsModal(false)}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
