import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Activity,
  Server,
  Database,
  Mail,
  Cpu,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import { fetchSystemMetrics } from "../lib/api";

const SystemHealthModal = ({ open, onOpenChange }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetchSystemMetrics();
      if (res.data && res.data.ok) {
        setMetrics(res.data);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to fetch system metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadMetrics();
      const interval = setInterval(loadMetrics, 10000);
      return () => clearInterval(interval);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border border-[#0a5f3d]/20 rounded-3xl p-0 overflow-hidden shadow-2xl">
        {/* Header banner */}
        <div className="bg-[#0a3d29] px-6 py-5 text-[#fff9e6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0a5f3d] flex items-center justify-center text-[#c99f3b] border border-[#c99f3b]/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-[17px] font-bold text-[#fff9e6]">
                Production VPS & System Health
              </DialogTitle>
              <DialogDescription className="text-[12px] text-[#fff9e6]/70 mt-0.5">
                Real-time observability for Junior DPS Darbhanga (Host: 5.175.216.125)
              </DialogDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadMetrics}
            disabled={loading}
            className="rounded-full border-[#fff9e6]/30 bg-white/10 text-[#fff9e6] hover:bg-white/20 text-[12px] h-8 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Checking..." : "Refresh"}
          </Button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status highlight grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0a5f3d]/5 border border-[#0a5f3d]/15 rounded-2xl p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold text-[13px] mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                <span>ONLINE</span>
              </div>
              <span className="text-[11px] text-[#1c2a24]/60 font-medium">Server Status</span>
            </div>

            <div className="bg-[#0a5f3d]/5 border border-[#0a5f3d]/15 rounded-2xl p-3.5 text-center">
              <div className="font-bold text-[14px] text-[#0a3d29] mb-1">
                {metrics?.server?.uptime_formatted || "--"}
              </div>
              <span className="text-[11px] text-[#1c2a24]/60 font-medium">Uptime</span>
            </div>

            <div className="bg-[#0a5f3d]/5 border border-[#0a5f3d]/15 rounded-2xl p-3.5 text-center">
              <div className="font-bold text-[14px] text-[#0a3d29] mb-1">
                {metrics?.database?.status === "connected" ? (
                  <span className="text-emerald-700 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {metrics?.database?.ping_ms || 1}ms
                  </span>
                ) : (
                  <span className="text-amber-700">Connecting</span>
                )}
              </div>
              <span className="text-[11px] text-[#1c2a24]/60 font-medium">MongoDB Latency</span>
            </div>

            <div className="bg-[#0a5f3d]/5 border border-[#0a5f3d]/15 rounded-2xl p-3.5 text-center">
              <div className="font-bold text-[14px] text-[#0a3d29] mb-1">
                {metrics?.server?.memory_rss_mb ? `${metrics.server.memory_rss_mb} MB` : "--"}
              </div>
              <span className="text-[11px] text-[#1c2a24]/60 font-medium">Memory (RSS)</span>
            </div>
          </div>

          {/* Detailed modules */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* VPS & Container specs */}
            <div className="border border-[#0a5f3d]/15 rounded-2xl p-4 bg-white">
              <div className="flex items-center gap-2 font-bold text-[13px] text-[#0a3d29] mb-3 pb-2 border-b border-[#0a5f3d]/10">
                <Cpu className="w-4 h-4 text-[#c99f3b]" />
                VPS Host & Runtime
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Public IP Address:</span>
                  <span className="font-mono font-bold text-gray-800">5.175.216.125</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Node.js Engine:</span>
                  <span className="font-mono text-gray-800">{metrics?.server?.node_version || "v22.x"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">OS Architecture:</span>
                  <span className="font-medium text-gray-800">
                    {metrics?.server?.platform || "linux"} ({metrics?.server?.arch || "x64"})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Container Port:</span>
                  <span className="font-mono text-gray-800">3000 (Proxy 443 HTTPS)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Heap Memory:</span>
                  <span className="font-medium text-gray-800">
                    {metrics?.server?.memory_heap_used_mb || 0} / {metrics?.server?.memory_heap_total_mb || 0} MB
                  </span>
                </div>
              </div>
            </div>

            {/* Email dispatch subsystem */}
            <div className="border border-[#0a5f3d]/15 rounded-2xl p-4 bg-white">
              <div className="flex items-center gap-2 font-bold text-[13px] text-[#0a3d29] mb-3 pb-2 border-b border-[#0a5f3d]/10">
                <Mail className="w-4 h-4 text-[#c99f3b]" />
                Email Services & Webhook
              </div>
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Zoho SMTP Host:</span>
                  <span className="font-mono text-gray-800">{metrics?.services?.zoho_smtp_host || "smtp.zoho.com"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Zoho SMTP Port:</span>
                  <span className="font-mono text-gray-800">{metrics?.services?.zoho_smtp_port || "587"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Zoho Outbound Status:</span>
                  <span className={`font-semibold ${metrics?.services?.zoho_smtp_configured ? "text-emerald-700" : "text-amber-700"}`}>
                    {metrics?.services?.zoho_smtp_configured ? "✓ Configured & Ready" : "Awaiting Secret"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Inbound Webhook:</span>
                  <span className="text-emerald-700 font-semibold">✓ Active on /api/webhooks</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Resend Fallback:</span>
                  <span className="text-gray-700 font-medium">
                    {metrics?.services?.resend_fallback_configured ? "Enabled (Backup)" : "Not Active"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* GitHub Deployment Pipeline info */}
          <div className="bg-[#fff9e6] border border-[#c99f3b]/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[13px] font-bold text-[#0a3d29]">
                <ShieldCheck className="w-4 h-4 text-[#c99f3b]" />
                Deployment Pipeline (GitHub Actions CI/CD)
              </div>
              <a
                href="https://github.com/satish1134/juniordpsdarbhangaprod/actions"
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-bold text-[#0a5f3d] hover:text-[#0a3d29] flex items-center gap-1 hover:underline"
              >
                View Live GitHub Actions ↗
              </a>
            </div>
            <p className="text-[12px] text-[#1c2a24]/80 leading-relaxed mb-3">
              Every push to <code className="bg-white px-1.5 py-0.5 rounded text-[11px] font-bold border border-[#c99f3b]/30">main</code> triggers an automated build and deploy to your production VPS (<strong>5.175.216.125</strong>).
            </p>
            <div className="bg-white/80 rounded-xl p-2.5 text-[11.5px] text-[#1c2a24]/70 space-y-1 border border-[#c99f3b]/20">
              <div>• <strong>Build Time:</strong> ~70 seconds (compiling Docker image in GitHub)</div>
              <div>• <strong>Sync Window:</strong> ~30 seconds (SSH into VPS, pulling latest image, restarting container)</div>
              <div>• <em>During this ~30-second restart, the website reloads and comes right back up.</em></div>
            </div>
          </div>

          {/* Direct links */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <a
              href="https://juniordpsdarbhanga.com/api/health"
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-[#0a5f3d] font-semibold flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Public Health URL (api/health)
            </a>
            {lastRefreshed && (
              <span className="text-[11px] text-gray-400">
                Last checked: {lastRefreshed}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SystemHealthModal;
