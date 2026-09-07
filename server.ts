import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { MongoClient, Db, GridFSBucket, ObjectId } from "mongodb";
import { Resend } from "resend";
import nodemailer from "nodemailer";


const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "admin").trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "admin123").trim();

function getMongoUrl(): string {
  const raw =
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    process.env.MONGODB_URL ||
    process.env.MONGO_CONNECTION_STRING ||
    "";
  let cleaned = raw.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

const DB_NAME = (process.env.DB_NAME || "juniordps").trim();

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let mongoConnectingPromise: Promise<Db | null> | null = null;

async function getDb(): Promise<Db | null> {
  if (mongoDb) return mongoDb;
  if (mongoConnectingPromise) return mongoConnectingPromise;

  mongoConnectingPromise = (async () => {
    const candidateUrls: string[] = [];
    const envUrl = getMongoUrl();
    if (envUrl) candidateUrls.push(envUrl);

    // Known production fallbacks for jdps_mongodb on Docker and host network
    candidateUrls.push("mongodb://root:jdpsSecurePass2026@mongodb:27017/juniordps?authSource=admin");
    candidateUrls.push("mongodb://root:jdpsSecurePass2026@jdps_mongodb:27017/juniordps?authSource=admin");
    candidateUrls.push("mongodb://root:jdpsSecurePass2026@127.0.0.1:27017/juniordps?authSource=admin");
    candidateUrls.push("mongodb://mongodb:27017/juniordps");
    candidateUrls.push("mongodb://jdps_mongodb:27017/juniordps");
    candidateUrls.push("mongodb://127.0.0.1:27017/juniordps");

    const uniqueUrls = Array.from(new Set(candidateUrls)).filter(Boolean);

    for (const testUrl of uniqueUrls) {
      try {
        const client = new MongoClient(testUrl, {
          serverSelectionTimeoutMS: 3000,
          connectTimeoutMS: 5000,
          maxPoolSize: 10,
        });
        await client.connect();
        const db = client.db(DB_NAME);
        await db.command({ ping: 1 });
        mongoClient = client;
        mongoDb = db;
        const sanitized = testUrl.replace(/:([^:@]+)@/, ":****@");
        console.log(`[MongoDB] Connected successfully to "${DB_NAME}" via ${sanitized}`);
        return mongoDb;
      } catch {
        // Try next candidate
      }
    }

    console.error("[MongoDB] Could not connect to any candidate MongoDB URL");
    mongoClient = null;
    mongoDb = null;
    return null;
  })();

  try {
    return await mongoConnectingPromise;
  } finally {
    mongoConnectingPromise = null;
  }
}
const COOKIE_NAME = "jdps_admin";
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours max age
const TOTP_ISSUER = "Junior DPS Darbhanga";
function sanitizeAdminPath(input?: string): string {
  if (!input) return "/manage-school-x92-secure";
  let s = input.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) {
    try {
      s = new URL(s).pathname;
    } catch {
      s = s.replace(/^https?:\/\/[^\/]+/, "");
    }
  }
  s = s.replace(/\/login\/?$/, ""); // strip trailing /login
  s = s.replace(/\/+$/, "");
  if (!s.startsWith("/")) s = "/" + s;
  return (!s || s === "/") ? "/manage-school-x92-secure" : s;
}

const ADMIN_PATH = sanitizeAdminPath(process.env.ADMIN_PATH);

// Brute-force protection: Max 5 failed attempts -> 15 min block
const LOGIN_FAILS = new Map<string, number[]>();
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

// Email OTP temporary store
const EMAIL_OTP_CACHE = new Map<string, { code: string; expires: number }>();

function parseDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown Device";
  const ua = userAgent.toLowerCase();
  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("edg/")) browser = "Chrome";
  else if (ua.includes("firefox/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome/")) browser = "Safari";
  else if (ua.includes("curl") || ua.includes("postman")) browser = "API Client";

  let os = "OS";
  if (ua.includes("iphone")) os = "iPhone (iOS)";
  else if (ua.includes("ipad")) os = "iPad (iPadOS)";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("mac os x") || ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("linux")) os = "Linux";

  return `${browser} on ${os}`;
}

interface AdminSecurity {
  username: string;
  passwordHash: string | null;
  secret: string | null;
  enabled: boolean;
}

const adminSecurity: AdminSecurity = {
  username: ADMIN_USERNAME,
  passwordHash: null,
  secret: null,
  enabled: false,
};

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  ip: string | null;
  user_agent: string | null;
  device?: string | null;
  details: Record<string, any>;
}

const auditLogs: AuditLogEntry[] = [];

async function auditLog(action: string, actor?: string, req?: Request, details?: Record<string, any>) {
  try {
    const fwd = req?.headers["x-forwarded-for"];
    const ip = typeof fwd === "string" ? fwd.split(",")[0].trim() : (req?.ip || null);
    const user_agent = (req?.headers["user-agent"] as string) || null;
    const device = parseDevice(user_agent);

    const entry: AuditLogEntry = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      action,
      actor: actor || "anonymous",
      ip,
      user_agent,
      device,
      details: details || {},
    };

    auditLogs.unshift(entry);
    if (auditLogs.length > 2000) {
      auditLogs.pop();
    }

    // Persist permanently in MongoDB
    const db = await getDb();
    if (db) {
      await db.collection("admin_audit_logs").insertOne(entry).catch(() => {});
    }
  } catch (e) {
    console.error("audit_log error:", e);
  }
}

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  message: string;
  status: string;
  created_at: string;
}

const enquiries: Enquiry[] = [];

export interface MailboxMessage {
  id: string;
  mailbox: "principal" | "info" | "account";
  direction: "inbound" | "outbound";
  from: string;
  from_name?: string;
  to: string[];
  reply_to?: string;
  subject: string;
  body: string;
  html?: string;
  status: "unread" | "read" | "replied" | "sent" | "archived";
  starred?: boolean;
  tags?: string[];
  created_at: string;
  in_reply_to_id?: string;
  delivery_info?: Record<string, any>;
}

// Live real in-memory cache (starts clean with zero fake emails)
const liveMailboxMessages: MailboxMessage[] = [];

function getMailTransporter(mailbox: "principal" | "info" | "account" = "principal") {
  const host = (process.env.ZOHO_SMTP_HOST || "smtp.zoho.com").trim();
  const port = parseInt(process.env.ZOHO_SMTP_PORT || "587", 10);

  let user = "";
  let pass = "";

  if (mailbox === "info") {
    user = (process.env.ZOHO_SMTP_USER_INFO || "info@juniordpsdarbhanga.com").trim();
    pass = (process.env.ZOHO_SMTP_PASS_INFO || process.env.ZOHO_SMTP_PASS || "").replace(/\s+/g, "").trim();
  } else if (mailbox === "account") {
    user = (process.env.ZOHO_SMTP_USER_ACCOUNT || "account@juniordpsdarbhanga.com").trim();
    pass = (process.env.ZOHO_SMTP_PASS_ACCOUNT || process.env.ZOHO_SMTP_PASS || "").replace(/\s+/g, "").trim();
  } else {
    user = (process.env.ZOHO_SMTP_USER_PRINCIPAL || process.env.ZOHO_SMTP_USER || "principal@juniordpsdarbhanga.com").trim();
    pass = (process.env.ZOHO_SMTP_PASS_PRINCIPAL || process.env.ZOHO_SMTP_PASS || "").replace(/\s+/g, "").trim();
  }

  // Generic fallback if mailbox-specific pass not found
  if (!pass) {
    pass = (process.env.ZOHO_SMTP_PASS || "").replace(/\s+/g, "").trim();
    user = (process.env.ZOHO_SMTP_USER || `${mailbox}@juniordpsdarbhanga.com`).trim();
  }

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  tag: string;
  date: string;
  cover_image: string;
  published: boolean;
  created_at: string;
}

const newsList: NewsItem[] = [
  {
    id: "news-1",
    title: "Admissions open for Session 2025-26",
    excerpt: "Registrations now open for Nursery to Class IX. Limited seats available — apply early to secure your child's future.",
    body: "Junior DPS Darbhanga is now accepting applications for the academic session 2025-26. Interested parents can visit our campus between 9 AM and 2 PM on all working days, or fill out the online enquiry form for a callback.",
    tag: "Admissions",
    date: "12 Jul 2025",
    cover_image: "",
    published: true,
    created_at: new Date("2025-07-12T10:00:00Z").toISOString(),
  },
  {
    id: "news-2",
    title: "Our students shine at CBSE Region-level Science Fair",
    excerpt: "Three of our senior students bagged medals at the CBSE regional science exhibition held in Patna.",
    body: "We are proud to announce that Aarav, Sneha and Rohan of Class IX have won gold, silver and bronze medals respectively at the CBSE regional science exhibition. Their working model on solar-powered rural irrigation was appreciated by the chief guest.",
    tag: "Achievement",
    date: "28 Jun 2025",
    cover_image: "",
    published: true,
    created_at: new Date("2025-06-28T10:00:00Z").toISOString(),
  },
  {
    id: "news-3",
    title: "Summer Reading Challenge launched",
    excerpt: "An 8-week reading marathon with rewards, book clubs and author interactions for students of all ages.",
    body: "Books open doors. Our new Summer Reading Challenge runs from 15 June to 10 August 2025, with grade-wise reading lists, weekly book clubs and a live session with a bestselling children's author.",
    tag: "Event",
    date: "14 Jun 2025",
    cover_image: "",
    published: true,
    created_at: new Date("2025-06-14T10:00:00Z").toISOString(),
  },
];

