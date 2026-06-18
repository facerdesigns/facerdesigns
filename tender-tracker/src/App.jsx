import { useState, useEffect } from "react";
import { firebaseReady, db, auth } from "./firebase";
import { signInAnonymously }       from "firebase/auth";
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy } from "firebase/firestore";

// ─── NSPL Reference Data ──────────────────────────────────────────────────────
const NSPL_DATA = [
  { code: "8.1",  category: "Office Stationery",              item: "A4 Paper (80gsm, 500 sheets/ream)",                     unit: "Ream",      price: 4.50,   table: 8  },
  { code: "8.2",  category: "Office Stationery",              item: "A3 Paper (80gsm, 500 sheets/ream)",                     unit: "Ream",      price: 8.00,   table: 8  },
  { code: "12.1", category: "Printing Requirements",          item: "Printing – Business Cards (Full Colour, 250 cards)",    unit: "Set",       price: 18.00,  table: 12 },
  { code: "12.2", category: "Printing Requirements",          item: "Printing – A4 Letterheads (Full Colour, 500)",          unit: "Set",       price: 35.00,  table: 12 },
  { code: "12.3", category: "Printing Requirements",          item: "Printing – A5 Flyers (Full Colour, 1000)",              unit: "Set",       price: 45.00,  table: 12 },
  { code: "12.4", category: "Printing Requirements",          item: "Printing – A4 Brochures (Full Colour, Folded)",         unit: "Per 100",   price: 55.00,  table: 12 },
  { code: "4.1",  category: "Corporate & Protective Wear",    item: "Corporate T-Shirts (Embroidered/Printed)",              unit: "Each",      price: 12.00,  table: 4  },
  { code: "4.2",  category: "Corporate & Protective Wear",    item: "Branded Polo Shirts",                                   unit: "Each",      price: 15.00,  table: 4  },
  { code: "4.3",  category: "Corporate & Protective Wear",    item: "Corporate Caps (Branded)",                              unit: "Each",      price: 8.00,   table: 4  },
  { code: "34.1", category: "General Non-Consultancy Services", item: "Graphic Design – Logo Design",                        unit: "Per job",   price: 120.00, table: 34 },
  { code: "34.2", category: "General Non-Consultancy Services", item: "Graphic Design – Company Profile",                    unit: "Per job",   price: 200.00, table: 34 },
  { code: "34.3", category: "General Non-Consultancy Services", item: "Graphic Design – Branding Package",                   unit: "Per job",   price: 350.00, table: 34 },
  { code: "34.4", category: "General Non-Consultancy Services", item: "Large Format Printing – Vinyl Banner (per sqm)",      unit: "Sqm",       price: 22.00,  table: 34 },
  { code: "34.5", category: "General Non-Consultancy Services", item: "Large Format Printing – X-Stand Banner",              unit: "Each",      price: 65.00,  table: 34 },
  { code: "34.6", category: "General Non-Consultancy Services", item: "Large Format Printing – Rollup Banner",               unit: "Each",      price: 95.00,  table: 34 },
  { code: "32.1", category: "Media Services",                 item: "Photography – Corporate Event",                        unit: "Per event", price: 250.00, table: 32 },
  { code: "32.2", category: "Media Services",                 item: "Videography – Corporate Event",                        unit: "Per event", price: 450.00, table: 32 },
  { code: "11.1", category: "ICT Solutions",                  item: "Website Design & Development",                         unit: "Per site",  price: 800.00, table: 11 },
  { code: "11.2", category: "ICT Solutions",                  item: "Website Hosting (Annual)",                             unit: "Per year",  price: 120.00, table: 11 },
];

// ─── PRAZ Checklist ───────────────────────────────────────────────────────────
const PRAZ_CHECKLIST = [
  { label: "Company Registration (CR14) — Reg No. 9845/2021",               defaultDone: true  },
  { label: "Tax Clearance Certificate — Valid to August 2026",               defaultDone: true  },
  { label: "CR14 Name Update (Tendekayi Kulture Mbire) — pending ID update", defaultDone: false },
  { label: "eGP System Account — system is live, complete registration",     defaultDone: false },
  { label: "Category Application — Graphic Design, Printing, Signage, Web",  defaultDone: false },
  { label: "PRAZ Registration Fee — US$130.00 via CBZ Bank",                 defaultDone: false },
  { label: "Key Pair Setup — for encrypted bid submissions",                  defaultDone: false },
  { label: "Company Profile PDF — ready for tender attachments",             defaultDone: true  },
  { label: "Branded Letterhead — available",                                  defaultDone: true  },
  { label: "ZIMSTAT-validated bank account details — needed for refunds",     defaultDone: false },
];

// ─── Document Checklist ───────────────────────────────────────────────────────
const DOC_CHECKLIST = [
  { key: "cr14",      label: "CR14"           },
  { key: "tax",       label: "Tax Clearance"  },
  { key: "profile",   label: "Company Profile"},
  { key: "letterhead",label: "Letterhead"     },
  { key: "quotation", label: "Quotation/BOQ"  },
  { key: "bid_form",  label: "Bid Form"       },
  { key: "bank",      label: "Bank Details"   },
];

const defaultDocs = () => Object.fromEntries(DOC_CHECKLIST.map(d => [d.key, false]));

// ─── Lists ────────────────────────────────────────────────────────────────────
const CATEGORIES = ["Graphic Design & Branding", "Printing & Signage", "Corporate Wear", "Web Development", "Events & Activation", "Other"];
const STATUSES   = ["Identified", "Bid Submitted", "Awaiting Result", "Won", "Lost", "No Bid"];
const SECTORS    = ["Government Ministry", "Parastatal", "NGO / UN Agency", "Private Sector", "Municipality / Council", "Statutory Body", "Other"];

const STATUS_COLORS = {
  "Identified":      { bg: "#1a2a1a", border: "#2d5a27", text: "#7ec86a", dot: "#7ec86a" },
  "Bid Submitted":   { bg: "#1a1f2a", border: "#27395a", text: "#6a9ee0", dot: "#6a9ee0" },
  "Awaiting Result": { bg: "#2a2010", border: "#5a4010", text: "#e0b44a", dot: "#e0b44a" },
  "Won":             { bg: "#0d2a1a", border: "#0d5a2a", text: "#3de898", dot: "#3de898" },
  "Lost":            { bg: "#2a0d0d", border: "#5a1414", text: "#e05a5a", dot: "#e05a5a" },
  "No Bid":          { bg: "#1a1a1a", border: "#333",    text: "#777",    dot: "#555"    },
};

const RADAR_CAT_MAP = {
  C4: "Graphic Design & Branding",
  C7: "Printing & Signage",
  C8: "Web Development",
  J2: "Printing & Signage",
  J3: "Corporate Wear",
};

const NSPL_CATEGORY_MAP = {
  "Graphic Design & Branding": ["General Non-Consultancy Services"],
  "Printing & Signage":        ["Printing Requirements", "General Non-Consultancy Services"],
  "Corporate Wear":            ["Corporate & Protective Wear"],
  "Web Development":           ["ICT Solutions"],
  "Events & Activation":       ["Media Services"],
  "Other":                     [],
};

// ─── Sample Data ──────────────────────────────────────────────────────────────
const SAMPLE_TENDERS = [
  {
    id: 1, tenderNo: "MOE/2026/BRAND/001", entity: "Ministry of Education",
    description: "Supply of branded stationery, letterheads and corporate gifts for national schools rollout",
    category: "Printing & Signage", value: 12500, currency: "USD", deadline: "2026-06-15",
    status: "Identified", notes: "Aligns with Facer's printing capability. Check NSPL Table 12.",
    added: "2026-05-20", source: "eGP Portal", contact: "", docs: defaultDocs(),
  },
  {
    id: 2, tenderNo: "ZIMRA/2026/005", entity: "ZIMRA",
    description: "Design and production of large format signage for 12 regional offices",
    category: "Graphic Design & Branding", value: 8000, currency: "USD", deadline: "2026-06-08",
    status: "Bid Submitted", notes: "Submitted full bid. Follow up with procurement officer.",
    added: "2026-05-10", source: "eGP Portal", contact: "",
    docs: { cr14: true, tax: true, profile: true, letterhead: true, quotation: true, bid_form: false, bank: false },
  },
];

