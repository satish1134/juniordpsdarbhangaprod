import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, Lock, User, Loader2, ArrowRight, ShieldCheck, Clock, ShieldAlert } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { adminLogin, adminMe } from "../lib/api";
import { isSessionExpired, clearAdminSession, hasValidAdminSession } from "../lib/sessionManager";
import { useToast } from "../hooks/use-toast";
import { useContent } from "../lib/ContentContext";
import { LOGO_RADIUS_CLASS, fontFamilyFor } from "../lib/displaySizes";

const AdminLogin = () => {
  const [form, setForm] = useState({ username: "", password: "", otp: "" });
  const [loading, setLoading] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { content } = useContent();
  const schoolInfo = content.school_info || {};
  const logoRadius = LOGO_RADIUS_CLASS[(content.display || {}).logo_shape] || LOGO_RADIUS_CLASS.circle;
  const nameFont = fontFamilyFor((content.display || {}).name_font);

  const queryParams = new URLSearchParams(location.search);
  const isIdleTimeout = queryParams.get("reason") === "idle_timeout";

  useEffect(() => {
    // If arriving with idle timeout reason, ensure local session is purged
    if (isIdleTimeout || isSessionExpired()) {
      clearAdminSession();
    } else if (hasValidAdminSession()) {
      adminMe()
        .then(() => navigate("/admin"))
        .catch(() => clearAdminSession());
    }
  }, [isIdleTimeout, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return;
    setLoading(true);
    try {
      const res = await adminLogin(form.username, form.password, needsOtp ? form.otp : undefined);
      toast({ title: "Welcome back", description: `Signed in as ${res.data.username}` });
      navigate("/admin");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Invalid credentials";
      const s = String(msg).toLowerCase();
      if (s.includes("otp")) {
        setNeedsOtp(true);
        toast({ title: "Two-factor code required", description: "Enter the 6-digit code from your authenticator app." });
      } else {
        toast({ title: "Sign in failed", description: String(msg) });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a3d29] flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="blob w-[500px] h-[500px] bg-[#c99f3b] -top-40 -right-40 opacity-25" />
      <div className="blob w-[400px] h-[400px] bg-[#167a51] -bottom-40 -left-40 opacity-40" />
      <div className="dots-bg absolute inset-0 opacity-25" />

      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          {schoolInfo.logo ? (
            <div className={`w-14 h-14 ${logoRadius} bg-white flex items-center justify-center overflow-hidden p-1`}>
              <img src={schoolInfo.logo} alt="School logo" className={`w-full h-full object-cover ${logoRadius}`} />
            </div>
          ) : (
            <div className={`w-14 h-14 ${logoRadius} bg-[#c99f3b] flex items-center justify-center`}>
              <GraduationCap className="w-7 h-7 text-[#0a3d29]" />
            </div>
          )}
          <div>
            <div className="font-bold text-[22px] text-[#fff9e6] tracking-tight" style={{ fontFamily: nameFont }}>
              {schoolInfo.name || "Junior DPS Darbhanga"}
            </div>
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#c99f3b] mt-0.5">Admin Console</div>
          </div>
        </div>

        <div className="bg-[#fff9e6] rounded-3xl p-8 shadow-2xl">
          <h1 className="font-display text-3xl font-bold text-[#0a3d29]">Welcome back</h1>
          <p className="text-[14px] text-[#1c2a24]/70 mt-2">Sign in to manage enquiries and news.</p>

          {isIdleTimeout && (
            <div className="mt-5 p-3.5 rounded-2xl bg-[#c99f3b]/15 border border-[#c99f3b]/40 text-[#8a6b1e] flex items-start gap-3">
              <Clock className="w-5 h-5 shrink-0 mt-0.5 text-[#c99f3b]" />
              <div className="text-[12.5px] leading-relaxed">
                <span className="font-bold block text-[#0a3d29]">Session timed out</span>
                You were automatically signed out after 5 minutes of inactivity for portal security.
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Username</label>
              <div className="mt-2 relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#0a5f3d]/60" />
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="pl-11 h-12 bg-white border-[#0a5f3d]/15 rounded-xl focus-visible:ring-[#0a5f3d]"
                  placeholder="admin"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Password</label>
              <div className="mt-2 relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#0a5f3d]/60" />
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pl-11 h-12 bg-white border-[#0a5f3d]/15 rounded-xl focus-visible:ring-[#0a5f3d]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {needsOtp && (
              <div className="rounded-2xl bg-[#0a5f3d]/8 border border-[#0a5f3d]/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#0a5f3d]" />
                  <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Authenticator code</label>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  className="h-12 bg-white border-[#0a5f3d]/15 rounded-xl font-mono tracking-[0.4em] text-center text-lg focus-visible:ring-[#0a5f3d]"
                  placeholder="123 456"
                  autoFocus
                  data-testid="admin-login-otp-input"
                />
                <p className="mt-2 text-[11.5px] text-[#1c2a24]/60">Enter the 6-digit code from Google Authenticator, Authy or 1Password.</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (needsOtp && form.otp.length !== 6)}
              className="w-full bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-12 font-semibold text-[15px] shadow-lg disabled:opacity-70"
              data-testid="admin-login-submit"
            >
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>) : (<>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>)}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#0a5f3d]/10 text-[12px] text-[#1c2a24]/60 leading-relaxed">
            <strong className="text-[#0a3d29]">Demo credentials:</strong> username <code className="text-[#0a5f3d] font-semibold">admin</code> · password <code className="text-[#0a5f3d] font-semibold">admin123</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