const DEFAULT_CONTENT: Record<string, any> = {
  hero_intro: {
    title_main: "Where curiosity",
    title_accent: "meets excellence.",
    description: "A modern, CBSE-affiliated school in the heart of Darbhanga, committed to shaping confident thinkers, kind humans and lifelong learners.",
    cta_primary: "Book a Campus Visit",
    cta_secondary: "Discover our story",
  },
  school_info: {
    name: "Junior DPS Darbhanga",
    tagline: "Nurturing Minds, Shaping Futures",
    fullName: "Junior Delhi Public School, Darbhanga",
    established: 2015,
    affiliation: "CBSE Affiliated",
    cbse_number: "",
    udise_number: "",
    hero_eyebrow: "CBSE Affiliation • Est. 2015",
    address: "Mufti Mohallah Rd, Mirzapur, Darbhanga, Bihar 846004",
    phone: "+91 9470410815",
    altPhone: "+91 9430008181",
    email: "info@juniordpsdarbhanga.com",
    timings: "08:00 AM – 03:00 PM (Mon – Sat)",
    logo: "",
  },
  hero_slides: [],
  principal: {
    name: "Mrs. Neelam Verma",
    title: "Principal, Junior DPS Darbhanga",
    photo: "",
    message: "At Junior DPS Darbhanga, we believe every child carries a spark of brilliance waiting to be nurtured. Our promise to parents is simple — a safe, joyful and rigorous environment where children learn to think, care and contribute. As we step into a new academic year, we invite you to walk this beautiful journey of growth with us.",
  },
  gallery_intro: {
    eyebrow: "Life at School",
    title_main: "Moments that make",
    title_accent: "our story.",
  },
  academics_intro: {
    eyebrow: "Academic Programs",
    title_main: "A learning path designed",
    title_accent: "for every age.",
    description: "From playful Nursery mornings to focused Board year preparation, our curriculum grows with your child — thoughtfully, joyfully and rigorously.",
  },
  facilities_intro: {
    eyebrow: "Campus Facilities",
    title_main: "Thoughtfully designed spaces",
    title_accent: "that inspire.",
    description: "Every corner of our campus is built with the child in mind — bright, safe, engaging and fully equipped for exploration.",
  },
  gallery: [],
  testimonials: [
    { name: "Priya Sharma", role: "Parent, Class IV", quote: "The teachers at Junior DPS Darbhanga genuinely care. My daughter looks forward to school every single day — that says everything." },
    { name: "Rakesh Kumar", role: "Parent, Class VIII", quote: "The balance between academics, sports and moral values is remarkable. My son has grown into a confident, curious learner." },
    { name: "Anjali Jha", role: "Alumnus, Class of 2022", quote: "The foundation I received here helped me crack my board exams comfortably. The mentors are still just a call away." },
  ],
  fee_structure: [
    { class: "Nursery – KG", admission: 8000, annual: 6000, tuition: 2800, transport: 1500 },
    { class: "Class I – II", admission: 9000, annual: 7000, tuition: 3200, transport: 1500 },
    { class: "Class III – V", admission: 10000, annual: 8000, tuition: 3600, transport: 1800 },
    { class: "Class VI – VIII", admission: 11000, annual: 9000, tuition: 4200, transport: 1800 },
    { class: "Class IX – X", admission: 12000, annual: 10000, tuition: 4800, transport: 2000 },
  ],
  fees_extras: {
    eyebrow: "Fee Structure",
    title_main: "A transparent",
    title_accent: "fee structure.",
    intro: "Session fee particulars for Junior DPS Darbhanga. All amounts are in Indian Rupees (₹). Please contact the school office for zone-wise transport charges and any queries.",
    notes_title: "Fee policy notes",
    notes: [
      "Admission fee is a one-time payment charged at the time of enrolment.",
      "Tuition fee is billed on a monthly basis; annual charges are collected once a year in April.",
      "Transport fee varies based on distance zone; the amount shown is the base rate.",
      "Sibling discount of 10% on tuition applies from the second child onwards.",
      "All fees are payable via bank transfer, UPI, or at the school office.",
    ],
    payment_title: "Payment methods",
    payment_body: "Fees can be paid via bank transfer, UPI, cheque or in cash at the school office during working hours. A digital fee portal is coming soon for parents.",
    payment_cta: "Download Fee Brochure",
  },
  calendar_events: [
    { date: "2025-04-01", title: "New Academic Session Begins", type: "Academic", desc: "Session 2025-26 commences for all classes." },
    { date: "2025-04-14", title: "Ambedkar Jayanti", type: "Holiday", desc: "School remains closed." },
    { date: "2025-05-25", title: "Summer Vacation Begins", type: "Break", desc: "Vacation from 25 May – 15 June." },
    { date: "2025-08-15", title: "Independence Day Celebration", type: "Event", desc: "Flag hoisting, cultural programs and student speeches." },
    { date: "2025-09-05", title: "Teachers' Day", type: "Event", desc: "Students celebrate their mentors with performances and cards." },
    { date: "2025-09-20", title: "Half-Yearly Examinations", type: "Exam", desc: "For Classes III to X; datesheet issued a week prior." },
    { date: "2025-10-15", title: "Annual Sports Meet", type: "Event", desc: "Two-day sports meet on campus grounds — parents invited." },
    { date: "2025-11-01", title: "Diwali Break", type: "Break", desc: "School closed from 1 – 5 November." },
    { date: "2025-12-15", title: "Winter Carnival & Fete", type: "Event", desc: "Food stalls, games and cultural performances open to families." },
    { date: "2026-01-26", title: "Republic Day Celebration", type: "Event", desc: "Cultural programs and prize distribution." },
    { date: "2026-02-15", title: "Annual Function", type: "Event", desc: "Showcasing student talent across dance, drama and music." },
    { date: "2026-03-01", title: "Final Examinations Begin", type: "Exam", desc: "Board exams (X) and annual exams for other classes." },
  ],
  display: {
    logo_size: "md",
    logo_shape: "circle",
    name_size: "md",
    name_color: "#0a3d29",
    name_font: "fraunces",
    tagline_size: "md",
    tagline_case: "upper",
    hero_height: "md",
    gallery_size: "md",
  },
  mobile_app: {
    enabled: false,
    headline: "Get the Junior DPS Parent App",
    subhead: "Instant updates on attendance, homework, fee reminders and school news — right on your phone.",
    play_store_url: "",
    app_store_url: "",
    website_url: "",
    screenshot: "",
    features: [
      "Attendance & homework alerts",
      "Fee statements and receipts",
      "Direct chat with class teachers",
      "Event photos & calendar sync",
    ],
  },
  about_intro: {
    eyebrow: "About the school",
    title_main: "A decade of joyful learning,",
    title_accent: "deep-rooted values.",
    description: "Since 2015, Junior DPS Darbhanga has been a warm, purposeful home for young learners from Nursery to Class X. We combine a rigorous CBSE curriculum with the arts, sports and civic values that shape truly well-rounded children.",
  },
  about_highlights: [
    { title: "Value-Driven Education", desc: "We blend academic rigour with Indian values, integrity and empathy to raise thoughtful citizens." },
    { title: "Experienced Faculty", desc: "Passionate teachers with decades of collective experience across CBSE curriculum." },
    { title: "Safe & Modern Campus", desc: "Air conditioned classrooms, CCTV surveillance and a warm nurturing environment." },
    { title: "Beyond Academics", desc: "Music, sports, arts, robotics and career counselling from Class V onwards." },
  ],
  programs: [
    {
      level: "Pre-Primary",
      grades: "Nursery – KG",
      ageRange: "3 – 5 years",
      desc: "Play-based learning that awakens curiosity, motor skills and confidence in our youngest learners.",
      highlights: ["Activity based learning", "Story & rhyme sessions", "Creative art corners"],
      image: "",
    },
    {
      level: "Primary",
      grades: "Class I – V",
      ageRange: "6 – 10 years",
      desc: "Foundational literacy, numeracy and critical thinking supported by a caring mentor system.",
      highlights: ["CBSE aligned curriculum", "Reading & writing labs", "Life skill workshops"],
      image: "",
    },
    {
      level: "Middle & Senior",
      grades: "Class VI – X",
      ageRange: "11 – 16 years",
      desc: "Concept-driven learning, science & maths olympiad prep and structured career counselling.",
      highlights: ["Well equipped labs", "Olympiad & competition prep", "Career mentorship"],
      image: "",
    },
  ],
  facilities_list: [
    { name: "Smart Classrooms", icon: "MonitorPlay", desc: "Interactive digital boards & AC comfort in every classroom." },
    { name: "Science Laboratory", icon: "FlaskConical", desc: "Physics, chemistry & biology labs for hands-on exploration." },
    { name: "Computer Lab", icon: "Laptop", desc: "Latest computers with coding & AI foundations from Class III." },
    { name: "Library", icon: "BookOpen", desc: "Over 8,000 titles, quiet reading zones and digital catalogue." },
    { name: "Sports Ground", icon: "Trophy", desc: "Cricket, football, athletics and indoor sports academies." },
    { name: "Music & Arts", icon: "Music", desc: "Dedicated music, dance and visual arts studios." },
    { name: "Transport", icon: "Bus", desc: "GPS-tracked buses across Darbhanga with trained attendants." },
    { name: "Medical Room", icon: "HeartPulse", desc: "On-campus nurse, first-aid and tie-ups with local hospitals." },
    { name: "Cafeteria", icon: "Utensils", desc: "Hygienic, nutritious meals prepared under expert supervision." },
  ],
  admission_steps: [
    { step: 1, title: "Enquiry & Registration", desc: "Fill the online enquiry form or visit the campus to collect a registration form." },
    { step: 2, title: "Interaction", desc: "A friendly interaction with the child and parents to understand needs and expectations." },
    { step: 3, title: "Documentation", desc: "Submit birth certificate, previous report card, address proof and passport photos." },
    { step: 4, title: "Fee Payment & Welcome", desc: "Complete admission fee payment and receive your welcome kit — you're home!" },
  ],
  careers: {
    eyebrow: "Careers",
    title_main: "Grow with a school that",
    title_accent: "grows children.",
    description: "We are always looking for warm, curious educators and support staff who share our belief that every child deserves an inspiring school day. Explore current openings below, or send us your CV even if nothing matches — we keep every profile on file.",
    contact_email: "careers@juniordpsdarbhanga.com",
    jobs: [
      { title: "Primary Class Teacher", department: "Academics", type: "Full-time", location: "Darbhanga", description: "Teach a primary class (I – V) across core subjects following the CBSE curriculum. Bachelor of Education preferred, minimum 2 years of classroom experience.", apply_url: "" },
      { title: "Mathematics Teacher (Middle & Senior)", department: "Academics", type: "Full-time", location: "Darbhanga", description: "Teach Mathematics for Classes VI – X. Strong subject knowledge, ability to make problem-solving fun, prior CBSE experience welcomed.", apply_url: "" },
      { title: "Sports Coach", department: "Co-curricular", type: "Full-time", location: "Darbhanga", description: "Coach cricket, football and athletics across primary and senior sections. Certification in sports coaching preferred.", apply_url: "" },
    ],
  },
  mission_vision_purpose: {
    enabled: true,
    eyebrow: "Who we are",
    title_main: "Mission, vision and",
    title_accent: "our purpose.",
    description: "The compass that guides every decision we make — from classroom design to the way we welcome each child at the gate.",
    cards: [
      { kind: "mission", title: "Our Mission", body: "To nurture confident, compassionate learners who think for themselves, care for others and act with integrity — through a curriculum that balances rigour with joy." },
      { kind: "vision", title: "Our Vision", body: "To be the most trusted CBSE school in Mithila, known for shaping children who are academically excellent, culturally rooted and globally aware." },
      { kind: "purpose", title: "Our Purpose", body: "Every child deserves a school day that feels like a warm, curious adventure. Our purpose is to protect that promise — every classroom, every teacher, every day." },
    ],
  },
  awards: {
    enabled: true,
    eyebrow: "Awards & Achievements",
    title_main: "Honours we wear",
    title_accent: "with pride.",
    description: "A few recognitions our students, teachers and school have earned along the way. We celebrate every one — big or small.",
    items: [
      { title: "Best CBSE School — Darbhanga", year: "2024", awarded_by: "Bihar Education Excellence Awards", description: "Recognised for consistent academic results and holistic student development.", image: "" },
      { title: "Regional Science Fair — Gold", year: "2024", awarded_by: "CBSE Patna Region", description: "Class IX students bagged gold for a working model on solar-powered rural irrigation.", image: "" },
      { title: "Green School Certification", year: "2023", awarded_by: "Centre for Science and Environment", description: "Awarded for water-conservation, waste-segregation and campus greening practices.", image: "" },
      { title: "Inter-school Cricket Champions", year: "2023", awarded_by: "Darbhanga Zonal Cricket Meet", description: "Under-14 boys team lifted the winners' trophy for the second year running.", image: "" },
    ],
  },
  transport_policies: {
    eyebrow: "Transport",
    title_main: "Safe, punctual and",
    title_accent: "parent-friendly transport.",
    description: "GPS-tracked buses, trained attendants and a clear rulebook so every parent has real peace of mind. Please read the policies below carefully before opting for school transport.",
    policies: [
      { icon: "MapPin", title: "GPS-Tracked Routes", body: "Every bus is fitted with real-time GPS. Parents can request live tracking access via the school office once transport is opted in." },
      { icon: "ShieldCheck", title: "Trained Attendants", body: "A female attendant travels on every bus. Attendants are background-verified and trained in first-aid and child-safety protocols." },
      { icon: "Clock", title: "Punctuality", body: "Buses depart from stops within a ±2 minute window. Parents are requested to have children ready 5 minutes before pickup; buses cannot wait beyond a minute for safety and fairness." },
      { icon: "Phone", title: "Communication", body: "Route WhatsApp groups are set up for parents. Delays due to weather, traffic or emergencies are informed immediately by the transport in-charge." },
      { icon: "AlertTriangle", title: "Discipline & Behaviour", body: "Students must remain seated at all times, use seat belts where provided, and behave respectfully with attendants. Repeated violations may lead to withdrawal of transport privileges." },
      { icon: "Wallet", title: "Fee & Zone Policy", body: "Transport fee is billed monthly based on your pickup zone. Route allocation is done once a term; mid-term route changes are considered only in exceptional cases." },
      { icon: "Ban", title: "What's Not Allowed", body: "Sharp objects, valuables and any form of consumable outside the school lunchbox policy are strictly not allowed on the buses." },
      { icon: "CalendarX", title: "Absence Notification", body: "If your child will not use the bus on any day, please inform the class teacher and the bus attendant by 7:00 AM to keep the route on time." },
    ],
    contact_note: "For zone-wise transport charges, the current route map or any transport query, please write to transport@juniordpsdarbhanga.com or call the school office during working hours.",
  },
  brochure: {
    enabled: true,
    eyebrow: "Prospectus",
    title_main: "Download the school",
    title_accent: "brochure.",
    description: "A quick 12-page PDF with our programs, fees, campus tour and admission calendar for the coming session — everything a parent needs to know at a glance.",
    brochure_url: "",
    brochure_size: "PDF • 3.4 MB",
    button_label: "Download Brochure",
    secondary_note: "Prefer to speak to us? Call +91 9470410815 or drop by the school office — we love in-person visits.",
  },
  theme: {
    preset: "emerald_gold",
    primary: "#0a5f3d",
    primary_dark: "#0a3d29",
    primary_darker: "#084a30",
    accent: "#c99f3b",
    accent_dark: "#8a6b1e",
    cream_light: "#fff9e6",
    cream_bg: "#fbfaf6",
    cream_neutral: "#f5f2ea",
    seasonal_enabled: true,
    seasonal_themes: [
      {
        name: "Independence Day",
        enabled: true,
        start_month: 8, start_day: 13,
        end_month: 8, end_day: 16,
        priority: 10,
        primary: "#0f5132", primary_dark: "#0a3a24", primary_darker: "#082e1c",
        accent: "#ff671f", accent_dark: "#b8460e",
        cream_light: "#ffffff", cream_bg: "#fefaf5", cream_neutral: "#fff2e6",
      },
      {
        name: "Diwali",
        enabled: true,
        start_month: 10, start_day: 25,
        end_month: 11, end_day: 5,
        priority: 20,
        primary: "#7c2d12", primary_dark: "#431407", primary_darker: "#2a0a03",
        accent: "#f59e0b", accent_dark: "#78350f",
        cream_light: "#fef3c7", cream_bg: "#fff8e1", cream_neutral: "#ffedd5",
      },
      {
        name: "Founder's Day",
        enabled: true,
        start_month: 11, start_day: 14,
        end_month: 11, end_day: 14,
        priority: 30,
        primary: "#4c1d95", primary_dark: "#2e1065", primary_darker: "#1e0854",
        accent: "#d4a373", accent_dark: "#78350f",
        cream_light: "#fef9c3", cream_bg: "#faf5ff", cream_neutral: "#ede9fe",
      },
    ],
  },
  email_settings: {
    enabled: true,
    recipients: "juniordpsdarbhanga@gmail.com",
    from_email: "onboarding@resend.dev",
    reply_to: "",
    subject: "New Admission Enquiry — {name}",
    intro: "A parent has submitted a new admission enquiry from the school website. Details are below — please reach out within 24 hours.",
    send_parent_ack: false,
    parent_ack_subject: "Thank you for your enquiry — Junior DPS Darbhanga",
  },
  current_notices: {
    enabled: true,
    eyebrow: "Notices",
    title_main: "Current",
    title_accent: "notices.",
    description: "Important announcements for parents — exam dates, holiday alerts, PTM schedules and circulars. Please check this section regularly.",
    notices: [
      { title: "Half-Yearly Examinations — Class VI to X", date: "12 Sep 2026", category: "Examinations", body: "Half-yearly examinations for Class VI to X begin from 12 September. The detailed date-sheet has been shared on the parent app. Please ensure children carry only allowed stationery.", link_url: "", urgent: true },
      { title: "Winter Uniform Effective 15 October", date: "05 Oct 2026", category: "Uniform", body: "The winter uniform becomes compulsory from 15 October. Uniforms are available at the school office between 08:00 AM and 02:00 PM on working days.", link_url: "", urgent: false },
      { title: "Parent-Teacher Meeting — Saturday, 21 September", date: "10 Sep 2026", category: "PTM", body: "PTM for all classes will be held on Saturday, 21 September 2026 between 09:00 AM and 01:00 PM. Class teachers will share individual time slots via the parent app.", link_url: "", urgent: false },
      { title: "Diwali Break — School closed 30 Oct to 3 Nov", date: "20 Oct 2026", category: "Holidays", body: "The school will remain closed from 30 October to 3 November on account of Diwali. Classes resume on Monday, 4 November.", link_url: "", urgent: false },
    ],
  },
  curriculum: {
    enabled: true,
    eyebrow: "Curriculum",
    title_main: "What each class",
    title_accent: "studies.",
    description: "A quick look at the CBSE curriculum followed at Junior DPS Darbhanga — subject blocks per class, plus co-curricular activities that shape well-rounded learners.",
    classes: [
      { grade: "Nursery – UKG", level: "Pre-Primary", subjects: ["English", "Hindi", "Numbers", "Environmental Awareness", "Storytelling & Rhymes", "Art & Craft"], cocurricular: "Music, dance, free play, phonics circles", note: "Play-based learning with structured phonics and number-sense routines." },
      { grade: "Class I – II", level: "Foundation", subjects: ["English", "Hindi", "Mathematics", "Environmental Studies (EVS)", "Computer Basics", "General Knowledge"], cocurricular: "Yoga, music, art, storytelling club", note: "Focus on reading fluency, writing habits and number sense." },
      { grade: "Class III – V", level: "Primary", subjects: ["English", "Hindi", "Sanskrit / Third Language", "Mathematics", "Science", "Social Studies", "Computer Science"], cocurricular: "Sports, drama, art, robotics club", note: "Introduction to inquiry-based learning; regular field trips." },
      { grade: "Class VI – VIII", level: "Middle School", subjects: ["English", "Hindi", "Sanskrit / Third Language", "Mathematics", "Science", "Social Science", "Computer Science", "General Knowledge"], cocurricular: "Debate, music, athletics, coding club, Model UN", note: "Concept-first Maths and Science with lab sessions every week." },
      { grade: "Class IX – X", level: "Secondary (CBSE)", subjects: ["English", "Hindi", "Mathematics", "Science (Physics, Chemistry, Biology)", "Social Science", "Computer Applications", "Physical Education"], cocurricular: "Career counselling, Olympiad prep, sports meets, tech fair", note: "CBSE board syllabus with regular mock exams and mentoring." },
    ],
  },
  marquee: {
    enabled: true,
    items: [
      "CBSE Affiliated",
      "Nursery – Class X",
      "Air-Conditioned Campus",
      "24×7 CCTV Surveillance",
      "GPS-Tracked Transport",
      "Career Counselling from Class V",
      "STEM & Robotics Program",
      "Music • Art • Sports",
    ],
  },
  footer: {
    description: "Nurturing curious minds and kind hearts since 2015. A modern, CBSE-affiliated day school for children from Nursery through Class X.",
    socials: {
      facebook: "",
      instagram: "",
      youtube: "",
      linkedin: "",
      twitter: "",
      whatsapp: "",
    },
    quick_links: [
      { label: "Fee Structure", href: "/fees" },
      { label: "School Calendar", href: "/calendar" },
      { label: "Transport Policies", href: "/transport" },
      { label: "Uniform Guidelines", href: "#" },
      { label: "Webmail Login", href: "https://www.zoho.com/mail/login.html" },
      { label: "Career with us", href: "/careers" },
    ],
  },
  admissions_intro: {
    eyebrow: "Admissions Open",
    title_main: "Join the class of",
    title_accent: "2025-26.",
    description: "Seats are filling quickly for Nursery to Class IX. Our simple four-step process makes enrolling your child a warm and welcoming experience.",
    cta_primary: "Start Application",
    cta_secondary: "Visit Campus",
  },
  privacy_policy: {
    title: "Privacy Policy",
    updated: "01 July 2025",
    intro: "Junior DPS Darbhanga is committed to protecting the privacy of every child, parent and staff member who interacts with this website. This Privacy Policy explains what information we collect, how we use it, and the choices you have. By using the website you agree to the practices described here.",
    sections: [
      {
        heading: "Information We Collect",
        body: "When you fill in an enquiry form, apply for admission or subscribe to school updates, we collect the details you voluntarily provide — parent name, child's name, contact number, email, class of interest and any message you send us. Server logs may automatically record IP address, browser type and pages viewed so we can keep the site secure and improve it.",
      },
      {
        heading: "How We Use Information",
        body: "Information is used strictly for school-related purposes: responding to admission enquiries, scheduling campus visits, sharing academic updates and complying with our regulatory obligations as a CBSE-affiliated institution. We do not sell, rent or trade personal data with any third party for marketing.",
      },
      {
        heading: "Children's Privacy",
        body: "The website is not designed for direct use by children under 13. Where a child's details are shared (for example, in an admission enquiry), we assume the parent or lawful guardian has provided them. Any account or portal features intended for students are governed by additional consent obtained at the time of admission.",
      },
      {
        heading: "Cookies & Analytics",
        body: "We use minimal cookies to keep you signed in to any staff dashboard and to remember your preferences. We may use privacy-respecting analytics to measure how the site is used in aggregate. You can disable cookies in your browser without losing access to the public pages of the site.",
      },
      {
        heading: "Data Sharing",
        body: "Enquiry information is accessible only to authorised admissions staff of Junior DPS Darbhanga. We may share information with government bodies (such as CBSE) or law enforcement when legally required, and with trusted service providers (email, hosting) who are contractually bound to protect your data.",
      },
      {
        heading: "Data Retention",
        body: "Enquiry records are retained for up to 24 months after the last contact. Admission and academic records are retained for the duration required by CBSE and applicable Indian law. Website server logs are kept for up to 90 days.",
      },
      {
        heading: "Your Rights",
        body: "You may write to us at any time to review, correct or delete the personal information we hold about you or your child. We will action reasonable requests within 30 days, subject to any legal obligation to preserve records.",
      },
      {
        heading: "Security",
        body: "We use industry-standard measures including HTTPS encryption, restricted admin access and secure password storage. No online service can be completely secure, but we work hard to safeguard your information and notify you promptly if any breach affects your data.",
      },
      {
        heading: "Changes to This Policy",
        body: "This policy may be updated from time to time. The 'Last updated' date at the top will always show the most recent revision. Continued use of the website after changes means you accept the updated policy.",
      },
      {
        heading: "Contact Us",
        body: "Questions about this Privacy Policy or your data can be sent to info@juniordpsdarbhanga.com or via post to Junior DPS Darbhanga, Mufti Mohallah Rd, Mirzapur, Darbhanga, Bihar 846004.",
      },
    ],
  },
  terms_of_use: {
    title: "Terms of Use",
    updated: "01 July 2025",
    intro: "These Terms of Use govern access to and use of the Junior DPS Darbhanga website and any related services. By using the site you agree to these terms. If you do not agree, please do not use the site.",
    sections: [
      {
        heading: "Acceptance of Terms",
        body: "By accessing this website, submitting an enquiry, or using the admin console you confirm that you are at least 18 years old (or are acting under the supervision of a parent or lawful guardian) and that you accept these Terms of Use along with our Privacy Policy.",
      },
      {
        heading: "Use of the Website",
        body: "You agree to use the website only for lawful, personal or educational purposes related to Junior DPS Darbhanga. You will not attempt to interfere with the operation of the site, upload harmful code, scrape data in bulk, or use it in any way that violates applicable law or the rights of others.",
      },
      {
        heading: "Intellectual Property",
        body: "All content on this website — including logos, photographs, curriculum descriptions, illustrations and copy — is the property of Junior DPS Darbhanga or its licensors and is protected by copyright laws.",
      },
      {
        heading: "User Submissions",
        body: "Any information you submit through enquiry forms or feedback forms should be truthful and not violate anyone else's rights.",
      },
      {
        heading: "Disclaimers",
        body: "The website is provided on an 'as is' and 'as available' basis. While we strive for accuracy, actual admission, fee and academic policies are governed by the official school and CBSE guidelines.",
      },
      {
        heading: "Contact Us",
        body: "For questions about these Terms of Use, please write to info@juniordpsdarbhanga.com.",
      },
    ],
  },
  stats: [
    { label: "Years of Excellence", value: 10, suffix: "+" },
    { label: "Happy Students", value: 1800, suffix: "+" },
    { label: "Qualified Teachers", value: 85, suffix: "+" },
    { label: "Award Winning Programs", value: 25, suffix: "+" },
  ],
  hero_badge: {
    enabled: true,
    value: "98% Pass",
    label: "CBSE Board 2025",
  },
};

