import React, { useState } from "react";
import { useContent } from "../lib/ContentContext";
import { MapPin, Phone, Mail, Clock, Send, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { useToast } from "../hooks/use-toast";
import { submitEnquiry } from "../lib/api";

const Contact = () => {
  const { content } = useContent();
  const schoolInfo = content.school_info || {};
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", grade: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast({ title: "Please complete required fields", description: "Name, email and phone are required." });
      return;
    }
    setLoading(true);
    try {
      await submitEnquiry(form);
      toast({ title: "Enquiry submitted", description: "Thank you! Our admissions team will reach out within 24 hours." });
      setForm({ name: "", email: "", phone: "", grade: "", message: "" });
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || "Something went wrong";
      toast({ title: "Could not submit enquiry", description: String(msg) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="relative py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-[12px] tracking-[0.3em] uppercase text-[#0a5f3d] font-semibold">Get in touch</div>
          <h2 className="font-display mt-3 text-[38px] md:text-[52px] leading-[1.05] font-bold text-[#0a3d29]">
            We&rsquo;d love to
            <span className="italic text-[#c99f3b] font-medium"> hear from you.</span>
          </h2>
          <p className="mt-6 text-[16px] text-[#1c2a24]/70">
            Have a question about admissions, curriculum or campus tours? Fill in the form and our
            team will get back to you within one working day.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-12 gap-8">
          {/* Contact info */}
          <div className="lg:col-span-5 space-y-4">
            {[
              { icon: MapPin, title: "Visit Campus", value: schoolInfo.address },
              { icon: Phone, title: "Call Us", value: `${schoolInfo.phone}  •  ${schoolInfo.altPhone}` },
              { icon: Mail, title: "Email", value: schoolInfo.email },
              { icon: Clock, title: "School Hours", value: schoolInfo.timings },
            ].map((c, i) => (
              <div key={i} className="lift bg-white rounded-2xl p-6 border border-[#0a5f3d]/10 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#0a5f3d] flex items-center justify-center shrink-0">
                  <c.icon className="w-5 h-5 text-[#fff9e6]" />
                </div>
                <div>
                  <div className="font-display text-lg font-semibold text-[#0a3d29]">{c.title}</div>
                  <div className="text-[14.5px] text-[#1c2a24]/70 mt-1">{c.value}</div>
                </div>
              </div>
            ))}

            <div className="rounded-2xl overflow-hidden border border-[#0a5f3d]/10 h-56">
              <iframe
                title="Junior DPS Darbhanga Map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=85.87%2C26.14%2C85.92%2C26.17&layer=mapnik&marker=26.155%2C85.895"
                className="w-full h-full"
                loading="lazy"
              />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} id="enquiry-form" className="lg:col-span-7 bg-[#0a3d29] rounded-3xl p-8 md:p-10 relative overflow-hidden">
            <div className="blob w-[300px] h-[300px] bg-[#c99f3b] -top-20 -right-20 opacity-20" />
            <div className="relative">
              <h3 className="font-display text-2xl md:text-3xl font-bold text-[#fff9e6]">Send us an enquiry</h3>
              <p className="text-[14px] text-[#fff9e6]/70 mt-2">A parent-friendly form — takes less than a minute.</p>

              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] tracking-[0.25em] uppercase text-[#c99f3b] font-semibold">Parent Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-2 bg-[#fff9e6]/5 border-[#fff9e6]/15 text-[#fff9e6] placeholder:text-[#fff9e6]/40 rounded-xl h-12 focus-visible:ring-[#c99f3b]"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="text-[11px] tracking-[0.25em] uppercase text-[#c99f3b] font-semibold">Phone *</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-2 bg-[#fff9e6]/5 border-[#fff9e6]/15 text-[#fff9e6] placeholder:text-[#fff9e6]/40 rounded-xl h-12 focus-visible:ring-[#c99f3b]"
                    placeholder="+91"
                  />
                </div>
                <div>
                  <label className="text-[11px] tracking-[0.25em] uppercase text-[#c99f3b] font-semibold">Email *</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-2 bg-[#fff9e6]/5 border-[#fff9e6]/15 text-[#fff9e6] placeholder:text-[#fff9e6]/40 rounded-xl h-12 focus-visible:ring-[#c99f3b]"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="text-[11px] tracking-[0.25em] uppercase text-[#c99f3b] font-semibold">Grade Applying For</label>
                  <Input
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="mt-2 bg-[#fff9e6]/5 border-[#fff9e6]/15 text-[#fff9e6] placeholder:text-[#fff9e6]/40 rounded-xl h-12 focus-visible:ring-[#c99f3b]"
                    placeholder="e.g. Class III"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[11px] tracking-[0.25em] uppercase text-[#c99f3b] font-semibold">Message</label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  className="mt-2 bg-[#fff9e6]/5 border-[#fff9e6]/15 text-[#fff9e6] placeholder:text-[#fff9e6]/40 rounded-xl focus-visible:ring-[#c99f3b]"
                  placeholder="Tell us about your child, questions or requested visit date..."
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-8 group bg-[#c99f3b] hover:bg-[#b48c2b] text-[#0a3d29] rounded-full h-12 px-8 font-semibold text-[15px] shadow-lg disabled:opacity-70"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                ) : (
                  <>Submit Enquiry <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-transform" /></>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