const SAMPLE_COMPANIES = [
  { id: "c1", name: "Ministry of Education", sector: "Government Ministry", contact: "", email: "", phone: "", address: "Ambassador House, Sam Nujoma St, Harare", notes: "National schools procurement. Large budgets. Slow cycle.", added: "2026-05-20" },
  { id: "c2", name: "ZIMRA",                 sector: "Statutory Body",       contact: "", email: "", phone: "", address: "Kurima House, 89 Baker Ave, Harare",        notes: "12 regional offices. Regular signage needs.",       added: "2026-05-10" },
];

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    plus:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    edit:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    close:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    search:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    link:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    warning:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    send:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    building: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    user:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    mail:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    phone:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
    eye:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    chart:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    radar:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/><path d="M12 10a2 2 0 0 1 2 2"/><line x1="12" y1="12" x2="19.07" y2="4.93"/></svg>,
    import:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v10m0 0l-3-3m3 3l3-3"/><path d="M20 16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2"/></svg>,
  };
  return icons[name] || null;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
};

const fmt = (n) => n?.toLocaleString("en-US", { minimumFractionDigits: 0 });

const currencySymbol = (c) =>
  c === "USD" ? "$" : c === "EUR" ? "€" : c === "ZWG" ? "ZWG " : (c || "$");