const contentStore = new Map<string, any>(Object.entries(DEFAULT_CONTENT));

// Auth Helpers
function createToken(username: string): string {
  return jwt.sign({ sub: username, role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
}

function verifyAdmin(req: Request): { sub: string; role: string } | null {
  let token = req.cookies?.[COOKIE_NAME];
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
      token = parts[1];
    }
  }
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = verifyAdmin(req);
  if (!user) {
    return res.status(401).json({ detail: "Not authenticated" });
  }
  (req as any).user = user;
  next();
}

function checkLockout(key: string): number | null {
  const now = Date.now();
  let fails = LOGIN_FAILS.get(key) || [];
  fails = fails.filter((t) => now - t < LOGIN_LOCKOUT_MS);
  LOGIN_FAILS.set(key, fails);
  if (fails.length >= LOGIN_MAX_ATTEMPTS) {
    const oldestFail = fails[0];
    const retryAfter = Math.ceil((LOGIN_LOCKOUT_MS - (now - oldestFail)) / 1000);
    return Math.max(retryAfter, 1);
  }
  return null;
}

function recordFail(key: string) {
  const fails = LOGIN_FAILS.get(key) || [];
  fails.push(Date.now());
  LOGIN_FAILS.set(key, fails);
}

function clearFails(key: string) {
  LOGIN_FAILS.delete(key);
}

