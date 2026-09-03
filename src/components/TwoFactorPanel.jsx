import React, { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, CheckCircle2, Copy, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { twofaStatus, twofaSetup, twofaEnable, twofaDisable, changeAdminPassword } from "../lib/api";
import { useToast } from "../hooks/use-toast";

const TwoFactorPanel = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState(null); // null | { enabled: bool }
  const [setup, setSetup] = useState(null);   // { secret, otpauth_uri, qr_data_url }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await twofaStatus();
      setStatus(r.data);
    } catch (err) {
      toast({ title: "Could not load 2FA status", description: err?.response?.data?.detail || err.message });
    }
  };

  useEffect(() => { load(); }, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const r = await twofaSetup();
      setSetup(r.data);
    } catch (err) {
      toast({ title: "Setup failed", description: err?.response?.data?.detail || err.message });
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    try {
      await twofaEnable(code);
      toast({ title: "Two-factor authentication enabled", description: "You will now be asked for a code on every sign-in." });
      setSetup(null); setCode(""); await load();
    } catch (err) {
      toast({ title: "Invalid code", description: err?.response?.data?.detail || "Please try again with the current authenticator code." });
    } finally { setBusy(false); }
  };

  const disable = async () => {
    if (code.length !== 6) return;
    if (!window.confirm("Disable two-factor authentication? This will remove the current authenticator link.")) return;
    setBusy(true);
    try {
      await twofaDisable(code);
      toast({ title: "Two-factor authentication disabled" });
      setCode(""); await load();
    } catch (err) {
      toast({ title: "Could not disable", description: err?.response?.data?.detail || "Please enter your current authenticator code." });
    } finally { setBusy(false); }
  };

  const copySecret = () => {
    if (!setup?.secret) return;
    navigator.clipboard.writeText(setup.secret);
    toast({ title: "Secret copied", description: "Paste it into your authenticator app if you cannot scan the QR code." });
  };

  if (!status) {
    return <div className="p-8 flex items-center gap-3 text-[#1c2a24]/60"><Loader2 className="w-5 h-5 animate-spin" /> Loading security settings…</div>;
  }

  return (
    <div className="bg-white rounded-3xl border border-[#0a5f3d]/10 p-8 max-w-3xl">
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${status.enabled ? "bg-[#0a5f3d]/12" : "bg-[#c99f3b]/15"}`}>
          {status.enabled
            ? <ShieldCheck className="w-7 h-7 text-[#0a5f3d]" />
            : <ShieldAlert className="w-7 h-7 text-[#8a6b1e]" />}
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-[#0a3d29]">Two-factor authentication</h2>
          <p className="text-[14px] text-[#1c2a24]/70 mt-1 max-w-xl">
            Add a second layer of security to the admin console. When enabled, sign-in requires a 6-digit code
            from Google Authenticator, Authy or 1Password in addition to your password.
          </p>
          <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11.5px] font-bold tracking-widest uppercase ${status.enabled ? "bg-[#0a5f3d]/10 text-[#0a5f3d]" : "bg-[#c99f3b]/15 text-[#8a6b1e]"}`}>
            {status.enabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            {status.enabled ? "Enabled" : "Disabled"}
          </div>
        </div>
      </div>

      {!status.enabled && !setup && (
        <div className="mt-8">
          <Button onClick={startSetup} disabled={busy} className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-11 px-6 font-semibold" data-testid="twofa-start-setup">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : "Enable 2FA"}
          </Button>
          <p className="text-[12.5px] text-[#1c2a24]/55 mt-3">You'll be shown a QR code to scan into your authenticator app.</p>
        </div>
      )}

      {setup && (
        <div className="mt-8 grid md:grid-cols-2 gap-6 items-start">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-2xl border border-[#0a5f3d]/15 shadow-sm">
              <img src={setup.qr_data_url} alt="TOTP QR" className="w-56 h-56" data-testid="twofa-qr" />
            </div>
            <div className="text-[11.5px] tracking-[0.22em] uppercase text-[#0a5f3d]/70 font-semibold">Scan with your authenticator</div>
          </div>
          <div>
            <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Manual entry (if you can't scan)</div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 font-mono text-[13px] px-3 py-2 rounded-xl bg-[#0a5f3d]/8 text-[#0a3d29] break-all">{setup.secret}</code>
              <Button onClick={copySecret} variant="outline" className="rounded-xl h-10 shrink-0" title="Copy secret">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="mt-6">
              <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Enter the 6-digit code shown in your app</label>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-2 h-12 rounded-xl font-mono tracking-[0.4em] text-center text-lg"
                placeholder="123 456"
                data-testid="twofa-code-input"
              />
              <Button onClick={confirm} disabled={busy || code.length !== 6}
                className="mt-4 w-full bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-11 font-semibold"
                data-testid="twofa-confirm">
                {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</> : "Verify & Enable"}
              </Button>
              <Button onClick={() => { setSetup(null); setCode(""); }} variant="ghost" className="mt-2 w-full rounded-full h-10 text-[#1c2a24]/60">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {status.enabled && !setup && (
        <div className="mt-8 border-t border-[#0a5f3d]/10 pt-6">
          <div className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d]/70 font-semibold">Disable 2FA</div>
          <p className="text-[13px] text-[#1c2a24]/65 mt-1 max-w-xl">Enter your current authenticator code to switch off two-factor sign-in.</p>
          <div className="mt-4 flex items-center gap-3">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="h-12 rounded-xl font-mono tracking-[0.35em] text-center max-w-[220px]"
              placeholder="Current code"
              data-testid="twofa-disable-code"
            />
            <Button onClick={disable} disabled={busy || code.length !== 6}
              variant="outline" className="rounded-full h-12 px-6 font-semibold border-red-300 text-red-700 hover:bg-red-50" data-testid="twofa-disable-btn">
              {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /></> : "Disable 2FA"}
            </Button>
          </div>
        </div>
      )}

      <PasswordChangeBlock />
    </div>
  );
};

const PasswordChangeBlock = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState({ current: false, next: false });

  const submit = async () => {
    if (!form.current || !form.next) {
      toast({ title: "Fill in all fields", description: "Enter the current password and the new one." });
      return;
    }
    if (form.next.length < 10) {
      toast({ title: "Password too short", description: "Use at least 10 characters." });
      return;
    }
    if (form.next !== form.confirm) {
      toast({ title: "Passwords don't match", description: "The confirmation doesn't match the new password." });
      return;
    }
    setBusy(true);
    try {
      await changeAdminPassword(form.current, form.next);
      toast({ title: "Password updated", description: "Use the new password on your next sign-in." });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast({ title: "Could not change password", description: err?.response?.data?.detail || err.message });
    } finally {
      setBusy(false);
    }
  };

  const strength = (() => {
    const p = form.next;
    if (!p) return null;
    let score = 0;
    if (p.length >= 10) score++;
    if (p.length >= 14) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score; // 0-5
  })();

  return (
    <div className="mt-10 pt-8 border-t border-[#0a5f3d]/10">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#c99f3b]/15 flex items-center justify-center">
          <KeyRound className="w-6 h-6 text-[#8a6b1e]" />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-[#0a3d29]">Change password</h3>
          <p className="text-[13.5px] text-[#1c2a24]/65 mt-1 max-w-xl">Choose a strong password — at least 10 characters, ideally with a mix of letters, numbers and symbols. You'll sign in with the new password from next time.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
        <div className="md:col-span-2">
          <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Current password</label>
          <div className="mt-2 relative">
            <Input
              type={show.current ? "text" : "password"}
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
              className="h-11 rounded-xl pr-11"
              placeholder="Enter your current password"
              data-testid="password-current"
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1c2a24]/50 hover:text-[#0a3d29]">
              {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">New password</label>
          <div className="mt-2 relative">
            <Input
              type={show.next ? "text" : "password"}
              value={form.next}
              onChange={(e) => setForm({ ...form, next: e.target.value })}
              className="h-11 rounded-xl pr-11"
              placeholder="At least 10 characters"
              data-testid="password-new"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShow((s) => ({ ...s, next: !s.next }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1c2a24]/50 hover:text-[#0a3d29]">
              {show.next ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {strength !== null && (
            <div className="mt-2 flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= strength ? (strength <= 2 ? "bg-red-400" : strength <= 3 ? "bg-[#c99f3b]" : "bg-[#0a5f3d]") : "bg-[#0a5f3d]/10"}`} />
              ))}
              <span className="text-[11px] font-semibold text-[#1c2a24]/60 ml-2 min-w-[64px]">
                {strength <= 2 ? "Weak" : strength <= 3 ? "Good" : strength <= 4 ? "Strong" : "Excellent"}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] tracking-[0.25em] uppercase text-[#0a5f3d] font-semibold">Confirm new password</label>
          <Input
            type={show.next ? "text" : "password"}
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            className="mt-2 h-11 rounded-xl"
            placeholder="Retype the new password"
            data-testid="password-confirm"
            autoComplete="new-password"
          />
          {form.confirm && form.confirm !== form.next && (
            <div className="mt-1 text-[11.5px] text-red-600">Passwords don't match yet.</div>
          )}
        </div>
      </div>

      <Button
        onClick={submit}
        disabled={busy || !form.current || !form.next || form.next !== form.confirm || form.next.length < 10}
        className="mt-5 bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-11 px-6 font-semibold"
        data-testid="password-change-submit"
      >
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</> : "Update password"}
      </Button>
    </div>
  );
};

export default TwoFactorPanel;
