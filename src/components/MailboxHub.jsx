import React, { useState, useEffect, useMemo } from "react";
import {
  Mail,
  Send,
  Inbox,
  Reply,
  Trash2,
  Star,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Sliders,
  Filter,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  fetchMailboxEmails,
  sendMailboxEmail,
  updateMailboxStatus,
  toggleMailboxStar,
  deleteMailboxEmail,
  simulateTestIncoming,
  getMailboxConfig,
} from "../lib/api";

const MAILBOX_OPTIONS = [
  { id: "all", label: "All Inboxes", address: "All official mailboxes" },
  { id: "principal", label: "Principal", address: "principal@juniordpsdarbhanga.com" },
  { id: "info", label: "Admissions & Info", address: "info@juniordpsdarbhanga.com" },
  { id: "account", label: "Accounts Office", address: "account@juniordpsdarbhanga.com" },
];

export default function MailboxHub() {
  const [emails, setEmails] = useState([]);
  const [counts, setCounts] = useState({ all: 0, total_unread: 0, principal_unread: 0, info_unread: 0, account_unread: 0, starred: 0, outbound: 0 });
  const [selectedMailbox, setSelectedMailbox] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);

  // Modals & Drawers
  const [showCompose, setShowCompose] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Compose State
  const [composeData, setComposeData] = useState({
    mailbox: "principal",
    to: "",
    subject: "",
    body: "",
    in_reply_to_id: null,
  });
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState(null);

  // Test Simulator State
  const [testData, setTestData] = useState({
    mailbox: "principal",
    from: "sandyverma3@gmail.com",
    from_name: "Sandy Verma (Test)",
    subject: "Test Inbound Email Verification",
    body: "Hello Principal, testing the live incoming email delivery to verify it lands inside the Admin Panel mailbox!",
  });
  const [testing, setTesting] = useState(false);

  // Load emails
  const loadEmails = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchMailboxEmails({
        mailbox: selectedMailbox,
        status: selectedStatus,
        search: searchQuery,
      });
      if (res.data) {
        setEmails(res.data.emails || []);
        if (res.data.counts) setCounts(res.data.counts);

        // Keep selected email updated if viewing
        if (selectedEmail) {
          const updated = res.data.emails.find((e) => e.id === selectedEmail.id);
          if (updated) setSelectedEmail(updated);
        }
      }
    } catch (err) {
      console.error("Failed to load mailbox emails:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, [selectedMailbox, selectedStatus]);

  useEffect(() => {
    getMailboxConfig()
      .then((res) => setConfig(res.data))
      .catch(() => {});
  }, []);

  // Handle email click
  const handleSelectEmail = async (email) => {
    setSelectedEmail(email);
    if (email.status === "unread" && email.direction === "inbound") {
      try {
        await updateMailboxStatus(email.id, "read");
        setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, status: "read" } : e)));
        setCounts((prev) => ({
          ...prev,
          total_unread: Math.max(0, prev.total_unread - 1),
          [`${email.mailbox}_unread`]: Math.max(0, (prev[`${email.mailbox}_unread`] || 1) - 1),
        }));
      } catch (err) {
        console.error("Failed to mark email as read:", err);
      }
    }
  };

  // Toggle star
  const handleToggleStar = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await toggleMailboxStar(id);
      setEmails((prev) => prev.map((item) => (item.id === id ? { ...item, starred: res.data.starred } : item)));
      if (selectedEmail && selectedEmail.id === id) {
        setSelectedEmail((prev) => ({ ...prev, starred: res.data.starred }));
      }
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  // Delete email
  const handleDeleteEmail = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this email?")) return;
    try {
      await deleteMailboxEmail(id);
      setEmails((prev) => prev.filter((item) => item.id !== id));
      if (selectedEmail && selectedEmail.id === id) {
        setSelectedEmail(null);
      }
    } catch (err) {
      console.error("Failed to delete email:", err);
    }
  };

  // Reply button click
  const handleOpenReply = (email) => {
    setComposeData({
      mailbox: email.mailbox || "principal",
      to: email.reply_to || email.from,
      subject: email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      body: `\n\n--- On ${new Date(email.created_at).toLocaleString("en-IN")}, ${email.from_name || email.from} wrote:\n> ${email.body.split("\n").join("\n> ")}`,
      in_reply_to_id: email.id,
    });
    setShowCompose(true);
  };

  // Send compose/reply
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!composeData.to || !composeData.subject || !composeData.body) return;
    setSending(true);
    setSendFeedback(null);
    try {
      const res = await sendMailboxEmail(composeData);
      setSendFeedback({
        type: "success",
        text: `Email dispatched successfully via ${res.data.method === "zoho_smtp" ? "Zoho SMTP" : res.data.method === "resend" ? "Resend API" : "Local Dispatch Queue"}!`,
      });
      setTimeout(() => {
        setShowCompose(false);
        setSendFeedback(null);
        setComposeData({ mailbox: "principal", to: "", subject: "", body: "", in_reply_to_id: null });
        loadEmails(true);
      }, 1500);
    } catch (err) {
      setSendFeedback({
        type: "error",
        text: err?.response?.data?.error || "Failed to send email. Please check server logs.",
      });
    } finally {
      setSending(false);
    }
  };

  // Send simulated test email
  const handleSendTestIncoming = async (e) => {
    e.preventDefault();
    setTesting(true);
    try {
      await simulateTestIncoming(testData);
      setShowTestModal(false);
      loadEmails(true);
    } catch (err) {
      alert("Failed to send test email: " + (err?.response?.data?.error || err.message));
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = () => {
    if (!config?.webhook_url) return;
    navigator.clipboard.writeText(config.webhook_url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Real Connection & Controls */}
      <div className="bg-gradient-to-r from-[#0a3d29] via-[#0d4f36] to-[#0a3d29] text-white p-5 rounded-2xl shadow-lg border border-[#c99f3b]/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#c99f3b] text-[#0a3d29]">
                <ShieldCheck className="w-3.5 h-3.5" /> Approach A: Live Inbound Webhook
              </span>
              <span className="text-[12px] text-[#fff9e6]/70">100% Free Domain Inbox</span>
            </div>
            <h2 className="text-xl font-bold font-serif text-[#fff9e6]">Official School Mailbox Hub</h2>
            <p className="text-sm text-[#fff9e6]/80 mt-0.5">
              Receives live emails via the Inbound Webhook and dispatches official replies directly from your school domain.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowWebhookGuide(true)}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white transition flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-[#c99f3b]" /> Webhook Setup Guide
            </button>

            <button
              onClick={() => setShowTestModal(true)}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-[#c99f3b]/20 hover:bg-[#c99f3b]/30 border border-[#c99f3b]/40 text-[#fff9e6] transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c99f3b]" /> Send Test Email
            </button>

            <a
              href="https://www.zoho.com/mail/login.html"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-[12px] font-bold rounded-lg bg-[#c99f3b] text-[#0a3d29] hover:bg-[#dfb552] transition flex items-center gap-1.5 shadow"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Zoho Webmail ↗
            </a>

            <button
              onClick={() => {
                setComposeData({ mailbox: "principal", to: "", subject: "", body: "", in_reply_to_id: null });
                setShowCompose(true);
              }}
              className="px-3.5 py-1.5 text-[12px] font-bold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Compose Email
            </button>
          </div>
        </div>
      </div>

      {/* Main Mailbox Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Sub-header with Mailbox Tabs & Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Mailbox Selector Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {MAILBOX_OPTIONS.map((mb) => {
              const active = selectedMailbox === mb.id;
              const unread =
                mb.id === "all"
                  ? counts.total_unread
                  : counts[`${mb.id}_unread`] || 0;

              return (
                <button
                  key={mb.id}
                  onClick={() => {
                    setSelectedMailbox(mb.id);
                    setSelectedEmail(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition flex items-center gap-2 ${
                    active
                      ? "bg-[#0a3d29] text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Mail className={`w-3.5 h-3.5 ${active ? "text-[#c99f3b]" : "text-slate-400"}`} />
                  <span>{mb.label}</span>
                  {unread > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                        active ? "bg-[#c99f3b] text-[#0a3d29]" : "bg-red-500 text-white"
                      }`}
                    >
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search and Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadEmails()}
                placeholder="Search emails..."
                className="w-full pl-9 pr-3 py-1.5 text-[13px] rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0a3d29]/20"
              />
            </div>

            {/* Filter status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="unread">Unread ({counts.total_unread || 0})</option>
              <option value="starred">Starred ({counts.starred || 0})</option>
              <option value="outbound">Sent / Outbound ({counts.outbound || 0})</option>
            </select>

            <button
              onClick={() => loadEmails()}
              title="Refresh Mailbox"
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#0a3d29]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Split Pane: Email List (Left) & Email Detail (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px] max-h-[750px]">
          {/* Email List (4 cols on lg) */}
          <div className="lg:col-span-5 border-r border-slate-200 overflow-y-auto divide-y divide-slate-100">
            {loading && emails.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0a3d29]" />
                Loading mailbox messages...
              </div>
            ) : emails.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Inbox className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-800 text-[14px]">No messages in this folder</h4>
                <p className="text-[12px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Live messages received via the Inbound Webhook or sent by the school will show here.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setShowTestModal(true)}
                    className="px-3 py-1.5 text-[12px] font-semibold rounded-lg bg-[#0a3d29] text-white hover:bg-[#0d4f36]"
                  >
                    Send Test Email Now
                  </button>
                  <button
                    onClick={() => setShowWebhookGuide(true)}
                    className="px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Setup Guide
                  </button>
                </div>
              </div>
            ) : (
              emails.map((email) => {
                const isSelected = selectedEmail?.id === email.id;
                const isUnread = email.direction === "inbound" && email.status === "unread";
                const isOutbound = email.direction === "outbound";

                return (
                  <div
                    key={email.id}
                    onClick={() => handleSelectEmail(email)}
                    className={`p-3.5 cursor-pointer transition relative group ${
                      isSelected
                        ? "bg-[#0a3d29]/5 border-l-4 border-[#0a3d29]"
                        : isUnread
                        ? "bg-white font-semibold hover:bg-slate-50 border-l-4 border-[#c99f3b]"
                        : "bg-white/60 hover:bg-slate-50 border-l-4 border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Direction icon badge */}
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                            isOutbound
                              ? "bg-purple-100 text-purple-700"
                              : isUnread
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isOutbound ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                        </span>

                        <span
                          className={`text-[13px] truncate ${
                            isUnread ? "text-slate-900 font-bold" : "text-slate-700"
                          }`}
                        >
                          {isOutbound ? `To: ${email.to?.[0] || "Recipient"}` : email.from_name || email.from}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 shrink-0">
                        {new Date(email.created_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <h5
                      className={`text-[13px] mt-1 truncate ${
                        isUnread ? "text-slate-900 font-bold" : "text-slate-800"
                      }`}
                    >
                      {email.subject || "(No Subject)"}
                    </h5>

                    <p className="text-[12px] text-slate-500 line-clamp-1 mt-0.5">
                      {email.body}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {email.mailbox}
                        </span>
                        {email.status === "replied" && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            Replied
                          </span>
                        )}
                        {isOutbound && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                            Sent
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => handleToggleStar(e, email.id)}
                          className="p-1 text-slate-400 hover:text-amber-500 transition"
                          title={email.starred ? "Unstar" : "Star"}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              email.starred ? "fill-amber-400 text-amber-500" : ""
                            }`}
                          />
                        </button>
                        <button
                          onClick={(e) => handleDeleteEmail(e, email.id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Email Reader Pane (7 cols on lg) */}
          <div className="lg:col-span-7 bg-white flex flex-col h-full overflow-y-auto">
            {selectedEmail ? (
              <div className="p-6 flex flex-col h-full">
                {/* Header Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenReply(selectedEmail)}
                      className="px-3 py-1.5 text-[12px] font-bold rounded-lg bg-[#0a3d29] text-white hover:bg-[#0d4f36] flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                    <button
                      onClick={(e) => handleToggleStar(e, selectedEmail.id)}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border flex items-center gap-1.5 transition ${
                        selectedEmail.starred
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          selectedEmail.starred ? "fill-amber-400 text-amber-500" : "text-slate-400"
                        }`}
                      />
                      {selectedEmail.starred ? "Starred" : "Star"}
                    </button>
                    <button
                      onClick={async () => {
                        const newStatus = selectedEmail.status === "unread" ? "read" : "unread";
                        await updateMailboxStatus(selectedEmail.id, newStatus);
                        setSelectedEmail((prev) => ({ ...prev, status: newStatus }));
                        loadEmails(true);
                      }}
                      className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      Mark as {selectedEmail.status === "unread" ? "Read" : "Unread"}
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={(e) => handleDeleteEmail(e, selectedEmail.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      title="Delete email"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Email Metadata */}
                <div className="py-4 border-b border-slate-100">
                  <h3 className="text-xl font-bold font-serif text-slate-900">
                    {selectedEmail.subject || "(No Subject)"}
                  </h3>

                  <div className="flex items-start justify-between gap-4 mt-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0a3d29] text-[#c99f3b] font-bold flex items-center justify-center text-sm shadow-sm">
                        {(selectedEmail.from_name || selectedEmail.from)?.[0]?.toUpperCase() || "M"}
                      </div>
                      <div>
                        <div className="text-[14px] font-bold text-slate-900">
                          {selectedEmail.from_name || selectedEmail.from}
                        </div>
                        <div className="text-[12px] text-slate-500">
                          From: <span className="text-slate-700">{selectedEmail.from}</span>
                        </div>
                        <div className="text-[12px] text-slate-500">
                          To: <span className="text-slate-700">{selectedEmail.to?.join(", ")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[12px] text-slate-500">
                        {new Date(selectedEmail.created_at).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#0a3d29]/10 text-[#0a3d29]">
                        Target: {selectedEmail.mailbox}@juniordpsdarbhanga.com
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="py-6 flex-1 text-slate-800 text-[14px] leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedEmail.body}
                </div>

                {/* Quick In-line Reply Box */}
                <div className="mt-auto pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Reply className="w-3.5 h-3.5 text-[#0a3d29]" />
                      Quick Reply as {selectedEmail.mailbox}@juniordpsdarbhanga.com
                    </span>
                    <button
                      onClick={() => handleOpenReply(selectedEmail)}
                      className="text-[12px] text-[#0a3d29] hover:underline font-semibold"
                    >
                      Open Full Composer ↗
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenReply(selectedEmail)}
                      className="w-full py-2.5 text-[13px] font-semibold rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 text-left px-4 flex items-center gap-2"
                    >
                      <Reply className="w-4 h-4 text-slate-400" />
                      Click here to reply to {selectedEmail.from_name || selectedEmail.from}...
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="m-auto text-center p-8 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-[#0a3d29]/10 text-[#0a3d29] flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-[#0a3d29]" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 font-serif">Select an email to read</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Choose a message from the list on the left to read its full content, send replies, or manage its status.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setComposeData({ mailbox: "principal", to: "", subject: "", body: "", in_reply_to_id: null });
                      setShowCompose(true);
                    }}
                    className="px-4 py-2 text-[12px] font-bold rounded-lg bg-[#0a3d29] text-white hover:bg-[#0d4f36] shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Compose New Email
                  </button>
                  <button
                    onClick={() => setShowTestModal(true)}
                    className="px-4 py-2 text-[12px] font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Send Test Email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: Compose New Email / Reply */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0a3d29] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#c99f3b]" />
                <h4 className="font-bold font-serif text-[15px] text-[#fff9e6]">
                  {composeData.in_reply_to_id ? "Reply to Email" : "Compose Official Email"}
                </h4>
              </div>
              <button
                onClick={() => setShowCompose(false)}
                className="text-white/70 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              {sendFeedback && (
                <div
                  className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                    sendFeedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {sendFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  {sendFeedback.text}
                </div>
              )}

              {/* Sender mailbox selector */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Send As (From):</label>
                <select
                  value={composeData.mailbox}
                  onChange={(e) => setComposeData((prev) => ({ ...prev, mailbox: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0a3d29]/20"
                >
                  <option value="principal">Principal — principal@juniordpsdarbhanga.com</option>
                  <option value="info">Admissions & Info — info@juniordpsdarbhanga.com</option>
                  <option value="account">Accounts Office — account@juniordpsdarbhanga.com</option>
                </select>
              </div>

              {/* Recipient To */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">To (Recipient Email):</label>
                <input
                  type="email"
                  required
                  value={composeData.to}
                  onChange={(e) => setComposeData((prev) => ({ ...prev, to: e.target.value }))}
                  placeholder="e.g. parent@example.com or sandyverma3@gmail.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0a3d29]/20"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Subject:</label>
                <input
                  type="text"
                  required
                  value={composeData.subject}
                  onChange={(e) => setComposeData((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="Subject line"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0a3d29]/20"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Message Body:</label>
                <textarea
                  rows={6}
                  required
                  value={composeData.body}
                  onChange={(e) => setComposeData((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="Type your official correspondence here..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0a3d29]/20"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="text-[11px] text-slate-400">
                  Outbound emails are archived in your sent mailbox and sent via SMTP/Resend.
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCompose(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={sending}
                    className="bg-[#0a3d29] hover:bg-[#0d4f36] text-white font-bold"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-2" /> Send Message
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Test Incoming Simulator */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-[#0a3d29] to-[#0d4f36] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c99f3b]" />
                <h4 className="font-bold font-serif text-[15px] text-[#fff9e6]">
                  Simulate Live Test Inbound Email
                </h4>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTestIncoming} className="p-6 space-y-4">
              <p className="text-[13px] text-slate-600">
                Use this simulator to send a real test email into the mailbox system right now to verify that inbound emails show up accurately in your admin dashboard.
              </p>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Target School Mailbox:</label>
                <select
                  value={testData.mailbox}
                  onChange={(e) => setTestData((prev) => ({ ...prev, mailbox: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                >
                  <option value="principal">principal@juniordpsdarbhanga.com</option>
                  <option value="info">info@juniordpsdarbhanga.com</option>
                  <option value="account">account@juniordpsdarbhanga.com</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Sender Email:</label>
                <input
                  type="email"
                  required
                  value={testData.from}
                  onChange={(e) => setTestData((prev) => ({ ...prev, from: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Sender Name:</label>
                <input
                  type="text"
                  required
                  value={testData.from_name}
                  onChange={(e) => setTestData((prev) => ({ ...prev, from_name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Subject:</label>
                <input
                  type="text"
                  required
                  value={testData.subject}
                  onChange={(e) => setTestData((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">Message Body:</label>
                <textarea
                  rows={4}
                  required
                  value={testData.body}
                  onChange={(e) => setTestData((prev) => ({ ...prev, body: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={() => setShowTestModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={testing}
                  className="bg-[#0a3d29] hover:bg-[#0d4f36] text-white font-bold"
                >
                  {testing ? "Simulating..." : "Send Test Email Now"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Webhook Setup Guide */}
      {showWebhookGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="bg-[#0a3d29] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#c99f3b]" />
                <h4 className="font-bold font-serif text-[15px] text-[#fff9e6]">
                  Approach A: Inbound Email Webhook Setup Guide
                </h4>
              </div>
              <button
                onClick={() => setShowWebhookGuide(false)}
                className="text-white/70 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700">
              <div>
                <h5 className="font-bold text-slate-900 text-base mb-1">
                  How Inbound Webhook Routing Works (100% Free):
                </h5>
                <p className="text-slate-600">
                  Because Zoho Mail Free Tier does not offer IMAP background synchronization, an Inbound Email Webhook is the standard industry method to receive real incoming emails into your website’s database in real-time.
                </p>
              </div>

              {/* Webhook URL box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Your Public Inbound Webhook Endpoint:
                </label>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-2 rounded-lg bg-slate-900 text-emerald-400 text-xs font-mono flex-1 truncate">
                    {config?.webhook_url || "https://juniordpsdarbhanga.com/api/webhooks/inbound-email"}
                  </code>
                  <button
                    onClick={copyWebhookUrl}
                    className="px-3 py-2 rounded-lg bg-[#0a3d29] text-white hover:bg-[#0d4f36] text-xs font-bold flex items-center gap-1 shrink-0"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? "Copied!" : "Copy URL"}
                  </button>
                </div>
              </div>

              {/* Method 1: Cloudflare Email Routing (Free) */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-[#c99f3b] text-[#0a3d29] text-xs flex items-center justify-center font-bold">1</span>
                  Option 1: Cloudflare Email Routing Worker (100% Free)
                </div>
                <p className="text-xs text-slate-600">
                  If your domain DNS is on Cloudflare: Go to <strong>Email Routing ➔ Email Workers</strong> and paste this snippet:
                </p>
                <pre className="bg-slate-900 text-slate-200 p-3 rounded-lg text-[11px] overflow-x-auto font-mono">
{`export default {
  async email(message, env, ctx) {
    const rawEmail = await new Response(message.raw).text();
    await fetch("${config?.webhook_url || "https://juniordpsdarbhanga.com/api/webhooks/inbound-email"}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.headers.get("subject") || "(No Subject)",
        body: rawEmail,
        date: new Date().toISOString()
      })
    });
  }
};`}
                </pre>
              </div>

              {/* Method 2: SendGrid Inbound Parse (Free) */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-[#c99f3b] text-[#0a3d29] text-xs flex items-center justify-center font-bold">2</span>
                  Option 2: SendGrid Inbound Parse (100% Free tier)
                </div>
                <p className="text-xs text-slate-600">
                  In SendGrid Settings ➔ Inbound Parse, add hostname <code>juniordpsdarbhanga.com</code> and paste the webhook URL above.
                </p>
              </div>

              {/* Outbound SMTP Status */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <h6 className="font-bold text-amber-900 text-xs uppercase tracking-wider mb-1">
                  Outbound SMTP Configuration Status:
                </h6>
                <p className="text-xs text-amber-800">
                  {config?.smtp_configured ? (
                    <span className="text-emerald-700 font-bold">✓ Zoho SMTP credentials detected in environment. Outbound replies will dispatch directly through Zoho!</span>
                  ) : (
                    <span>
                      To send live replies through Zoho SMTP, set <code>ZOHO_SMTP_USER=principal@juniordpsdarbhanga.com</code> and <code>ZOHO_SMTP_PASS=&lt;password&gt;</code> in your deployment environment variables.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-end">
              <Button onClick={() => setShowWebhookGuide(false)} className="bg-[#0a3d29] text-white">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