async function loadAdminSecurityFromDb() {
  const db = await getDb();
  if (!db) return;
  try {
    const doc = await db.collection("admin_settings").findOne({ _id: "security" as any });
    if (doc) {
      if (doc.passwordHash) adminSecurity.passwordHash = doc.passwordHash;
      if (doc.secret) adminSecurity.secret = doc.secret;
      if (typeof doc.enabled === "boolean") adminSecurity.enabled = doc.enabled;
    }
  } catch (e) {
    console.error("[MongoDB] Error loading admin security:", e);
  }
}

async function verifyPassword(password: string): Promise<boolean> {
  const trimmed = (password || "").trim();
  if (!trimmed) return false;

  await loadAdminSecurityFromDb();
  if (adminSecurity.passwordHash) {
    try {
      const match = await bcrypt.compare(trimmed, adminSecurity.passwordHash);
      if (match) return true;
    } catch {}
  }

  // Also check if any admin doc exists in admins / users collection
  const db = await getDb();
  if (db) {
    try {
      const adminDocs = await db.collection("admins").find({}).toArray();
      for (const doc of adminDocs) {
        if (doc.passwordHash) {
          const match = await bcrypt.compare(trimmed, doc.passwordHash);
          if (match) return true;
        }
        if (doc.password && doc.password === trimmed) {
          return true;
        }
      }
    } catch {}
  }

  const configuredPass = (process.env.ADMIN_PASSWORD || ADMIN_PASSWORD || "").trim();
  if (configuredPass && trimmed === configuredPass) {
    if (db && !adminSecurity.passwordHash) {
      try {
        const hash = await bcrypt.hash(trimmed, 10);
        adminSecurity.passwordHash = hash;
        await db.collection("admin_settings").updateOne(
          { _id: "security" as any },
          { $set: { passwordHash: hash, updated_at: new Date() } },
          { upsert: true }
        );
      } catch (e) {
        console.warn("[MongoDB] Auto-init admin hash warning:", e);
      }
    }
    return true;
  }
  return false;
}

const app = express();
app.set("trust proxy", 1);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Server", "jdps-web");
  res.removeHeader("X-Powered-By");

  // No Public Discovery: noindex, nofollow for admin and sensitive endpoints
  const p = req.path.toLowerCase();
  if (
    p.startsWith(ADMIN_PATH) ||
    p.startsWith("/admin") ||
    p.startsWith("/api/admin") ||
    p.startsWith("/api/audit-log")
  ) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  }

  next();
});

// Dynamic robots.txt with Disallow for the secret admin path and internal endpoints
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(
    `User-agent: *\nDisallow: ${ADMIN_PATH}/\nDisallow: /admin/\nDisallow: /api/admin/\nDisallow: /api/audit-log\n\nSitemap: /sitemap.xml\n`
  );
});

