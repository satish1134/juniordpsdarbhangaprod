import React from "react";
import { Link } from "react-router-dom";
import { navLinks } from "../mock";
import { useContent } from "../lib/ContentContext";
import { LOGO_BOX_PX, LOGO_ICON_PX, NAME_SIZE_PX, TAGLINE_SIZE_PX, LOGO_RADIUS_CLASS, fontFamilyFor, pick } from "../lib/displaySizes";
import { resolveImageUrl } from "../lib/api";
import { Facebook, Instagram, Youtube, Linkedin, Twitter, MessageCircle, GraduationCap, MapPin, Phone, Mail } from "lucide-react";

const Footer = () => {
  const { content } = useContent();
  const schoolInfo = content.school_info || {};
  const display = content.display || {};
  const footer = content.footer || {};
  const socials = footer.socials || {};
  const rawQuickLinks = Array.isArray(footer.quick_links) && footer.quick_links.length
    ? footer.quick_links
    : [{ label: "Fee Structure", href: "/fees" }, { label: "School Calendar", href: "/calendar" }];
  const quickLinks = rawQuickLinks.map((l) => {
    if (l && typeof l.label === "string" && l.label.toLowerCase().includes("parent login")) {
      return { label: "Webmail Login", href: "https://mail.zoho.com", isWebmail: true };
    }
    return l;
  });
  if (!quickLinks.some((l) => l.label && l.label.toLowerCase().includes("webmail"))) {
    quickLinks.push({ label: "Webmail Login", href: "https://mail.zoho.com", isWebmail: true });
  }
  const socialIcons = [
    { key: "facebook", Icon: Facebook },
    { key: "instagram", Icon: Instagram },
    { key: "youtube", Icon: Youtube },
    { key: "linkedin", Icon: Linkedin },
    { key: "twitter", Icon: Twitter },
    { key: "whatsapp", Icon: MessageCircle },
  ];
  const logoBox = pick(LOGO_BOX_PX, display.logo_size);
  const logoIcon = pick(LOGO_ICON_PX, display.logo_size);
  const nameSize = pick(NAME_SIZE_PX, display.name_size);
  const tagSize = pick(TAGLINE_SIZE_PX, display.tagline_size || display.name_size);
  const tagCase = display.tagline_case === "normal" ? "none" : "uppercase";
  const logoRadius = LOGO_RADIUS_CLASS[display.logo_shape] || LOGO_RADIUS_CLASS.circle;
  const nameFont = fontFamilyFor(display.name_font);
  return (
    <footer className="relative bg-[#0a3d29] text-[#fff9e6] pt-20 pb-8 overflow-hidden">
      <div className="blob w-[400px] h-[400px] bg-[#167a51] -top-40 -left-40 opacity-30" />
      <div className="dots-bg absolute inset-0 opacity-30" />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              {schoolInfo.logo ? (
                <div
                  className={`${logoRadius} bg-[#fff9e6] flex items-center justify-center overflow-hidden p-1`}
                  style={{ width: logoBox, height: logoBox }}
                >
                  <img
                    src={resolveImageUrl(schoolInfo.logo)}
                    alt={schoolInfo.name || "School logo"}
                    className={`w-full h-full object-cover ${logoRadius}`}
                    crossOrigin="anonymous"
                  />
                </div>
              ) : (
                <div
                  className={`${logoRadius} bg-[#c99f3b] flex items-center justify-center`}
                  style={{ width: logoBox, height: logoBox }}
                >
                  <GraduationCap style={{ width: logoIcon, height: logoIcon }} className="text-[#0a3d29]" />
                </div>
              )}
              <div className="leading-tight">
                <div
                  className="font-bold tracking-tight"
                  style={{ fontSize: nameSize, lineHeight: 1.05, fontFamily: nameFont }}
                >
                  {schoolInfo.name || "Junior DPS Darbhanga"}
                </div>
                {schoolInfo.tagline && (
                  <div
                    className="tracking-[0.22em] text-[#c99f3b] font-semibold mt-0.5"
                    style={{ fontSize: tagSize, textTransform: tagCase }}
                  >
                    {schoolInfo.tagline}
                  </div>
                )}
              </div>
            </div>
            <p className="mt-6 text-[14.5px] leading-relaxed text-[#fff9e6]/70 max-w-sm">
              {footer.description || `Nurturing curious minds and kind hearts since ${schoolInfo.established || 2015}. A modern, CBSE-affiliated day school for children from Nursery through Class X.`}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {socialIcons.filter(({ key }) => (socials[key] || "").trim()).map(({ key, Icon }) => (
                <a
                  key={key}
                  href={socials[key]}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={key}
                  className="w-10 h-10 rounded-full border border-[#fff9e6]/20 flex items-center justify-center hover:bg-[#c99f3b] hover:text-[#0a3d29] hover:border-[#c99f3b] transition"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[11px] tracking-[0.3em] uppercase text-[#c99f3b] font-semibold">Explore</div>
            <ul className="mt-5 space-y-3">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-[14.5px] text-[#fff9e6]/75 hover:text-[#c99f3b] transition">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <div className="text-[11px] tracking-[0.3em] uppercase text-[#c99f3b] font-semibold">Quick Links</div>
            <ul className="mt-5 space-y-3">
              {quickLinks.map((l, i) => {
                const isWebmail = l.isWebmail || (l.label && l.label.toLowerCase().includes("webmail"));
                const isExternal = isWebmail || (l.href && (l.href.startsWith("http://") || l.href.startsWith("https://")));
                return (
                  <li key={i}>
                    {isExternal ? (
                      <a
                        href={l.href || "https://mail.zoho.com"}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center gap-1.5 text-[14.5px] transition ${
                          isWebmail ? "text-[#c99f3b] font-semibold hover:text-[#dfb552]" : "text-[#fff9e6]/75 hover:text-[#c99f3b]"
                        }`}
                        title={isWebmail ? "Official Staff and Faculty Webmail Portal (Zoho)" : l.label}
                      >
                        {isWebmail && <Mail className="w-3.5 h-3.5" />}
                        {l.label} ↗
                      </a>
                    ) : l.href && l.href.startsWith("/") ? (
                      <Link to={l.href} className="text-[14.5px] text-[#fff9e6]/75 hover:text-[#c99f3b] transition">{l.label}</Link>
                    ) : (
                      <a href={l.href || "#"} className="text-[14.5px] text-[#fff9e6]/75 hover:text-[#c99f3b] transition">{l.label}</a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <div className="text-[11px] tracking-[0.3em] uppercase text-[#c99f3b] font-semibold">Reach Us</div>
            <ul className="mt-5 space-y-4">
              <li className="flex items-start gap-3 text-[14px] text-[#fff9e6]/80">
                <MapPin className="w-4 h-4 mt-0.5 text-[#c99f3b]" />
                <span>{schoolInfo.address}</span>
              </li>
              <li className="flex items-start gap-3 text-[14px] text-[#fff9e6]/80">
                <Phone className="w-4 h-4 mt-0.5 text-[#c99f3b]" />
                <span>{schoolInfo.phone}</span>
              </li>
              <li className="flex items-start gap-3 text-[14px] text-[#fff9e6]/80">
                <Mail className="w-4 h-4 mt-0.5 text-[#c99f3b]" />
                <span>{schoolInfo.email}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[#fff9e6]/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-[#fff9e6]/60">
            © {new Date().getFullYear()} Junior DPS Darbhanga. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-5 text-[13px] text-[#fff9e6]/60">
            <a
              href="https://mail.zoho.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c99f3b]/15 border border-[#c99f3b]/30 text-[#c99f3b] hover:bg-[#c99f3b] hover:text-[#0a3d29] font-semibold transition"
              title="Official Zoho Webmail Login for School Staff & Teachers"
            >
              <Mail className="w-3.5 h-3.5" /> Webmail Login (Zoho)
            </a>
            <Link to="/privacy" className="hover:text-[#c99f3b] transition">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#c99f3b] transition">Terms of Use</Link>
            <a href="#" className="hover:text-[#c99f3b] transition">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