const generateBidDocument = (tender, company) => {
  const today = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  const relevantCats = NSPL_CATEGORY_MAP[tender.category] || [];
  const nsplItems = NSPL_DATA.filter(n => relevantCats.includes(n.category));
  const boqRows = nsplItems.length > 0
    ? nsplItems.map(n =>
        `  ${n.code.padEnd(7)}${n.item.slice(0, 42).padEnd(43)}${n.unit.padEnd(13)}${currencySymbol("USD")}${fmt(n.price)}`
      ).join("\n")
    : "  [See attached detailed quotation for full BOQ]";

  return `FACER DESIGNS
Registration No: 9845/2021
Tax Clearance: Valid to August 2026
Email: info@facerdesigns.co.zw
Harare, Zimbabwe
${"─".repeat(60)}
${today}

The Procurement Officer
${tender.entity}${company?.address ? `\n${company.address}` : ""}

RE: BID SUBMISSION — TENDER ${tender.tenderNo}
    ${tender.description.toUpperCase()}

Dear Sir/Madam,

We, Facer Designs (Reg. No. 9845/2021), hereby submit our bid
for the above-referenced tender in accordance with all PRAZ
procurement requirements.

Facer Designs is a registered graphic design, printing, and
branding company based in Harare, Zimbabwe. We specialise in
${tender.category} and have the capacity to deliver quality
work within the specified timeframe.

BILL OF QUANTITIES (NSPL Reference — ${new Date().getFullYear()}):
${"─".repeat(60)}
  Code   Item                                       Unit         Price
${"─".repeat(60)}
${boqRows}
${"─".repeat(60)}

TOTAL BID VALUE : ${currencySymbol(tender.currency)}${fmt(tender.value)} (${tender.currency})
DEADLINE        : ${tender.deadline}
SOURCE          : ${tender.source}

ATTACHED DOCUMENTS:
  • CR14 — Company Registration (No. 9845/2021)
  • Tax Clearance Certificate (Valid: August 2026)
  • Company Profile
  • Branded Letterhead Samples
  • Detailed Bill of Quantities / Quotation

We confirm all information is accurate and that we meet all
PRAZ supplier requirements. We look forward to the opportunity
to serve ${tender.entity}.

Yours faithfully,

Tendekayi Kulture Mbire
Director — Facer Designs
info@facerdesigns.co.zw | Harare, Zimbabwe

BANKING DETAILS:
${"─".repeat(60)}
Bank          : CBZ Bank
Account Name  : R. Mbire
Account (FCA) : 0292134700035
Account (ZIG) : 02921347470015
Branch        : Borrowdale`;
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {

  // ── Persistent state ──────────────────────────────────────────────────────
  const [tenders, setTenders] = useState(() => {
    try { const s = localStorage.getItem("facer_tenders"); return s ? JSON.parse(s) : SAMPLE_TENDERS; }
    catch { return SAMPLE_TENDERS; }
  });
  const [companies, setCompanies] = useState(() => {
    try { const s = localStorage.getItem("facer_companies"); return s ? JSON.parse(s) : SAMPLE_COMPANIES; }
    catch { return SAMPLE_COMPANIES; }
  });
  const [prazChecked, setPrazChecked] = useState(() => {
    try { const s = localStorage.getItem("facer_praz"); return s ? JSON.parse(s) : PRAZ_CHECKLIST.map(i => i.defaultDone); }
    catch { return PRAZ_CHECKLIST.map(i => i.defaultDone); }
  });

  const [syncStatus,    setSyncStatus]    = useState("idle");
  const [uid,           setUid]           = useState(null);
  const [cloudReady,    setCloudReady]    = useState(false);
  const [radarTenders,  setRadarTenders]  = useState([]);
  const [radarFilter,   setRadarFilter]   = useState("All");
  const [radarSearch,   setRadarSearch]   = useState("");

  // ── localStorage (offline cache) ────────────────────────────────────────
  useEffect(() => { localStorage.setItem("facer_tenders",   JSON.stringify(tenders));    }, [tenders]);
  useEffect(() => { localStorage.setItem("facer_companies", JSON.stringify(companies));  }, [companies]);
  useEffect(() => { localStorage.setItem("facer_praz",      JSON.stringify(prazChecked));}, [prazChecked]);

  // ── Firebase cloud sync ──────────────────────────────────────────────────
  useEffect(() => {
    if (!firebaseReady) return;
    signInAnonymously(auth)
      .then(cred => { setUid(cred.user.uid); return getDoc(doc(db, "facer", cred.user.uid)); })
      .then(snap => {
        if (snap && snap.exists()) {
          const d = snap.data();
          if (d.tenders)   setTenders(d.tenders);
          if (d.companies) setCompanies(d.companies);
          if (d.praz)      setPrazChecked(d.praz);
        }
        setCloudReady(true);
      })
      .catch(() => setCloudReady(true));
  }, []);

  useEffect(() => {
    if (!uid || !cloudReady) return;
    setSyncStatus("syncing");
    setDoc(doc(db, "facer", uid), { tenders, companies, praz: prazChecked })
      .then(() => setSyncStatus("synced"))
      .catch(() => setSyncStatus("error"));
  }, [tenders, companies, prazChecked, uid, cloudReady]);

  // ── Deadline notifications ───────────────────────────────────────────────
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission();
    if (Notification.permission !== "granted") return;
    const today = new Date().toISOString().slice(0, 10);
    const seen  = JSON.parse(localStorage.getItem("facer_notified") || "{}");
    tenders
      .filter(t => { const d = daysUntil(t.deadline); return d !== null && d >= 0 && d <= 7 && ["Identified","Bid Submitted"].includes(t.status); })
      .forEach(t => {
        const key = `${t.id}_${today}`;
        if (seen[key]) return;
        const d = daysUntil(t.deadline);
        new Notification(`Deadline: ${t.entity}`, {
          body: `${t.tenderNo} — ${d === 0 ? "TODAY" : `${d} day${d > 1 ? "s" : ""} left`}`,
          icon: "/icon-192.png",
        });
        seen[key] = true;
      });
    localStorage.setItem("facer_notified", JSON.stringify(seen));
  }, [tenders]);

  // ── Radar: listen to Firestore radar_tenders collection ─────────────────
  useEffect(() => {
    if (!firebaseReady || !db) return;
    const q  = query(collection(db, "radar_tenders"), orderBy("score", "desc"));
    const unsub = onSnapshot(q, snap => {
      setRadarTenders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, []);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [tab,            setTab]            = useState("tracker");
  const [showForm,       setShowForm]       = useState(false);
  const [editTender,     setEditTender]     = useState(null);
  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState("All");
  const [filterSource,   setFilterSource]   = useState("All");
  const [nsplSearch,     setNsplSearch]     = useState("");
  const [showBidModal,   setShowBidModal]   = useState(false);
  const [bidTender,      setBidTender]      = useState(null);
  const [showCoForm,     setShowCoForm]     = useState(false);
  const [editCompany,    setEditCompany]    = useState(null);
  const [clientSearch,   setClientSearch]   = useState("");
  const [clientSort,     setClientSort]     = useState("bids");
  const [expandedClient, setExpandedClient] = useState(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const BLANK_TENDER = { tenderNo: "", entity: "", description: "", category: CATEGORIES[0], value: "", currency: "USD", deadline: "", status: STATUSES[0], notes: "", source: "eGP Portal", contact: "" };
  const BLANK_CO     = { name: "", sector: SECTORS[0], contact: "", email: "", phone: "", address: "", notes: "" };
  const [form,   setForm]   = useState(BLANK_TENDER);
  const [coForm, setCoForm] = useState(BLANK_CO);

  // ── Derived values ────────────────────────────────────────────────────────
  const total      = tenders.length;
  const won        = tenders.filter(t => t.status === "Won").length;
  const active     = tenders.filter(t => ["Identified", "Bid Submitted", "Awaiting Result"].includes(t.status)).length;
  const totalValue = tenders.reduce((s, t) => s + (t.value ? Number(t.value) : 0), 0);
  const wonValue   = tenders.filter(t => t.status === "Won").reduce((s, t) => s + (t.value ? Number(t.value) : 0), 0);
  const urgentCount = tenders.filter(t => { const d = daysUntil(t.deadline); return d !== null && d <= 7 && d >= 0 && t.status === "Identified"; }).length;
  const decided    = tenders.filter(t => ["Won", "Lost"].includes(t.status));
  const winRate    = decided.length > 0 ? Math.round((won / decided.length) * 100) : 0;
  const prazDone   = prazChecked.filter(Boolean).length;
  const allSources = ["All", ...Array.from(new Set(tenders.map(t => t.source).filter(Boolean)))];

  // ── Company stats ─────────────────────────────────────────────────────────
  const getCoStats = (name) => {
    const rows  = tenders.filter(t => t.entity?.toLowerCase() === name?.toLowerCase());
    const coWon = rows.filter(t => t.status === "Won").length;
    const coLost= rows.filter(t => t.status === "Lost").length;
    const dec   = coWon + coLost;
    return {
      totalBids:     rows.length,
      submitted:     rows.filter(t => ["Bid Submitted","Awaiting Result","Won","Lost"].includes(t.status)).length,
      won:           coWon,
      lost:          coLost,
      winRate:       dec > 0 ? Math.round((coWon / dec) * 100) : null,
      pipelineValue: rows.reduce((s, t) => s + (t.value ? Number(t.value) : 0), 0),
      wonValue:      rows.filter(t => t.status === "Won").reduce((s, t) => s + (t.value ? Number(t.value) : 0), 0),
      lastActivity:  rows.sort((a, b) => new Date(b.added) - new Date(a.added))[0]?.added || null,
      tenders:       rows,
    };
  };

  // ── Tender handlers ───────────────────────────────────────────────────────
  const openAdd  = (prefill) => {
    const safe = prefill && !(prefill instanceof Event) ? prefill : {};
    setForm({ ...BLANK_TENDER, ...safe });
    setEditTender(null);
    setShowForm(true);
  };
  const openEdit = (t) => { setForm({ ...t }); setEditTender(t.id); setShowForm(true); };

  const saveForm = () => {
    if (!form.tenderNo || !form.entity || !form.description) return;
    if (editTender) {
      setTenders(ts => ts.map(t => t.id === editTender ? { ...t, ...form } : t));
    } else {
      setTenders(ts => [...ts, { ...form, id: Date.now(), added: new Date().toISOString().slice(0, 10), docs: defaultDocs() }]);
    }
    if (form.entity && !companies.find(c => c.name.toLowerCase() === form.entity.toLowerCase())) {
      setCompanies(cs => [...cs, { id: `c${Date.now()}`, name: form.entity, sector: "Other", contact: form.contact || "", email: "", phone: "", address: "", notes: "", added: new Date().toISOString().slice(0, 10) }]);
    }
    setShowForm(false);
  };

  const deleteTender = (id) => setTenders(ts => ts.filter(t => t.id !== id));
  const toggleDoc    = (id, key) => setTenders(ts => ts.map(t => t.id === id ? { ...t, docs: { ...t.docs, [key]: !t.docs?.[key] } } : t));

  const exportCSV = () => {
    const cols = ["tenderNo","entity","description","category","value","currency","deadline","status","source","contact","notes","added"];
    const csv  = [cols.join(","), ...tenders.map(t => cols.map(c => `"${String(t[c] ?? "").replace(/"/g,'""')}"`).join(","))].join("\n");
    const a    = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: `facer-tenders-${new Date().toISOString().slice(0,10)}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  };

  // ── Bid handlers ──────────────────────────────────────────────────────────
  const openBidModal = (t) => { setBidTender(t); setShowBidModal(true); };

  const downloadBidPDF = (tender) => {
    const co      = companies.find(c => c.name.toLowerCase() === tender.entity?.toLowerCase());
    const content = generateBidDocument(tender, co).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>Bid — ${tender.tenderNo}</title>
      <style>body{font-family:'Courier New',monospace;max-width:780px;margin:40px auto;color:#111;line-height:1.65;font-size:12.5px;}
      pre{white-space:pre-wrap;font-family:inherit;}@media print{@page{margin:20mm;}}</style></head>
      <body><pre>${content}</pre><script>window.onload=function(){window.print();}<\/script></body></html>`);
    w.document.close();
  };

  const sendViaGmail = (tender) => {
    const co = companies.find(c => c.name.toLowerCase() === tender.entity?.toLowerCase());
    const subject = encodeURIComponent(`BID SUBMISSION — ${tender.tenderNo}: ${tender.description}`);
    const body    = encodeURIComponent(generateBidDocument(tender, co));
    const to      = encodeURIComponent(co?.email || "");
    window.open(`https://mail.google.com/mail/?view=cm&to=${to}&su=${subject}&body=${body}`, "_blank");
  };

  // ── Company handlers ──────────────────────────────────────────────────────
  const openAddCo  = () => { setCoForm(BLANK_CO); setEditCompany(null); setShowCoForm(true); };
  const openEditCo = (c) => { setCoForm({ ...c }); setEditCompany(c.id); setShowCoForm(true); };

  const saveCoForm = () => {
    if (!coForm.name) return;
    if (editCompany) {
      setCompanies(cs => cs.map(c => c.id === editCompany ? { ...c, ...coForm } : c));
    } else {
      setCompanies(cs => [...cs, { ...coForm, id: `c${Date.now()}`, added: new Date().toISOString().slice(0, 10) }]);
    }
    setShowCoForm(false);
  };

  const deleteCo = (id) => setCompanies(cs => cs.filter(c => c.id !== id));

  // ── Filtered lists ────────────────────────────────────────────────────────
  const filtered = tenders.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search || [t.tenderNo, t.entity, t.description, t.category].join(" ").toLowerCase().includes(q);
    return matchSearch && (filterStatus === "All" || t.status === filterStatus) && (filterSource === "All" || t.source === filterSource);
  });

  const sortedCompanies = companies
    .filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.sector?.toLowerCase().includes(clientSearch.toLowerCase()))
    .map(c => ({ ...c, stats: getCoStats(c.name) }))
    .sort((a, b) => {
      if (clientSort === "bids")    return b.stats.totalBids     - a.stats.totalBids;
      if (clientSort === "wins")    return b.stats.won           - a.stats.won;
      if (clientSort === "winrate") return (b.stats.winRate ?? -1) - (a.stats.winRate ?? -1);
      if (clientSort === "value")   return b.stats.pipelineValue - a.stats.pipelineValue;
      return 0;
    });

  const nsplFiltered = NSPL_DATA.filter(n => !nsplSearch || [n.item, n.category].join(" ").toLowerCase().includes(nsplSearch.toLowerCase()));

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Mono','Courier New',monospace", background: "#0a0f0a", minHeight: "100vh", color: "#ccd5cc" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:#0f140f;}::-webkit-scrollbar-thumb{background:#2d5a27;border-radius:3px;}
        input,select,textarea{background:#0f1a0f!important;color:#ccd5cc!important;border:1px solid #2a3d2a!important;border-radius:4px;padding:8px 10px;font-family:inherit;font-size:13px;width:100%;outline:none;}
        input:focus,select:focus,textarea:focus{border-color:#4a9a3a!important;}
        select option{background:#0f1a0f;}
        button{cursor:pointer;font-family:inherit;}
        .tab-btn{background:none;border:none;padding:10px 18px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#4a6a4a;border-bottom:2px solid transparent;transition:all 0.2s;white-space:nowrap;}
        .tab-btn.active{color:#7ec86a;border-color:#4a9a3a;}
        .tab-btn:hover:not(.active){color:#8aad8a;}
        .card{background:#0f140f;border:1px solid #1e2e1e;border-radius:6px;padding:16px;transition:border-color 0.2s;}
        .card:hover{border-color:#2d5a27;}
        .btn-primary{background:#2d5a27;color:#ccd5cc;border:1px solid #3d7a35;border-radius:4px;padding:8px 16px;font-size:12px;letter-spacing:1px;text-transform:uppercase;display:inline-flex;align-items:center;gap:6px;transition:background 0.2s;}
        .btn-primary:hover{background:#3d7a35;}
        .btn-send{background:#1a2a3a;color:#6a9ee0;border:1px solid #27395a;border-radius:4px;padding:6px 12px;font-size:11px;letter-spacing:1px;text-transform:uppercase;display:inline-flex;align-items:center;gap:5px;transition:all 0.2s;}
        .btn-send:hover{background:#27395a;color:#9abce0;}
        .btn-ghost{background:none;color:#4a6a4a;border:1px solid #2a3d2a;border-radius:4px;padding:6px 10px;font-size:11px;display:inline-flex;align-items:center;gap:4px;transition:all 0.2s;}
        .btn-ghost:hover{color:#7ec86a;border-color:#4a9a3a;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;}
        .modal{background:#0f140f;border:1px solid #2d5a27;border-radius:8px;padding:24px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;}
        .modal-wide{max-width:720px;}
        .stat-val{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:1px;color:#7ec86a;line-height:1;}
        .stat-label{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#4a6a4a;margin-top:4px;}
        .stat-sub{font-size:10px;color:#2d5a27;margin-top:2px;}
        .nspl-row:hover{background:#111811;}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .sec-title{font-size:9px;letter-spacing:3px;color:#2d5a27;text-transform:uppercase;margin:4px 0 10px;}
        .sec-divider{border-top:1px solid #1e2e1e;margin:6px 0;}
        .doc-pill{font-size:10px;padding:2px 8px;border-radius:2px;border:1px solid;cursor:pointer;font-family:inherit;transition:all 0.15s;letter-spacing:0.5px;}
        .win-bar-bg{background:#0a0f0a;height:4px;border-radius:2px;overflow:hidden;margin-top:4px;}
        .chk-row{display:flex;gap:10px;align-items:center;padding:7px 4px;cursor:pointer;border-radius:3px;transition:background 0.1s;}
        .chk-row:hover{background:#111811;}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}
        .pulse{animation:pulse 1.5s infinite;}
        @media(max-width:600px){.grid2{grid-template-columns:1fr;}.tab-btn{padding:8px 10px;font-size:10px;letter-spacing:1px;}.stat-val{font-size:24px;}}
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: "#0a0f0a", borderBottom: "1px solid #1e2e1e", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 4, color: "#7ec86a" }}>FACER DESIGNS</div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#4a6a4a", textTransform: "uppercase", marginTop: 2 }}>PRAZ Tender Tracker · eGP System</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {urgentCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#2a0d0d", border: "1px solid #5a1414", borderRadius: 4, padding: "6px 10px", fontSize: 11, color: "#e05a5a" }}>
              <Icon name="warning" size={13} /> {urgentCount} deadline{urgentCount > 1 ? "s" : ""} within 7 days
            </div>
          )}
          {firebaseReady && syncStatus !== "idle" && (
            <div style={{ fontSize: 10, letterSpacing: 1, color: syncStatus === "synced" ? "#3a9a2a" : syncStatus === "error" ? "#e05a5a" : "#4a6a4a" }}>
              {syncStatus === "syncing" ? "syncing…" : syncStatus === "synced" ? "● synced" : "● sync error"}
            </div>
          )}
          <a href="https://egp.praz.org.zw" target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#0f1a0f", border: "1px solid #2a3d2a", borderRadius: 4, padding: "6px 12px", fontSize: 11, color: "#6aad5a", textDecoration: "none", letterSpacing: 1 }}>
            <Icon name="link" size={12} /> eGP Portal
          </a>
        </div>
      </div>

      {/* PRAZ progress bar */}
      <div style={{ height: 3, background: "#0f140f" }}>
        <div style={{ width: `${(prazDone / PRAZ_CHECKLIST.length) * 100}%`, height: "100%", background: "#3d7a35", transition: "width 0.4s" }} />
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: "1px solid #1e2e1e", padding: "0 24px", display: "flex", overflowX: "auto" }}>
        {[["tracker","Tender Tracker"],["radar","Radar"],["clients","Clients"],["nspl","NSPL Prices"],["stats","Pipeline Stats"]].map(([key, label]) => (
          <button key={key} className={`tab-btn ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ══════════════════════ TRACKER TAB ══════════════════════ */}
        {tab === "tracker" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { val: total,            label: "Total Tenders"  },
                { val: active,           label: "Active Bids"    },
                { val: won,              label: "Tenders Won"    },
                { val: `$${fmt(totalValue)}`, label: "Pipeline Value" },
                { val: `$${fmt(wonValue)}`,   label: "Won Value"      },
              ].map(({ val, label }) => (
                <div key={label} className="card" style={{ textAlign: "center" }}>
                  <div className="stat-val">{val}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#4a6a4a" }}><Icon name="search" size={14} /></span>
                <input placeholder="Search tenders…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: "auto", minWidth: 130 }}>
                <option value="All">All Statuses</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ width: "auto", minWidth: 130 }}>
                {allSources.map(s => <option key={s}>{s}</option>)}
              </select>
              <button className="btn-primary" onClick={openAdd}><Icon name="plus" size={14} /> Add Tender</button>
              <button className="btn-ghost" onClick={exportCSV}><Icon name="download" size={13} /> CSV</button>
            </div>

            {/* Tender Cards */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#2d5a27" }}>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>No tenders found</div>
                <div style={{ fontSize: 11, color: "#1e3a1e", marginTop: 8 }}>Add your first tender or adjust filters</div>
              </div>
            ) : filtered.map(t => {
              const days      = daysUntil(t.deadline);
              const sc        = STATUS_COLORS[t.status] || STATUS_COLORS["Identified"];
              const isUrgent  = days !== null && days >= 0 && days <= 3;
              const isSoon    = days !== null && days >  3 && days <= 7;
              const dClass    = !days ? "" : days < 0 ? "deadline-urgent" : isUrgent ? "deadline-urgent" : isSoon ? "deadline-soon" : "";
              const docsDone  = t.docs ? Object.values(t.docs).filter(Boolean).length : 0;
              const co        = companies.find(c => c.name.toLowerCase() === t.entity?.toLowerCase());

              return (
                <div key={t.id} className="card" style={{ marginBottom: 10, borderLeft: isUrgent ? "3px solid #e05a5a" : isSoon ? "3px solid #e0b44a" : "1px solid #1e2e1e" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      {/* Badges */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "#4a7a3a", letterSpacing: 1 }}>{t.tenderNo}</span>
                        <span style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, fontSize: 10, letterSpacing: 1, padding: "2px 8px", borderRadius: 2, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span className={isUrgent ? "pulse" : ""} style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot, display: "inline-block" }} />
                          {t.status}
                        </span>
                        <span style={{ fontSize: 10, color: "#3a5a3a", background: "#111811", border: "1px solid #1e2e1e", padding: "2px 6px", borderRadius: 2 }}>{t.category}</span>
                        <span style={{ fontSize: 10, color: "#5a7a9a", background: "#0f1520", border: "1px solid #1a2a3a", padding: "2px 6px", borderRadius: 2 }}>{t.source}</span>
                      </div>
                      <div style={{ fontSize: 14, color: "#ccd5cc", marginBottom: 2, fontWeight: 500 }}>{t.entity}</div>
                      <div style={{ fontSize: 12, color: "#6a8a6a", lineHeight: 1.5, marginBottom: 4 }}>{t.description}</div>
                      {t.contact && <div style={{ fontSize: 11, color: "#4a6a7a", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}><Icon name="user" size={10} /> {t.contact}</div>}
                      {t.notes   && <div style={{ fontSize: 11, color: "#4a6a4a", borderLeft: "2px solid #2d5a27", paddingLeft: 8, fontStyle: "italic", marginBottom: 6 }}>{t.notes}</div>}

                      {/* Doc pills */}
                      {t.status !== "No Bid" && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: "#2d4a2d", marginRight: 2 }}>{docsDone}/{DOC_CHECKLIST.length}</span>
                          {DOC_CHECKLIST.map(d => (
                            <button key={d.key} className="doc-pill" onClick={() => toggleDoc(t.id, d.key)}
                              style={{ borderColor: t.docs?.[d.key] ? "#2d7a27" : "#2a3d2a", background: t.docs?.[d.key] ? "#1a3a14" : "transparent", color: t.docs?.[d.key] ? "#7ec86a" : "#4a6a4a" }}>
                              {t.docs?.[d.key] ? "✓ " : ""}{d.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right column */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 110 }}>
                      {t.value && (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: "#7ec86a", letterSpacing: 1 }}>{currencySymbol(t.currency)}{fmt(t.value)}</div>
                          <div style={{ fontSize: 9, color: "#3a5a3a", letterSpacing: 1 }}>{t.currency}</div>
                        </div>
                      )}
                      {t.deadline && (
                        <div style={{ textAlign: "right" }}>
                          <div className={dClass} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", color: dClass ? undefined : "#4a6a4a" }}>
                            <Icon name="calendar" size={11} /> {t.deadline}
                          </div>
                          {days !== null && (
                            <div style={{ fontSize: 10, color: days < 0 ? "#e05a5a" : days <= 7 ? "#e0b44a" : "#3a5a3a" }}>
                              {days < 0 ? "CLOSED" : days === 0 ? "TODAY" : `${days}d left`}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {t.status !== "No Bid" && (
                          <button className="btn-send" onClick={() => openBidModal(t)}><Icon name="send" size={11} /> Send Bid</button>
                        )}
                        <button className="btn-ghost" onClick={() => openEdit(t)}><Icon name="edit" size={12} /></button>
                        <button className="btn-ghost" style={{ color: "#6a3a3a", borderColor: "#3a1a1a" }} onClick={() => deleteTender(t.id)}><Icon name="trash" size={12} /></button>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 10, color: "#2d4a2d" }}>
                    <span>Added: {t.added}</span>
                    {co && <span style={{ color: "#2d4a5a" }}><Icon name="building" size={10} /> Client on file</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════ RADAR TAB ══════════════════════ */}
        {tab === "radar" && (() => {
          const CAT_FILTERS = ["All","C4","C7","C8","J2","J3"];

          const filtered = radarTenders.filter(t => {
            const matchCat = radarFilter === "All" || t.category === radarFilter;
            const q = radarSearch.toLowerCase();
            const matchQ  = !q || [t.title, t.entity, t.category, t.description].join(" ").toLowerCase().includes(q);
            return matchCat && matchQ;
          });

          const highCount = radarTenders.filter(t => t.score >= 70).length;
          const lastScan  = radarTenders.length > 0
            ? new Date(radarTenders[0].scraped_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })
            : null;

          const scoreColor = (s) => s >= 70 ? "#3de898" : s >= 50 ? "#e0b44a" : "#6a6a6a";

          const importTender = (rt) => {
            openAdd({
              tenderNo:    rt.description?.match(/Ref:\s*(\S+)/)?.[1] || "",
              entity:      rt.entity || "",
              description: rt.title  || "",
              deadline:    rt.deadline || "",
              source:      rt.source === "PRAZ" ? "eGP Portal" : rt.source || "",
              category:    RADAR_CAT_MAP[rt.category] || "Other",
              notes:       `Score ${rt.score}/100 — ${rt.description || ""}`,
            });
          };

          return (
            <div>
              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 20 }}>
                {[
                  { val: radarTenders.length, label: "Tenders Scanned" },
                  { val: highCount,            label: "Strong Matches (70+)" },
                  { val: filtered.length,      label: "Showing" },
                ].map(({ val, label }) => (
                  <div key={label} className="card" style={{ textAlign: "center" }}>
                    <div className="stat-val">{val}</div>
                    <div className="stat-label">{label}</div>
                  </div>
                ))}
                {lastScan && (
                  <div className="card" style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#5a9a4a", marginTop: 6 }}>{lastScan}</div>
                    <div className="stat-label">Last Scan</div>
                  </div>
                )}
              </div>

              {radarTenders.length === 0 ? (
                <div style={{ background: "#0f140f", border: "1px solid #2d5a27", borderRadius: 6, padding: "32px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, color: "#4a7a3a", marginBottom: 12 }}><Icon name="radar" size={32} /></div>
                  <div style={{ fontSize: 13, color: "#7ec86a", letterSpacing: 1, marginBottom: 8 }}>No radar data yet</div>
                  <div style={{ fontSize: 11, color: "#4a6a4a", lineHeight: 1.8 }}>
                    Run the scraper to populate this feed:<br />
                    <code style={{ background: "#111", padding: "2px 8px", borderRadius: 3, color: "#9ac87a", fontSize: 11 }}>
                      cd tender-tracker/radar && python run.py scrape --pages 3
                    </code>
                    <br />
                    Then sync to Firestore:<br />
                    <code style={{ background: "#111", padding: "2px 8px", borderRadius: 3, color: "#9ac87a", fontSize: 11 }}>
                      python run.py sync
                    </code>
                  </div>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                      <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#4a6a4a" }}><Icon name="search" size={14} /></span>
                      <input placeholder="Search radar…" value={radarSearch} onChange={e => setRadarSearch(e.target.value)} style={{ paddingLeft: 32 }} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {CAT_FILTERS.map(f => (
                        <button key={f} onClick={() => setRadarFilter(f)}
                          style={{ background: radarFilter === f ? "#2d5a27" : "transparent", border: `1px solid ${radarFilter === f ? "#4a9a3a" : "#2a3d2a"}`, color: radarFilter === f ? "#ccd5cc" : "#4a6a4a", borderRadius: 4, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1 }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tender cards */}
                  {filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#2d5a27", fontSize: 11, letterSpacing: 2 }}>No matches for current filter</div>
                  ) : filtered.map(t => {
                    const days = t.deadline ? Math.ceil((new Date(t.deadline) - new Date()) / 86400000) : null;
                    const isUrgent = days !== null && days >= 0 && days <= 3;
                    const isSoon   = days !== null && days >  3 && days <= 7;

                    return (
                      <div key={t.id} className="card" style={{ marginBottom: 10, borderLeft: isUrgent ? "3px solid #e05a5a" : isSoon ? "3px solid #e0b44a" : t.score >= 70 ? "3px solid #3de898" : "1px solid #1e2e1e" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            {/* Badges */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: scoreColor(t.score), letterSpacing: 1, minWidth: 42 }}>{t.score}<span style={{ fontSize: 10, color: "#3a5a3a" }}>/100</span></span>
                              {t.category && (
                                <span style={{ fontSize: 10, background: "#0f1a0f", border: "1px solid #2a4a2a", color: "#7ec86a", padding: "2px 7px", borderRadius: 2, letterSpacing: 1 }}>{t.category}</span>
                              )}
                              <span style={{ fontSize: 10, background: "#0f1520", border: "1px solid #1a2a3a", color: "#5a7a9a", padding: "2px 7px", borderRadius: 2 }}>{t.source}</span>
                              {t.score >= 70 && <span style={{ fontSize: 10, color: "#3de898", letterSpacing: 1 }}>STRONG MATCH</span>}
                            </div>

                            <div style={{ fontSize: 14, color: "#ccd5cc", marginBottom: 2 }}>{t.entity}</div>
                            <div style={{ fontSize: 12, color: "#6a8a6a", lineHeight: 1.5, marginBottom: 4 }}>{t.title}</div>
                            {t.description && (
                              <div style={{ fontSize: 11, color: "#3a5a3a", marginBottom: 4, fontStyle: "italic" }}>{t.description}</div>
                            )}
                          </div>

                          {/* Right col */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 120 }}>
                            {t.deadline && (
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 12, color: isUrgent ? "#e05a5a" : isSoon ? "#e0b44a" : "#4a6a4a", display: "flex", alignItems: "center", gap: 4 }}>
                                  <Icon name="calendar" size={11} /> {t.deadline}
                                </div>
                                {days !== null && (
                                  <div style={{ fontSize: 10, color: days < 0 ? "#e05a5a" : days <= 7 ? "#e0b44a" : "#3a5a3a" }}>
                                    {days < 0 ? "CLOSED" : days === 0 ? "TODAY" : `${days}d left`}
                                  </div>
                                )}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                              <a href={t.source_url} target="_blank" rel="noopener noreferrer"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "1px solid #2a3d2a", color: "#4a6a4a", borderRadius: 4, padding: "5px 9px", fontSize: 11, textDecoration: "none", cursor: "pointer", fontFamily: "inherit" }}>
                                <Icon name="link" size={11} /> View
                              </a>
                              <button className="btn-primary" style={{ padding: "5px 10px", fontSize: 11 }} onClick={() => importTender(t)}>
                                <Icon name="import" size={12} /> Import
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })()}

        {/* ══════════════════════ CLIENTS TAB ══════════════════════ */}
        {tab === "clients" && (() => {
          const withWins   = companies.filter(c => getCoStats(c.name).won > 0);
          const mostActive = [...companies].sort((a, b) => getCoStats(b.name).totalBids - getCoStats(a.name).totalBids)[0];
          const bestWR     = [...companies].filter(c => getCoStats(c.name).winRate !== null).sort((a, b) => (getCoStats(b.name).winRate ?? 0) - (getCoStats(a.name).winRate ?? 0))[0];
          return (
            <div>
              {/* Top stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="stat-val">{companies.length}</div>
                  <div className="stat-label">Total Clients</div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="stat-val">{withWins.length}</div>
                  <div className="stat-label">Clients We've Won</div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="stat-val" style={{ fontSize: 18, paddingTop: 4 }}>{mostActive ? mostActive.name.split(" ").slice(0, 2).join(" ") : "—"}</div>
                  <div className="stat-label">Most Bids Sent To</div>
                  {mostActive && <div className="stat-sub">{getCoStats(mostActive.name).totalBids} bids</div>}
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="stat-val" style={{ fontSize: 18, paddingTop: 4 }}>{bestWR ? bestWR.name.split(" ").slice(0, 2).join(" ") : "—"}</div>
                  <div className="stat-label">Best Win Rate</div>
                  {bestWR && <div className="stat-sub">{getCoStats(bestWR.name).winRate}%</div>}
                </div>
              </div>

              {/* Toolbar */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#4a6a4a" }}><Icon name="search" size={14} /></span>
                  <input placeholder="Search clients…" value={clientSearch} onChange={e => setClientSearch(e.target.value)} style={{ paddingLeft: 32 }} />
                </div>
                <select value={clientSort} onChange={e => setClientSort(e.target.value)} style={{ width: "auto", minWidth: 160 }}>
                  <option value="bids">Sort: Most Bids</option>
                  <option value="wins">Sort: Most Wins</option>
                  <option value="winrate">Sort: Best Win Rate</option>
                  <option value="value">Sort: Highest Value</option>
                </select>
                <button className="btn-primary" onClick={openAddCo}><Icon name="plus" size={14} /> Add Client</button>
              </div>

              {sortedCompanies.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#2d5a27" }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>No clients yet</div>
                  <div style={{ fontSize: 11, color: "#1e3a1e", marginTop: 8 }}>Clients are auto-created when you add a tender</div>
                </div>
              ) : sortedCompanies.map(c => {
                const s = c.stats;
                const isExpanded = expandedClient === c.id;
                return (
                  <div key={c.id} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, color: "#ccd5cc", fontWeight: 500 }}>{c.name}</span>
                          <span style={{ fontSize: 10, color: "#5a7a5a", background: "#111811", border: "1px solid #1e2e1e", padding: "2px 6px", borderRadius: 2 }}>{c.sector}</span>
                        </div>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
                          {c.contact && <span style={{ fontSize: 11, color: "#5a7a6a", display: "flex", alignItems: "center", gap: 4 }}><Icon name="user"  size={10} /> {c.contact}</span>}
                          {c.email   && <span style={{ fontSize: 11, color: "#5a7a6a", display: "flex", alignItems: "center", gap: 4 }}><Icon name="mail"  size={10} /> {c.email}</span>}
                          {c.phone   && <span style={{ fontSize: 11, color: "#5a7a6a", display: "flex", alignItems: "center", gap: 4 }}><Icon name="phone" size={10} /> {c.phone}</span>}
                        </div>

                        {/* Stats row */}
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 6 }}>
                          {[
                            { val: s.totalBids,     label: "Total Bids",   color: "#7ec86a" },
                            { val: s.submitted,     label: "Submitted",    color: "#6a9ee0" },
                            { val: s.won,           label: "Won",          color: "#3de898" },
                            { val: s.lost,          label: "Lost",         color: "#e05a5a" },
                          ].map(({ val, label, color }) => (
                            <div key={label}>
                              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color, letterSpacing: 1 }}>{val}</div>
                              <div style={{ fontSize: 9, letterSpacing: 1, color: "#3a5a3a", textTransform: "uppercase" }}>{label}</div>
                            </div>
                          ))}
                          <div>
                            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, color: s.winRate === null ? "#333" : s.winRate >= 50 ? "#3de898" : "#e0b44a" }}>
                              {s.winRate !== null ? `${s.winRate}%` : "—"}
                            </div>
                            <div style={{ fontSize: 9, letterSpacing: 1, color: "#3a5a3a", textTransform: "uppercase" }}>Win Rate</div>
                            {s.winRate !== null && (
                              <div className="win-bar-bg" style={{ width: 60 }}>
                                <div style={{ width: `${s.winRate}%`, height: "100%", background: s.winRate >= 50 ? "#3de898" : "#e0b44a", borderRadius: 2 }} />
                              </div>
                            )}
                          </div>
                          {s.pipelineValue > 0 && (
                            <div>
                              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: "#7ec86a", letterSpacing: 1 }}>${fmt(s.pipelineValue)}</div>
                              <div style={{ fontSize: 9, letterSpacing: 1, color: "#3a5a3a", textTransform: "uppercase" }}>Pipeline</div>
                            </div>
                          )}
                          {s.wonValue > 0 && (
                            <div>
                              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: "#3de898", letterSpacing: 1 }}>${fmt(s.wonValue)}</div>
                              <div style={{ fontSize: 9, letterSpacing: 1, color: "#3a5a3a", textTransform: "uppercase" }}>Won Value</div>
                            </div>
                          )}
                        </div>

                        {c.notes && <div style={{ fontSize: 11, color: "#4a6a4a", fontStyle: "italic", borderLeft: "2px solid #1e3a1e", paddingLeft: 8 }}>{c.notes}</div>}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        {s.lastActivity && <div style={{ fontSize: 10, color: "#2d4a2d" }}>Last: {s.lastActivity}</div>}
                        <div style={{ display: "flex", gap: 5 }}>
                          <button className="btn-ghost" style={{ fontSize: 10 }} onClick={() => setExpandedClient(isExpanded ? null : c.id)}>
                            <Icon name="eye" size={12} /> {isExpanded ? "Hide" : "History"}
                          </button>
                          <button className="btn-ghost" onClick={() => openEditCo(c)}><Icon name="edit" size={12} /></button>
                          <button className="btn-ghost" style={{ color: "#6a3a3a", borderColor: "#3a1a1a" }} onClick={() => deleteCo(c.id)}><Icon name="trash" size={12} /></button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded tender history */}
                    {isExpanded && (
                      <div style={{ marginTop: 12, borderTop: "1px solid #1e2e1e", paddingTop: 12 }}>
                        <div className="sec-title">Tender History ({s.tenders.length})</div>
                        {s.tenders.length === 0 ? (
                          <div style={{ fontSize: 11, color: "#2d4a2d" }}>No tenders linked yet</div>
                        ) : s.tenders.map(t => {
                          const sc = STATUS_COLORS[t.status] || STATUS_COLORS["Identified"];
                          return (
                            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #111811", flexWrap: "wrap", gap: 8 }}>
                              <div>
                                <span style={{ fontSize: 10, color: "#4a7a3a", marginRight: 8 }}>{t.tenderNo}</span>
                                <span style={{ fontSize: 12, color: "#8a9a8a" }}>{t.description.length > 55 ? t.description.slice(0, 55) + "…" : t.description}</span>
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {t.value && <span style={{ fontSize: 13, color: "#5a9a4a", fontFamily: "'Bebas Neue',sans-serif" }}>{currencySymbol(t.currency)}{fmt(t.value)}</span>}
                                <span style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, fontSize: 10, padding: "2px 6px", borderRadius: 2 }}>{t.status}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ══════════════════════ NSPL TAB ══════════════════════ */}
        {tab === "nspl" && (
          <div>
            <div style={{ background: "#0f1a0f", border: "1px solid #1e3a1e", borderRadius: 6, padding: "14px 16px", marginBottom: 16, display: "flex", gap: 10 }}>
              <span style={{ color: "#e0b44a", marginTop: 1, flexShrink: 0 }}><Icon name="warning" size={14} /></span>
              <div style={{ fontSize: 12, color: "#6a8a5a", lineHeight: 1.6 }}>
                <strong style={{ color: "#a0c87a" }}>PRAZ NSPL — January 2026.</strong> All prices in USD. Bids must fall within <strong>±10%</strong> of these reference prices. Tables 12 and 34 (highlighted) are most relevant to Facer Designs.
              </div>
            </div>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#4a6a4a" }}><Icon name="search" size={14} /></span>
              <input placeholder="Search NSPL items…" value={nsplSearch} onChange={e => setNsplSearch(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>
            <div style={{ background: "#0a0f0a", border: "1px solid #1e2e1e", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 80px 90px", background: "#0f140f", borderBottom: "1px solid #1e2e1e", padding: "8px 14px", fontSize: 10, letterSpacing: 2, color: "#3a5a3a", textTransform: "uppercase" }}>
                <span>Code</span><span>Category</span><span>Item</span><span>Unit</span><span style={{ textAlign: "right" }}>USD Price</span>
              </div>
              {nsplFiltered.map((n, i) => (
                <div key={i} className="nspl-row" style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 80px 90px", padding: "9px 14px", borderBottom: "1px solid #111811", fontSize: 12, alignItems: "center", gap: 8, borderLeft: [12, 34].includes(n.table) ? "2px solid #2d5a27" : "2px solid transparent" }}>
                  <span style={{ color: "#3a6a3a", fontSize: 11 }}>{n.code}</span>
                  <span style={{ color: "#5a8a5a", fontSize: 11 }}>{n.category}</span>
                  <span style={{ color: "#9ab09a" }}>{n.item}</span>
                  <span style={{ color: "#4a6a4a", fontSize: 11 }}>{n.unit}</span>
                  <span style={{ textAlign: "right", color: "#7ec86a", fontFamily: "'Bebas Neue',sans-serif", fontSize: 16 }}>${fmt(n.price)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, background: "#0f140f", border: "1px solid #1e3a1e", borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#4a7a3a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Key Tables for Facer Designs</div>
              {[["Table 12","Printing Requirements","Business cards, letterheads, flyers, brochures"],
                ["Table 34","General Non-Consultancy Services","Graphic design, branding, signage, large format"],
                ["Table 4", "Corporate & Protective Wear",     "Branded T-shirts, polo shirts, caps"],
                ["Table 8", "Office Stationery",               "Paper, envelopes, office supplies"],
                ["Table 11","ICT Solutions",                   "Website design, development, hosting"],
                ["Table 32","Media Services",                  "Photography, videography"],
              ].map(([code, name, desc]) => (
                <div key={code} style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid #111811" }}>
                  <span style={{ color: "#4a9a3a", fontSize: 11, minWidth: 60, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 1 }}>{code}</span>
                  <span style={{ color: "#8aad6a", fontSize: 12, minWidth: 200 }}>{name}</span>
                  <span style={{ color: "#4a6a4a", fontSize: 11 }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════ STATS TAB ══════════════════════ */}
        {tab === "stats" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Win Rate",        val: `${winRate}%`,                                           sub: `${decided.length} decided` },
                { label: "Total Pipeline",  val: `$${fmt(totalValue)}`                                                                     },
                { label: "Total Won",       val: `$${fmt(wonValue)}`                                                                       },
                { label: "Avg Tender Value",val: total > 0 ? `$${fmt(Math.round(totalValue / total))}` : "$0"                              },
              ].map(({ label, val, sub }) => (
                <div key={label} className="card" style={{ textAlign: "center" }}>
                  <div className="stat-val">{val}</div>
                  <div className="stat-label">{label}</div>
                  {sub && <div className="stat-sub">{sub}</div>}
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "#4a6a4a", textTransform: "uppercase", marginBottom: 14 }}>Status Breakdown</div>
              {STATUSES.map(s => {
                const count = tenders.filter(t => t.status === s).length;
                const pct   = total > 0 ? (count / total) * 100 : 0;
                const sc    = STATUS_COLORS[s];
                return (
                  <div key={s} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: sc.text, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, display: "inline-block" }} />{s}
                      </span>
                      <span style={{ fontSize: 12, color: "#4a6a4a" }}>{count} tender{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ background: "#0a0f0a", height: 4, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: sc.dot, borderRadius: 2, transition: "width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "#4a6a4a", textTransform: "uppercase", marginBottom: 14 }}>Category Breakdown</div>
              {CATEGORIES.map(cat => {
                const rows = tenders.filter(t => t.category === cat);
                if (!rows.length) return null;
                const val  = rows.reduce((s, t) => s + (t.value ? Number(t.value) : 0), 0);
                return (
                  <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #111811", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#8aad6a" }}>{cat}</span>
                    <div>
                      <span style={{ fontSize: 11, color: "#4a6a4a" }}>{rows.length} tender{rows.length !== 1 ? "s" : ""}</span>
                      {val > 0 && <span style={{ fontSize: 12, color: "#5a9a4a", marginLeft: 12 }}>${fmt(val)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: "#4a6a4a", textTransform: "uppercase" }}>PRAZ Registration</div>
                <div style={{ fontSize: 11, color: "#5a9a4a" }}>{prazDone}/{PRAZ_CHECKLIST.length} complete</div>
              </div>
              {PRAZ_CHECKLIST.map((item, idx) => {
                const done = prazChecked[idx];
                return (
                  <div key={idx} className="chk-row" onClick={() => setPrazChecked(c => c.map((v, i) => i === idx ? !v : v))}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${done ? "#3a9a2a" : "#2a3d2a"}`, background: done ? "#1a4a0f" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#5ae83a" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize: 12, color: done ? "#7ec86a" : "#5a7a5a", textDecoration: done ? "line-through" : "none" }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ════════════ TENDER FORM MODAL ════════════ */}
      {showForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 3, color: "#7ec86a" }}>{editTender ? "Edit Tender" : "Add New Tender"}</div>
              <button className="btn-ghost" onClick={() => setShowForm(false)}><Icon name="close" size={14} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="sec-title">Identity</div>
              <div className="grid2">
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Tender No. *</div>
                  <input placeholder="e.g. MOE/2026/001" value={form.tenderNo} onChange={e => setForm(f => ({ ...f, tenderNo: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Source</div>
                  <input placeholder="eGP Portal / Direct / NGO" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} />
                </div>
              </div>
              <div className="grid2">
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Procuring Entity *</div>
                  <input list="co-list" placeholder="e.g. Ministry of Education" value={form.entity} onChange={e => setForm(f => ({ ...f, entity: e.target.value }))} />
                  <datalist id="co-list">{companies.map(c => <option key={c.id} value={c.name} />)}</datalist>
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Contact Officer</div>
                  <input placeholder="Name / phone / email" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Description *</div>
                <textarea rows={2} placeholder="What does this tender cover?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="sec-divider" />
              <div className="sec-title">Commercial</div>
              <div className="grid2">
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Category</div>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Status</div>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
                </div>
              </div>
              <div className="grid2">
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Estimated Value</div>
                  <input type="number" placeholder="0.00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Currency</div>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    <option>USD</option><option>ZWG</option><option>EUR</option>
                  </select>
                </div>
              </div>
              <div className="sec-divider" />
              <div className="sec-title">Submission</div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Submission Deadline</div>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Notes / Strategy</div>
                <textarea rows={2} placeholder="NSPL reference, contact strategy, key observations…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-primary" onClick={saveForm}><Icon name="plus" size={14} /> {editTender ? "Save Changes" : "Add Tender"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ BID MODAL ════════════ */}
      {showBidModal && bidTender && (() => {
        const co      = companies.find(c => c.name.toLowerCase() === bidTender.entity?.toLowerCase());
        const bidText = generateBidDocument(bidTender, co);
        return (
          <div className="overlay" onClick={e => e.target === e.currentTarget && setShowBidModal(false)}>
            <div className="modal modal-wide">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 3, color: "#6a9ee0" }}>Send Bid</div>
                  <div style={{ fontSize: 10, color: "#3a5a7a", letterSpacing: 1 }}>{bidTender.tenderNo} — {bidTender.entity}</div>
                </div>
                <button className="btn-ghost" onClick={() => setShowBidModal(false)}><Icon name="close" size={14} /></button>
              </div>

              {!co?.email && (
                <div style={{ background: "#2a1a0d", border: "1px solid #5a3a10", borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 11, color: "#e0a04a", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Icon name="warning" size={13} />
                  <span>No email on file for <strong>{bidTender.entity}</strong>. Add one in the Clients tab and Gmail's To field will be pre-filled automatically.</span>
                </div>
              )}

              <div style={{ background: "#070d07", border: "1px solid #1e2e1e", borderRadius: 4, padding: 16, marginBottom: 14, maxHeight: 340, overflowY: "auto" }}>
                <pre style={{ fontSize: 11, color: "#8aad8a", lineHeight: 1.7, fontFamily: "'DM Mono','Courier New',monospace", whiteSpace: "pre-wrap" }}>{bidText}</pre>
              </div>

              <div style={{ fontSize: 10, color: "#2d4a2d", marginBottom: 14, lineHeight: 1.6 }}>
                <strong style={{ color: "#4a7a4a" }}>Download PDF</strong> — opens print dialog, save as PDF to attach. &nbsp;|&nbsp;
                <strong style={{ color: "#4a6a8a" }}>Send via Gmail</strong> — opens Gmail with bid pre-filled{co?.email ? `, addressed to ${co.email}` : ""}. Click Send.
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button className="btn-ghost" onClick={() => setShowBidModal(false)}>Cancel</button>
                <button className="btn-ghost" style={{ color: "#7ec86a", borderColor: "#2d5a27" }} onClick={() => downloadBidPDF(bidTender)}>
                  <Icon name="download" size={13} /> Download PDF
                </button>
                <button className="btn-send" style={{ padding: "8px 18px", fontSize: 12 }} onClick={() => sendViaGmail(bidTender)}>
                  <Icon name="send" size={14} /> Send via Gmail
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════════ CLIENT FORM MODAL ════════════ */}
      {showCoForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowCoForm(false)}>
          <div className="modal">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 3, color: "#7ec86a" }}>{editCompany ? "Edit Client" : "Add Client"}</div>
              <button className="btn-ghost" onClick={() => setShowCoForm(false)}><Icon name="close" size={14} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="grid2">
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Company Name *</div>
                  <input placeholder="e.g. ZIMRA" value={coForm.name} onChange={e => setCoForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Sector</div>
                  <select value={coForm.sector} onChange={e => setCoForm(f => ({ ...f, sector: e.target.value }))}>{SECTORS.map(s => <option key={s}>{s}</option>)}</select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Procurement Contact</div>
                <input placeholder="Full name" value={coForm.contact} onChange={e => setCoForm(f => ({ ...f, contact: e.target.value }))} />
              </div>
              <div className="grid2">
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Email</div>
                  <input type="email" placeholder="procurement@entity.co.zw" value={coForm.email} onChange={e => setCoForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Phone</div>
                  <input placeholder="+263 77 000 0000" value={coForm.phone} onChange={e => setCoForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Address</div>
                <input placeholder="Street, City" value={coForm.address} onChange={e => setCoForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: "#4a6a4a", marginBottom: 4, textTransform: "uppercase" }}>Notes</div>
                <textarea rows={2} placeholder="Procurement cycle, key contacts, preferences…" value={coForm.notes} onChange={e => setCoForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="btn-ghost" onClick={() => setShowCoForm(false)}>Cancel</button>
                <button className="btn-primary" onClick={saveCoForm}><Icon name="building" size={14} /> {editCompany ? "Save Changes" : "Add Client"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