// Strictly block /admin and /admin/* with a genuine 404 response to obscure admin location
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    p === "/admin" ||
    p === "/admin/" ||
    (p.startsWith("/admin/") && !p.startsWith("/api/"))
  ) {
    return res.status(404).send(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow">
  <title>404 Not Found</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: white; padding: 2.5rem 3rem; border-radius: 1rem; border: 1px solid #e2e8f0; text-align: center; max-width: 440px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    h1 { font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
    p { color: #64748b; font-size: 1rem; line-height: 1.5; margin-bottom: 1.5rem; }
    a { display: inline-block; background: #0a5f3d; color: white; padding: 0.625rem 1.25rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; font-size: 0.875rem; }
    a:hover { background: #074a2f; }
  </style>
</head>
<body>
  <div class="card">
    <h1>404</h1>
    <p>The requested URL was not found on this server.</p>
    <a href="/">Return to Homepage</a>
  </div>
</body>
</html>`
    );
  }
  next();
});

const apiRouter = express.Router();

// Public discovery endpoint for client to resolve dynamic admin path
apiRouter.get("/config/admin-path", (req, res) => {
  res.json({ admin_path: ADMIN_PATH });
});

// Root & Health
apiRouter.get("/", (req, res) => {
  res.json({ message: "Junior DPS Darbhanga API", status: "online" });
});

apiRouter.get("/health", async (req, res) => {
  const db = await getDb();
  res.json({
    status: "ok",
    version: "2026.09.06-webmail-official-mailbox-v2",
    features: ["official-mailbox", "webmail-login", "admin-quick-access"],
    database: !!db ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get("/db-status", async (req, res) => {
  const url = getMongoUrl();
  const hasUrl = !!url;
  const db = await getDb();
  const isConnected = !!db;

  res.json({
    connected: isConnected,
    has_secret: hasUrl,
    database_name: DB_NAME,
    mode: isConnected ? "MongoDB Atlas" : "In-Memory / Default Seeds",
    host: hasUrl ? (url.includes("@") ? url.split("@")[1].split("/")[0].split("?")[0] : "configured") : "none",
  });
});

apiRouter.get("/admin/system-metrics", requireAdmin, async (req, res) => {
  const db = await getDb();
  let dbPingMs = 0;
  let dbStatus = "disconnected";
  if (db) {
    try {
      const start = Date.now();
      await db.command({ ping: 1 });
      dbPingMs = Date.now() - start;
      dbStatus = "connected";
    } catch {
      dbStatus = "error";
    }
  }

  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  res.json({
    ok: true,
    server: {
      uptime_seconds: uptimeSeconds,
      uptime_formatted: `${hours}h ${minutes}m ${seconds}s`,
      memory_rss_mb: Math.round(mem.rss / (1024 * 1024)),
      memory_heap_used_mb: Math.round(mem.heapUsed / (1024 * 1024)),
      memory_heap_total_mb: Math.round(mem.heapTotal / (1024 * 1024)),
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || "development",
    },
    database: {
      status: dbStatus,
      ping_ms: dbPingMs,
      type: "MongoDB 7.0 (Dockerized)",
    },
    services: {
      zoho_smtp_configured: !!(process.env.ZOHO_SMTP_PASS_PRINCIPAL || process.env.ZOHO_SMTP_PASS),
      zoho_smtp_host: process.env.ZOHO_SMTP_HOST || "smtp.zoho.com",
      zoho_smtp_port: process.env.ZOHO_SMTP_PORT || "587",
      resend_fallback_configured: !!process.env.RESEND_API_KEY,
      inbound_webhook_ready: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// Admin Login
const handleAdminLogin = async (req: any, res: any) => {
  try {
    const { username, password, otp, emailOtp } = req.body || {};
    const user = (username || "").trim();
    const pass = (password || "").trim();
    const fwd = req.headers["x-forwarded-for"];
    const ip = typeof fwd === "string" ? fwd.split(",")[0].trim() : (req.ip || "unknown");
    const key = `${user.toLowerCase()}:${ip}`;

    const retryAfter = checkLockout(key);
    if (retryAfter !== null) {
      await auditLog("admin.rate_limit_locked", user || "?", req, {
        retry_after_sec: retryAfter,
        attempts: LOGIN_MAX_ATTEMPTS,
      });
      return res.status(429).json({
        detail: `Account locked due to 5 consecutive failed attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes (${retryAfter}s).`,
      });
    }

    const expectedUsername = ADMIN_USERNAME.trim().toLowerCase();
    const inputUsername = user.toLowerCase();
    const isUserValid = inputUsername === expectedUsername || inputUsername === "admin";
    const isPassValid = await verifyPassword(pass);

    if (!isUserValid || !isPassValid) {
      recordFail(key);
      await auditLog("admin.login_failed", user || "?", req, { reason: "bad_credentials" });
      return res.status(401).json({ detail: "Invalid username or password." });
    }

    await loadAdminSecurityFromDb();
    const twoFactorEnabled = !!(adminSecurity.enabled && adminSecurity.secret);

    // 2FA is COMPULSORY for administrator accounts
    if (!twoFactorEnabled) {
      const secret = speakeasy.generateSecret({
        length: 20,
        name: `Junior DPS Darbhanga (${user || "admin"})`,
        issuer: TOTP_ISSUER,
      });

      const qr_data_url = await QRCode.toDataURL(secret.otpauth_url || "");
      const tempToken = jwt.sign(
        { temp: true, sub: user || "admin", secret: secret.base32 },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      await auditLog("admin.2fa_setup_prompted", user, req, { reason: "compulsory_2fa_setup" });

      return res.json({
        require_2fa_setup: true,
        secret: secret.base32,
        qr_data_url,
        temp_token: tempToken,
        detail: "Google Authenticator 2FA setup is compulsory. Scan the QR code to finish sign in.",
      });
    }

    // 2FA verification step
    const code = (otp || emailOtp || "").toString().trim();
    if (!code || !/^\d{6}$/.test(code)) {
      await auditLog("admin.2fa_prompted", user, req);
      return res.status(401).json({
        require_2fa: true,
        detail: "Two-factor authentication code required (from Google Authenticator or Email OTP).",
      });
    }

    let isValidTotp = speakeasy.totp.verify({
      secret: adminSecurity.secret!,
      encoding: "base32",
      token: code,
      window: 1, // Allow +/- 30s for time drift
    });

    // Check Email OTP fallback
    if (!isValidTotp) {
      const cached = EMAIL_OTP_CACHE.get(user.toLowerCase());
      if (cached && cached.code === code && Date.now() < cached.expires) {
        isValidTotp = true;
        EMAIL_OTP_CACHE.delete(user.toLowerCase());
      }
    }

    if (!isValidTotp) {
      recordFail(key);
      await auditLog("admin.login_failed", user, req, { reason: "otp_invalid" });
      return res.status(401).json({ detail: "Invalid 6-digit authentication code." });
    }

    clearFails(key);
    const token = createToken(ADMIN_USERNAME || "admin");
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie(COOKIE_NAME, token, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
    });

    await auditLog("admin.login_success", ADMIN_USERNAME, req, {
      two_factor: true,
      auth_method: "password_and_2fa",
    });

    return res.json({
      token,
      username: ADMIN_USERNAME,
      two_factor_enabled: true,
    });
  } catch (err: any) {
    console.error("[Login Error]:", err);
    return res.status(500).json({ detail: err?.message || "Login authentication error" });
  }
};

apiRouter.post("/admin/login", handleAdminLogin);
apiRouter.post("/auth/login", handleAdminLogin);
apiRouter.post("/login", handleAdminLogin);
app.post("/api/admin/login", handleAdminLogin);
app.post("/api/auth/login", handleAdminLogin);
app.post("/api/login", handleAdminLogin);

// Verify & Activate Compulsory 2FA Setup
apiRouter.post("/admin/2fa/verify-setup", async (req, res) => {
  try {
    const { code, tempToken } = req.body || {};
    const inputCode = (code || "").toString().trim();
    if (!inputCode || !tempToken) {
      return res.status(400).json({ detail: "6-digit code and setup token are required." });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.status(400).json({ detail: "Setup token expired or invalid. Please sign in again." });
    }

    if (!decoded?.temp || !decoded?.secret) {
      return res.status(400).json({ detail: "Invalid setup session." });
    }

    const isValid = speakeasy.totp.verify({
      secret: decoded.secret,
      encoding: "base32",
      token: inputCode,
      window: 1,
    });

    if (!isValid) {
      return res.status(400).json({ detail: "Invalid 6-digit code. Please verify against Google Authenticator." });
    }

    adminSecurity.secret = decoded.secret;
    adminSecurity.enabled = true;

    const db = await getDb();
    if (db) {
      await db.collection("admin_settings").updateOne(
        { _id: "security" as any },
        { $set: { secret: decoded.secret, enabled: true, updated_at: new Date() } },
        { upsert: true }
      );
    }

    await auditLog("admin.2fa_enabled", decoded.sub, req);
    await auditLog("admin.login_success", decoded.sub, req, { two_factor: true, setup_completed: true });

    const token = createToken(decoded.sub || "admin");
    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie(COOKIE_NAME, token, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
    });

    return res.json({ token, username: decoded.sub, two_factor_enabled: true });
  } catch (err: any) {
    console.error("[2FA Setup Verification Error]:", err);
    return res.status(500).json({ detail: err?.message || "2FA activation error" });
  }
});

// Send Email OTP for admin login backup
apiRouter.post("/admin/send-email-otp", async (req, res) => {
  try {
    const { username } = req.body || {};
    const user = (username || "").trim();
    if (!user) {
      return res.status(400).json({ detail: "Username is required." });
    }

    const resendKey = (process.env.RESEND_API_KEY || "").trim();
    const adminEmail = (process.env.ADMIN_EMAIL || process.env.SENDER_EMAIL || "sandyverma3@gmail.com").trim();

    if (!resendKey) {
      return res.status(400).json({
        detail: "Email service (RESEND_API_KEY) is not configured. Please use your Google Authenticator code.",
      });
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    EMAIL_OTP_CACHE.set(user.toLowerCase(), {
      code: otp,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    const resendClient = new Resend(resendKey);
    const sender = process.env.SENDER_EMAIL || "admin@juniordpsdarbhanga.com";

    await resendClient.emails.send({
      from: sender.includes("@") ? sender : "Junior DPS <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `Your Junior DPS Darbhanga Admin Login OTP: ${otp}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;rounded:12px;">
          <h2 style="color:#0a5f3d;margin-top:0;">Junior DPS Darbhanga — Admin Login Verification</h2>
          <p style="font-size:15px;color:#333;">A login attempt was initiated for user <strong>${user}</strong>.</p>
          <div style="background:#f5f2ea;padding:16px;border-radius:8px;text-align:center;margin:24px 0;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#666;margin-bottom:6px;">Your 6-Digit Verification Code</div>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0a3d29;font-family:monospace;">${otp}</div>
          </div>
          <p style="font-size:13px;color:#666;line-height:1.5;">This code is valid for 10 minutes. If you did not initiate this request, someone may be attempting to access the admin portal.</p>
        </div>
      `,
    });

    await auditLog("admin.email_otp_sent", user, req, { destination: adminEmail });
    return res.json({ ok: true, message: `OTP sent to administrator email (${adminEmail.slice(0, 3)}***)` });
  } catch (err: any) {
    console.error("[Email OTP Error]:", err);
    return res.status(500).json({ detail: err?.message || "Failed to dispatch email OTP." });
  }
});

// Admin Logout
apiRouter.post("/admin/logout", (req, res) => {
  const user = verifyAdmin(req);
  res.clearCookie(COOKIE_NAME, { path: "/" });
  if (user) {
    auditLog("admin.logout", user.sub, req);
  }
  res.json({ ok: true });
});

// Admin Me
apiRouter.get("/admin/me", requireAdmin, (req, res) => {
  const user = (req as any).user;
  res.json({
    username: user.sub,
    role: user.role,
    two_factor_enabled: !!(adminSecurity.enabled && adminSecurity.secret),
  });
});

// Audit Log: Reads from MongoDB or memory fallback
apiRouter.get("/audit-log", requireAdmin, async (req, res) => {
  const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 100, 500));
  const skip = Math.max(0, parseInt(req.query.skip as string) || 0);
  const action = req.query.action as string;

  try {
    const db = await getDb();
    if (db) {
      const filter: any = {};
      if (action) filter.action = action;
      const total = await db.collection("admin_audit_logs").countDocuments(filter);
      const items = await db.collection("admin_audit_logs")
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      return res.json({ total, items, limit, skip });
    }
  } catch (e) {
    console.warn("[MongoDB] Audit log query fallback to memory:", e);
  }

  const filtered = action ? auditLogs.filter((l) => l.action === action) : auditLogs;
  const items = filtered.slice(skip, skip + limit);
  res.json({ total: filtered.length, items, limit, skip });
});

// 2FA Status
apiRouter.get("/admin/2fa/status", requireAdmin, (req, res) => {
  res.json({ enabled: !!(adminSecurity.enabled && adminSecurity.secret) });
});

// 2FA Setup
apiRouter.post("/admin/2fa/setup", requireAdmin, async (req, res) => {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `Junior DPS Darbhanga (${ADMIN_USERNAME})`,
    issuer: TOTP_ISSUER,
  });

  const uri = secret.otpauth_url || "";
  const qr_data_url = await QRCode.toDataURL(uri);

  adminSecurity.secret = secret.base32;
  adminSecurity.enabled = false;

  await auditLog("admin.2fa_setup_started", (req as any).user?.sub, req);
  res.json({ secret: secret.base32, otpauth_uri: uri, qr_data_url, issuer: TOTP_ISSUER });
});

// 2FA Enable
apiRouter.post("/admin/2fa/enable", requireAdmin, async (req, res) => {
  const { code } = req.body || {};
  if (!adminSecurity.secret) {
    return res.status(400).json({ detail: "Run setup first." });
  }
  const isValid = speakeasy.totp.verify({
    secret: adminSecurity.secret,
    encoding: "base32",
    token: (code || "").toString().trim(),
    window: 1,
  });
  if (!isValid) {
    return res.status(400).json({ detail: "Invalid or expired code." });
  }
  adminSecurity.enabled = true;
  const db = await getDb();
  if (db) {
    try {
      await db.collection("admin_settings").updateOne(
        { _id: "security" as any },
        { $set: { secret: adminSecurity.secret, enabled: true, updated_at: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.error("[MongoDB] Failed to persist 2FA enable:", err);
    }
  }
  await auditLog("admin.2fa_enabled", (req as any).user?.sub, req);
  res.json({ ok: true, enabled: true });
});

// 2FA Disable
apiRouter.post("/admin/2fa/disable", requireAdmin, async (req, res) => {
  const { code } = req.body || {};
  if (!adminSecurity.enabled || !adminSecurity.secret) {
    return res.status(400).json({ detail: "2FA is not enabled." });
  }
  const isValid = speakeasy.totp.verify({
    secret: adminSecurity.secret,
    encoding: "base32",
    token: (code || "").toString().trim(),
    window: 1,
  });
  if (!isValid) {
    return res.status(400).json({ detail: "Invalid code. Provide your current authenticator code to disable." });
  }
  adminSecurity.enabled = false;
  adminSecurity.secret = null;
  const db = await getDb();
  if (db) {
    try {
      await db.collection("admin_settings").updateOne(
        { _id: "security" as any },
        { $set: { secret: null, enabled: false, updated_at: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      console.error("[MongoDB] Failed to persist 2FA disable:", err);
    }
  }
  await auditLog("admin.2fa_disabled", (req as any).user?.sub, req);
  res.json({ ok: true, enabled: false });
});

  // Password Change
  apiRouter.post("/admin/password/change", requireAdmin, async (req, res) => {
    const { current_password, new_password } = req.body || {};
    const username = (req as any).user?.sub || ADMIN_USERNAME;

    if (!(await verifyPassword(current_password))) {
      auditLog("admin.password_change_failed", username, req, { reason: "bad_current" });
      return res.status(400).json({ detail: "Current password is incorrect." });
    }
    if (current_password === new_password) {
      return res.status(400).json({ detail: "New password must be different from the current password." });
    }
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ detail: "New password must be at least 8 characters." });
    }

    const hash = await bcrypt.hash(new_password, 10);
    adminSecurity.passwordHash = hash;

    const db = await getDb();
    if (db) {
      try {
        await db.collection("admin_settings").updateOne(
          { _id: "security" as any },
          { $set: { passwordHash: hash, updated_at: new Date() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB] Failed to persist password hash:", err);
      }
    }

    auditLog("admin.password_changed", username, req);
    res.json({ ok: true });
  });

  // Resend Email Integration Helpers
  function getResendKey(): string {
    const raw =
      process.env.RESEND_API_KEY ||
      process.env.RESEND_KEY ||
      process.env.RESEND_TOKEN ||
      "";
    let cleaned = raw.trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    return cleaned;
  }

  function getSenderEmail(customFrom?: string): string {
    const envSender =
      process.env.SENDER_EMAIL ||
      process.env.RESEND_FROM_EMAIL ||
      process.env.FROM_EMAIL ||
      process.env.RESEND_SENDER_EMAIL ||
      "";
    const raw = (envSender || customFrom || "").trim();
    if (!raw) {
      return "Junior DPS Darbhanga <onboarding@resend.dev>";
    }
    if (raw.includes("<") && raw.includes(">")) {
      return raw;
    }
    return `Junior DPS Darbhanga <${raw}>`;
  }

  function getRecipients(customRecipients?: string): string[] {
    const envRecipient =
      process.env.ADMIN_EMAIL ||
      process.env.NOTIFICATION_EMAIL ||
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      "";
    const source = (envRecipient || customRecipients || "juniordpsdarbhanga@gmail.com").trim();
    const list = source
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes("@"));
    return list.length > 0 ? list : ["juniordpsdarbhanga@gmail.com"];
  }

  async function sendAdmissionEnquiryEmail(enquiry: Enquiry, isTest = false): Promise<{ sent_to_admin: boolean; sent_to_parent: boolean; error?: string; resend_id?: string }> {
    const apiKey = getResendKey();
    if (!apiKey) {
      console.log("[Resend] Skipped: No RESEND_API_KEY configured.");
      return { sent_to_admin: false, sent_to_parent: false, error: "No RESEND_API_KEY configured in environment" };
    }

    let emailSettings = DEFAULT_CONTENT.email_settings || {
      enabled: true,
      recipients: "juniordpsdarbhanga@gmail.com",
      from_email: "onboarding@resend.dev",
      reply_to: "",
      subject: "New Admission Enquiry — {name}",
      intro: "A parent has submitted a new admission enquiry from the school website. Details are below — please reach out within 24 hours.",
      send_parent_ack: false,
      parent_ack_subject: "Thank you for your enquiry — Junior DPS Darbhanga",
    };

    const db = await getDb();
    if (db) {
      try {
        const doc = await db.collection("content").findOne({ section: "email_settings" });
        if (doc && doc.data) {
          emailSettings = { ...emailSettings, ...doc.data };
        }
      } catch {}
    } else if (contentStore.has("email_settings")) {
      emailSettings = { ...emailSettings, ...contentStore.get("email_settings") };
    }

    if (!isTest && emailSettings.enabled === false) {
      return { sent_to_admin: false, sent_to_parent: false, error: "Email alerts are disabled in settings" };
    }

    const sender = getSenderEmail(emailSettings.from_email);
    const recipients = getRecipients(emailSettings.recipients);
    const replyTo = (emailSettings.reply_to || enquiry.email || "").trim() || undefined;

    let subject = (emailSettings.subject || "New Admission Enquiry — {name}")
      .replace(/\{name\}/gi, enquiry.name || "Student")
      .replace(/\{grade\}/gi, enquiry.grade || "Admission");

    if (isTest) {
      subject = `[TEST ALERT] ${subject}`;
    }

    const formattedDate = new Date(enquiry.created_at || Date.now()).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const adminHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f6f3; color: #1c2a24; }
          .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(10,61,41,0.08); border: 1px solid #e2ebe6; }
          .header { background: #0a3d29; color: #fff9e6; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #fff9e6; letter-spacing: 0.3px; }
          .header p { margin: 6px 0 0; font-size: 13px; color: #c99f3b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 26px 24px; }
          .intro { font-size: 14.5px; color: #3d5248; line-height: 1.5; margin-bottom: 20px; }
          .card { background: #f8faf8; border: 1px solid #e1e9e4; border-radius: 12px; padding: 18px; margin-bottom: 22px; }
          .row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #edf2ef; font-size: 14px; }
          .row:last-child { border-bottom: none; }
          .label { color: #62776d; font-weight: 600; min-width: 130px; }
          .value { color: #0a3d29; font-weight: 600; text-align: right; word-break: break-word; }
          .message-box { margin-top: 12px; padding: 14px; background: #ffffff; border-radius: 8px; border: 1px solid #e5ece8; font-style: italic; color: #2d3e35; font-size: 13.5px; line-height: 1.5; }
          .action-btn { display: inline-block; background: #c99f3b; color: #0a3d29; text-decoration: none; font-weight: 700; padding: 12px 28px; border-radius: 9999px; font-size: 14px; text-align: center; margin: 10px 0; }
          .footer { background: #f4f6f3; padding: 18px 24px; text-align: center; font-size: 12px; color: #7f9389; border-top: 1px solid #e5ebe7; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Junior DPS Darbhanga</h1>
            <p>Admission Enquiry Notification</p>
          </div>
          <div class="content">
            <p class="intro">${emailSettings.intro || "A parent has submitted a new admission enquiry from the school website. Details are below:"}</p>
            <div class="card">
              <div class="row">
                <span class="label">Parent / Student:</span>
                <span class="value">${enquiry.name || "N/A"}</span>
              </div>
              <div class="row">
                <span class="label">Applying For Class:</span>
                <span class="value" style="color: #c99f3b; font-size: 15px;">${enquiry.grade || "Not specified"}</span>
              </div>
              <div class="row">
                <span class="label">Contact Phone:</span>
                <span class="value"><a href="tel:${enquiry.phone}" style="color: #0a5f3d; text-decoration: none;">${enquiry.phone || "N/A"}</a></span>
              </div>
              <div class="row">
                <span class="label">Email Address:</span>
                <span class="value"><a href="mailto:${enquiry.email}" style="color: #0a5f3d; text-decoration: none;">${enquiry.email || "N/A"}</a></span>
              </div>
              <div class="row">
                <span class="label">Received At:</span>
                <span class="value" style="font-weight: normal; font-size: 13px; color: #52675d;">${formattedDate}</span>
              </div>
              ${
                enquiry.message
                  ? `
                <div style="margin-top: 14px; font-weight: 600; font-size: 13px; color: #62776d;">Message / Note:</div>
                <div class="message-box">${enquiry.message}</div>
              `
                  : ""
              }
            </div>
            <div style="text-align: center;">
              <a href="tel:${enquiry.phone}" class="action-btn">Call Parent Now (${enquiry.phone || "Phone"})</a>
            </div>
          </div>
          <div class="footer">
            Junior Delhi Public School, Darbhanga • Mufti Mohallah Rd, Mirzapur, Darbhanga, Bihar 846004<br />
            Ph: +91 9470410815 / +91 9430008181
          </div>
        </div>
      </body>
    </html>
    `;

    let sentToAdmin = false;
    let sentToParent = false;
    let adminResendId = "";

    try {
      const resend = new Resend(apiKey);
      const adminResult = await resend.emails.send({
        from: sender,
        to: recipients,
        replyTo: replyTo,
        subject: subject,
        html: adminHtml,
      });

      if (adminResult.error) {
        console.error("[Resend] Admin dispatch error:", adminResult.error);
        return { sent_to_admin: false, sent_to_parent: false, error: adminResult.error.message || JSON.stringify(adminResult.error) };
      }

      sentToAdmin = true;
      adminResendId = adminResult.data?.id || "";
      console.log(`[Resend] Email sent to admin recipients (${recipients.join(", ")}) [ID: ${adminResendId}]`);

      // Optional Parent Acknowledgement Email
      if (emailSettings.send_parent_ack && enquiry.email && enquiry.email.includes("@")) {
        try {
          const parentAckSubject = (emailSettings.parent_ack_subject || "Thank you for your enquiry — Junior DPS Darbhanga")
            .replace(/\{name\}/gi, enquiry.name || "")
            .replace(/\{grade\}/gi, enquiry.grade || "");

          const parentHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f6f3; color: #1c2a24; }
                .container { max-width: 600px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(10,61,41,0.08); border: 1px solid #e2ebe6; }
                .header { background: #0a3d29; color: #fff9e6; padding: 28px 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #fff9e6; }
                .header p { margin: 6px 0 0; font-size: 13px; color: #c99f3b; font-weight: 600; }
                .content { padding: 28px 24px; line-height: 1.6; font-size: 14.5px; color: #2d3e35; }
                .card { background: #f8faf8; border: 1px solid #e1e9e4; border-radius: 12px; padding: 18px; margin: 18px 0; }
                .footer { background: #f4f6f3; padding: 18px 24px; text-align: center; font-size: 12px; color: #7f9389; border-top: 1px solid #e5ebe7; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Junior DPS Darbhanga</h1>
                  <p>CBSE Affiliated • Est. 2015</p>
                </div>
                <div class="content">
                  <p>Dear <b>${enquiry.name || "Parent"}</b>,</p>
                  <p>Thank you for reaching out to <b>Junior DPS Darbhanga</b>. We have successfully received your admission enquiry for <b>${enquiry.grade || "the upcoming session"}</b>.</p>
                  <div class="card">
                    <b style="color: #0a3d29;">What happens next?</b>
                    <p style="margin: 6px 0 0; font-size: 13.5px; color: #4a5d53;">Our admissions team will review your details and call you on <b>${enquiry.phone || "your contact number"}</b> to guide you through the admission procedure and schedule a campus visit.</p>
                  </div>
                  <p>If you have any urgent queries, please feel free to reach our admissions desk directly:</p>
                  <p style="margin: 4px 0; color: #0a3d29;">📞 <b>+91 9470410815 / +91 9430008181</b></p>
                  <p style="margin: 4px 0; color: #0a3d29;">📍 <b>Mufti Mohallah Rd, Mirzapur, Darbhanga, Bihar 846004</b></p>
                  <p style="margin-top: 24px;">Warm regards,<br /><b>Admissions Office</b><br />Junior DPS Darbhanga</p>
                </div>
                <div class="footer">
                  © Junior DPS Darbhanga. All rights reserved.
                </div>
              </div>
            </body>
          </html>
          `;

          const parentResult = await resend.emails.send({
            from: sender,
            to: [enquiry.email],
            subject: parentAckSubject,
            html: parentHtml,
          });

          if (!parentResult.error) {
            sentToParent = true;
            console.log(`[Resend] Acknowledgement sent to parent (${enquiry.email})`);
          } else {
            console.error("[Resend] Parent email error:", parentResult.error);
          }
        } catch (pErr) {
          console.error("[Resend] Exception dispatching parent email:", pErr);
        }
      }

      return { sent_to_admin: sentToAdmin, sent_to_parent: sentToParent, resend_id: adminResendId };
    } catch (err: any) {
      console.error("[Resend] Exception sending email:", err);
      return { sent_to_admin: false, sent_to_parent: false, error: err?.message || "Failed to send email via Resend" };
    }
  }

  // Enquiries
  apiRouter.post("/enquiries", async (req, res) => {
    const { name, email, phone, grade, message } = req.body || {};
    const enquiry: Enquiry = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      name: name || "",
      email: email || "",
      phone: phone || "",
      grade: grade || "",
      message: message || "",
      status: "new",
      created_at: new Date().toISOString(),
    };
    enquiries.unshift(enquiry);

    const db = await getDb();
    if (db) {
      try {
        await db.collection("enquiries").insertOne({ ...enquiry, _id: enquiry.id as any });
      } catch (err) {
        console.error("[MongoDB] Insert enquiry error:", err);
      }
    }

    auditLog("enquiry.created", enquiry.email || "public", req, { id: enquiry.id, name: enquiry.name, grade: enquiry.grade });

    // Send email notification asynchronously via Resend
    sendAdmissionEnquiryEmail(enquiry, false).catch((err) => {
      console.error("[Resend] Background email error:", err);
    });

    res.json(enquiry);
  });

  apiRouter.post("/enquiries/test-email", requireAdmin, async (req, res) => {
    const sampleEnquiry: Enquiry = {
      id: "test-" + Date.now().toString(36),
      name: "Ramesh Sharma (Sample Parent)",
      email: (req as any).user?.sub ? "test-parent@example.com" : "parent@example.com",
      phone: "+91 9876543210",
      grade: "Class I (Foundation)",
      message: "This is a live test enquiry generated from the Junior DPS Darbhanga Admin Console to verify Resend API integration.",
      status: "new",
      created_at: new Date().toISOString(),
    };

    const outcome = await sendAdmissionEnquiryEmail(sampleEnquiry, true);
    if (!outcome.sent_to_admin) {
      return res.status(400).json({
        ok: false,
        detail: outcome.error || "Failed to send test email. Please check your RESEND_API_KEY and sender email.",
        outcome,
      });
    }

    auditLog("enquiry.test_email_dispatched", (req as any).user?.sub, req, { outcome });
    res.json({ ok: true, outcome });
  });

  apiRouter.get("/enquiries", requireAdmin, async (req, res) => {
    const db = await getDb();
    if (db) {
      try {
        const docs = await db.collection("enquiries").find({}).sort({ created_at: -1 }).toArray();
        if (docs.length > 0) {
          const list = docs.map((d: any) => ({
            id: d.id || d._id?.toString(),
            name: d.name || "",
            email: d.email || "",
            phone: d.phone || "",
            grade: d.grade || "",
            message: d.message || "",
            status: d.status || "new",
            created_at: d.created_at || new Date().toISOString(),
          }));
          return res.json(list);
        }
      } catch (err) {
        console.error("[MongoDB] Fetch enquiries error:", err);
      }
    }
    res.json(enquiries);
  });

  apiRouter.patch("/enquiries/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    const item = enquiries.find((e) => e.id === id);
    if (item) {
      item.status = status;
    }

    const db = await getDb();
    if (db) {
      try {
        await db.collection("enquiries").updateOne(
          { $or: [{ id }, { _id: id as any }, ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])] },
          { $set: { status, updated_at: new Date() } }
        );
      } catch (err) {
        console.error("[MongoDB] Update enquiry error:", err);
      }
    }

    auditLog("enquiry.status_updated", (req as any).user?.sub, req, { id, status });
    res.json({ ok: true });
  });

  apiRouter.delete("/enquiries/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const index = enquiries.findIndex((e) => e.id === id);
    if (index !== -1) {
      enquiries.splice(index, 1);
    }

    const db = await getDb();
    if (db) {
      try {
        await db.collection("enquiries").deleteOne({
          $or: [{ id }, { _id: id as any }, ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])],
        });
      } catch (err) {
        console.error("[MongoDB] Delete enquiry error:", err);
      }
    }

    auditLog("enquiry.deleted", (req as any).user?.sub, req, { id });
    res.json({ ok: true });
  });

  // ==========================================
  // REAL MAILBOX HUB & INBOUND WEBHOOK (Approach A)
  // ==========================================

  // Public Inbound Email Webhook (Called by Cloudflare Email Worker, SendGrid Inbound Parse, etc.)
  apiRouter.post("/webhooks/inbound-email", async (req, res) => {
    const secret = process.env.INBOUND_WEBHOOK_SECRET;
    if (secret) {
      const providedSecret = req.headers["x-webhook-secret"] || req.query.secret;
      if (providedSecret !== secret) {
        return res.status(401).json({ error: "Invalid webhook secret" });
      }
    }

    try {
      const body = req.body || {};
      const rawTo = body.to || body.recipient || body.envelope?.to || "principal@juniordpsdarbhanga.com";
      const toArr: string[] = Array.isArray(rawTo)
        ? rawTo
        : typeof rawTo === "string"
        ? rawTo.split(",").map((s) => s.trim())
        : ["principal@juniordpsdarbhanga.com"];

      const toStr = toArr.join(" ").toLowerCase();
      let mailbox: "principal" | "info" | "account" = "principal";
      if (toStr.includes("account@") || toStr.includes("accounts@")) {
        mailbox = "account";
      } else if (toStr.includes("info@")) {
        mailbox = "info";
      } else {
        mailbox = "principal";
      }

      let fromAddress = "sender@external.com";
      let fromName = "External Sender";
      const rawFrom = body.from || body.sender || body.envelope?.from || "";
      if (typeof rawFrom === "string") {
        const match = rawFrom.match(/^(.*?)\s*<([^>]+)>$/);
        if (match) {
          fromName = match[1].replace(/["']/g, "").trim() || match[2];
          fromAddress = match[2].trim();
        } else {
          fromAddress = rawFrom.trim();
          fromName = rawFrom.split("@")[0] || rawFrom;
        }
      } else if (typeof rawFrom === "object" && rawFrom !== null) {
        fromAddress = rawFrom.address || rawFrom.email || "sender@external.com";
        fromName = rawFrom.name || fromAddress;
      }

      const subject = body.subject || "(No Subject)";
      const text = body.text || body.body || body.message || "";
      const html = body.html || "";

      const msg: MailboxMessage = {
        id: "msg-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        mailbox,
        direction: "inbound",
        from: fromAddress,
        from_name: fromName,
        to: toArr,
        reply_to: body.reply_to || fromAddress,
        subject,
        body: text || (html ? html.replace(/<[^>]+>/g, " ").trim() : "(Empty email body)"),
        html: html || undefined,
        status: "unread",
        starred: false,
        tags: ["Inbound", mailbox],
        created_at: body.date || new Date().toISOString(),
        delivery_info: {
          source: (req.headers["user-agent"] as string) || "webhook",
          received_at: new Date().toISOString(),
        },
      };

      liveMailboxMessages.unshift(msg);

      const db = await getDb();
      if (db) {
        await db.collection("incoming_emails").insertOne({ ...msg, _id: msg.id as any });
      }

      console.log(`[Mailbox Webhook] Inbound email received for ${mailbox}@: "${subject}" from ${fromAddress}`);
      res.json({ ok: true, id: msg.id, mailbox: msg.mailbox });
    } catch (err: any) {
      console.error("[Mailbox Webhook] Error processing email:", err);
      res.status(500).json({ error: "Failed to process incoming email", details: err?.message });
    }
  });

  // Admin Mailbox List
  apiRouter.get("/mailbox/emails", requireAdmin, async (req, res) => {
    const { mailbox = "all", status = "all", search = "" } = req.query as Record<string, string>;
    const db = await getDb();
    let allItems: MailboxMessage[] = [];

    if (db) {
      try {
        const docs = await db.collection("incoming_emails").find({}).sort({ created_at: -1 }).toArray();
        allItems = docs.map((d: any) => ({
          id: d.id || d._id?.toString(),
          mailbox: d.mailbox || "principal",
          direction: d.direction || "inbound",
          from: d.from || "",
          from_name: d.from_name || "",
          to: Array.isArray(d.to) ? d.to : [d.to || ""],
          reply_to: d.reply_to || "",
          subject: d.subject || "",
          body: d.body || "",
          html: d.html,
          status: d.status || "unread",
          starred: !!d.starred,
          tags: d.tags || [],
          created_at: d.created_at || new Date().toISOString(),
          in_reply_to_id: d.in_reply_to_id,
          delivery_info: d.delivery_info,
        }));
      } catch (err) {
        console.error("[MongoDB] Fetch mailbox error:", err);
        allItems = [...liveMailboxMessages];
      }
    } else {
      allItems = [...liveMailboxMessages];
    }

    let filtered = [...allItems];
    if (mailbox && mailbox !== "all") {
      filtered = filtered.filter((m) => m.mailbox === mailbox);
    }
    if (status && status !== "all") {
      if (status === "starred") {
        filtered = filtered.filter((m) => !!m.starred);
      } else if (status === "outbound") {
        filtered = filtered.filter((m) => m.direction === "outbound");
      } else {
        filtered = filtered.filter((m) => m.status === status);
      }
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          m.from.toLowerCase().includes(q) ||
          (m.from_name && m.from_name.toLowerCase().includes(q))
      );
    }

    const counts = {
      all: allItems.length,
      total_unread: allItems.filter((m) => m.direction === "inbound" && m.status === "unread").length,
      principal_unread: allItems.filter((m) => m.mailbox === "principal" && m.status === "unread").length,
      info_unread: allItems.filter((m) => m.mailbox === "info" && m.status === "unread").length,
      account_unread: allItems.filter((m) => m.mailbox === "account" && m.status === "unread").length,
      starred: allItems.filter((m) => !!m.starred).length,
      outbound: allItems.filter((m) => m.direction === "outbound").length,
    };

    res.json({ emails: filtered, counts });
  });

  // Admin Mailbox: Send Outbound Email / Reply
  apiRouter.post("/mailbox/send", requireAdmin, async (req, res) => {
    const { mailbox = "principal", to, subject, body, in_reply_to_id } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Recipient email (to), subject, and body are required." });
    }

    const validMailbox = ["principal", "info", "account"].includes(mailbox) ? mailbox : "principal";
    const fromAddress = `${validMailbox}@juniordpsdarbhanga.com`;
    const fromDisplayName =
      validMailbox === "principal"
        ? "Principal — Junior DPS Darbhanga"
        : validMailbox === "account"
        ? "Accounts Office — Junior DPS Darbhanga"
        : "Admissions & Info — Junior DPS Darbhanga";

    let dispatchResult: any = null;
    let dispatchMethod = "unconfigured";

    // 1. Try Zoho SMTP via nodemailer if credentials provided in env
    const transporter = getMailTransporter(validMailbox as any);
    if (transporter) {
      try {
        dispatchResult = await transporter.sendMail({
          from: `"${fromDisplayName}" <${fromAddress}>`,
          to,
          subject,
          text: body,
        });
        dispatchMethod = "zoho_smtp";
      } catch (err: any) {
        console.error("[Mailbox SMTP Error]:", err?.message || err);
      }
    }

    // 2. Fall back to Resend if SMTP not configured or failed
    if (!dispatchResult) {
      const resendKey = getResendKey();
      if (resendKey) {
        try {
          const resend = new Resend(resendKey);
          dispatchResult = await resend.emails.send({
            from: `Junior DPS Darbhanga <onboarding@resend.dev>`,
            replyTo: fromAddress,
            to: Array.isArray(to) ? to : [to],
            subject: `[${fromDisplayName}] ${subject}`,
            text: `${body}\n\n---\nJunior DPS Darbhanga | Official Correspondence\n${fromAddress}`,
          });
          dispatchMethod = "resend";
        } catch (err: any) {
          console.warn("[Mailbox Resend Warning]:", err?.message || err);
        }
      }
    }

    const outMsg: MailboxMessage = {
      id: "out-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      mailbox: validMailbox as any,
      direction: "outbound",
      from: fromAddress,
      from_name: fromDisplayName,
      to: Array.isArray(to) ? to : [to],
      subject,
      body,
      status: "sent",
      starred: false,
      tags: ["Sent", validMailbox],
      created_at: new Date().toISOString(),
      in_reply_to_id,
      delivery_info: { method: dispatchMethod, result: dispatchResult },
    };

    liveMailboxMessages.unshift(outMsg);

    const db = await getDb();
    if (db) {
      try {
        await db.collection("incoming_emails").insertOne({ ...outMsg, _id: outMsg.id as any });
        if (in_reply_to_id) {
          await db.collection("incoming_emails").updateOne(
            { $or: [{ id: in_reply_to_id }, { _id: in_reply_to_id as any }] },
            { $set: { status: "replied", updated_at: new Date() } }
          );
        }
      } catch (err) {
        console.error("[MongoDB] Insert outbound email error:", err);
      }
    }

    if (in_reply_to_id) {
      const existing = liveMailboxMessages.find((m) => m.id === in_reply_to_id);
      if (existing) existing.status = "replied";
    }

    auditLog("mailbox.email_sent", (req as any).user?.sub, req, {
      to,
      subject,
      mailbox: validMailbox,
      method: dispatchMethod,
    });

    res.json({ ok: true, message: outMsg, method: dispatchMethod });
  });

  // Admin Mailbox: Update Status (mark read / unread)
  apiRouter.patch("/mailbox/emails/:id/status", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};
    const item = liveMailboxMessages.find((m) => m.id === id);
    if (item && status) item.status = status;

    const db = await getDb();
    if (db) {
      try {
        await db.collection("incoming_emails").updateOne(
          { $or: [{ id }, { _id: id as any }, ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])] },
          { $set: { status, updated_at: new Date() } }
        );
      } catch (err) {
        console.error("[MongoDB] Update email status error:", err);
      }
    }
    res.json({ ok: true, id, status });
  });

  // Admin Mailbox: Toggle Star
  apiRouter.patch("/mailbox/emails/:id/star", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const item = liveMailboxMessages.find((m) => m.id === id);
    let starred = false;
    if (item) {
      item.starred = !item.starred;
      starred = item.starred;
    }

    const db = await getDb();
    if (db) {
      try {
        const existing = await db.collection("incoming_emails").findOne({
          $or: [{ id }, { _id: id as any }, ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])],
        });
        if (existing) {
          starred = !existing.starred;
          await db.collection("incoming_emails").updateOne(
            { _id: existing._id },
            { $set: { starred, updated_at: new Date() } }
          );
        }
      } catch (err) {
        console.error("[MongoDB] Toggle star error:", err);
      }
    }
    res.json({ ok: true, id, starred });
  });

  // Admin Mailbox: Delete Email
  apiRouter.delete("/mailbox/emails/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const idx = liveMailboxMessages.findIndex((m) => m.id === id);
    if (idx !== -1) liveMailboxMessages.splice(idx, 1);

    const db = await getDb();
    if (db) {
      try {
        await db.collection("incoming_emails").deleteOne({
          $or: [{ id }, { _id: id as any }, ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])],
        });
      } catch (err) {
        console.error("[MongoDB] Delete email error:", err);
      }
    }
    res.json({ ok: true });
  });

  // Admin Mailbox: Test Simulator (Send real simulated incoming email to verify flow)
  apiRouter.post("/mailbox/test-incoming", requireAdmin, async (req, res) => {
    const {
      mailbox = "principal",
      from = "sandyverma3@gmail.com",
      from_name = "Sandy Verma (Test)",
      subject = "Test Inbound Email Verification",
      body = "This is a live test email sent into the Admin Panel Mailbox to verify incoming delivery.",
    } = req.body || {};

    const msg: MailboxMessage = {
      id: "test-" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      mailbox: ["principal", "info", "account"].includes(mailbox) ? mailbox : "principal",
      direction: "inbound",
      from,
      from_name,
      to: [`${mailbox}@juniordpsdarbhanga.com`],
      reply_to: from,
      subject,
      body,
      status: "unread",
      starred: false,
      tags: ["Test", "Inbound"],
      created_at: new Date().toISOString(),
      delivery_info: { test: true, triggered_by: (req as any).user?.sub },
    };

    liveMailboxMessages.unshift(msg);

    const db = await getDb();
    if (db) {
      await db.collection("incoming_emails").insertOne({ ...msg, _id: msg.id as any });
    }

    auditLog("mailbox.test_simulated", (req as any).user?.sub, req, { id: msg.id, mailbox, from });
    res.json({ ok: true, message: msg });
  });

  // Admin Mailbox: Configuration & Webhook Guide
  apiRouter.get("/mailbox/config", requireAdmin, async (req, res) => {
    const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const host = req.get("host") || "juniordpsdarbhanga.com";
    const webhookUrl = `${protocol}://${host}/api/webhooks/inbound-email`;

    res.json({
      webhook_url: webhookUrl,
      smtp_configured: !!(process.env.ZOHO_SMTP_USER && process.env.ZOHO_SMTP_PASS),
      resend_configured: !!getResendKey(),
      has_webhook_secret: !!process.env.INBOUND_WEBHOOK_SECRET,
      mailboxes: [
        { id: "principal", address: "principal@juniordpsdarbhanga.com", role: "Principal & Academic Leadership" },
        { id: "info", address: "info@juniordpsdarbhanga.com", role: "General Admissions & Enquiries" },
        { id: "account", address: "account@juniordpsdarbhanga.com", role: "Fee Receipts & Accounts Office" },
      ],
    });
  });

  // News
  apiRouter.get("/news", async (req, res) => {
    const onlyPublished = req.query.only_published !== "false";
    const db = await getDb();
    if (db) {
      try {
        const query = onlyPublished ? { published: { $ne: false } } : {};
        const docs = await db.collection("news").find(query).sort({ created_at: -1 }).toArray();
        if (docs.length > 0) {
          const mapped = docs.map((d: any) => ({
            id: d.id || d._id?.toString(),
            title: d.title || "",
            excerpt: d.excerpt || "",
            body: d.body || "",
            tag: d.tag || "General",
            date: d.date || "",
            cover_image: d.cover_image || "",
            published: d.published !== false,
            created_at: d.created_at || new Date().toISOString(),
          }));
          return res.json(mapped);
        }
      } catch (err) {
        console.error("[MongoDB] Get news error:", err);
      }
    }
    const items = onlyPublished ? newsList.filter((n) => n.published) : newsList;
    res.json(items);
  });

  apiRouter.get("/news/all", requireAdmin, async (req, res) => {
    const db = await getDb();
    if (db) {
      try {
        const docs = await db.collection("news").find({}).sort({ created_at: -1 }).toArray();
        if (docs.length > 0) {
          const mapped = docs.map((d: any) => ({
            id: d.id || d._id?.toString(),
            title: d.title || "",
            excerpt: d.excerpt || "",
            body: d.body || "",
            tag: d.tag || "General",
            date: d.date || "",
            cover_image: d.cover_image || "",
            published: d.published !== false,
            created_at: d.created_at || new Date().toISOString(),
          }));
          return res.json(mapped);
        }
      } catch (err) {
        console.error("[MongoDB] Get all news error:", err);
      }
    }
    res.json(newsList);
  });

  apiRouter.post("/news", requireAdmin, async (req, res) => {
    const { title, excerpt, body, tag, date, cover_image, published } = req.body || {};
    const item: NewsItem = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      title: title || "",
      excerpt: excerpt || "",
      body: body || "",
      tag: tag || "General",
      date: date || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      cover_image: cover_image || "",
      published: published !== false,
      created_at: new Date().toISOString(),
    };
    newsList.unshift(item);

    const db = await getDb();
    if (db) {
      try {
        await db.collection("news").insertOne({ ...item, _id: item.id as any });
      } catch (err) {
        console.error("[MongoDB] Insert news error:", err);
      }
    }

    res.json(item);
  });

  apiRouter.put("/news/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, excerpt, body, tag, date, cover_image, published } = req.body || {};
    
    const item = newsList.find((n) => n.id === id);
    if (item) {
      if (title !== undefined) item.title = title;
      if (excerpt !== undefined) item.excerpt = excerpt;
      if (body !== undefined) item.body = body;
      if (tag !== undefined) item.tag = tag;
      if (date !== undefined) item.date = date;
      if (cover_image !== undefined) item.cover_image = cover_image;
      if (published !== undefined) item.published = published;
    }

    const db = await getDb();
    if (db) {
      try {
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (excerpt !== undefined) updateData.excerpt = excerpt;
        if (body !== undefined) updateData.body = body;
        if (tag !== undefined) updateData.tag = tag;
        if (date !== undefined) updateData.date = date;
        if (cover_image !== undefined) updateData.cover_image = cover_image;
        if (published !== undefined) updateData.published = published;
        updateData.updated_at = new Date();

        await db.collection("news").updateOne(
          { $or: [{ id }, { _id: id as any }, ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])] },
          { $set: updateData },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB] Update news error:", err);
      }
    }

    res.json(item || { id, title, excerpt, body, tag, date, cover_image, published });
  });

  apiRouter.delete("/news/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const index = newsList.findIndex((n) => n.id === id);
    if (index !== -1) {
      newsList.splice(index, 1);
    }

    const db = await getDb();
    if (db) {
      try {
        await db.collection("news").deleteOne({
          $or: [{ id }, { _id: id as any }, ...(ObjectId.isValid(id) ? [{ _id: new ObjectId(id) }] : [])],
        });
      } catch (err) {
        console.error("[MongoDB] Delete news error:", err);
      }
    }

    res.json({ ok: true });
  });

  // Content (reads from MongoDB Atlas or fallback default seeds)
  apiRouter.get("/content", async (req, res) => {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(DEFAULT_CONTENT)) {
      result[key] = contentStore.has(key) ? contentStore.get(key) : JSON.parse(JSON.stringify(val));
    }
    for (const [key, val] of contentStore.entries()) {
      result[key] = val;
    }

    const db = await getDb();
    if (db) {
      try {
        const docs = await db.collection("content").find({}).toArray();
        for (const doc of docs) {
          if (doc.section && doc.data !== undefined) {
            result[doc.section] = doc.data;
            contentStore.set(doc.section, doc.data);
          } else if (doc._id && typeof doc._id === "string" && (doc.data !== undefined || doc.value !== undefined)) {
            const val = doc.data !== undefined ? doc.data : doc.value;
            result[doc._id] = val;
            contentStore.set(doc._id, val);
          } else if (doc.key && (doc.value !== undefined || doc.data !== undefined)) {
            const val = doc.data !== undefined ? doc.data : doc.value;
            result[doc.key] = val;
            contentStore.set(doc.key, val);
          } else {
            for (const [k, v] of Object.entries(doc)) {
              if (k !== "_id" && k !== "updated_at" && k !== "created_at" && v !== undefined) {
                result[k] = v;
                contentStore.set(k, v);
              }
            }
          }
        }
      } catch (err) {
        console.error("[MongoDB] Read content error:", err);
      }
    }

    if (result.footer && Array.isArray(result.footer.quick_links)) {
      result.footer.quick_links = result.footer.quick_links.map((l: any) => {
        if (l && typeof l.label === "string" && l.label.toLowerCase().includes("parent login")) {
          return { label: "Webmail Login", href: "https://www.zoho.com/mail/login.html" };
        }
        if (l && typeof l.label === "string" && l.label.toLowerCase().includes("webmail")) {
          if (!l.href || l.href === "https://mail.zoho.com" || l.href === "https://mail.zoho.com/") {
            return { ...l, href: "https://www.zoho.com/mail/login.html" };
          }
        }
        return l;
      });
    }

    res.json(result);
  });

  apiRouter.put("/content/:section", requireAdmin, async (req, res) => {
    const { section } = req.params;
    if (!(section in DEFAULT_CONTENT)) {
      return res.status(400).json({ detail: `Unknown section: ${section}` });
    }
    const data = req.body?.data;
    contentStore.set(section, data);

    const db = await getDb();
    if (db) {
      try {
        await db.collection("content").updateOne(
          { $or: [{ section }, { _id: section as any }, { key: section }] },
          { $set: { section, data, key: section, value: data, updated_at: new Date() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB] Write content error:", err);
      }
    }

    auditLog(`content.save.${section}`, (req as any).user?.sub, req, { section });
    res.json({ ok: true, section });
  });

  apiRouter.post("/content/:section/reset", requireAdmin, async (req, res) => {
    const { section } = req.params;
    if (!(section in DEFAULT_CONTENT)) {
      return res.status(400).json({ detail: "Unknown section" });
    }
    const defData = JSON.parse(JSON.stringify(DEFAULT_CONTENT[section]));
    contentStore.set(section, defData);

    const db = await getDb();
    if (db) {
      try {
        await db.collection("content").updateOne(
          { $or: [{ section }, { _id: section as any }, { key: section }] },
          { $set: { section, data: defData, key: section, value: defData, updated_at: new Date() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[MongoDB] Reset content error:", err);
      }
    }

    auditLog(`content.reset.${section}`, (req as any).user?.sub, req, { section });
    res.json({ ok: true });
  });

  // Media / Image endpoint to fetch images from MongoDB Atlas GridFS or collections
  apiRouter.get(["/images/:id", "/media/:id", "/uploads/:id", "/files/:id"], async (req, res) => {
    const { id } = req.params;
    const db = await getDb();
    if (!db) {
      return res.status(404).json({ detail: "Image not found (MongoDB not connected)" });
    }

    try {
      // 1. Check in collections: images, files, media, uploads, gallery
      for (const collName of ["images", "files", "media", "uploads", "photos"]) {
        try {
          let doc: any = null;
          if (ObjectId.isValid(id)) {
            doc = await db.collection(collName).findOne({ _id: new ObjectId(id) });
          }
          if (!doc) {
            doc = await db.collection(collName).findOne({
              $or: [{ id }, { filename: id }, { name: id }, { key: id }, { title: id }],
            });
          }
          if (doc) {
            const raw = doc.data || doc.src || doc.url || doc.image || doc.base64;
            if (typeof raw === "string" && raw.startsWith("data:")) {
              const matches = raw.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
              if (matches && matches.length === 3) {
                res.setHeader("Content-Type", matches[1]);
                res.setHeader("Cache-Control", "public, max-age=86400");
                return res.send(Buffer.from(matches[2], "base64"));
              }
            } else if (doc.buffer || doc.binary) {
              res.setHeader("Content-Type", doc.contentType || doc.mimeType || "image/jpeg");
              res.setHeader("Cache-Control", "public, max-age=86400");
              return res.send(doc.buffer || doc.binary);
            } else if (typeof raw === "string" && raw.startsWith("http")) {
              return res.redirect(raw);
            }
          }
        } catch {}
      }

      // 2. Check in GridFS
      for (const bucketName of ["fs", "uploads", "images"]) {
        try {
          const bucket = new GridFSBucket(db, { bucketName });
          let fileId: ObjectId | null = null;
          if (ObjectId.isValid(id)) {
            fileId = new ObjectId(id);
          } else {
            const fileDoc = await db.collection(`${bucketName}.files`).findOne({ filename: id });
            if (fileDoc) fileId = fileDoc._id;
          }
          if (fileId) {
            const files = await bucket.find({ _id: fileId }).toArray();
            if (files.length > 0) {
              const file = files[0];
              res.setHeader("Content-Type", (file as any).contentType || "image/jpeg");
              res.setHeader("Cache-Control", "public, max-age=86400");
              const downloadStream = bucket.openDownloadStream(fileId);
              return downloadStream.pipe(res);
            }
          }
        } catch {}
      }

      return res.status(404).json({ detail: "Image not found" });
    } catch (err) {
      console.error("[MongoDB] Image retrieve error:", err);
      return res.status(500).json({ detail: "Error retrieving image" });
    }
  });


  // Mount router under /api
  app.use("/api", apiRouter);

  // Also mount router directly for environments where /api is stripped by serverless proxies
  app.use((req, res, next) => {
    if (
      (req.method !== "GET" && req.path.startsWith("/admin")) ||
      req.path.startsWith("/news") ||
      req.path.startsWith("/enquiries") ||
      req.path.startsWith("/content") ||
      req.path.startsWith("/audit-log") ||
      req.path.startsWith("/db-status") ||
      req.path.startsWith("/health") ||
      req.path.startsWith("/images")
    ) {
      return apiRouter(req, res, next);
    }
    next();
  });

  // Global API error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("[Unhandled Express Error]:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({
      detail: err?.message || "Internal server error occurred",
    });
  });

  async function warmupContent() {
    try {
      const db = await getDb();
      if (db) {
        const docs = await db.collection("content").find({}).toArray();
        for (const doc of docs) {
          if (doc.section && doc.data !== undefined) {
            contentStore.set(doc.section, doc.data);
          } else if (doc._id && typeof doc._id === "string" && (doc.data !== undefined || doc.value !== undefined)) {
            contentStore.set(doc._id, doc.data !== undefined ? doc.data : doc.value);
          } else if (doc.key && (doc.value !== undefined || doc.data !== undefined)) {
            contentStore.set(doc.key, doc.data !== undefined ? doc.data : doc.value);
          }
        }
        console.log(`[Content] Pre-warmed ${docs.length} sections from MongoDB into memory cache`);
      }
    } catch (err: any) {
      console.warn("[Content] Warmup note:", err?.message || err);
    }
  }

  async function start() {
    warmupContent().catch(() => {});
    if (process.env.NODE_ENV !== "production") {
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
        app.listen(PORT, "0.0.0.0", () => {
          console.log(`[Dev] Server running on http://localhost:${PORT}`);
        });
      } catch (e) {
        console.error("Failed to initialize Vite dev server:", e);
      }
    } else if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.NOW_REGION) {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.sendFile(path.join(distPath, "index.html"));
      });
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[Prod] Server running on http://localhost:${PORT}`);
      });
    }
  }

  // Only start standalone listener when not in serverless runtime
  if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.NOW_REGION) {
    start().catch((err) => {
      console.error("Failed to start server:", err);
    });
  }

export { app };
export default app;
