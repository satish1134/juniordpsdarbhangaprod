import React, { useEffect, useState } from "react";
import { Menu, X, Phone, Mail, MapPin, GraduationCap } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { navLinks } from "../mock";
import { useContent } from "../lib/ContentContext";
import { LOGO_BOX_PX, LOGO_ICON_PX, NAME_SIZE_PX, TAGLINE_SIZE_PX, LOGO_RADIUS_CLASS, fontFamilyFor, pick } from "../lib/displaySizes";
import { resolveImageUrl } from "../lib/api";
import { Button } from "./ui/button";

const Navbar = ({ onEnquiry }) => {
  const { content } = useContent();
  const schoolInfo = content.school_info || {};
  const display = content.display || {};
  const logoBox = pick(LOGO_BOX_PX, display.logo_size);
  const logoIcon = pick(LOGO_ICON_PX, display.logo_size);
  const nameSize = pick(NAME_SIZE_PX, display.name_size);
  const tagSize = pick(TAGLINE_SIZE_PX, display.tagline_size || display.name_size);
  const tagCase = display.tagline_case === "normal" ? "none" : "uppercase";
  const logoRadius = LOGO_RADIUS_CLASS[display.logo_shape] || LOGO_RADIUS_CLASS.circle;
  const nameColor = display.name_color || "#0a3d29";
  const nameFont = fontFamilyFor(display.name_font);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      if (location.pathname === "/") {
        const sections = ["home", "about", "academics", "facilities", "gallery", "contact"];
        for (const id of sections) {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 120 && rect.bottom >= 120) {
              setActive("#" + id);
              break;
            }
          }
        }
      } else {
        setActive(location.pathname);
      }
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  const handleClick = (l, e) => {
    if (l.hash) {
      e.preventDefault();
      if (location.pathname !== "/") {
        navigate("/" + l.hash);
      } else {
        const el = document.getElementById(l.hash.replace("#", ""));
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
      setOpen(false);
    }
  };

  const isActive = (l) => {
    if (l.hash) return active === l.hash && location.pathname === "/";
    return location.pathname === l.route;
  };

  return (
    <>
      <div className="hidden md:block bg-[#0a5f3d] text-[#fff9e6] text-[13px]">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {schoolInfo.phone}</span>
            <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {schoolInfo.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            <span className="opacity-90">{schoolInfo.address}</span>
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#fbfaf6]/95 backdrop-blur-md shadow-[0_10px_30px_-20px_rgba(10,95,61,0.35)]"
            : "bg-[#fbfaf6]/60 backdrop-blur"
        }`}
      >
        <div className="max-w-7xl mx-auto pl-3 pr-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="relative shrink-0">
              {schoolInfo.logo ? (
                <div
                  className={`${logoRadius} bg-white shadow-lg shadow-[#0a5f3d]/15 border border-[#0a5f3d]/10 flex items-center justify-center overflow-hidden p-1`}
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
                  className={`${logoRadius} bg-[#0a5f3d] flex items-center justify-center shadow-lg shadow-[#0a5f3d]/20`}
                  style={{ width: logoBox, height: logoBox }}
                >
                  <GraduationCap style={{ width: logoIcon, height: logoIcon }} className="text-[#fff9e6]" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#c99f3b] border-2 border-[#fbfaf6]"></span>
            </div>
            <div className="leading-tight whitespace-nowrap">
              <div
                className="font-bold tracking-tight whitespace-nowrap"
                style={{ fontSize: nameSize, lineHeight: 1.05, color: nameColor, fontFamily: nameFont }}
              >
                {schoolInfo.name || "Junior DPS Darbhanga"}
              </div>
              {schoolInfo.tagline && (
                <div
                  className="tracking-[0.22em] text-[#0a5f3d]/70 font-semibold mt-0.5 whitespace-nowrap"
                  style={{ fontSize: tagSize, textTransform: tagCase }}
                >
                  {schoolInfo.tagline}
                </div>
              )}
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-5">
            {navLinks.map((l) =>
              l.hash ? (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => handleClick(l, e)}
                  className={`nav-underline text-[14px] font-medium tracking-wide text-[#1c2a24] hover:text-[#0a5f3d] ${
                    isActive(l) ? "active text-[#0a5f3d]" : ""
                  }`}
                >
                  {l.label}
                </a>
              ) : (
                <Link
                  key={l.href}
                  to={l.route}
                  className={`nav-underline text-[14px] font-medium tracking-wide text-[#1c2a24] hover:text-[#0a5f3d] ${
                    isActive(l) ? "active text-[#0a5f3d]" : ""
                  }`}
                >
                  {l.label}
                </Link>
              )
            )}
          </nav>

          <div className="hidden md:flex flex-col items-end gap-1.5">
            {(schoolInfo.cbse_number || schoolInfo.udise_number) && (
              <div className="flex flex-wrap justify-end gap-1.5">
                {schoolInfo.cbse_number && (
                  <span className="px-2.5 py-1 rounded-full bg-[#c99f3b]/15 border border-[#c99f3b]/30 text-[#8a6b1e] text-[10.5px] font-bold tracking-widest uppercase">
                    CBSE No. {schoolInfo.cbse_number}
                  </span>
                )}
                {schoolInfo.udise_number && (
                  <span className="px-2.5 py-1 rounded-full bg-[#0a5f3d]/10 border border-[#0a5f3d]/25 text-[#0a5f3d] text-[10.5px] font-bold tracking-widest uppercase">
                    UDISE {schoolInfo.udise_number}
                  </span>
                )}
              </div>
            )}
            <Button
              onClick={onEnquiry}
              className="bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full px-6 h-11 font-semibold shadow-lg shadow-[#0a5f3d]/20"
            >
              Apply for Admission
            </Button>
          </div>

          <button
            className="lg:hidden p-2 rounded-lg text-[#0a3d29]"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden bg-[#fbfaf6] border-t border-[#0a5f3d]/10">
            <div className="px-6 py-4 flex flex-col gap-1">
              {navLinks.map((l) =>
                l.hash ? (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={(e) => handleClick(l, e)}
                    className="py-3 border-b border-[#0a5f3d]/5 text-[#1c2a24] font-medium"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.href}
                    to={l.route}
                    onClick={() => setOpen(false)}
                    className="py-3 border-b border-[#0a5f3d]/5 text-[#1c2a24] font-medium"
                  >
                    {l.label}
                  </Link>
                )
              )}
              <Button
                onClick={() => { setOpen(false); onEnquiry(); }}
                className="mt-4 bg-[#0a5f3d] hover:bg-[#084a30] text-[#fff9e6] rounded-full h-11 font-semibold"
              >
                Apply for Admission
              </Button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default Navbar;
