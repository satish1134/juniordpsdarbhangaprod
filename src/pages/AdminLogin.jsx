import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  GraduationCap,
  Lock,
  User,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  QrCode,
  Copy,
  Mail,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  adminLogin,
  adminMe,
  verifyTwoFaSetup,
  sendEmailOtp,
  getAdminPath,
} from "../lib/api";
import {
  isSessionExpired,
  clearAdminSession,
  hasValidAdminSession,
} from "../lib/sessionManager";
import { useToast } from "../hooks/use-toast";
import { useContent } from "../lib/ContentContext";
import { LOGO_RADIUS_CLASS, fontFamilyFor } from "../lib/displaySizes";

const AdminLogin = () => {
  const [form, setForm] = useState({ username: "", password: "", otp: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);

  // Compulsory 2FA setup state
  const [setupData, setSetupData] = useState(null); // { secret, qr_data_url, temp_token }
  const [setupCode, setSetupCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  // Email OTP state
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpLoading, setEmailOtpLoading] = useState(false);

  // Rate limiting lockout state
  const [lockoutError, setLockoutError] = useState(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const adminPath = getAdminPath();
  const { content } = useContent();
  const schoolInfo = content.school_info || {};
  const logoRadius =
    LOGO_RADIUS_CLASS[(content.display || {}).logo_shape] ||
    LOGO_RADIUS_CLASS.circle;
  const nameFont = fontFamilyFor((content.display || {}).name_font);

  const queryParams = new URLSearchParams(location.search);
  const isIdleTimeout = queryParams.get("reason") === "idle_timeout";

  useEffect(() => {
    // Prevent search engine indexing
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, nofollow, noarchive";

    // If arriving with idle timeout reason, ensure local session is purged
    if (isIdleTimeout || isSessionExpired()) {
      clearAdminSession();
    } else if (hasValidAdminSession()) {
      adminMe()
        .then(() => navigate(adminPath))
        .catch(() => clearAdminSession());
    }
  }, [isIdleTimeout, navigate, adminPath]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return;
    setLoading(true);
    setLockoutError(null);

    try {
      const res = await adminLogin(
        form.username.trim(),
        form.password,
        needsOtp ? form.otp : undefined
      );

      // Check if compulsory 2FA setup is required
      if (res.data?.require_2fa_setup) {
        setSetupData({
          secret: res.data.secret,
          qr_data_url: res.data.qr_data_url,
          temp_token: res.data.temp_token,
        });
        toast({
          title: "Two-Factor Authentication Required",
          description: "Google Authenticator is compulsory. Please scan the QR code to finish setup.",
        });
        return;
      }

      toast({
        title: "Welcome back",
        description: `Signed in as ${res.data.username || form.username}`,
      });
      navigate(adminPath);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const msg =
        data?.detail ||
        data?.error?.message ||
        data?.message ||
        err?.message ||
        "Invalid credentials";

      if (status === 429) {
        setLockoutError(String(msg));
        toast({
          title: "Account Locked (Security Protection)",
          description: String(msg),
          variant: "destructive",
        });
        return;
      }

      const s = String(msg).toLowerCase();
      if (s.includes("otp") || s.includes("two-factor") || data?.require_2fa) {
        setNeedsOtp(true);
        toast({
          title: "2FA Code Required",
          description: "Enter the 6-digit code from Google Authenticator or your email.",
        });
      } else {
        toast({
          title: "Sign in failed",
          description: String(msg),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    if (setupCode.length !== 6 || !setupData?.temp_token) return;
    setSetupLoading(true);
    try {
      const res = await verifyTwoFaSetup(setupCode, setupData.temp_token);
      toast({
        title: "2FA Activated & Signed In",
        description: `Welcome, ${res.data.username || "Admin"}!`,
      });
      navigate(adminPath);
    } catch (err) {
      toast({
        title: "Setup Verification Failed",
        description:
          err?.response?.data?.detail ||
          "Invalid 6-digit code. Please check Google Authenticator and retry.",
        variant: "destructive",
      });
    } finally {
      setSetupLoading(false);
    }
  };

  const handleRequestEmailOtp = async () => {
    if (!form.username) {
      toast({ title: "Username required", description: "Please enter your username first." });
      return;
    }
    setEmailOtpLoading(true);
    try {
      await sendEmailOtp(form.username.trim());
      setEmailOtpSent(true);
      toast({
        title: "Email OTP Sent",
        description: "A 6-digit verification code was sent to the registered administrator email. Valid for 10 minutes.",
      });
    } catch (err) {
      toast({
        title: "Could not send OTP",
        description: err?.response?.data?.detail || "Email dispatch failed. Please use Google Authenticator.",
        variant: "destructive",
      });
    } finally {
      setEmailOtpLoading(false);
    }
  };

  const copySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    toast({
      title: "Key Copied",
      description: "Secret key copied to clipboard. You can paste it manually into Google Authenticator.",
    });
  };

  return (
    <div className="min-h-screen bg-[#0a3d29] flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="blob w-[500px] h-[500px] bg-[#c99f3b] -top-40 -right-40 opacity-25" />
      <div className="blob w-[400px] h-[400px] bg-[#167a51] -bottom-40 -left-40 opacity-40" />
      <div className="dots-bg absolute inset-0 opacity-25" />

      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          {schoolInfo.logo ? (
            <div
              className={`w-14 h-14 ${logoRadius} bg-white flex items-center justify-center overflow-hidden p-1`}
            >
              <img
                src={schoolInfo.logo}
                alt="School logo"
                className={`w-full h-full object-cover ${logoRadius}`}
              />
            </div>
          ) : (
            <div
              className={`w-14 h-14 ${logoRadius} bg-[#c99f3b] flex items-center justify-center`}
            >
              <GraduationCap className="w-7 h-7 text-[#0a3d29]" />
            </div>
          )}
          <div>
            <div
              className="font-bold text-[22px] text-[#fff9e6] tracking-tight"
              style={{ fontFamily: nameFont }}
            >
              {schoolInfo.name || "Junior DPS Darbhanga"}
            </div>
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#c99f3b] mt-0.5">
              Secure Admin Console
            </div>
          </div>
        </div>

        <div className="bg-[#fff9e6] rounded-3xl p-8 shadow-2xl border border-[#c99f3b]/20">
          {/* Compulsory 2FA Setup Flow */}
          {setupData ? (
            <div>
              <div className="flex items-center gap-2.5 text-[#0a5f3d]">
                <ShieldCheck className="w-6 h-6 text-[#0a5f3d]" />
                <h1 className="font-display text-2xl font-bold">
                  Compulsory 2FA Setup
                </h1>
              </div>
              <p className="text-[13.5px] text-[#1c2a24]/75 mt-1.5 leading-relaxed">
                Two-Factor Authentication is mandatory for admin access. Scan this QR
                code with <strong>Google Authenticator</strong> (or Authy / 1Password).
              </p>

              <div className="mt-5 p-4 bg-white rounded-2xl border border-[#0a5f3d]/20 flex flex-col items-center justify-center">
                {setupData.qr_data_url ? (
                  <img
                    src={setupData.qr_data_url}
                    alt="2FA QR Code"
                    className="w-48 h-48 rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-[#1c2a24]/40">
                    <QrCode className="w-12 h-12" />
                  </div>
                )}

                <div className="mt-3 w-full">
                  <div className="text-[11px] uppercase tracking-wider text-[#0a5f3d] font-semibold text-center mb-1">
                    Manual Secret Key
                  </div>
                  <div className="flex items-center gap-2 bg-[#f5f2ea] p-2 rounded-xl text-[12px] font-mono justify-between">
                    <span className="truncate text-[#0a3d29] font-bold select-all">
                      {setupData.secret}
                    </span>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="p-1.5 hover:bg-[#0a5f3d]/10 rounded-lg text-[#0a5f3d]"
                      title="Copy Key"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerifySetup} className="mt-5 space-y-4">
                <div>
                  <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">
                    Enter 6-Digit Authenticator Code
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={setupCode}
                    onChange={(e) =>
                      setSetupCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="mt-1.5 h-12 bg-white border-[#0a5f3d]/25 rounded-xl font-mono tracking-[0.4em] text-center text-xl font-bold text-[#0a3d29] focus-visible:ring-[#0a5f3d]"
                    placeholder="123 456"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={setupLoading || setupCode.length !== 6}
                  className="w-full bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-12 font-semibold text-[15px] shadow-lg disabled:opacity-60"
                >
                  {setupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating
                      2FA…
                    </>
                  ) : (
                    <>
                      Activate & Enter Console <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            /* Normal Login Flow */
            <>
              <h1 className="font-display text-3xl font-bold text-[#0a3d29]">
                Admin Sign In
              </h1>
              <p className="text-[14px] text-[#1c2a24]/70 mt-1.5">
                Protected school management portal.
              </p>

              {lockoutError && (
                <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-[13px]">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Security Lockout Active</div>
                    <div className="mt-0.5 text-red-700/90">{lockoutError}</div>
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">
                    Username
                  </label>
                  <div className="mt-1.5 relative">
                    <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#0a5f3d]/60" />
                    <Input
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                      className="pl-11 h-12 bg-white border-[#0a5f3d]/15 rounded-xl focus-visible:ring-[#0a5f3d]"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">
                    Password
                  </label>
                  <div className="mt-1.5 relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#0a5f3d]/60" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      className="pl-11 pr-11 h-12 bg-white border-[#0a5f3d]/15 rounded-xl focus-visible:ring-[#0a5f3d]"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0a5f3d]/60 hover:text-[#0a3d29] focus:outline-none"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {needsOtp && (
                  <div className="rounded-2xl bg-[#0a5f3d]/8 border border-[#0a5f3d]/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#0a5f3d]" />
                        <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">
                          2FA Code
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleRequestEmailOtp}
                        disabled={emailOtpLoading}
                        className="text-[11.5px] text-[#0a5f3d] hover:underline flex items-center gap-1 font-medium disabled:opacity-50"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {emailOtpLoading
                          ? "Sending..."
                          : emailOtpSent
                          ? "Resend Email OTP"
                          : "Send to Email"}
                      </button>
                    </div>

                    <Input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={form.otp}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                        })
                      }
                      className="h-12 bg-white border-[#0a5f3d]/25 rounded-xl font-mono tracking-[0.4em] text-center text-lg font-bold focus-visible:ring-[#0a5f3d]"
                      placeholder="123 456"
                      autoFocus
                    />

                    <p className="text-[11.5px] text-[#1c2a24]/65">
                      {emailOtpSent
                        ? "Enter the 6-digit code sent to your registered admin email, or your Google Authenticator code."
                        : "Enter the 6-digit code from Google Authenticator, Authy, or click Send to Email."}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || (needsOtp && form.otp.length !== 6)}
                  className="w-full bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-12 font-semibold text-[15px] shadow-lg disabled:opacity-60 transition"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      Sign In <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-[#0a5f3d]/10 flex items-center justify-between text-[11px] text-[#1c2a24]/50">
                <span className="flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" /> 256-bit Encrypted
                </span>
                <span>Max 5 attempts · 15m Lockout</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
