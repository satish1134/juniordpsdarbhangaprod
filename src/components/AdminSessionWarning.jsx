import React from "react";
import { Clock, ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

export default function AdminSessionWarning({
  open,
  remainingSeconds,
  onExtend,
  onLogout,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#fff9e6] border-2 border-[#c99f3b] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
        {/* Decorative background aura */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#c99f3b]/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#0a5f3d]/15 rounded-full blur-2xl" />

        <div className="relative">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#c99f3b]/20 border border-[#c99f3b]/40 flex items-center justify-center text-[#8a6b1e]">
            <Clock className="w-8 h-8 animate-pulse text-[#c99f3b]" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c99f3b]/15 text-[#8a6b1e] text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" /> Inactivity Security Alert
          </div>

          <h3 className="font-display text-2xl font-bold text-[#0a3d29] mt-1">
            Session Expiring Soon
          </h3>

          <p className="text-[14px] text-[#1c2a24]/75 mt-2 leading-relaxed">
            No activity detected for over 4 minutes. Your admin session will automatically terminate in:
          </p>

          <div className="my-5 py-3 px-4 bg-white rounded-2xl border border-[#0a5f3d]/15 inline-flex items-center gap-2 shadow-inner">
            <span className="font-mono text-3xl font-extrabold text-[#c99f3b] tracking-wider">
              {remainingSeconds}s
            </span>
          </div>

          <p className="text-[12px] text-[#1c2a24]/60 mb-6">
            Click <b>Extend Session</b> to stay logged in, or you will be redirected to the login screen.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onExtend}
              className="flex-1 bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-11 font-semibold text-[14px] shadow-md flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Extend Session
            </Button>
            <Button
              variant="outline"
              onClick={onLogout}
              className="border-[#0a5f3d]/20 text-[#0a3d29] hover:bg-[#0a5f3d]/10 rounded-full h-11 font-medium text-[14px] flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Log Out Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
