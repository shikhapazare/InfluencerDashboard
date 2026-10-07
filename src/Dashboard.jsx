import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Search,
  X,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Linkedin,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Zap,
  MapPin,
  Phone,
  Mail,
  Clock,
  Table2,
  LayoutGrid,
  UserPlus,
  Calendar,
  IndianRupee,
  Users,
  Link2,
  AlertCircle,
  AlertTriangle,
  ListChecks,
  Sun,
  Package,
  Megaphone,
  UserCheck,
  Eye,
  Heart,
  TrendingUp,
  LayoutDashboard,
  Trophy,
  Wallet,
  Download,
  Upload,
  ShoppingCart,
} from "lucide-react";

// ==================== SHARED DATA KEYS, HELPERS & UI ====================

const INFLUENCERS_KEY = "emotorad-influencers-v4";
const CAMPAIGNS_KEY = "emotorad-campaigns-v2";
const LOGISTICS_KEY = "emotorad-logistics-v2";
const TEAM_KEY = "emotorad-team-members-v2";
const PLATFORMS = ["Instagram", "YouTube", "Facebook", "X", "LinkedIn"];
const SEED_TEAM = ["Shikha", "Rohan", "Ananya"];

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatINR(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN");
}

function daysSince(iso) {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function initials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function StatBlock({ icon: Icon, label, value, accent, warn }) {
  return (
    <div className="px-6 py-4 border-r border-zinc-800 last:border-r-0">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
        {Icon && <Icon size={12} />}
        {label}
      </div>
      <div
        className={`font-display text-2xl font-semibold ${
          warn ? "text-amber-400" : accent ? "text-blue-400" : "text-zinc-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      <Icon size={14} />
      {children}
    </button>
  );
}

function Select({ value, onChange, options, labelAll, labelMap }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-zinc-900 border border-zinc-800 rounded-md pl-3 pr-7 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-blue-500 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? labelAll : labelMap ? labelMap[o] || o : o}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

// ---------- shared month filtering & CSV export ----------

function monthKey(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 7); // "YYYY-MM"
}

function monthLabelFromKey(key) {
  if (!key) return "Unknown date";
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function isPlausibleMonthKey(key) {
  if (!key) return false;
  const year = Number(key.slice(0, 4));
  return year >= 2020 && year <= 2030;
}

function inSelectedMonths(dateStr, selectedMonths) {
  if (!selectedMonths || selectedMonths.length === 0) return true;
  return selectedMonths.includes(monthKey(dateStr));
}

function inCustomRange(dateStr, rangeStart, rangeEnd) {
  if (!rangeStart && !rangeEnd) return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (rangeStart && d < new Date(rangeStart)) return false;
  if (rangeEnd && d > new Date(rangeEnd)) return false;
  return true;
}

function downloadCSV(filename, headers, rows) {
  const escape = (val) => {
    const s = val === null || val === undefined ? "" : String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [headers.map(escape).join(",")];
  rows.forEach((row) => {
    lines.push(row.map(escape).join(","));
  });
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Protecting saved data ----
// Every list in the dashboard is loaded from shared storage, and when a list
// "isn't there yet" the dashboard fills it with the starting sample data and
// saves that. The problem: a failed read (a network blip) looks exactly like
// "isn't there", and the starting data would then be saved over real data.
// This guard (installed once, before anything loads) fixes that: a failed read
// is retried, and if it still fails, saving to that list is blocked instead
// of overwriting it. A genuinely missing list is still created as before.
function installStorageGuard() {
  const st = typeof window !== "undefined" ? window.storage : null;
  if (!st || st.__guarded || typeof st.get !== "function" || typeof st.set !== "function") return;
  if (typeof st.list !== "function") return; // can't tell "missing" from "failed" — leave as is
  const rawGet = st.get.bind(st);
  const rawSet = st.set.bind(st);
  const rawList = st.list.bind(st);
  const unreadable = new Set();
  const reasons = {};
  const NOT_FOUND = /not found|does not exist|no such key|404/i;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // true / false, or null when we couldn't find out
  async function keyExists(key, shared) {
    try {
      const l = await rawList(key, shared);
      return !!(l && Array.isArray(l.keys) && l.keys.includes(key));
    } catch (e) {
      return null;
    }
  }

  try {
    st.get = async (key, shared) => {
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await rawGet(key, shared);
          unreadable.delete(key);
          delete reasons[key];
          return r;
        } catch (e) {
          lastErr = e;
          reasons[key] = String((e && e.message) || e || "unknown error");
          if (NOT_FOUND.test(reasons[key]) || (await keyExists(key, shared)) === false) {
            unreadable.delete(key); // genuinely not there yet — a normal answer
            delete reasons[key];
            throw e;
          }
          await sleep(300 * (attempt + 1));
        }
      }
      unreadable.add(key);
      throw lastErr;
    };
    st.set = async (key, value, shared) => {
      if (unreadable.has(key)) {
        try {
          window.dispatchEvent(new CustomEvent("storage-guard", { detail: { key, reason: reasons[key] || "" } }));
        } catch (e) {}
        return null; // protect the data we couldn't read
      }
      return rawSet(key, value, shared);
    };
    st.clearProblems = () => {
      unreadable.clear();
    };
    st.forceSet = async (key, value, shared) => {
      unreadable.delete(key);
      return rawSet(key, value, shared);
    };
    st.__guarded = true;
  } catch (e) {}
}

if (typeof window !== "undefined" && window.storage) installStorageGuard();

const BACKUP_APP_ID = "emotorad-influencer-dashboard";

async function collectBackup() {
  const known = [
    INFLUENCERS_KEY, CAMPAIGNS_KEY, LOGISTICS_KEY, TEAM_KEY, TASKS_KEY,
    PERFORMANCE_KEY, SALES_KEY, PAYMENTS_KEY, MONTHLY_TRACKING_KEY, SALES_TRACKING_KEY,
  ];
  let listed = [];
  try {
    const l = await window.storage.list("emotorad-", true);
    if (l && Array.isArray(l.keys)) listed = l.keys;
  } catch (e) {}
  const data = {};
  for (const k of Array.from(new Set([...listed, ...known]))) {
    try {
      const r = await window.storage.get(k, true);
      if (r && r.value) data[k] = r.value;
    } catch (e) {}
  }
  return { app: BACKUP_APP_ID, version: 1, savedAt: new Date().toISOString(), data };
}

async function applyBackup(backup) {
  const setter = window.storage.forceSet || window.storage.set;
  let count = 0;
  for (const k of Object.keys(backup.data || {})) {
    if (!k.startsWith("emotorad-") || typeof backup.data[k] !== "string") continue;
    await setter.call(window.storage, k, backup.data[k], true);
    count += 1;
  }
  return count;
}

// Makes a pasted post link reliable to open. Adds https:// when it was
// pasted without one (otherwise the browser treats it as a page inside this
// dashboard), keeps only the first link if several were pasted together, and
// drops share-tracking parameters (igsh, utm_*, si, mibextid...) so
// Instagram / YouTube / Facebook open the exact post instead of a redirect.
// Anything that isn't a link is returned exactly as typed.
const LINK_TRACKING_PARAMS = ["igsh", "igshid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "mibextid", "fbclid", "xmt"];
const YOUTUBE_TRACKING_PARAMS = ["si", "feature", "pp"];

function cleanVideoUrl(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  const found = s.match(/https?:\/\/[^\s]+/i);
  if (found) {
    s = found[0];
  } else {
    const first = s.split(/\s+/)[0];
    if (s === first && /^[\w-]+(\.[\w-]+)+(\/|$)/.test(first)) s = "https://" + first;
    else return s;
  }
  try {
    const u = new URL(s);
    LINK_TRACKING_PARAMS.forEach((p) => u.searchParams.delete(p));
    if (/youtube\.com|youtu\.be/i.test(u.hostname)) {
      YOUTUBE_TRACKING_PARAMS.forEach((p) => u.searchParams.delete(p));
    }
    return u.toString();
  } catch (e) {
    return s;
  }
}

// Payment Approvals is the single source of truth for whether an influencer
// has been paid for a campaign. Campaigns and Monthly Tracking read it live
// and derive their own "Payment Status" from it — neither stores a copy, so
// changing a status in Payment Approvals is all it takes.
//
// Matching is by influencer + campaign. Campaign names are typed freely in
// Payment Approvals, so formatting differences (case, spaces, dashes) are
// ignored: "Facelift - Pune", "FaceLift-Pune" and "facelift pune" are the
// same campaign. A payment tagged with just the parent name ("Facelift") is
// applied to a city campaign ("Facelift - Pune") only when that influencer
// appears in exactly one such campaign — otherwise it is left unlinked
// rather than guessed.
function normalizeForMatch(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function campaignKey(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function campaignTokens(s) {
  return String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function makePaymentResolver(payments, campaigns) {
  const byInfluencer = {};
  (payments || []).forEach((p) => {
    if (!p.vendorName || !p.campaign) return;
    const k = normalizeForMatch(p.vendorName);
    (byInfluencer[k] = byInfluencer[k] || []).push({
      key: campaignKey(p.campaign),
      tokens: campaignTokens(p.campaign),
      status: p.paymentStatus,
    });
  });

  // Several payments can exist for one influencer + campaign (e.g. advance
  // and balance): Paid only when all are Done, Advance Paid when some money
  // has gone out, otherwise Pending.
  const summarize = (list) => {
    if (list.every((x) => x.status === "Done")) return "Paid";
    if (list.some((x) => x.status === "Done" || x.status === "Advance Paid")) return "Advance Paid";
    return "Pending";
  };

  const startsWithTokens = (tokens, prefix) =>
    prefix.length > 0 && prefix.length < tokens.length && prefix.every((t, i) => tokens[i] === t);

  return function resolve(influencerName, campaignName) {
    if (!campaignName) return null; // no campaign set — payment status doesn't apply
    const records = byInfluencer[normalizeForMatch(influencerName)] || [];
    const ck = campaignKey(campaignName);
    const exact = records.filter((r) => r.key === ck);
    if (exact.length > 0) return summarize(exact);

    // Parent-name fallback, only when unambiguous for this influencer.
    const ct = campaignTokens(campaignName);
    const parents = records.filter((r) => startsWithTokens(ct, r.tokens));
    if (parents.length > 0) {
      const inf = normalizeForMatch(influencerName);
      const familyCampaigns = (campaigns || []).filter(
        (c) =>
          (c.deliverables || []).some((d) => normalizeForMatch(d.influencerName) === inf) &&
          parents.some((r) => startsWithTokens(campaignTokens(c.name), r.tokens))
      );
      if (familyCampaigns.length === 1 && campaignKey(familyCampaigns[0].name) === ck) {
        return summarize(parents);
      }
    }
    return "Not linked";
  };
}

function PaymentStatusBadge({ status }) {
  if (status === null || status === undefined) {
    return <span className="text-xs text-zinc-600">—</span>;
  }
  if (status === "Not linked") {
    return (
      <span
        className="text-xs text-zinc-500"
        title="No matching payment found in Payment Approvals (matched by influencer + campaign name)"
      >
        Not linked
      </span>
    );
  }
  const styles =
    status === "Paid"
      ? "bg-green-500/10 text-green-400"
      : status === "Advance Paid"
      ? "bg-blue-500/10 text-blue-400"
      : "bg-amber-400/10 text-amber-400";
  return <span className={`text-xs px-2 py-1 rounded ${styles}`}>{status}</span>;
}

// Re-reads Payment Approvals when the tab regains focus and every 20s, so a
// status changed there (by you or a teammate) shows up without a reload.
function usePaymentsRefresh(setPayments) {
  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const r = await window.storage.get(PAYMENTS_KEY, true);
        if (alive && r && r.value) setPayments(JSON.parse(r.value));
      } catch (e) {}
    }
    const id = setInterval(refresh, 20000);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("focus", refresh);
    };
  }, []);
}

// ---- Never count the same post twice ----
// Performance combines three places that can hold a post's numbers: Monthly
// Tracking (the main log), Performance's own older entries, and Campaign
// deliverables. The same post can legitimately exist in more than one (the
// older entries were a copy of the Monthly Tracking import), so each post is
// identified by its link — or, when there's no link, influencer + date +
// views — and counted once, with Monthly Tracking taking priority.
function postLinkKey(raw) {
  const clean = cleanVideoUrl(raw);
  if (!clean || !/^https?:\/\//i.test(clean)) return "";
  try {
    const u = new URL(clean);
    const host = u.hostname.replace(/^(www|m)\./i, "").toLowerCase();
    const parts = u.pathname.split("/").filter(Boolean);
    if (host === "instagram.com" && parts.length >= 2 && /^(reel|reels|p|tv)$/i.test(parts[0])) return "ig:" + parts[1];
    if (host === "youtu.be" && parts[0]) return "yt:" + parts[0];
    if (host.endsWith("youtube.com")) {
      if (parts[0] === "shorts" && parts[1]) return "yt:" + parts[1];
      const v = u.searchParams.get("v");
      if (v) return "yt:" + v;
    }
    return host + "/" + parts.join("/");
  } catch (e) {
    return "";
  }
}

function postFingerprint(name, date, views) {
  const v = Number(views) || 0;
  if (!name || !date || !v) return "";
  return "f:" + normalizeForMatch(name) + "|" + String(date).slice(0, 10) + "|" + v;
}

function postKeys(link, name, date, views) {
  return [postLinkKey(link), postFingerprint(name, date, views)].filter(Boolean);
}

// Keeps only rows whose post hasn't been seen yet, and records the kept rows.
function keepNewPosts(rows, seen, keysOf) {
  return rows.filter((r) => {
    const ks = keysOf(r);
    if (ks.some((k) => seen.has(k))) return false;
    ks.forEach((k) => seen.add(k));
    return true;
  });
}

function MonthFilter({ availableMonths, selected, onChange, customRange, onCustomRangeChange }) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === 0
      ? "All months"
      : selected.length === 1
      ? monthLabelFromKey(selected[0])
      : `${selected.length} months selected`;

  function toggleMonth(key) {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-800"
      >
        <Calendar size={13} />
        {label}
        <ChevronDown size={13} className="text-zinc-500" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-40 bg-zinc-900 border border-zinc-800 rounded-md p-3 w-64 max-h-80 overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500">Select one or more months</span>
              {(selected.length > 0 || (customRange && (customRange.start || customRange.end))) && (
                <button
                  onClick={() => {
                    onChange([]);
                    if (onCustomRangeChange) onCustomRangeChange({ start: "", end: "" });
                  }}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1 mb-3">
              {availableMonths.length === 0 && (
                <div className="text-xs text-zinc-600 py-2">No dated records yet.</div>
              )}
              {availableMonths.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer py-0.5">
                  <input
                    type="checkbox"
                    checked={selected.includes(key)}
                    onChange={() => toggleMonth(key)}
                    className="accent-blue-600"
                  />
                  {monthLabelFromKey(key)}
                </label>
              ))}
            </div>
            {onCustomRangeChange && (
              <div className="border-t border-zinc-800 pt-2">
                <div className="text-xs text-zinc-500 mb-1.5">Or a custom date range</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={customRange?.start || ""}
                    onChange={(e) => onCustomRangeChange({ ...customRange, start: e.target.value })}
                    className="input text-xs"
                  />
                  <input
                    type="date"
                    value={customRange?.end || ""}
                    onChange={(e) => onCustomRangeChange({ ...customRange, end: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ==================== CRM & PIPELINE MODULE ====================

// ---------- constants ----------

const CRM_STAGES = [
  { key: "prospecting", label: "Prospecting" },
  { key: "contacted", label: "Contacted" },
  { key: "negotiating", label: "Negotiating" },
  { key: "contracted", label: "Contracted" },
  { key: "live", label: "Content Live" },
  { key: "paid", label: "Paid & Closed" },
];

const CATEGORIES = [
  "Fitness",
  "Urban Commute",
  "Tech & Gadgets",
  "Sustainability",
  "Lifestyle",
  "Family",
  "Comedy",
  "Travel",
];

const PLATFORM_ICONS = {
  Instagram: Instagram,
  YouTube: Youtube,
  Facebook: Facebook,
  X: Twitter,
  LinkedIn: Linkedin,
};

function daysAgoDate(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const SEED_INFLUENCERS = [
  {
    "id": "imp-swati-rojha",
    "name": "Swati Rojha",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 209000,
    "city": "",
    "stage": "paid",
    "rate": 330000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 209000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-virender-singh",
    "name": "Virender Singh",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 140000,
    "city": "",
    "stage": "contracted",
    "rate": 60000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Air. Note: Shorts, reel pending (Will shoot on ranger). Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 140000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-ev-auto-gyan-ev-auto-gyan-2",
    "name": "EV Auto Gyan EV Auto Gyan 2",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-only-desi",
    "name": "Only Desi",
    "handle": "",
    "platform": "YouTube",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 150000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: MSD Animal. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-harry-archana-singh",
    "name": "Harry Archana Singh",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Factory Visit. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-abhishek-moto",
    "name": "Abhishek Moto",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 3407,
    "city": "Ajmer",
    "stage": "paid",
    "rate": 406698,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle V3. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 3407,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-urvishkaushik",
    "name": "urvishkaushik_",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 77900,
    "city": "",
    "stage": "paid",
    "rate": 60000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Rager. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 77900,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-dev-mtr",
    "name": "Dev Mtr",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 237000,
    "city": "",
    "stage": "contracted",
    "rate": 30000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Pro. Note: Tex pro Reel pending - 2nd week of jan. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 237000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-new-tuber",
    "name": "New Tuber",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 40600,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 40600,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-king-indian-media",
    "name": "King Indian Media",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 233000,
    "city": "",
    "stage": "paid",
    "rate": 50000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 233000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-vaibhav-malik",
    "name": "Vaibhav Malik",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 305000,
    "city": "",
    "stage": "contracted",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Pro. Note: Payment pending dope. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 305000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-soumya-jaiswal",
    "name": "Soumya Jaiswal",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 220000,
    "city": "",
    "stage": "paid",
    "rate": 29999,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 220000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-dr-drive",
    "name": "Dr Drive",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 85200,
    "city": "",
    "stage": "paid",
    "rate": 25000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 85200,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-i-am-noel",
    "name": "I am Noel",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 6103,
    "city": "",
    "stage": "paid",
    "rate": 50000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 6103,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-kl-rider",
    "name": "KL Rider",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 254000,
    "city": "",
    "stage": "paid",
    "rate": 45000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 254000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-punekar-ig",
    "name": "Punekar_Ig",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 430000,
    "city": "",
    "stage": "paid",
    "rate": 25000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Factory Visit. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 430000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-kon-kunal",
    "name": "Kon Kunal",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 10400,
    "city": "",
    "stage": "paid",
    "rate": 10000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 10400,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-samar-experiment",
    "name": "Samar Experiment",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 17300,
    "city": "",
    "stage": "contracted",
    "rate": 40000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Pro. Note: Short and reel is pending - Checking footages. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 17300,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-suvan",
    "name": "Suvan",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 55000,
    "city": "",
    "stage": "paid",
    "rate": 7000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store Visit. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 55000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-ev-gyan",
    "name": "EV Gyan",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 48700,
    "city": "",
    "stage": "contracted",
    "rate": 80000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T Rex Pro. Note: Short is pending - will call you later. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 48700,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-dil-toota-biker",
    "name": "Dil Toota Biker",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 92600,
    "city": "",
    "stage": "paid",
    "rate": 30000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 92600,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-karan-gade",
    "name": "Karan Gade",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 17900,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 17900,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-k2k-motovlogs",
    "name": "K2K Motovlogs",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 114000,
    "city": "",
    "stage": "paid",
    "rate": 37000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 114000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-akash-chaturvedi",
    "name": "Akash Chaturvedi",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 10300,
    "city": "",
    "stage": "paid",
    "rate": 18000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-Rex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 10300,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-vaishnavi-india",
    "name": "Vaishnavi India",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 66000,
    "city": "",
    "stage": "paid",
    "rate": 7000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store Visit. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 66000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-kishan-sharma",
    "name": "Kishan Sharma",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 3000,
    "city": "",
    "stage": "paid",
    "rate": 7000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-rex pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 3000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-vishal-singh",
    "name": "Vishal Singh",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 499000,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 499000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-4-traction",
    "name": "4 Traction",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 182000,
    "city": "",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-Rex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 182000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-amandeep-singh-gulati",
    "name": "Amandeep Singh Gulati",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 29600,
    "city": "",
    "stage": "paid",
    "rate": 25000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 29600,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-duke-sanal",
    "name": "Duke Sanal",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 77000,
    "city": "",
    "stage": "paid",
    "rate": 149599,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: X2. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 77000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-fuel-injected",
    "name": "Fuel Injected",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 118000,
    "city": "",
    "stage": "paid",
    "rate": 69599,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 118000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-amrit-singh",
    "name": "Amrit Singh",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 335000,
    "city": "",
    "stage": "paid",
    "rate": 8000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: (Prime Day). Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 335000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-naveen-jangid",
    "name": "NAVEEN JANGID",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 258000,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: (Prime Day). Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 258000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-himalayan-moosa",
    "name": "Himalayan Moosa",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 67000,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-Rex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 67000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-abhinav-thul",
    "name": "Abhinav Thul",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 105000,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Sale Reel. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 105000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-shubham-tomar",
    "name": "Shubham Tomar",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 575000,
    "city": "",
    "stage": "paid",
    "rate": 39200,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 575000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-nagpur-wow",
    "name": "Nagpur Wow",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 279000,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Sale Reel. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 279000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-rc-mech",
    "name": "Rc Mech",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 207000,
    "city": "",
    "stage": "contracted",
    "rate": 35000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Note: Pickup Pending. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 207000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-mtb-imran",
    "name": "MTB Imran",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 154000,
    "city": "",
    "stage": "paid",
    "rate": 50000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Note: Video changes shared - 22nd jan pick up. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 154000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-rachna-gowda",
    "name": "RACHNA GOWDA",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 67300,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Note: Bike routed to dealer - Video Under QC. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 67300,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-fatbiker-vaibhav",
    "name": "Fatbiker Vaibhav",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 351000,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Lil E. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 351000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-design-shraddha",
    "name": "design.Shraddha",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 46500,
    "city": "",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Competition. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 46500,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-suraj-bl-vlogs",
    "name": "suraj_bl_vlogs",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 210000,
    "city": "",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-Rex Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 210000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-typography-studio",
    "name": "typography.studio",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 171000,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Competition. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 171000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-shaga-media",
    "name": "Shaga Media",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: --. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-bhawna-choudhary",
    "name": "Bhawna Choudhary",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 118000,
    "city": "",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: STX. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 118000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-moto-maniac-46",
    "name": "Moto Maniac 46",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 51900,
    "city": "",
    "stage": "paid",
    "rate": 5000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: X1. Note: pickup done from influencer - short will upload on 31st dec. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 51900,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-moto-fuel",
    "name": "Moto Fuel",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 54500,
    "city": "",
    "stage": "contracted",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-rex Pro. Note: Short reel pending. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 54500,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-jagmohan-yadav",
    "name": "Jagmohan Yadav",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 48100,
    "city": "",
    "stage": "contracted",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-rex Pro. Note: short pending. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 48100,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-kunal-ingle",
    "name": "Kunal Ingle",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 16400,
    "city": "",
    "stage": "paid",
    "rate": 14000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Dope. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 16400,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-swapnil-valkunde",
    "name": "Swapnil Valkunde",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 117000,
    "city": "",
    "stage": "paid",
    "rate": 242500,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-rex air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 117000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-yellow-cruiser",
    "name": "Yellow cruiser",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 19500,
    "city": "",
    "stage": "paid",
    "rate": 8000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-rex air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 19500,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-mrinmay",
    "name": "Mrinmay",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-rohan-dalape",
    "name": "Rohan Dalape",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 25000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Dope. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-bhavik-rajput",
    "name": "Bhavik Rajput",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 138000,
    "city": "",
    "stage": "paid",
    "rate": 30000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Note: Will shoot in jan 2nd week. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 138000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-ranjith-cs",
    "name": "Ranjith CS",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 122000,
    "city": "",
    "stage": "paid",
    "rate": 75000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Note: Check deliverables. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 122000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-ishu-finds",
    "name": "Ishu Finds",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 140000,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-rex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 140000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-microtech-007",
    "name": "Microtech 007",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 1000000,
    "city": "",
    "stage": "paid",
    "rate": 40000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 1000000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-auto-review-46",
    "name": "Auto Review 46",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 263000,
    "city": "",
    "stage": "paid",
    "rate": 30000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-Rex Air. Note: Revised video shared - Invoice shared, reverse pickup agter 10th feb. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 263000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-master-wheels",
    "name": "Master Wheels",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 958000,
    "city": "",
    "stage": "paid",
    "rate": 277599,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 958000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-motor-mitra",
    "name": "Motor Mitra",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 22000,
    "city": "",
    "stage": "paid",
    "rate": 8000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 22000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-technical-sht",
    "name": "Technical SHT",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 59599,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-Rex Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-chalte-firte",
    "name": "Chalte Firte",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 114000,
    "city": "",
    "stage": "paid",
    "rate": 35000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 114000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-anurag-sah",
    "name": "Anurag Sah",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 20700,
    "city": "",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-Rex+ V3. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 20700,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-jzyyll",
    "name": "Jzyyll",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 27200,
    "city": "",
    "stage": "paid",
    "rate": 8000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 27200,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-its-sanchit-bansal",
    "name": "Its Sanchit Bansal",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 2000,
    "city": "",
    "stage": "paid",
    "rate": 12000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 2000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-ksn-talks",
    "name": "KSN TALKS",
    "handle": "",
    "platform": "YouTube",
    "category": "General",
    "followers": 44800,
    "city": "",
    "stage": "paid",
    "rate": 7000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Air. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 44800,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-y4shiiiii1",
    "name": "Y4shiiiii1",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-siddhant-ingole",
    "name": "Siddhant Ingole",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-imdivyansh",
    "name": "imdivyansh._",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 267000,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 267000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-sahil-sethi",
    "name": "Sahil Sethi",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 37900,
    "city": "",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Trex Air Yellow. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 37900,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-filmedby-naresh",
    "name": "filmedby.naresh",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 53700,
    "city": "",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle V3. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 53700,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-samruddhi",
    "name": "Samruddhi",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 2200,
    "city": "",
    "stage": "paid",
    "rate": 10000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 2200,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-vd-chawla",
    "name": "VD Chawla",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Viper. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-dr-drive-deepak-ranjan",
    "name": "Dr Drive - Deepak Ranjan",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 158000,
    "city": "",
    "stage": "paid",
    "rate": 30000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 158000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-vidit-arora",
    "name": "Vidit Arora",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 8000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: X1. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-anshika",
    "name": "Anshika",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 25000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Ranger. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-kartik-nagpurtimeline",
    "name": "Kartik - NagpurTimeLine",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 3000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-chetan-dhokhe-baheti-brothers",
    "name": "Chetan Dhokhe - Baheti Brothers",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 10000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-arpit-talwar-baheti-borther-s",
    "name": "Arpit Talwar - Baheti Borther's",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 5000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-shlok-jaiswal",
    "name": "Shlok Jaiswal",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 10000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: X1. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-vd-chawala",
    "name": "VD chawala",
    "handle": "",
    "platform": "YouTube",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Viper. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-ahemdabad",
    "name": "Ahemdabad",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Ahemdabad",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store Visit. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-laksh-dadwani-agarwal-store",
    "name": "Laksh Dadwani - Agarwal Store",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Nagpur",
    "stage": "paid",
    "rate": 13000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store Visit. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-nagpurchakartik-nagpur",
    "name": "nagpurchakartik - Nagpur",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Nagpur",
    "stage": "paid",
    "rate": 10000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store Visit. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-aish-journey-nagpur",
    "name": "_aish_journey_ - Nagpur",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Nagpur",
    "stage": "paid",
    "rate": 3000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store Visit. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-iamronaksagar",
    "name": "iamronaksagar",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 10000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: STORE. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-sakxhmm",
    "name": "sakxhmm",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 30000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: TREX AIR. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-mumbaiwala-vlogs",
    "name": "mumbaiwala_vlogs",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 8000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: STORE. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-abhijit-shete",
    "name": "abhijit.shete",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: STX. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-thevogueandstyle",
    "name": "thevogueandstyle",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 40000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: T-REX AIR. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-shubhamrevankar",
    "name": "shubhamrevankar_",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 65000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle PRO. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-shivv-dutt",
    "name": "shivv.dutt",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: TREX AIR. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-mr-dakol",
    "name": "mr_dakol",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 27000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Doodle Pro. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-explorewithsahil01",
    "name": "explorewithsahil01",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-bhandariji",
    "name": "Bhandariji",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Dehradun",
    "stage": "paid",
    "rate": 30000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: X1 Legend 07. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-nick-audience",
    "name": "Nick Audience",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Ghaziabad",
    "stage": "paid",
    "rate": 40000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-ka-09-rider",
    "name": "ka_09_rider",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Karnataka",
    "stage": "paid",
    "rate": 60000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-hellonagpur-nagpur",
    "name": "hellonagpur_ - Nagpur",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Nagpur",
    "stage": "paid",
    "rate": 8000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Store Visit. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-suvan-pranay",
    "name": "Suvan Pranay",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: LEXEND 07. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-editorbhai",
    "name": "editorbhai_",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 22000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-only-discount",
    "name": "only__discount_",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 18000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: STORE - kohinoor sales agency. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-ayaz-ahmed",
    "name": "ayaz_ahmed._",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: TREX AIR. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-ayeaadii",
    "name": "ayeaadii",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 40000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: TREX AIR. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-vansh-gupta-15",
    "name": "vansh_gupta__15",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Mumbai",
    "stage": "paid",
    "rate": 5000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: STORE. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-akashprasad0",
    "name": "akashprasad0",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Kolkata",
    "stage": "paid",
    "rate": 25000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-k2kmotovlogs",
    "name": "k2kmotovlogs",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Delhi",
    "stage": "paid",
    "rate": 70000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-invention-destroy",
    "name": "Invention Destroy",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "Haryana",
    "stage": "paid",
    "rate": 70000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-sreya-rajesh",
    "name": "sreya__rajesh",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-rnk-autos",
    "name": "RNK AUTOS",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 30000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-trengine-bhavik",
    "name": "Trengine - Bhavik",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 45000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-harsh-epic-life",
    "name": "harsh_epic_life",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 30000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-joyal-joshy",
    "name": "Joyal joshy",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 25000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-souvik-films",
    "name": "souvik_films_",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 10000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-malayali-gentleman",
    "name": "malayali_gentleman",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 18000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-maitreyasathe",
    "name": "maitreyasathe",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 40000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-trippingmommy",
    "name": "trippingmommy",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-rachit-rawal-vlogs",
    "name": "rachit_rawal_vlogs",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 13000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-halka-tech",
    "name": "Halka Tech",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 577000,
    "city": "Kolkata",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 577000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-motomachans",
    "name": "motomachans",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 207000,
    "city": "Kerala",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 207000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-prachitaranshofficial",
    "name": "prachitaranshofficial",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 103000,
    "city": "",
    "stage": "paid",
    "rate": 22500,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: JR. LIL E. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 103000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-chatpat-toy-tv",
    "name": "Chatpat Toy TV",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 198000,
    "city": "",
    "stage": "paid",
    "rate": 20000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Bentley EXP 12. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 198000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-sakshi-agarwal",
    "name": "Sakshi Agarwal",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 104000,
    "city": "",
    "stage": "paid",
    "rate": 13000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Bentley EXP 12. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 104000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-rituka-and-baby-saksham",
    "name": "Rituka and baby saksham",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 100000,
    "city": "",
    "stage": "paid",
    "rate": 8000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Delhi Expo. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 100000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-manpreet-kaur-chawla",
    "name": "Manpreet Kaur Chawla",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 101000,
    "city": "",
    "stage": "paid",
    "rate": 7000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Delhi Expo. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 101000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-vandita-chaurasia",
    "name": "Vandita Chaurasia",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 105000,
    "city": "",
    "stage": "paid",
    "rate": 10000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Delhi Expo. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 105000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-avinash",
    "name": "Avinash",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 164000,
    "city": "",
    "stage": "paid",
    "rate": 10000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Delhi Expo. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 164000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-explore-vlogs-a-r",
    "name": "Explore Vlogs A.R",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 19100,
    "city": "",
    "stage": "paid",
    "rate": 3500,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Delhi Expo. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 19100,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-abhishek-jha",
    "name": "Abhishek Jha",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 128000,
    "city": "",
    "stage": "paid",
    "rate": 5000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Delhi Expo. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 128000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-palak-chopra",
    "name": "Palak Chopra",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 100000,
    "city": "",
    "stage": "paid",
    "rate": 8000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Delhi Expo. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 100000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-jassimran-kaur",
    "name": "Jassimran kaur",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 104000,
    "city": "",
    "stage": "paid",
    "rate": 8000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Delhi Expo. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 104000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-innocent-hiccups",
    "name": "innocent_hiccups",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 306000,
    "city": "",
    "stage": "paid",
    "rate": 22000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Bike: Bentley EXP 12. Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 306000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-rdx-hriday",
    "name": "_rdx_hriday_",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 10700,
    "city": "",
    "stage": "paid",
    "rate": 5000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 10700,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "imp-bhakti-kotwal",
    "name": "Bhakti Kotwal",
    "handle": "",
    "platform": "Instagram",
    "category": "General",
    "followers": 53000,
    "city": "",
    "stage": "paid",
    "rate": 15000,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Imported from Excel tracker.",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "createdAt": "2026-09-11T12:06:02.705055",
    "dropped": false,
    "igFollowers": 53000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-0",
    "name": "Sujeet Naik",
    "handle": "sujit_naik",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "8888395775",
    "email": "",
    "notes": "Source: EM Employee. E-cycle: Multiple. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-1",
    "name": "Vagabond Soul",
    "handle": "umeshkoira",
    "platform": "Youtube",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "contacted",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "9901863963 umeshkoira@gmail.com",
    "notes": "Source: WhatsApp Group. E-cycle: T-Rex Air. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-2",
    "name": "Sibanand",
    "handle": "shiv062010",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "contacted",
    "rate": 0,
    "assignedTo": "",
    "phone": "8447744578",
    "email": "",
    "notes": "Source: LinkedIn. E-cycle: T-Rex Pro. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-3",
    "name": "Aashish Jhunjhunwala",
    "handle": "[namesake]",
    "platform": "LinkedIn",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Source: Subham Mehta EM. E-cycle: Lil-E Jr.. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-4",
    "name": "Experiential Himalaya",
    "handle": "",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "prospecting",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Source: Sumedh Sir. E-cycle: Multiple. Remarks: Too much ask. Called but didn't respond.. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": true,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-5",
    "name": "Rishikesh Rahansa",
    "handle": "",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "contacted",
    "rate": 0,
    "assignedTo": "",
    "phone": "9890906631",
    "email": "",
    "notes": "Source: Dealer Hemant Ji. E-cycle: Legend 07. Remarks: Received info. Shoot can be aligned for 19th or 26th July. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-6",
    "name": "Avadhoot Kumbhar",
    "handle": "",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "prospecting",
    "rate": 0,
    "assignedTo": "",
    "phone": "7498531921",
    "email": "",
    "notes": "Source: Dealer Hemant Ji. E-cycle: Doodle V3. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-7",
    "name": "Kanitkar",
    "handle": "",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "prospecting",
    "rate": 0,
    "assignedTo": "",
    "phone": "9130011223",
    "email": "",
    "notes": "Source: Dealer Hemant Ji. E-cycle: Legend 07. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-8",
    "name": "Col. Vivek Mundkar",
    "handle": "",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "9850177497",
    "email": "",
    "notes": "Source: Dealer Hemant Ji. E-cycle: Doodle V3. Remarks: Shoot done, but he wanted payment after that, so we scrapped it.. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-9",
    "name": "Mr Jose",
    "handle": "",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "prospecting",
    "rate": 0,
    "assignedTo": "",
    "phone": "9970952536",
    "email": "",
    "notes": "Source: Goa Dealer. E-cycle: Ranger. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-10",
    "name": "Shrikant",
    "handle": "",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Source: Instagram - Shikha. E-cycle: X1. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-11",
    "name": "Prashant Iranna",
    "handle": "krishnprashant",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "contacted",
    "rate": 0,
    "assignedTo": "",
    "phone": "8867778982",
    "email": "",
    "notes": "Source: LinkedIn - Shruti. E-cycle: Doodle V3. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-12",
    "name": "Vinay Patil",
    "handle": "vinay_patil_nikcanstories",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "prospecting",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Source: Instagram - Jai. E-cycle: . Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-13",
    "name": "Vibhu Arvindan",
    "handle": "",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "prospecting",
    "rate": 0,
    "assignedTo": "",
    "phone": "95662 05720",
    "email": "",
    "notes": "Source: Pradeep Roy - BDC. E-cycle: X1. Remarks: Unable to ride his e-cycle without some modification. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": true,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "ugcinp-14",
    "name": "Sudhish",
    "handle": "https://www.instagram.com/vlnsudhish/",
    "platform": "Instagram",
    "category": "UGC",
    "followers": 0,
    "city": "",
    "stage": "prospecting",
    "rate": 0,
    "assignedTo": "",
    "phone": "9561927254",
    "email": "",
    "notes": "Source: Sakshee. E-cycle: Lil E. Remarks: To align with friends and come up with a shoot concept. Imported from UGC Content tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "contactinp-0",
    "name": "Akshay Yadav",
    "handle": "akshayyadav.life",
    "platform": "YouTube",
    "category": "General",
    "followers": 44000,
    "city": "",
    "stage": "prospecting",
    "rate": 0,
    "assignedTo": "",
    "phone": "9680997673",
    "email": "",
    "notes": "Imported from Contact list tracker.",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "createdAt": "2026-09-11T12:39:47.715646",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 44000,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-8",
    "name": "EPIC MEMES",
    "handle": "EPIC MEMES",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 134000,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 134000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-9",
    "name": "epic.sarcasm",
    "handle": "epic.sarcasm",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 52800,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 52800,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-10",
    "name": "Ultra legend memer",
    "handle": "Ultra legend memer",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 22500,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 22500,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-11",
    "name": "okayurbroken",
    "handle": "okayurbroken",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 46400,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 46400,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-12",
    "name": "adultsociety",
    "handle": "adultsociety",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 7300000,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 7300000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-14",
    "name": "laughtercolours",
    "handle": "laughtercolours",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 4400000,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 4400000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-15",
    "name": "NAGARPALIKA MEMES",
    "handle": "NAGARPALIKA MEMES",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 1100000,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 1100000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-16",
    "name": "desithuglife",
    "handle": "desithuglife",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 422000,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 422000,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-17",
    "name": "Naughty Duniya",
    "handle": "Naughty Duniya",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-18",
    "name": "Dosti aur pyarr",
    "handle": "Dosti aur pyarr",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-19",
    "name": "Ghantareel",
    "handle": "Ghantareel",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-20",
    "name": "Desitroll.In",
    "handle": "Desitroll.In",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-21",
    "name": "Viralvicharr",
    "handle": "Viralvicharr",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-22",
    "name": "Flirtygrram",
    "handle": "Flirtygrram",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-23",
    "name": "Baba.ji.officiial",
    "handle": "Baba.ji.officiial",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-24",
    "name": "Funnycartoon0o",
    "handle": "Funnycartoon0o",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-25",
    "name": "Motivational man",
    "handle": "Motivational man",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-26",
    "name": "Cartoon famly",
    "handle": "Cartoon famly",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-27",
    "name": "Yobros.In",
    "handle": "Yobros.In",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-28",
    "name": "Dostiyariii",
    "handle": "Dostiyariii",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-29",
    "name": "Laughtergram",
    "handle": "Laughtergram",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-30",
    "name": "Cartoon media",
    "handle": "Cartoon media",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-31",
    "name": "Dreamcartoon5",
    "handle": "Dreamcartoon5",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-32",
    "name": "Timepass",
    "handle": "Timepass",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-33",
    "name": "Tomnjerry_videos_",
    "handle": "Tomnjerry_videos_",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-34",
    "name": "Tom_jerry_fanny2",
    "handle": "Tom_jerry_fanny2",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-35",
    "name": "Tomandjerry.fandom",
    "handle": "Tomandjerry.fandom",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-36",
    "name": "Tomnjerry.Videos",
    "handle": "Tomnjerry.Videos",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-37",
    "name": "Tomjerrymemes8",
    "handle": "Tomjerrymemes8",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-38",
    "name": "Ghantaflix",
    "handle": "Ghantaflix",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  },
  {
    "id": "rangerinp-39",
    "name": "Naughtyduniya",
    "handle": "Naughtyduniya",
    "platform": "Instagram",
    "category": "Meme Page",
    "followers": 0,
    "city": "",
    "stage": "paid",
    "rate": 0,
    "assignedTo": "",
    "phone": "",
    "email": "",
    "notes": "Ranger pre-buzz meme-page seeding. Imported from Ranger Seeding sheet.",
    "stageUpdatedAt": "2026-09-11T13:08:13.436780",
    "createdAt": "2026-09-11T13:08:13.436780",
    "dropped": false,
    "igFollowers": 0,
    "fbFollowers": 0,
    "liFollowers": 0,
    "xFollowers": 0,
    "ytFollowers": 0,
    "includeInPipeline": false,
    "state": ""
  }
];

// ---------- helpers ----------

function formatFollowers(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(num);
}

function emptyInfluencerDraft() {
  return {
    id: null,
    name: "",
    handle: "",
    platform: "Instagram",
    category: "Fitness",
    followers: "",
    igFollowers: "",
    fbFollowers: "",
    liFollowers: "",
    xFollowers: "",
    ytFollowers: "",
    city: "",
    state: "",
    stage: "prospecting",
    rate: "",
    campaignName: "",
    followUpDate: "",
    nextAction: "",
    assignedTo: "",
    phone: "",
    email: "",
    notes: "",
    dropped: false,
    includeInPipeline: true,
  };
}

// ---------- main component ----------

function EMotoradInfluencerCRM() {
  const [influencers, setInfluencers] = useState([]);
  const [team, setTeam] = useState(SEED_TEAM);
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [showDropped, setShowDropped] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(emptyInfluencerDraft());
  const [isNew, setIsNew] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newTeammate, setNewTeammate] = useState("");
  const [showAddTeammate, setShowAddTeammate] = useState(false);
  const [toast, setToast] = useState("");
  const [dragOverStage, setDragOverStage] = useState(null);

  // load from persistent storage
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let loadedInfluencers = null;
      let loadedTeam = null;
      let loadedCampaigns = null;
      try {
        const res = await window.storage.get(INFLUENCERS_KEY, true);
        if (res && res.value) loadedInfluencers = JSON.parse(res.value);
      } catch (e) {
        loadedInfluencers = null;
      }
      try {
        const res2 = await window.storage.get(TEAM_KEY, true);
        if (res2 && res2.value) loadedTeam = JSON.parse(res2.value);
      } catch (e) {
        loadedTeam = null;
      }
      try {
        const res3 = await window.storage.get(CAMPAIGNS_KEY, true);
        if (res3 && res3.value) loadedCampaigns = JSON.parse(res3.value);
      } catch (e) {
        loadedCampaigns = null;
      }
      if (cancelled) return;
      if (loadedInfluencers) {
        setInfluencers(loadedInfluencers);
      } else {
        setInfluencers(SEED_INFLUENCERS);
        try {
          await window.storage.set(INFLUENCERS_KEY, JSON.stringify(SEED_INFLUENCERS), true);
        } catch (e) {}
      }
      if (loadedTeam) {
        setTeam(loadedTeam);
      } else {
        setTeam(SEED_TEAM);
        try {
          await window.storage.set(TEAM_KEY, JSON.stringify(SEED_TEAM), true);
        } catch (e) {}
      }
      setCampaigns(loadedCampaigns || []);
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistInfluencers = useCallback(async (next) => {
    setInfluencers(next);
    try {
      const res = await window.storage.set(INFLUENCERS_KEY, JSON.stringify(next), true);
      if (!res) showToast("Couldn't save — try again");
    } catch (e) {
      showToast("Couldn't save — try again");
    }
  }, []);

  const persistTeam = useCallback(async (next) => {
    setTeam(next);
    try {
      await window.storage.set(TEAM_KEY, JSON.stringify(next), true);
    } catch (e) {}
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  // ---------- derived data ----------

  const filtered = useMemo(() => {
    return influencers.filter((inf) => {
      if (!showDropped && inf.dropped) return false;
      if (showDropped && !inf.dropped) return false;
      if (filterPlatform !== "all" && inf.platform !== filterPlatform) return false;
      if (filterCategory !== "all" && inf.category !== filterCategory) return false;
      if (filterAssignee !== "all" && inf.assignedTo !== filterAssignee) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = (inf.name + " " + inf.handle + " " + inf.city).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [influencers, showDropped, filterPlatform, filterCategory, filterAssignee, search]);

  const stats = useMemo(() => {
    const active = influencers.filter((i) => !i.dropped);
    const activeDeals = active.filter(
      (i) => i.stage === "negotiating" || i.stage === "contracted"
    ).length;
    const live = active.filter((i) => i.stage === "live").length;
    const pipelineValue = active
      .filter((i) => i.stage !== "paid")
      .reduce((sum, i) => sum + (Number(i.rate) || 0), 0);
    return {
      total: active.length,
      activeDeals,
      live,
      pipelineValue,
    };
  }, [influencers]);

  // ---------- actions ----------

  function openAddDrawer() {
    setDraft(emptyInfluencerDraft());
    setIsNew(true);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function openEditDrawer(inf) {
    setDraft({
      ...inf,
      followers: String(inf.followers),
      igFollowers: String(inf.igFollowers || 0),
      fbFollowers: String(inf.fbFollowers || 0),
      liFollowers: String(inf.liFollowers || 0),
      xFollowers: String(inf.xFollowers || 0),
      ytFollowers: String(inf.ytFollowers || 0),
      rate: String(inf.rate),
    });
    setIsNew(false);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setShowAddTeammate(false);
    setNewTeammate("");
  }

  function saveDraft() {
    if (!draft.name.trim()) {
      showToast("Name is required");
      return;
    }
    const now = new Date().toISOString();
    const igFollowers = Number(draft.igFollowers) || 0;
    const fbFollowers = Number(draft.fbFollowers) || 0;
    const liFollowers = Number(draft.liFollowers) || 0;
    const xFollowers = Number(draft.xFollowers) || 0;
    const ytFollowers = Number(draft.ytFollowers) || 0;
    const totalFollowers = igFollowers + fbFollowers + liFollowers + xFollowers + ytFollowers;
    if (isNew) {
      const record = {
        ...draft,
        id: "inf-" + Date.now(),
        followers: totalFollowers,
        igFollowers, fbFollowers, liFollowers, xFollowers, ytFollowers,
        rate: Number(draft.rate) || 0,
        stage: "prospecting",
        stageUpdatedAt: now,
        createdAt: now,
        dropped: false,
      };
      persistInfluencers([record, ...influencers]);
      showToast("Influencer added");
    } else {
      const next = influencers.map((i) =>
        i.id === draft.id
          ? {
              ...i,
              ...draft,
              followers: totalFollowers,
              igFollowers, fbFollowers, liFollowers, xFollowers, ytFollowers,
              rate: Number(draft.rate) || 0,
              stageUpdatedAt: draft.stage !== i.stage ? now : i.stageUpdatedAt,
            }
          : i
      );
      persistInfluencers(next);
      showToast("Changes saved");
    }
    closeDrawer();
  }

  function deleteDraft() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    persistInfluencers(influencers.filter((i) => i.id !== draft.id));
    showToast("Influencer removed");
    closeDrawer();
  }

  function moveStage(id, direction) {
    const next = influencers.map((i) => {
      if (i.id !== id) return i;
      const idx = CRM_STAGES.findIndex((s) => s.key === i.stage);
      const newIdx = Math.min(CRM_STAGES.length - 1, Math.max(0, idx + direction));
      if (newIdx === idx) return i;
      return { ...i, stage: CRM_STAGES[newIdx].key, stageUpdatedAt: new Date().toISOString() };
    });
    persistInfluencers(next);
  }

  function setStageDirect(id, stageKey) {
    const next = influencers.map((i) =>
      i.id === id ? { ...i, stage: stageKey, stageUpdatedAt: new Date().toISOString() } : i
    );
    persistInfluencers(next);
  }

  function toggleIncludeInPipeline(id) {
    const next = influencers.map((i) =>
      i.id === id ? { ...i, includeInPipeline: i.includeInPipeline === false } : i
    );
    persistInfluencers(next);
    const target = influencers.find((i) => i.id === id);
    showToast(
      target && target.includeInPipeline === false ? "Added to Pipeline" : "Moved to Directory only"
    );
  }

  function addTeammate() {
    const name = newTeammate.trim();
    if (!name) return;
    if (team.includes(name)) {
      showToast("Already on the team list");
      return;
    }
    persistTeam([...team, name]);
    setDraft((d) => ({ ...d, assignedTo: name }));
    setNewTeammate("");
    setShowAddTeammate(false);
  }

  // drag and drop
  function handleDrop(stageKey, e) {
    e.preventDefault();
    setDragOverStage(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) setStageDirect(id, stageKey);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading board…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* top bar */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="font-display font-semibold text-lg">Influencer CRM & Pipeline</div>
        <button
          onClick={openAddDrawer}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add influencer
        </button>
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800">
        <StatBlock label="Total influencers" value={stats.total} />
        <StatBlock label="Active deals" value={stats.activeDeals} accent />
        <StatBlock label="Content live" value={stats.live} />
        <StatBlock label="Open pipeline value" value={formatINR(stats.pipelineValue)} />
      </div>

      {/* controls */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-zinc-800">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
          <TabButton active={activeTab === "pipeline"} onClick={() => setActiveTab("pipeline")} icon={LayoutGrid}>
            Pipeline
          </TabButton>
          <TabButton active={activeTab === "directory"} onClick={() => setActiveTab("directory")} icon={Table2}>
            Directory
          </TabButton>
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, handle, city"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <Select value={filterPlatform} onChange={setFilterPlatform} options={["all", ...PLATFORMS]} labelAll="All platforms" />
        <Select value={filterCategory} onChange={setFilterCategory} options={["all", ...CATEGORIES]} labelAll="All categories" />
        <Select value={filterAssignee} onChange={setFilterAssignee} options={["all", ...team]} labelAll="Everyone" />

        <button
          onClick={() => setShowDropped((s) => !s)}
          className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
            showDropped
              ? "border-zinc-800 bg-zinc-800 text-zinc-100"
              : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {showDropped ? "Viewing dropped" : "Show dropped"}
        </button>
      </div>

      {/* body */}
      <div className="px-6 py-5">
        {activeTab === "pipeline" ? (
          <PipelineBoard
            filtered={filtered.filter((inf) => inf.includeInPipeline !== false)}
            onCardClick={openEditDrawer}
            onMoveStage={moveStage}
            onDrop={handleDrop}
            dragOverStage={dragOverStage}
            setDragOverStage={setDragOverStage}
          />
        ) : (
          <CRMDirectoryTable filtered={filtered} onRowClick={openEditDrawer} onTogglePipeline={toggleIncludeInPipeline} />
        )}
      </div>

      {/* drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">
                {isNew ? "Add influencer" : "Edit influencer"}
              </div>
              <button onClick={closeDrawer} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <Field label="Name">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="input"
                  placeholder="Full name"
                />
              </Field>

              <Field label="Handle">
                <input
                  value={draft.handle}
                  onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
                  className="input"
                  placeholder="@handle"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Platform">
                  <select
                    value={draft.platform}
                    onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
                    className="input"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Category">
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="input"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                    className="input"
                    placeholder="City"
                  />
                </Field>
                <Field label="State">
                  <input
                    value={draft.state}
                    onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                    className="input"
                    placeholder="State"
                  />
                </Field>
              </div>

              <div>
                <div className="text-xs text-zinc-500 mb-1.5">Followers by platform</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Instagram">
                    <input
                      type="number"
                      value={draft.igFollowers}
                      onChange={(e) => setDraft({ ...draft, igFollowers: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Facebook">
                    <input
                      type="number"
                      value={draft.fbFollowers}
                      onChange={(e) => setDraft({ ...draft, fbFollowers: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </Field>
                  <Field label="LinkedIn">
                    <input
                      type="number"
                      value={draft.liFollowers}
                      onChange={(e) => setDraft({ ...draft, liFollowers: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </Field>
                  <Field label="X">
                    <input
                      type="number"
                      value={draft.xFollowers}
                      onChange={(e) => setDraft({ ...draft, xFollowers: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </Field>
                  <Field label="YouTube">
                    <input
                      type="number"
                      value={draft.ytFollowers}
                      onChange={(e) => setDraft({ ...draft, ytFollowers: e.target.value })}
                      className="input"
                      placeholder="0"
                    />
                  </Field>
                </div>
              </div>

              {!isNew && (
                <Field label="Stage">
                  <select
                    value={draft.stage}
                    onChange={(e) => setDraft({ ...draft, stage: e.target.value })}
                    className="input"
                  >
                    {CRM_STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Campaign (optional)">
                <select
                  value={draft.campaignName}
                  onChange={(e) => setDraft({ ...draft, campaignName: e.target.value })}
                  className="input"
                >
                  <option value="">Not linked to a campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Deal Amount (₹)">
                <input
                  type="number"
                  value={draft.rate}
                  onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
                  className="input"
                  placeholder="0"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Follow-up date">
                  <input
                    type="date"
                    value={draft.followUpDate}
                    onChange={(e) => setDraft({ ...draft, followUpDate: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Next action">
                  <input
                    value={draft.nextAction}
                    onChange={(e) => setDraft({ ...draft, nextAction: e.target.value })}
                    className="input"
                    placeholder="e.g. Send contract"
                  />
                </Field>
              </div>

              <Field label="Assigned to">
                {!showAddTeammate ? (
                  <div className="flex gap-2">
                    <select
                      value={draft.assignedTo}
                      onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })}
                      className="input flex-1"
                    >
                      <option value="">Unassigned</option>
                      {team.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowAddTeammate(true)}
                      className="px-2.5 border border-zinc-800 rounded-md text-zinc-400 hover:text-blue-400 hover:border-blue-500/50"
                      title="Add teammate"
                    >
                      <UserPlus size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newTeammate}
                      onChange={(e) => setNewTeammate(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTeammate()}
                      className="input flex-1"
                      placeholder="Teammate name"
                    />
                    <button
                      onClick={addTeammate}
                      className="px-3 bg-blue-600 text-white rounded-md text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <input
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                    className="input"
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    className="input"
                    placeholder="Optional"
                  />
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="input min-h-[80px] resize-none"
                  placeholder="Negotiation notes, deliverables, anything the team should know"
                />
              </Field>

              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={draft.includeInPipeline !== false}
                  onChange={(e) => setDraft({ ...draft, includeInPipeline: e.target.checked })}
                  className="accent-blue-600"
                />
                Show on Pipeline board (uncheck to keep this influencer in Directory only)
              </label>

              {!isNew && (
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!draft.dropped}
                    onChange={(e) => setDraft({ ...draft, dropped: e.target.checked })}
                    className="accent-blue-600"
                  />
                  Mark as dropped
                </label>
              )}
            </div>

            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-5 flex gap-2">
              <button
                onClick={saveDraft}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors"
              >
                {isNew ? "Add to pipeline" : "Save changes"}
              </button>
              {!isNew && (
                <button
                  onClick={deleteDraft}
                  className={`px-3 rounded-md border text-sm transition-colors ${
                    confirmDelete
                      ? "border-red-500 text-red-400 bg-red-500/10"
                      : "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                  }`}
                >
                  {confirmDelete ? "Confirm delete" : <Trash2 size={16} />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-800 text-sm px-4 py-2 rounded-md z-50">
          {toast}
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13.5px;
          color: #f4f4f5;
        }
        .input:focus { outline: none; border-color: #004DAC; }
        select.input { cursor: pointer; }
      `}</style>
    </div>
  );
}

// ---------- subcomponents ----------

function InfluencerCard({ inf, onClick, onMoveStage }) {
  const Icon = PLATFORM_ICONS[inf.platform] || Instagram;
  const idx = CRM_STAGES.findIndex((s) => s.key === inf.stage);
  const stale = daysSince(inf.stageUpdatedAt) >= 5 && inf.stage !== "paid";
  const followUpOverdue = inf.followUpDate && new Date(inf.followUpDate) < new Date(new Date().toDateString());

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", inf.id)}
      onClick={() => onClick(inf)}
      className="bg-zinc-900 border border-zinc-800 rounded-md p-3 cursor-pointer hover:border-zinc-800 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-300 flex-shrink-0">
            {initials(inf.name)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{inf.name}</div>
            <div className="text-xs text-zinc-500 truncate">{inf.handle}</div>
          </div>
        </div>
        <Icon size={14} className="text-zinc-500 flex-shrink-0 mt-1" />
      </div>

      {inf.campaignName && (
        <div className="text-[11px] text-zinc-600 mb-1.5 truncate">{inf.campaignName}</div>
      )}

      <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
        <span>{formatFollowers(inf.followers)} followers</span>
        <span className="text-blue-400">{formatINR(inf.rate)}</span>
      </div>

      {inf.nextAction && (
        <div className="text-[11px] text-zinc-400 mb-1.5 truncate">Next: {inf.nextAction}</div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{inf.category}</span>
        {followUpOverdue ? (
          <span className="flex items-center gap-1 text-[11px] text-red-400">
            <Clock size={11} />
            Follow-up overdue
          </span>
        ) : inf.followUpDate ? (
          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
            <Clock size={11} />
            {formatDate(inf.followUpDate)}
          </span>
        ) : stale ? (
          <span className="flex items-center gap-1 text-[11px] text-amber-400">
            <Clock size={11} />
            {daysSince(inf.stageUpdatedAt)}d
          </span>
        ) : (
          <span className="text-[11px] text-zinc-600">{inf.assignedTo || "Unassigned"}</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
        <button
          disabled={idx === 0}
          onClick={(e) => {
            e.stopPropagation();
            onMoveStage(inf.id, -1);
          }}
          className="text-zinc-500 hover:text-blue-400 disabled:opacity-20 disabled:hover:text-zinc-500"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-[10px] text-zinc-600">move stage</span>
        <button
          disabled={idx === CRM_STAGES.length - 1}
          onClick={(e) => {
            e.stopPropagation();
            onMoveStage(inf.id, 1);
          }}
          className="text-zinc-500 hover:text-blue-400 disabled:opacity-20 disabled:hover:text-zinc-500"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function PipelineBoard({ filtered, onCardClick, onMoveStage, onDrop, dragOverStage, setDragOverStage }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {CRM_STAGES.map((stage) => {
        const cards = filtered.filter((i) => i.stage === stage.key);
        return (
          <div
            key={stage.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage.key);
            }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => onDrop(stage.key, e)}
            className={`w-64 flex-shrink-0 rounded-md border transition-colors ${
              dragOverStage === stage.key ? "border-blue-500/60 bg-blue-600/5" : "border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
              <span className="text-sm font-medium">{stage.label}</span>
              <span className="text-xs text-zinc-500 bg-zinc-900 rounded px-1.5 py-0.5">{cards.length}</span>
            </div>
            <div className="p-2 flex flex-col gap-2 min-h-[80px]">
              {cards.length === 0 ? (
                <div className="border border-dashed border-zinc-800 rounded-md py-6 text-center text-xs text-zinc-600">
                  Drag a card here
                </div>
              ) : (
                cards.map((inf) => (
                  <InfluencerCard key={inf.id} inf={inf} onClick={onCardClick} onMoveStage={onMoveStage} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function platformsForInfluencer(inf) {
  const active = [];
  if (inf.igFollowers > 0) active.push("Instagram");
  if (inf.fbFollowers > 0) active.push("Facebook");
  if (inf.liFollowers > 0) active.push("LinkedIn");
  if (inf.xFollowers > 0) active.push("X");
  if (inf.ytFollowers > 0) active.push("YouTube");
  return active.length > 0 ? active.join(", ") : inf.platform;
}

function CRMDirectoryTable({ filtered, onRowClick, onTogglePipeline }) {
  if (filtered.length === 0) {
    return <div className="text-center text-zinc-600 text-sm py-16">No influencers match these filters.</div>;
  }
  return (
    <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-500 text-xs">
            <th rowSpan={2} className="text-left font-medium px-3 py-2.5 align-bottom">Name</th>
            <th rowSpan={2} className="text-left font-medium px-3 py-2.5 align-bottom">Platforms</th>
            <th rowSpan={2} className="text-left font-medium px-3 py-2.5 align-bottom">Category</th>
            <th colSpan={2} className="text-center font-medium px-3 py-1.5 border-b border-zinc-800">Followers</th>
            <th rowSpan={2} className="text-left font-medium px-3 py-2.5 align-bottom">City</th>
            <th rowSpan={2} className="text-left font-medium px-3 py-2.5 align-bottom">State</th>
            <th rowSpan={2} className="text-left font-medium px-3 py-2.5 align-bottom">Pipeline</th>
          </tr>
          <tr className="bg-zinc-900 text-zinc-500 text-xs">
            <th className="text-left font-medium px-2 py-1.5">IG</th>
            <th className="text-left font-medium px-2 py-1.5">YouTube</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((inf) => {
            const onPipeline = inf.includeInPipeline !== false;
            return (
              <tr
                key={inf.id}
                onClick={() => onRowClick(inf)}
                className="border-t border-zinc-800 hover:bg-zinc-900/60 cursor-pointer"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="font-medium">{inf.name}</div>
                    {!onPipeline && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">Directory only</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500">{inf.handle}</div>
                </td>
                <td className="px-3 py-2.5 text-zinc-400">{platformsForInfluencer(inf)}</td>
                <td className="px-3 py-2.5 text-zinc-400">{inf.category}</td>
                <td className="px-2 py-2.5 text-zinc-400">{inf.igFollowers ? formatFollowers(inf.igFollowers) : "—"}</td>
                <td className="px-2 py-2.5 text-zinc-400">{inf.ytFollowers ? formatFollowers(inf.ytFollowers) : "—"}</td>
                <td className="px-3 py-2.5 text-zinc-400">{inf.city || "—"}</td>
                <td className="px-3 py-2.5 text-zinc-400">{inf.state || "—"}</td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePipeline(inf.id);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      onPipeline
                        ? "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                        : "border-blue-500/50 text-blue-400 hover:bg-blue-600/10"
                    }`}
                  >
                    {onPipeline ? "Remove from Pipeline" : "Add to Pipeline"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ==================== CAMPAIGN MANAGEMENT MODULE ====================

// ---------- constants ----------

const CAMPAIGN_STATUSES = ["Planning", "Active", "Content Review", "Completed"];
const DELIVERABLE_TYPES = ["Reel", "Story", "YouTube Video", "Instagram Post", "Unboxing Video", "Live Stream"];
const DELIVERABLE_STATUSES = ["Not Started", "Draft Submitted", "Approved", "Posted", "Paid"];

const SEED_CAMPAIGNS = [
  {
    id: "camp-1",
    name: "Monsoon Commute Push",
    objective: "Drive awareness for waterproof e-cycle models ahead of monsoon season",
    startDate: daysFromNow(-10),
    endDate: daysFromNow(20),
    budget: 250000,
    status: "Active",
    notes: "Focus on Tier-1 city commuters. Prioritize video content over static posts.",
    createdAt: new Date().toISOString(),
    deliverables: [
      {
        id: "d1",
        influencerName: "Ishaan Verma",
        contentTypes: ["Reel"],
        dueDate: daysFromNow(-2),
        status: "Draft Submitted",
        postLinks: [],
        notes: "",
      },
      {
        id: "d2",
        influencerName: "Meera Kulkarni",
        contentTypes: ["YouTube Video"],
        dueDate: daysFromNow(5),
        status: "Not Started",
        postLinks: [],
        notes: "Waiting on contract signature.",
      },
      {
        id: "d3",
        influencerName: "Devansh Patil",
        contentTypes: ["Instagram Post", "Story"],
        dueDate: daysFromNow(-1),
        status: "Posted",
        postLinks: ["https://instagram.com/p/example"],
        notes: "",
      },
    ],
  },
  {
    id: "camp-2",
    name: "Diwali Launch 2026",
    objective: "Launch the new city commuter line during festive season",
    startDate: daysFromNow(15),
    endDate: daysFromNow(45),
    budget: 500000,
    status: "Planning",
    notes: "Bikes still in production, do not confirm shoot dates yet.",
    createdAt: new Date().toISOString(),
    deliverables: [],
  },
  {"id": "camp-facelift-pune", "name": "FaceLift - Pune", "objective": "", "startDate": "2026-09-19", "endDate": "2026-10-10", "budget": 0, "status": "Active", "notes": "Rebuilt from your exported deliverables (influencer, content type, due date, status). Budget, objective and post links weren't in that export — please fill them in.", "deliverables": [{"id": "del-facelift-pune-1", "influencerName": "Saurabh kurud", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-10", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-2", "influencerName": "Riya Singh", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-09", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-3", "influencerName": "Mitali Baisane", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-19", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-4", "influencerName": "Pawan Salunke", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-20", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-5", "influencerName": "Minal Naukariya", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-08", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-6", "influencerName": "justpune_", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-21", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-7", "influencerName": "Sumeet Kale", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-07", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-8", "influencerName": "Rahul Champawat", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-06", "status": "Draft Submitted", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-9", "influencerName": "Manish", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-05", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-10", "influencerName": "Joshini", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-04", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-11", "influencerName": "Prasad", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-22", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-12", "influencerName": "goldenshadesoflife", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-03", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-13", "influencerName": "Tejaswini", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-02", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-14", "influencerName": "Avishkar", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-23", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-15", "influencerName": "Charandeep Singh", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-24", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-16", "influencerName": "Prasad", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-25", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-17", "influencerName": "Varsha", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-02", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-18", "influencerName": "Barkat", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-02", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-19", "influencerName": "Rakesh Choudhary", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-03", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-20", "influencerName": "Shubham Jagdale", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-01", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-21", "influencerName": "Rohan Dalpe", "contentTypes": ["YouTube Video", "Reel"], "dueDate": "2026-10-04", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-22", "influencerName": "Pavan Nayak", "contentTypes": ["Reel"], "dueDate": "2026-10-05", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-23", "influencerName": "Preeti Singh", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-06", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-24", "influencerName": "Mayur Valkunde", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-05", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-pune-25", "influencerName": "Swapnil Valkunde", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-04", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}]},
  {"id": "camp-facelift-delhi", "name": "FaceLift - Delhi", "objective": "", "startDate": "2026-09-19", "endDate": "2026-10-11", "budget": 0, "status": "Active", "notes": "Rebuilt from your exported deliverables (influencer, content type, due date, status). Budget, objective and post links weren't in that export — please fill them in.", "deliverables": [{"id": "del-facelift-delhi-1", "influencerName": "Manish Upadhyay", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-01", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-2", "influencerName": "Sachin Tyagi", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-09", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-3", "influencerName": "Uzaim Malik", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-26", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-4", "influencerName": "Nawab Adnan", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-29", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-5", "influencerName": "Adil malik", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-02", "status": "Draft Submitted", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-6", "influencerName": "Vaibhav Malik", "contentTypes": ["Story", "Reel"], "dueDate": "2026-09-21", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-7", "influencerName": "Simmi Gupta", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-21", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-8", "influencerName": "Dishu khanna", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-19", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-9", "influencerName": "Apple tiwari", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-28", "status": "Draft Submitted", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-10", "influencerName": "Atul Chaurasiya", "contentTypes": ["Story", "Reel"], "dueDate": "2026-10-11", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-11", "influencerName": "Nikhil Dhingra", "contentTypes": ["Reel", "Story"], "dueDate": "2026-10-05", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-12", "influencerName": "Chayan Sharma", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-22", "status": "Draft Submitted", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-13", "influencerName": "Piyush Sahu", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-27", "status": "Draft Submitted", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-14", "influencerName": "Ajay Sagar", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-20", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-15", "influencerName": "Siddharth singh", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-24", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-16", "influencerName": "Kamya Singh", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-25", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-17", "influencerName": "Ankur Sharma", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-30", "status": "Draft Submitted", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-delhi-18", "influencerName": "Akshat Sharma", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-23", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}]},
  {"id": "camp-facelift-bangalore", "name": "FaceLift - Bangalore", "objective": "", "startDate": "2026-09-19", "endDate": "2026-10-07", "budget": 0, "status": "Active", "notes": "Rebuilt from your exported deliverables (influencer, content type, due date, status). Budget, objective and post links weren't in that export — please fill them in.", "deliverables": [{"id": "del-facelift-bangalore-1", "influencerName": "Swati", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-19", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-2", "influencerName": "Nitisha", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-20", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-3", "influencerName": "Anusha", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-21", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-4", "influencerName": "Ankita", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-22", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-5", "influencerName": "Akansha", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-23", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-6", "influencerName": "Aditi Gupta", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-24", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-7", "influencerName": "Anandita Banerjee", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-22", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-8", "influencerName": "Abdul Shafi", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-26", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-9", "influencerName": "Shahid (poc - salman)", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-27", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-10", "influencerName": "Salman", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-28", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-11", "influencerName": "_mithali_krishnan", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-29", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-12", "influencerName": "Snigdha (Friend of Adarsh)", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-30", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-13", "influencerName": "Ashlyn Sam", "contentTypes": ["Instagram Post"], "dueDate": "2026-10-01", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-14", "influencerName": "Adarsh Kumar Barnwal", "contentTypes": ["Instagram Post"], "dueDate": "2026-10-02", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-15", "influencerName": "Santosh", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-29", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-16", "influencerName": "Preet Supravan", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-29", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-17", "influencerName": "Vikrant", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-26", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-18", "influencerName": "Raghav", "contentTypes": ["Instagram Post"], "dueDate": "2026-10-03", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-19", "influencerName": "Ankith", "contentTypes": ["Instagram Post"], "dueDate": "2026-10-04", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-20", "influencerName": "Gautam", "contentTypes": ["Instagram Post"], "dueDate": "2026-10-05", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-21", "influencerName": "Mohan Jayanna", "contentTypes": ["Instagram Post", "YouTube Video"], "dueDate": "2026-10-06", "status": "Not Started", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-22", "influencerName": "Manjula Patil", "contentTypes": ["Instagram Post"], "dueDate": "2026-10-07", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-23", "influencerName": "Arun Kumar", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-19", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-24", "influencerName": "Aashira Singh", "contentTypes": ["Instagram Post"], "dueDate": "2026-09-24", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}, {"id": "del-facelift-bangalore-25", "influencerName": "HarshVardhan", "contentTypes": ["Reel", "Story"], "dueDate": "2026-09-23", "status": "Approved", "postLinks": [], "views": 0, "likes": 0, "comments": 0, "cost": 0, "notes": ""}]}
];

// ---------- helpers ----------

function isOverdue(dueDate, status) {
  if (!dueDate) return false;
  if (status === "Posted" || status === "Paid") return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function daysUntil(dueDate) {
  const diff = new Date(dueDate) - new Date(new Date().toDateString());
  return Math.round(diff / 86400000);
}

function emptyCampaignDraft() {
  return {
    id: null,
    name: "",
    objective: "",
    startDate: daysFromNow(0),
    endDate: daysFromNow(30),
    budget: "",
    status: "Planning",
    notes: "",
  };
}

function emptyDeliverableDraft() {
  return {
    id: null,
    influencerName: "",
    useOther: false,
    contentTypes: [],
    dueDate: daysFromNow(7),
    status: "Not Started",
    postLinks: [""],
    views: "",
    likes: "",
    comments: "",
    cost: "",
    notes: "",
  };
}

// ---------- main component ----------

function EMotoradCampaignManagement() {
  const [campaigns, setCampaigns] = useState([]);
  const [crmInfluencers, setCrmInfluencers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [monthlyTrackingRecords, setMonthlyTrackingRecords] = useState([]);
  const [performanceEntries, setPerformanceEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("list"); // list | detail
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(emptyCampaignDraft());
  const [isNew, setIsNew] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState("");

  const [deliverableForm, setDeliverableForm] = useState(null); // null = closed, else draft object
  const [confirmDeleteDeliverable, setConfirmDeleteDeliverable] = useState(null);

  // load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let loadedCampaigns = null;
      let loadedInfluencers = null;
      try {
        const res = await window.storage.get(CAMPAIGNS_KEY, true);
        if (res && res.value) loadedCampaigns = JSON.parse(res.value);
      } catch (e) {
        loadedCampaigns = null;
      }
      try {
        const res2 = await window.storage.get(INFLUENCERS_KEY, true);
        if (res2 && res2.value) loadedInfluencers = JSON.parse(res2.value);
      } catch (e) {
        loadedInfluencers = null;
      }
      let loadedPayments = null;
      try {
        const res3 = await window.storage.get(PAYMENTS_KEY, true);
        if (res3 && res3.value) loadedPayments = JSON.parse(res3.value);
      } catch (e) {
        loadedPayments = null;
      }
      let loadedMonthlyTracking = null;
      try {
        const res4 = await window.storage.get(MONTHLY_TRACKING_KEY, true);
        if (res4 && res4.value) loadedMonthlyTracking = JSON.parse(res4.value);
      } catch (e) {
        loadedMonthlyTracking = null;
      }
      let loadedPerformanceEntries = null;
      try {
        const res5 = await window.storage.get(PERFORMANCE_KEY, true);
        if (res5 && res5.value) loadedPerformanceEntries = JSON.parse(res5.value);
      } catch (e) {
        loadedPerformanceEntries = null;
      }
      if (cancelled) return;
      if (loadedCampaigns) {
        setCampaigns(loadedCampaigns);
      } else {
        setCampaigns(SEED_CAMPAIGNS);
        try {
          await window.storage.set(CAMPAIGNS_KEY, JSON.stringify(SEED_CAMPAIGNS), true);
        } catch (e) {}
      }
      setCrmInfluencers(loadedInfluencers || []);
      if (loadedPayments) {
        setPayments(loadedPayments);
      } else {
        setPayments(SEED_PAYMENTS);
        try {
          await window.storage.set(PAYMENTS_KEY, JSON.stringify(SEED_PAYMENTS), true);
        } catch (e) {}
      }
      if (loadedMonthlyTracking) {
        setMonthlyTrackingRecords(loadedMonthlyTracking);
      } else {
        setMonthlyTrackingRecords(SEED_MONTHLY_TRACKING);
        try {
          await window.storage.set(MONTHLY_TRACKING_KEY, JSON.stringify(SEED_MONTHLY_TRACKING), true);
        } catch (e) {}
      }
      if (loadedPerformanceEntries) {
        setPerformanceEntries(loadedPerformanceEntries);
      } else {
        setPerformanceEntries(SEED_ENTRIES);
        try {
          await window.storage.set(PERFORMANCE_KEY, JSON.stringify(SEED_ENTRIES), true);
        } catch (e) {}
      }
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next) => {
    setCampaigns(next);
    try {
      const res = await window.storage.set(CAMPAIGNS_KEY, JSON.stringify(next), true);
      if (!res) showToast("Couldn't save — try again");
    } catch (e) {
      showToast("Couldn't save — try again");
    }
  }, []);

  const persistCrmInfluencers = useCallback(async (next) => {
    setCrmInfluencers(next);
    try {
      await window.storage.set(INFLUENCERS_KEY, JSON.stringify(next), true);
    } catch (e) {}
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  // Deliverables can reference an influencer either by picking one from CRM,
  // or by typing a name manually — and CRM's own data can change later. This
  // finds any name used in a deliverable that no longer has a matching CRM
  // entry, so nothing referenced in a campaign silently disappears from the
  // Directory.
  const orphanedInfluencers = useMemo(() => {
    const crmNames = new Set(crmInfluencers.map((i) => i.name.trim().toLowerCase()));
    const found = new Set();
    campaigns.forEach((c) => {
      (c.deliverables || []).forEach((d) => {
        const name = (d.influencerName || "").trim();
        if (name && !crmNames.has(name.toLowerCase())) found.add(name);
      });
    });
    return Array.from(found);
  }, [campaigns, crmInfluencers]);

  function restoreMissingInfluencers() {
    if (orphanedInfluencers.length === 0) return;
    const now = new Date().toISOString();
    const newRecords = orphanedInfluencers.map((name) => ({
      id: "restored-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
      name,
      handle: "",
      platform: "Instagram",
      category: "General",
      followers: 0,
      igFollowers: 0,
      fbFollowers: 0,
      liFollowers: 0,
      xFollowers: 0,
      ytFollowers: 0,
      city: "",
      state: "",
      stage: "contracted",
      rate: "",
      campaignName: "",
      followUpDate: "",
      nextAction: "",
      assignedTo: "",
      phone: "",
      email: "",
      notes: "Restored automatically — was referenced in a campaign deliverable but missing from the Directory.",
      stageUpdatedAt: now,
      createdAt: now,
      dropped: false,
      includeInPipeline: false,
    }));
    persistCrmInfluencers([...crmInfluencers, ...newRecords]);
    showToast(`Restored ${newRecords.length} influencer${newRecords.length > 1 ? "s" : ""} to CRM Directory`);
  }

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedId) || null,
    [campaigns, selectedId]
  );

  const resolvePayment = useMemo(() => makePaymentResolver(payments, campaigns), [payments, campaigns]);
  usePaymentsRefresh(setPayments);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [campaigns, filterStatus, search]);

  // The stats strip is shared between the list, schedule, and detail views —
  // when a specific campaign is open, scope every number to just that
  // campaign; otherwise show the aggregate across whatever is filtered.
  const statsSource = view === "detail" && selectedCampaign ? [selectedCampaign] : filtered;

  const globalStats = useMemo(() => {
    const active = statsSource.filter((c) => c.status === "Active").length;
    const committed = statsSource
      .filter((c) => c.status !== "Completed")
      .reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
    let dueThisWeek = 0;
    let totalDeliverables = 0;
    let doneDeliverables = 0;
    statsSource.forEach((c) => {
      (c.deliverables || []).forEach((d) => {
        totalDeliverables += 1;
        if (d.status === "Posted" || d.status === "Paid") doneDeliverables += 1;
        const days = daysUntil(d.dueDate);
        if (days >= 0 && days <= 7 && d.status !== "Posted" && d.status !== "Paid") dueThisWeek += 1;
      });
    });
    const completionRate = totalDeliverables > 0 ? Math.round((doneDeliverables / totalDeliverables) * 100) : 0;
    return { active, committed, dueThisWeek, completionRate };
  }, [statsSource]);

  // ---------- campaign actions ----------

  function openAddCampaign() {
    setDraft(emptyCampaignDraft());
    setIsNew(true);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function openEditCampaign(c) {
    setDraft({ ...c, budget: String(c.budget) });
    setIsNew(false);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function saveCampaign() {
    if (!draft.name.trim()) {
      showToast("Campaign name is required");
      return;
    }
    if (isNew) {
      const record = {
        ...draft,
        id: "camp-" + Date.now(),
        budget: Number(draft.budget) || 0,
        createdAt: new Date().toISOString(),
        deliverables: [],
      };
      persist([record, ...campaigns]);
      showToast("Campaign created");
    } else {
      const next = campaigns.map((c) =>
        c.id === draft.id ? { ...c, ...draft, budget: Number(draft.budget) || 0 } : c
      );
      persist(next);
      showToast("Campaign updated");
    }
    closeDrawer();
  }

  function deleteCampaign() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    persist(campaigns.filter((c) => c.id !== draft.id));
    showToast("Campaign deleted");
    closeDrawer();
    if (selectedId === draft.id) {
      setView("list");
      setSelectedId(null);
    }
  }

  function openCampaignDetail(id) {
    setSelectedId(id);
    setView("detail");
  }

  // ---------- deliverable actions ----------

  function openAddDeliverable() {
    setDeliverableForm(emptyDeliverableDraft());
  }

  function openEditDeliverable(d) {
    const isKnown = crmInfluencers.some((i) => i.name === d.influencerName);
    const postLinks = d.postLinks && d.postLinks.length > 0 ? d.postLinks : [""];
    setDeliverableForm({
      ...d,
      contentTypes: d.contentTypes || [],
      postLinks,
      useOther: !isKnown,
      views: d.views ? String(d.views) : "",
      likes: d.likes ? String(d.likes) : "",
      comments: d.comments ? String(d.comments) : "",
      cost: d.cost ? String(d.cost) : "",
    });
  }

  function toggleDeliverableContentType(type) {
    setDeliverableForm((f) => {
      const has = f.contentTypes.includes(type);
      return {
        ...f,
        contentTypes: has ? f.contentTypes.filter((t) => t !== type) : [...f.contentTypes, type],
      };
    });
  }

  function setDeliverableLink(index, value) {
    setDeliverableForm((f) => {
      const next = [...f.postLinks];
      next[index] = value;
      return { ...f, postLinks: next };
    });
  }

  function addDeliverableLink() {
    setDeliverableForm((f) => ({ ...f, postLinks: [...f.postLinks, ""] }));
  }

  function removeDeliverableLink(index) {
    setDeliverableForm((f) => ({ ...f, postLinks: f.postLinks.filter((_, i) => i !== index) }));
  }

  function saveDeliverable() {
    if (!deliverableForm.influencerName.trim()) {
      showToast("Pick or enter an influencer");
      return;
    }
    const record = {
      id: deliverableForm.id || "del-" + Date.now(),
      influencerName: deliverableForm.influencerName,
      contentTypes: deliverableForm.contentTypes,
      dueDate: deliverableForm.dueDate,
      status: deliverableForm.status,
      postLinks: deliverableForm.postLinks.map((l) => cleanVideoUrl(l)).filter(Boolean),
      views: Number(deliverableForm.views) || 0,
      likes: Number(deliverableForm.likes) || 0,
      comments: Number(deliverableForm.comments) || 0,
      cost: Number(deliverableForm.cost) || 0,
      notes: deliverableForm.notes,
    };
    const next = campaigns.map((c) => {
      if (c.id !== selectedCampaign.id) return c;
      const exists = (c.deliverables || []).some((d) => d.id === record.id);
      const nextDeliverables = exists
        ? c.deliverables.map((d) => (d.id === record.id ? record : d))
        : [...(c.deliverables || []), record];
      return { ...c, deliverables: nextDeliverables };
    });
    persist(next);
    setDeliverableForm(null);
    showToast(exists_msg(deliverableForm.id));
  }

  function exists_msg(id) {
    return id ? "Deliverable updated" : "Deliverable added";
  }

  function deleteDeliverable(id) {
    if (confirmDeleteDeliverable !== id) {
      setConfirmDeleteDeliverable(id);
      return;
    }
    const next = campaigns.map((c) =>
      c.id === selectedCampaign.id
        ? { ...c, deliverables: c.deliverables.filter((d) => d.id !== id) }
        : c
    );
    persist(next);
    setConfirmDeleteDeliverable(null);
    showToast("Deliverable removed");
  }

  function quickStatusChange(deliverableId, status) {
    const next = campaigns.map((c) =>
      c.id === selectedCampaign.id
        ? {
            ...c,
            deliverables: c.deliverables.map((d) =>
              d.id === deliverableId ? { ...d, status } : d
            ),
          }
        : c
    );
    persist(next);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading campaigns…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .input {
          width: 100%;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13.5px;
          color: #f4f4f5;
        }
        .input:focus { outline: none; border-color: #004DAC; }
      `}</style>

      {/* top bar */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="font-display font-semibold text-lg">Campaign Management</div>
        {view === "list" && (
          <button
            onClick={openAddCampaign}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            New campaign
          </button>
        )}
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800">
        <StatBlock label="Active campaigns" value={globalStats.active} accent />
        <StatBlock label="Budget committed" value={formatINR(globalStats.committed)} />
        <StatBlock label="Deliverables due (7d)" value={globalStats.dueThisWeek} />
        <StatBlock label="Overall completion" value={globalStats.completionRate + "%"} />
      </div>

      {view !== "detail" && (
        <div className="px-6 py-4 flex items-center gap-3 border-b border-zinc-800">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
            <TabButton active={view === "list"} onClick={() => setView("list")} icon={LayoutGrid}>
              Campaigns
            </TabButton>
            <TabButton active={view === "schedule"} onClick={() => setView("schedule")} icon={Calendar}>
              Posting Schedule
            </TabButton>
          </div>
        </div>
      )}

      {view === "list" ? (
        <div className="px-6 py-5">
          {orphanedInfluencers.length > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap bg-amber-400/10 border border-amber-400/30 rounded-md px-4 py-3 mb-4">
              <div className="text-sm text-amber-400">
                {orphanedInfluencers.length} influencer{orphanedInfluencers.length > 1 ? "s" : ""} referenced in your
                campaigns {orphanedInfluencers.length > 1 ? "aren't" : "isn't"} in the CRM Directory:{" "}
                <span className="text-zinc-300">{orphanedInfluencers.join(", ")}</span>
              </div>
              <button
                onClick={restoreMissingInfluencers}
                className="flex-shrink-0 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-medium text-xs px-3 py-1.5 rounded-md transition-colors"
              >
                Restore to CRM Directory
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <Select value={filterStatus} onChange={setFilterStatus} options={["all", ...CAMPAIGN_STATUSES]} labelAll="All statuses" />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center text-zinc-600 text-sm py-16">
              No campaigns yet. Click "New campaign" to plan your first one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <CampaignCard key={c.id} campaign={c} onClick={() => openCampaignDetail(c.id)} />
              ))}
            </div>
          )}
        </div>
      ) : view === "schedule" ? (
        <PostingScheduleView campaigns={campaigns} resolvePayment={resolvePayment} />
      ) : (
        selectedCampaign && (
          <CampaignDetail
            campaign={selectedCampaign}
            onBack={() => {
              setView("list");
              setSelectedId(null);
            }}
            onEdit={() => openEditCampaign(selectedCampaign)}
            onAddDeliverable={openAddDeliverable}
            onEditDeliverable={openEditDeliverable}
            onDeleteDeliverable={deleteDeliverable}
            confirmDeleteDeliverable={confirmDeleteDeliverable}
            onQuickStatus={quickStatusChange}
            resolvePayment={resolvePayment}
            monthlyTrackingRecords={monthlyTrackingRecords}
            performanceEntries={performanceEntries}
          />
        )
      )}

      {/* campaign drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">{isNew ? "New campaign" : "Edit campaign"}</div>
              <button onClick={closeDrawer} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <Field label="Campaign name">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Diwali Launch 2026"
                />
              </Field>

              <Field label="Objective">
                <textarea
                  value={draft.objective}
                  onChange={(e) => setDraft({ ...draft, objective: e.target.value })}
                  className="input min-h-[60px] resize-none"
                  placeholder="What is this campaign trying to achieve?"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date">
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="End date">
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Budget (₹)">
                  <input
                    type="number"
                    value={draft.budget}
                    onChange={(e) => setDraft({ ...draft, budget: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                    className="input"
                  >
                    {CAMPAIGN_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Notes">
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="input min-h-[70px] resize-none"
                  placeholder="Anything the team should know"
                />
              </Field>
            </div>

            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-5 flex gap-2">
              <button
                onClick={saveCampaign}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors"
              >
                {isNew ? "Create campaign" : "Save changes"}
              </button>
              {!isNew && (
                <button
                  onClick={deleteCampaign}
                  className={`px-3 rounded-md border text-sm transition-colors ${
                    confirmDelete
                      ? "border-red-500 text-red-400 bg-red-500/10"
                      : "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                  }`}
                >
                  {confirmDelete ? "Confirm delete" : <Trash2 size={16} />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* deliverable drawer */}
      {deliverableForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setDeliverableForm(null)} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">
                {deliverableForm.id ? "Edit deliverable" : "Add deliverable"}
              </div>
              <button onClick={() => setDeliverableForm(null)} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <Field label="Influencer">
                {!deliverableForm.useOther ? (
                  <select
                    value={deliverableForm.influencerName}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setDeliverableForm({ ...deliverableForm, useOther: true, influencerName: "" });
                      } else {
                        setDeliverableForm({ ...deliverableForm, influencerName: e.target.value });
                      }
                    }}
                    className="input"
                  >
                    <option value="">Select from CRM</option>
                    {crmInfluencers.map((i) => (
                      <option key={i.id} value={i.name}>
                        {i.name}
                      </option>
                    ))}
                    <option value="__other__">Other (type manually)</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={deliverableForm.influencerName}
                      onChange={(e) => setDeliverableForm({ ...deliverableForm, influencerName: e.target.value })}
                      className="input"
                      placeholder="Influencer name"
                      autoFocus
                    />
                    <button
                      onClick={() => setDeliverableForm({ ...deliverableForm, useOther: false, influencerName: "" })}
                      className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap px-2"
                    >
                      Use CRM list
                    </button>
                  </div>
                )}
              </Field>

              <Field label="Content type / deliverables (select all that apply)">
                <div className="flex flex-wrap gap-2">
                  {DELIVERABLE_TYPES.map((t) => {
                    const active = deliverableForm.contentTypes.includes(t);
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => toggleDeliverableContentType(t)}
                        className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                          active
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "border-zinc-800 text-zinc-400 hover:border-zinc-800"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Due date">
                  <input
                    type="date"
                    value={deliverableForm.dueDate}
                    onChange={(e) => setDeliverableForm({ ...deliverableForm, dueDate: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={deliverableForm.status}
                    onChange={(e) => setDeliverableForm({ ...deliverableForm, status: e.target.value })}
                    className="input"
                  >
                    {DELIVERABLE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Post / live links">
                <div className="flex flex-col gap-2">
                  {deliverableForm.postLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={link}
                        onChange={(e) => setDeliverableLink(idx, e.target.value)}
                        className="input"
                        placeholder="Optional, once live"
                      />
                      {deliverableForm.postLinks.length > 1 && (
                        <button
                          onClick={() => removeDeliverableLink(idx)}
                          className="px-2.5 border border-zinc-800 rounded-md text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addDeliverableLink}
                    className="text-xs text-zinc-500 hover:text-blue-400 flex items-center gap-1 self-start"
                  >
                    <Plus size={12} />
                    Add another link
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Views">
                  <input
                    type="number"
                    value={deliverableForm.views}
                    onChange={(e) => setDeliverableForm({ ...deliverableForm, views: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Likes">
                  <input
                    type="number"
                    value={deliverableForm.likes}
                    onChange={(e) => setDeliverableForm({ ...deliverableForm, likes: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Comments">
                  <input
                    type="number"
                    value={deliverableForm.comments}
                    onChange={(e) => setDeliverableForm({ ...deliverableForm, comments: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Cost (₹)">
                  <input
                    type="number"
                    value={deliverableForm.cost}
                    onChange={(e) => setDeliverableForm({ ...deliverableForm, cost: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
              </div>
              <div className="text-[11px] text-zinc-600 -mt-2">
                Fill these in once the post is live. Only enter them here if this post isn't already logged in
                Monthly Tracking — entering it in both places would count it twice in Performance.
              </div>

              <Field label="Notes">
                <textarea
                  value={deliverableForm.notes}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, notes: e.target.value })}
                  className="input min-h-[60px] resize-none"
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-5">
              <button
                onClick={saveDeliverable}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors"
              >
                {deliverableForm.id ? "Save changes" : "Add deliverable"}
              </button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-800 text-sm px-4 py-2 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------- subcomponents ----------

function PostingScheduleView({ campaigns, resolvePayment }) {
  const [search, setSearch] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const allRows = useMemo(() => {
    const rows = [];
    campaigns.forEach((c) => {
      (c.deliverables || []).forEach((d) => {
        rows.push({
          id: d.id,
          date: d.dueDate,
          campaign: c.name,
          influencer: d.influencerName,
          contentType: (d.contentTypes || []).join(", "),
          status: d.status,
          paymentStatus: resolvePayment(d.influencerName, c.name),
        });
      });
    });
    return rows.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [campaigns, resolvePayment]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (filterCampaign !== "all" && r.campaign !== filterCampaign) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (search.trim() && !r.influencer.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [allRows, filterCampaign, filterStatus, search]);

  function exportSchedule() {
    const headers = ["Date", "Campaign", "Influencer", "Content Type", "Status", "Payment Status"];
    const rows = filtered.map((r) => [formatDate(r.date), r.campaign, r.influencer, r.contentType, r.status, r.paymentStatus === null ? "—" : r.paymentStatus]);
    downloadCSV("posting-schedule.csv", headers, rows);
  }

  const campaignNames = Array.from(new Set(campaigns.map((c) => c.name)));

  return (
    <div className="px-6 py-5">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search influencer"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <Select value={filterCampaign} onChange={setFilterCampaign} options={["all", ...campaignNames]} labelAll="All campaigns" />
        <Select value={filterStatus} onChange={setFilterStatus} options={["all", ...DELIVERABLE_STATUSES]} labelAll="All statuses" />
        <button
          onClick={exportSchedule}
          className="flex items-center gap-1.5 border border-zinc-800 hover:border-zinc-600 text-zinc-300 text-sm px-3 py-1.5 rounded-md transition-colors ml-auto"
        >
          <Download size={14} />
          Download CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-zinc-600 text-sm py-16">
          No posting dates found. Deliverables you add across your campaigns will show up here automatically.
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-500 text-xs">
                <th className="text-left font-medium px-3 py-2.5">Date</th>
                <th className="text-left font-medium px-3 py-2.5">Campaign</th>
                <th className="text-left font-medium px-3 py-2.5">Influencer</th>
                <th className="text-left font-medium px-3 py-2.5">Content Type</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-left font-medium px-3 py-2.5">Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2.5 text-zinc-400">{formatDate(r.date)}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{r.campaign}</td>
                  <td className="px-3 py-2.5 font-medium">{r.influencer}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{r.contentType || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">{r.status}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <PaymentStatusBadge status={r.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="text-[11px] text-zinc-600 mt-3">
        Pulled live from every campaign's deliverables — add or edit a deliverable in the Campaigns view and it
        updates here automatically, no need to enter it twice.
      </div>
    </div>
  );
}

function statusBorderColor(status) {
  if (status === "Active") return "border-blue-500/50";
  if (status === "Content Review") return "border-amber-400/50";
  if (status === "Completed") return "border-zinc-800";
  return "border-zinc-800";
}

function CampaignCard({ campaign, onClick }) {
  const total = (campaign.deliverables || []).length;
  const done = (campaign.deliverables || []).filter((d) => d.status === "Posted" || d.status === "Paid").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdueCount = (campaign.deliverables || []).filter((d) => isOverdue(d.dueDate, d.status)).length;
  const uniqueInfluencers = new Set((campaign.deliverables || []).map((d) => d.influencerName)).size;

  return (
    <div
      onClick={onClick}
      className={`bg-zinc-900 border rounded-md p-4 cursor-pointer hover:border-zinc-800 transition-colors ${statusBorderColor(
        campaign.status
      )} ${campaign.status === "Completed" ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium text-sm truncate">{campaign.name}</div>
        <span className="text-[11px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded whitespace-nowrap">
          {campaign.status}
        </span>
      </div>

      <div className="text-xs text-zinc-500 mb-3 line-clamp-2">{campaign.objective || "No objective set."}</div>

      <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {formatDate(campaign.startDate)}
        </span>
        <span className="flex items-center gap-1">
          <IndianRupee size={12} />
          {formatINR(campaign.budget)}
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {uniqueInfluencers}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
        <span>
          {done}/{total} deliverables posted
        </span>
        {overdueCount > 0 && (
          <span className="flex items-center gap-1 text-amber-400">
            <AlertCircle size={11} />
            {overdueCount} overdue
          </span>
        )}
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full" style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

function CampaignDetail({
  campaign,
  onBack,
  onEdit,
  onAddDeliverable,
  onEditDeliverable,
  onDeleteDeliverable,
  confirmDeleteDeliverable,
  onQuickStatus,
  resolvePayment,
  monthlyTrackingRecords,
  performanceEntries,
}) {
  const [filterDeliverableStatus, setFilterDeliverableStatus] = useState("all");
  const [perfMonth, setPerfMonth] = useState("all");
  const deliverables = campaign.deliverables || [];
  const filteredDeliverables = useMemo(
    () => deliverables.filter((d) => filterDeliverableStatus === "all" || d.status === filterDeliverableStatus),
    [deliverables, filterDeliverableStatus]
  );

  // Performance for this one campaign — read live from Monthly Tracking and
  // Performance's own logged entries (the same two sources Performance's
  // Overview combines), scoped to just this campaign's name. Nothing is
  // stored here separately, so there's no duplicate data and no risk of
  // double-counting.
  const campaignActivity = useMemo(() => {
    // Same rules as the Performance dashboard so the numbers always agree:
    // campaign names that differ only by capitalization/spacing are the same
    // campaign, and a post is counted once even if it exists in more than one
    // place (Monthly Tracking first, then Performance's own entries, then a
    // deliverable entered here).
    const thisKey = campaignKey(campaign.name);
    const sameCampaign = (n) => thisKey !== "" && campaignKey(n) === thisKey;
    const seen = new Set();

    const trackingRows = (monthlyTrackingRecords || []).filter((r) => sameCampaign(r.campaignName));
    trackingRows.forEach((r) => postKeys(r.contentLink, r.influencerName, r.date, r.views).forEach((k) => seen.add(k)));
    const fromTracking = trackingRows.map((r) => ({
      date: r.date, views: r.views, likes: r.likes, comments: r.comments, shares: r.shares, spend: r.spend || 0,
    }));

    const fromPerformance = keepNewPosts(
      (performanceEntries || []).filter((e) => sameCampaign(e.campaignName)),
      seen,
      (e) => postKeys(e.postLink, e.influencerName, e.postDate, e.views)
    ).map((e) => ({
      date: e.postDate, views: e.views, likes: e.likes, comments: e.comments, shares: e.shares, spend: e.spend || 0,
    }));

    // Deliverables with Views/Likes/Comments/Cost filled in (entered right
    // here in Campaigns) count too, dated by their due date.
    const fromDeliverables = keepNewPosts(
      (campaign.deliverables || []).filter((d) => d.views || d.likes || d.comments || d.cost),
      seen,
      (d) =>
        [...(d.postLinks || []).map(postLinkKey).filter(Boolean), postFingerprint(d.influencerName, d.dueDate, d.views)].filter(Boolean)
    ).map((d) => ({
      date: d.dueDate, views: d.views || 0, likes: d.likes || 0, comments: d.comments || 0, shares: 0, spend: d.cost || 0,
    }));

    return [...fromTracking, ...fromPerformance, ...fromDeliverables];
  }, [monthlyTrackingRecords, performanceEntries, campaign.name, campaign.deliverables]);

  const perfAvailableMonths = useMemo(() => {
    const set = new Set(campaignActivity.map((a) => monthKey(a.date)).filter(isPlausibleMonthKey));
    return Array.from(set).sort();
  }, [campaignActivity]);

  const perfMonthLabels = useMemo(() => {
    const map = {};
    perfAvailableMonths.forEach((k) => (map[k] = monthLabelFromKey(k)));
    return map;
  }, [perfAvailableMonths]);

  const filteredActivity = useMemo(() => {
    if (perfMonth === "all") return campaignActivity;
    return campaignActivity.filter((a) => monthKey(a.date) === perfMonth);
  }, [campaignActivity, perfMonth]);

  const perfStats = useMemo(() => {
    const views = filteredActivity.reduce((s, a) => s + (Number(a.views) || 0), 0);
    const likes = filteredActivity.reduce((s, a) => s + (Number(a.likes) || 0), 0);
    const comments = filteredActivity.reduce((s, a) => s + (Number(a.comments) || 0), 0);
    const shares = filteredActivity.reduce((s, a) => s + (Number(a.shares) || 0), 0);
    const cost = filteredActivity.reduce((s, a) => s + (Number(a.spend) || 0), 0);
    const engagement = likes + comments + shares;
    const cpv = views > 0 && cost > 0 ? cost / views : null;
    return { views, likes, comments, engagement, cost, cpv };
  }, [filteredActivity]);

  function exportDeliverables() {
    const headers = ["Campaign", "Influencer", "Content Type", "Due Date", "Status", "Payment Status", "Views", "Likes", "Comments", "Cost", "Links"];
    const rows = filteredDeliverables.map((d) => {
      const paymentStatus = resolvePayment(d.influencerName, campaign.name);
      return [
        campaign.name,
        d.influencerName,
        (d.contentTypes || []).join(", "),
        d.dueDate,
        d.status,
        paymentStatus === null ? "—" : paymentStatus,
        d.views || 0,
        d.likes || 0,
        d.comments || 0,
        d.cost || 0,
        (d.postLinks || []).join(" | "),
      ];
    });
    const safeName = campaign.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    downloadCSV(`${safeName}-deliverables.csv`, headers, rows);
  }

  return (
    <div className="px-6 py-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 mb-4">
        <ChevronLeft size={15} />
        All campaigns
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-xl font-semibold">{campaign.name}</h1>
            <span className="text-[11px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{campaign.status}</span>
          </div>
          <p className="text-sm text-zinc-500 max-w-lg">{campaign.objective || "No objective set."}</p>
          <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <IndianRupee size={12} />
              {formatINR(campaign.budget)} budget
            </span>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-sm px-3 py-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-800"
        >
          Edit campaign
        </button>
      </div>

      {campaign.notes && (
        <div className="text-sm text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-md p-3 mb-5">
          {campaign.notes}
        </div>
      )}

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-display font-semibold text-sm">Performance</h2>
        <Select
          value={perfMonth}
          onChange={setPerfMonth}
          options={["all", ...perfAvailableMonths]}
          labelAll="All time"
          labelMap={perfMonthLabels}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatBlock label="Views" value={formatNumber(perfStats.views)} accent />
        <StatBlock label="Likes" value={formatNumber(perfStats.likes)} />
        <StatBlock label="Comments" value={formatNumber(perfStats.comments)} />
        <StatBlock label="Engagement" value={formatNumber(perfStats.engagement)} />
        <StatBlock label="Cost" value={formatINR(perfStats.cost)} />
        <StatBlock label="CPV" value={perfStats.cpv !== null ? "₹" + perfStats.cpv.toFixed(2) : "—"} />
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-display font-semibold text-sm">Deliverables</h2>
        <div className="flex items-center gap-2">
          <Select
            value={filterDeliverableStatus}
            onChange={setFilterDeliverableStatus}
            options={["all", ...DELIVERABLE_STATUSES]}
            labelAll="All statuses"
          />
          <button
            onClick={exportDeliverables}
            className="flex items-center gap-1.5 border border-zinc-800 hover:border-zinc-600 text-zinc-300 text-xs px-3 py-1.5 rounded-md transition-colors"
          >
            <Download size={13} />
            Download CSV
          </button>
          <button
            onClick={onAddDeliverable}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-3 py-1.5 rounded-md transition-colors"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add deliverable
          </button>
        </div>
      </div>

      {deliverables.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-md py-10 text-center text-sm text-zinc-600">
          No deliverables yet. Add one to start tracking content for this campaign.
        </div>
      ) : filteredDeliverables.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-md py-10 text-center text-sm text-zinc-600">
          No deliverables match this status filter.
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 text-zinc-500 text-xs">
                <th className="text-left font-medium px-3 py-2.5">Influencer</th>
                <th className="text-left font-medium px-3 py-2.5">Content type</th>
                <th className="text-left font-medium px-3 py-2.5">Due date</th>
                <th className="text-left font-medium px-3 py-2.5">Status</th>
                <th className="text-left font-medium px-3 py-2.5">Payment Status</th>
                <th className="text-left font-medium px-3 py-2.5">Views</th>
                <th className="text-left font-medium px-3 py-2.5">Likes</th>
                <th className="text-left font-medium px-3 py-2.5">Comments</th>
                <th className="text-left font-medium px-3 py-2.5">Cost</th>
                <th className="text-left font-medium px-3 py-2.5">Link</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliverables.map((d) => {
                const overdue = isOverdue(d.dueDate, d.status);
                return (
                  <tr key={d.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                    <td
                      className="px-3 py-2.5 font-medium cursor-pointer"
                      onClick={() => onEditDeliverable(d)}
                    >
                      {d.influencerName}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">{(d.contentTypes || []).join(", ") || "—"}</td>
                    <td className={`px-3 py-2.5 ${overdue ? "text-amber-400" : "text-zinc-400"}`}>
                      {formatDate(d.dueDate)}
                      {overdue && " · overdue"}
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={d.status}
                        onChange={(e) => onQuickStatus(d.id, e.target.value)}
                        className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {DELIVERABLE_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <PaymentStatusBadge status={resolvePayment(d.influencerName, campaign.name)} />
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">{d.views ? formatNumber(d.views) : "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{d.likes ? formatNumber(d.likes) : "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{d.comments ? formatNumber(d.comments) : "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{d.cost ? formatINR(d.cost) : "—"}</td>
                    <td className="px-3 py-2.5">
                      {(d.postLinks || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {d.postLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={cleanVideoUrl(link)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link2 size={12} />
                              View {d.postLinks.length > 1 ? idx + 1 : ""}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => onDeleteDeliverable(d.id)}
                        className={`text-xs ${
                          confirmDeleteDeliverable === d.id
                            ? "text-red-400"
                            : "text-zinc-600 hover:text-red-400"
                        }`}
                      >
                        {confirmDeleteDeliverable === d.id ? "Confirm" : <Trash2 size={13} />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== MONTHLY TRACKING MODULE ====================

const SEED_MONTHLY_TRACKING = [
  {
    "id": "montrack-0",
    "date": "2026-01-04",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "Kuppam Kurralu",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DTEghrAE6oG/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Pre-event",
    "product": "STX",
    "views": 40400,
    "likes": 1488,
    "comments": 10,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-1",
    "date": "2026-01-09",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "Billy",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DTSp7UsjCvq/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Vintage Lifestyle",
    "product": "Ranger",
    "views": 353599,
    "likes": 14231,
    "comments": 173,
    "shares": 485,
    "saves": 741
  },
  {
    "id": "montrack-2",
    "date": "2026-01-23",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "Bhavik Rajput",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DT12628k8S0/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Review",
    "product": "Doodle Pro",
    "views": 70082,
    "likes": 1661,
    "comments": 50,
    "shares": 123,
    "saves": 91
  },
  {
    "id": "montrack-5",
    "date": "2026-01-26",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "Priyanka Artist",
    "campaignName": "Independence Day",
    "contentLink": "https://www.instagram.com/reel/DT9ZRGHk2Oo/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Independence Day",
    "product": "Doodle Pro",
    "views": 166000,
    "likes": 6584,
    "comments": 77,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-6",
    "date": "2026-01-06",
    "month": "Jan",
    "platform": "YouTube",
    "influencerName": "MTB Imran",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/bfQm6dC-2dw?si=7ou6356duXzHG0SW",
    "contentType": "Product Unboxing",
    "product": "Ranger",
    "views": 59056,
    "likes": 1500,
    "comments": 119,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-17",
    "date": "2026-01-30",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "RC Mech Jino",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DUIo0AFkf-w/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Ranger Off road",
    "product": "Ranger",
    "views": 92100,
    "likes": 2720,
    "comments": 21,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-18",
    "date": "2026-02-04",
    "month": "Feb",
    "platform": "YouTube",
    "influencerName": "Telugu Traveller Vlogger",
    "campaignName": "Kuppam",
    "contentLink": "https://youtu.be/xpHgh2BBXpo?si=lNW30EOdZ3CYcwie",
    "contentType": "Vlog",
    "product": "STX",
    "views": 13489,
    "likes": 675,
    "comments": 44,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-23",
    "date": "2026-01-31",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "Kuppam Kurralu",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUKhEkmE1pI/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Event",
    "product": "STX",
    "views": 73900,
    "likes": 3261,
    "comments": 10,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-27",
    "date": "2026-01-08",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "Namaste Kuppam",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DTQC_TnEtnu/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Pre Event",
    "product": "STX",
    "views": 1000000,
    "likes": 34600,
    "comments": 223,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-29",
    "date": "2026-01-19",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "KTM Buddy",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DTsM4u9EqZG/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Pre Event",
    "product": "STX",
    "views": 134000,
    "likes": 5570,
    "comments": 37,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-30",
    "date": "2026-01-31",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "amaravathi_ammaye",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUKefJcDy1K/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Pre Event",
    "product": "STX",
    "views": 4308,
    "likes": 128,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-31",
    "date": "2026-01-31",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "aa_dronography",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DULVjZjD6JW/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Instagram Post",
    "product": "STX",
    "views": 10400,
    "likes": 252,
    "comments": 17,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-32",
    "date": "2025-12-11",
    "month": "Dec",
    "platform": "Instagram",
    "influencerName": "Kuppam Diaries",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DSHsRZjEyfL/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Pre Event",
    "product": "STX",
    "views": 372000,
    "likes": 24500,
    "comments": 172,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-37",
    "date": "2026-01-31",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "Kuppam Wonders",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DULjeHnksZ-/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Event",
    "product": "STX",
    "views": 31100,
    "likes": 1964,
    "comments": 3,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-38",
    "date": "2026-01-02",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "VelloreReels + 3",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUPmR6hk3Nw/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 95000,
    "likes": 3800,
    "comments": 15,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-39",
    "date": "2026-02-05",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "rekha_cuty9531",
    "campaignName": "Chittor, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUVZkHsgfab/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 58000,
    "likes": 1902,
    "comments": 9,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-40",
    "date": "2026-02-05",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "Naveen Adventures",
    "campaignName": "",
    "contentLink": "https://www.instagram.com/reel/DUVgkfADznm/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 17200,
    "likes": 845,
    "comments": 1,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-41",
    "date": "2026-02-02",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "Vicky's | Kuppam Diaries",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUQkVVdkjgt/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Event",
    "product": "STX",
    "views": 87700,
    "likes": 3415,
    "comments": 25,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-43",
    "date": "2026-01-25",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "I Love My Chittor",
    "campaignName": "Chittor, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DT68rkPkqqe/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Pre Event",
    "product": "STX",
    "views": 101000,
    "likes": 3295,
    "comments": 35,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-46",
    "date": "2026-01-25",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "beautiful_chittoor",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DT7psK4kwwS/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 81000,
    "likes": 1333,
    "comments": 17,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-48",
    "date": "2026-02-03",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "chittoor Abbai 08",
    "campaignName": "Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUS1vv5kt6H/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 27500,
    "likes": 921,
    "comments": 1,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-49",
    "date": "2026-02-09",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "Bangalore saga.",
    "campaignName": "Bangalore, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUfvlhZCRd_/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 18600,
    "likes": 63,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-50",
    "date": "",
    "month": "",
    "platform": "Instagram",
    "influencerName": "bengaluru.ig",
    "campaignName": "",
    "contentLink": "",
    "contentType": "Instagram Post",
    "product": "",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-51",
    "date": "2026-02-08",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "nammakarnatakatrends",
    "campaignName": "Bangalore, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUiiesPk6cx/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 7944,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-52",
    "date": "2026-02-08",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "bangalore_social",
    "campaignName": "Bangalore, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUfu_7uk5Js/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 13600,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-53",
    "date": "2026-02-09",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "Chittoor Chinnodu",
    "campaignName": "Chittoor, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUigRdtE4TZ/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Event",
    "product": "STX",
    "views": 19100,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-55",
    "date": "2026-02-10",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "Hyderabad Bakasurulu",
    "campaignName": "Hyderabad, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUf0L9xEzOR/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 6775,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-56",
    "date": "2026-02-09",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "Chittor Manadhe",
    "campaignName": "Chittoor, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUiqcWZkqmU/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Pre Event",
    "product": "STX",
    "views": 19800,
    "likes": 4,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-57",
    "date": "2026-02-02",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "Chittoor Central",
    "campaignName": "Chittoor, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUSO5x9ie_2/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Pre Event",
    "product": "STX",
    "views": 187000,
    "likes": 12500,
    "comments": 54,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-59",
    "date": "2026-01-20",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "chittoor_now",
    "campaignName": "Chittoor, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DTuvZw6j3UL/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Event",
    "product": "STX",
    "views": 66300,
    "likes": 1346,
    "comments": 8,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-60",
    "date": "2026-01-29",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "The Hyderabadi Event",
    "campaignName": "Hyderabad,kuppam",
    "contentLink": "https://www.instagram.com/reel/DUFmD3AkhoB/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Pre Event",
    "product": "STX",
    "views": 32500,
    "likes": 324,
    "comments": 7,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-61",
    "date": "2026-01-29",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "aamir_foodietraveler",
    "campaignName": "",
    "contentLink": "https://www.instagram.com/reel/DUDqQl-gfGP/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Instagram Post",
    "product": "",
    "views": 26900,
    "likes": 265,
    "comments": 17,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-62",
    "date": "2026-01-19",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "hyderbad Travel Freak",
    "campaignName": "Hyderabad,kuppam",
    "contentLink": "https://www.instagram.com/reel/DTsWviEEvDb/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Pre Event",
    "product": "STX",
    "views": 9059,
    "likes": 59,
    "comments": 3,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-63",
    "date": "2026-01-10",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "Peepoye",
    "campaignName": "Delhi, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUk2lYiElCL/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 8797,
    "likes": 235,
    "comments": 12,
    "shares": 41,
    "saves": 8
  },
  {
    "id": "montrack-64",
    "date": "2026-01-11",
    "month": "Jan",
    "platform": "Instagram",
    "influencerName": "Gaurav Thakur",
    "campaignName": "Delhi, Kuppam",
    "contentLink": "https://www.instagram.com/reel/DUnyKq_DRFn/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Event",
    "product": "STX",
    "views": 49927,
    "likes": 3020,
    "comments": 33,
    "shares": 626,
    "saves": 153
  },
  {
    "id": "montrack-65",
    "date": "2026-02-18",
    "month": "Feb",
    "platform": "YouTube",
    "influencerName": "Rochak for sports",
    "campaignName": "Dealer - Regular",
    "contentLink": "https://youtu.be/PSWxny3uzGQ?si=B1fswNGggce71i8E",
    "contentType": "Product Review",
    "product": "Ranger",
    "views": 11000,
    "likes": 30,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-66",
    "date": "2026-01-31",
    "month": "Jan",
    "platform": "YouTube",
    "influencerName": "Bike Dekho",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/TDfabg8T9hE?si=1alztSlYHCm4zoyT",
    "contentType": "Product Review",
    "product": "Ranger",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-67",
    "date": "2026-02-10",
    "month": "Feb",
    "platform": "YouTube",
    "influencerName": "Auto Review",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/HNiNPMZErug?si=sFlAmBvmCpHZ7Pa6",
    "contentType": "Product Review",
    "product": "T-Rex Air",
    "views": 914,
    "likes": 7,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-68",
    "date": "2026-01-13",
    "month": "Feb",
    "platform": "YouTube",
    "influencerName": "Vaibhav Malik",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/jlE1pbxhJ6w?si=Di-Y-Xuw2-ABZcjU",
    "contentType": "Product Review",
    "product": "Dope",
    "views": 2000,
    "likes": 17,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-69",
    "date": "2026-02-21",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "Chalte Firte",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DVBK35PCAdp/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Integration",
    "product": "Doodle Pro",
    "views": 2870000,
    "likes": 520000,
    "comments": 2701,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-70",
    "date": "2026-02-28",
    "month": "Feb",
    "platform": "Instagram",
    "influencerName": "Sanchit Bansal",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DVTZkD3kv1H/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Doodle Pro",
    "views": 30200,
    "likes": 2534,
    "comments": 114,
    "shares": 406,
    "saves": 753
  },
  {
    "id": "montrack-71",
    "date": "2026-03-02",
    "month": "March",
    "platform": "YouTube",
    "influencerName": "KSN",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/8xx5TeFI7ZI?si=SYamCBwoS8rDlDwq",
    "contentType": "Product Review",
    "product": "Trex Air",
    "views": 11101,
    "likes": 26,
    "comments": 7,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-72",
    "date": "2026-03-02",
    "month": "March",
    "platform": "YouTube",
    "influencerName": "KSN",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/MU3fDLWVQB4?si=QdYYghai70RswL3Z",
    "contentType": "Product Review",
    "product": "Trex Air",
    "views": 2500,
    "likes": 200,
    "comments": 1,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-73",
    "date": "2026-03-08",
    "month": "March",
    "platform": "Instagram",
    "influencerName": "Radhika Vikay",
    "campaignName": "Women's Day",
    "contentLink": "https://www.instagram.com/reel/DVm1OU6jPWe/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Ranger",
    "views": 33088,
    "likes": 859,
    "comments": 75,
    "shares": 242,
    "saves": 69
  },
  {
    "id": "montrack-74",
    "date": "2026-03-16",
    "month": "March",
    "platform": "Instagram",
    "influencerName": "Anurag Shah",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DV-_8S6E6Kx/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Trex Air",
    "views": 187757,
    "likes": 19000,
    "comments": 118,
    "shares": 1700,
    "saves": 2100
  },
  {
    "id": "montrack-75",
    "date": "2026-03-22",
    "month": "March",
    "platform": "Instagram",
    "influencerName": "Abin",
    "campaignName": "Customer Review",
    "contentLink": "https://www.instagram.com/reel/DWMST7Ck_g7/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Vlog",
    "product": "Ranger",
    "views": 3045,
    "likes": 76,
    "comments": 4,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-76",
    "date": "2026-03-22",
    "month": "March",
    "platform": "Facebook",
    "influencerName": "Jino Mech",
    "campaignName": "Regular",
    "contentLink": "https://www.facebook.com/share/v/1bRTNeYGoQ/?mibextid=wwXIfr",
    "contentType": "Product Review",
    "product": "Ranger",
    "views": 366000,
    "likes": 6100,
    "comments": 32,
    "shares": 54,
    "saves": 0
  },
  {
    "id": "montrack-77",
    "date": "2026-03-23",
    "month": "March",
    "platform": "Facebook",
    "influencerName": "Jino Mech",
    "campaignName": "Regular",
    "contentLink": "https://www.facebook.com/share/v/18WQrtAndJ/",
    "contentType": "Product Review",
    "product": "Ranger",
    "views": 439000,
    "likes": 6400,
    "comments": 89,
    "shares": 188,
    "saves": 0
  },
  {
    "id": "montrack-78",
    "date": "2026-03-23",
    "month": "March",
    "platform": "Instagram",
    "influencerName": "Billy",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DWOXls2Mh8J/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Ranger",
    "views": 11585,
    "likes": 238,
    "comments": 5,
    "shares": 15,
    "saves": 15
  },
  {
    "id": "montrack-79",
    "date": "2026-04-01",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Jzyy",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DWlz7l6ES1P/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Doodle Pro",
    "views": 41042,
    "likes": 1700,
    "comments": 83,
    "shares": 83,
    "saves": 76
  },
  {
    "id": "montrack-80",
    "date": "2026-04-20",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Punewalaofficial",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXWraWcDdsN/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 53133,
    "likes": 1400,
    "comments": 89,
    "shares": 992,
    "saves": 336
  },
  {
    "id": "montrack-81",
    "date": "2026-04-20",
    "month": "April",
    "platform": "YouTube",
    "influencerName": "Punewalaofficial",
    "campaignName": "Viper Launch",
    "contentLink": "https://youtube.com/shorts/ru1YWuwBWc0?si=jCdbKD770UTFQyic",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 21000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-82",
    "date": "2026-04-22",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Prasad Joshi",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXbwtT2CF0z/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 33397,
    "likes": 941,
    "comments": 43,
    "shares": 280,
    "saves": 133
  },
  {
    "id": "montrack-83",
    "date": "2026-04-24",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Infinity Pune",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXgsjo4jPGg/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 113000,
    "likes": 1167,
    "comments": 26,
    "shares": 19,
    "saves": 0
  },
  {
    "id": "montrack-84",
    "date": "2026-04-25",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Swapnil Valkunde",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXjm7uhjDFt/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 139000,
    "likes": 2500,
    "comments": 151,
    "shares": 46,
    "saves": 7,
    "spend": 75000
  },
  {
    "id": "montrack-85",
    "date": "2026-04-25",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Pune Viral",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXiyeTbDAvA/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 76400,
    "likes": 793,
    "comments": 15,
    "shares": 9,
    "saves": 0
  },
  {
    "id": "montrack-86",
    "date": "2026-04-25",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Hey Pune",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXipM38SGeT/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 130000,
    "likes": 0,
    "comments": 61,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-87",
    "date": "2026-04-26",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Mrunal Rajput",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXipGFWSjUk/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 86100,
    "likes": 0,
    "comments": 20,
    "shares": 3,
    "saves": 0,
    "spend": 12000
  },
  {
    "id": "montrack-88",
    "date": "2026-04-28",
    "month": "April",
    "platform": "YouTube",
    "influencerName": "Prasad Joshi",
    "campaignName": "Viper Launch",
    "contentLink": "https://youtube.com/shorts/PGYZrcx2YIQ?si=wU_vcHjVioulIKlX",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-89",
    "date": "2026-04-28",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Prasad Joshi and Saai",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXrK5gLjM6E/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 30535,
    "likes": 930,
    "comments": 36,
    "shares": 491,
    "saves": 215
  },
  {
    "id": "montrack-90",
    "date": "2026-04-28",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Aapla Pune",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXrDrUZD3O8/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 8041,
    "likes": 124,
    "comments": 11,
    "shares": 188,
    "saves": 30
  },
  {
    "id": "montrack-91",
    "date": "2026-04-28",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Maze Pune",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXrGM7NCJx1/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 76055,
    "likes": 310,
    "comments": 10,
    "shares": 160,
    "saves": 81
  },
  {
    "id": "montrack-92",
    "date": "2026-04-28",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Divyansh",
    "campaignName": "Dealer Visit - Rajesh Cycles Noida",
    "contentLink": "https://www.instagram.com/reel/DXrAXJLExyz/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "All Ebikes",
    "views": 212638,
    "likes": 1100,
    "comments": 73,
    "shares": 762,
    "saves": 1
  },
  {
    "id": "montrack-93",
    "date": "2026-04-28",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Rochak for sports",
    "campaignName": "YouTube",
    "contentLink": "https://youtu.be/yBsiGH4T_CA?si=zMwoZuPzI9ZMb_Sr",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 10347,
    "likes": 216,
    "comments": 30,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-94",
    "date": "2026-04-30",
    "month": "April",
    "platform": "Instagram",
    "influencerName": "Siddhant",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DXwREWAt279/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Ranger",
    "views": 14109,
    "likes": 500,
    "comments": 98,
    "shares": 93,
    "saves": 8
  },
  {
    "id": "montrack-95",
    "date": "2026-05-01",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Charandeep Singh",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXzZO12T_WL/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 223129,
    "likes": 8100,
    "comments": 42,
    "shares": 9700,
    "saves": 3,
    "spend": 11000
  },
  {
    "id": "montrack-96",
    "date": "2026-05-01",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Pune Shehar",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXyEe2PsHO5/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 49400,
    "likes": 986,
    "comments": 53,
    "shares": 15,
    "saves": 0
  },
  {
    "id": "montrack-97",
    "date": "2026-05-02",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Trending Pune",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DXwl1khMBtn/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 47695,
    "likes": 1300,
    "comments": 9,
    "shares": 58,
    "saves": 24
  },
  {
    "id": "montrack-98",
    "date": "2026-05-03",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Mayur Valkunde",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DX2D4T9onlb/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 89668,
    "likes": 398,
    "comments": 148,
    "shares": 36,
    "saves": 22
  },
  {
    "id": "montrack-99",
    "date": "2026-05-04",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Puneri Feeds",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DX679DcoCSs/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 5189,
    "likes": 89,
    "comments": 34,
    "shares": 25,
    "saves": 5
  },
  {
    "id": "montrack-100",
    "date": "2026-05-06",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Gurjeet Singh",
    "campaignName": "Dealer Visit - Bike port Cycling",
    "contentLink": "https://www.instagram.com/reel/DYAXib6Ikom/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "All Ebikes",
    "views": 60300,
    "likes": 1527,
    "comments": 30,
    "shares": 42,
    "saves": 0
  },
  {
    "id": "montrack-101",
    "date": "2026-05-08",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "We Love Pune",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DYFBHf9MW1K/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 10900,
    "likes": 102,
    "comments": 6,
    "shares": 5,
    "saves": 0
  },
  {
    "id": "montrack-102",
    "date": "2026-05-09",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Rohan Dalpe",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DYG-2-6tSxd/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 481000,
    "likes": 8924,
    "comments": 196,
    "shares": 163,
    "saves": 0
  },
  {
    "id": "montrack-103",
    "date": "2026-05-09",
    "month": "May",
    "platform": "YouTube",
    "influencerName": "Rohan Dalpe",
    "campaignName": "Viper Launch",
    "contentLink": "https://youtube.com/shorts/hTyP_d4I31s?si=87yfyBtzM11lTHFy",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 250000,
    "likes": 1800,
    "comments": 32,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-104",
    "date": "2026-05-09",
    "month": "May",
    "platform": "Facebook",
    "influencerName": "Rohan Dalpe",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.facebook.com/share/r/1Cfac6X2Nr/",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 60000,
    "likes": 411,
    "comments": 18,
    "shares": 5,
    "saves": 0
  },
  {
    "id": "montrack-105",
    "date": "2026-05-10",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Anil Kharra",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DYKIxM_Jmxd/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Ranger",
    "views": 3900000,
    "likes": 78100,
    "comments": 431,
    "shares": 958,
    "saves": 0
  },
  {
    "id": "montrack-106",
    "date": "2026-05-10",
    "month": "May",
    "platform": "YouTube",
    "influencerName": "Anil Kharra",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/MigayQ_ccVo?si=RBwjcxykG3rqhhnf",
    "contentType": "Lifestyle",
    "product": "Ranger",
    "views": 3200000,
    "likes": 28000,
    "comments": 106,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-107",
    "date": "2026-05-11",
    "month": "May",
    "platform": "YouTube",
    "influencerName": "Anil Kharra",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/xCZkwypBhck?si=UmCVrETeO0nSdk_O",
    "contentType": "Lifestyle",
    "product": "Ranger",
    "views": 1400000,
    "likes": 28000,
    "comments": 106,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-108",
    "date": "2026-05-12",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Preeti Singh",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DYM2TdtoBMY/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 99300,
    "likes": 73,
    "comments": 20,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-109",
    "date": "2026-05-15",
    "month": "May",
    "platform": "YouTube",
    "influencerName": "MTB Imran",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/Psc_Yfb6D8Q?si=kbzb_seYcjj23ma0",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 99675,
    "likes": 1400,
    "comments": 72,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-110",
    "date": "2026-05-16",
    "month": "May",
    "platform": "Facebook",
    "influencerName": "Barkat",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.facebook.com/share/r/1BNnMmSE4A/",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 1600000,
    "likes": 14400,
    "comments": 396,
    "shares": 287,
    "saves": 0
  },
  {
    "id": "montrack-111",
    "date": "2026-05-16",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Barkat",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DYZVHt_AYw6/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 318000,
    "likes": 4297,
    "comments": 354,
    "shares": 99,
    "saves": 0
  },
  {
    "id": "montrack-112",
    "date": "2026-05-18",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Sahil Sethi",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DYev1HohrJu/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Trex Air",
    "views": 14600,
    "likes": 406,
    "comments": 65,
    "shares": 24,
    "saves": 0,
    "spend": 20000
  },
  {
    "id": "montrack-113",
    "date": "2026-05-18",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Aditya",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DYe8uhHIUst/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 79800,
    "likes": 954,
    "comments": 30,
    "shares": 10,
    "saves": 0,
    "spend": 9000
  },
  {
    "id": "montrack-114",
    "date": "2026-05-20",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Pavan Nayak",
    "campaignName": "Viper Launch",
    "contentLink": "https://www.instagram.com/reel/DYkFjkyo3-N/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Launch",
    "product": "Viper",
    "views": 94700,
    "likes": 816,
    "comments": 6,
    "shares": 4,
    "saves": 0
  },
  {
    "id": "montrack-115",
    "date": "2026-05-20",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Swapnil Valkunde",
    "campaignName": "Viper",
    "contentLink": "https://www.instagram.com/reel/DYjZB14NHHB/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Regular",
    "product": "Viper",
    "views": 198000,
    "likes": 2886,
    "comments": 134,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-116",
    "date": "2026-05-28",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "theentrepreneur_story",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY44kxgMF84/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 7,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-117",
    "date": "2026-05-28",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "entrepreneur_hype",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY4cjioGDP_/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 38,
    "comments": 1,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-118",
    "date": "2026-05-27",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "tbv_insight",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY2L__HEmEH/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 734,
    "comments": 0,
    "shares": 12,
    "saves": 0
  },
  {
    "id": "montrack-119",
    "date": "2026-05-27",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "ceoindiaweekly",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY15eG3PLTw/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 13,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-120",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "businesshustle.in",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1rQy1AXUF/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 250,
    "comments": 8,
    "shares": 4,
    "saves": 0
  },
  {
    "id": "montrack-121",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "startup.age",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1fbKcGurz/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 20,
    "comments": 1,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-122",
    "date": "2026-05-26",
    "month": "May",
    "platform": "LinkedIn",
    "influencerName": "startup.age",
    "campaignName": "CEO PR",
    "contentLink": "https://www.linkedin.com/posts/startup-age_himanshuratnoo-emotorad-startupage-activity-7465322116809371649-qmZz?utm_source=share&utm_medium=member_android&rcm=ACoAACgqMPsBvNcJ1cA9SWGVpo6pzdB__cvWahg",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 5,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-123",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "startup.age",
    "campaignName": "CEO PR",
    "contentLink": "https://www.threads.com/@startup.age/post/DY1hJsAkfO_?xmt=AQG0RmYsgnPLYUGUsPbMsKWFF89DXr8K4i-sMzczgcGt6QIHh3_8uOQcdO4MVGWSKV3im6_7&slof=1",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 2,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-124",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "social.shor",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1e7WasTmO/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 18,
    "comments": 1,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-125",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "risingstartup",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1b8Edy4tk/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 106,
    "comments": 5,
    "shares": 7,
    "saves": 0
  },
  {
    "id": "montrack-126",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "corporatecurrent",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1YLP7yb1c/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 36,
    "comments": 0,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-127",
    "date": "2026-05-26",
    "month": "May",
    "platform": "LinkedIn",
    "influencerName": "corporatecurrent",
    "campaignName": "CEO PR",
    "contentLink": "https://www.linkedin.com/posts/corporatecurrent_emotorad-ebike-ceo-activity-7465306696937050112-GRnI?utm_source=share&utm_medium=member_ios&rcm=ACoAAC-UW5UBVvB6I-wj237EwOgQbL99B5Wy3Ks",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 80,
    "comments": 0,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-128",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "theindianalert",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1VrNxk25y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 10,
    "comments": 0,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-129",
    "date": "2026-05-26",
    "month": "May",
    "platform": "LinkedIn",
    "influencerName": "theindianalert",
    "campaignName": "CEO PR",
    "contentLink": "https://www.linkedin.com/posts/ex-cars24-ceo-himanshu-ratnoo-joins-emotorad-share-7465300799615766528-huiV/?utm_source=share&utm_medium=member_ios&rcm=ACoAAC9pP2wBgOKvPNdfzoa1XYmT0ToNMwDoZ8I",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 14,
    "comments": 0,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-130",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "viestories__com",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1SzsZxQyx/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 21,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-131",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "founder.inyou",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1Od_2sTPD/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 25,
    "comments": 16,
    "shares": 14,
    "saves": 0
  },
  {
    "id": "montrack-132",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "entrepreneur.inyou",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1N2C1NTSq/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 27,
    "comments": 15,
    "shares": 15,
    "saves": 0
  },
  {
    "id": "montrack-133",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "viralvista.india",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1LDp4EaIA/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 45,
    "comments": 1,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-134",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "ceosofbharat",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1E-k8JpR6/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 153,
    "comments": 8,
    "shares": 6,
    "saves": 0
  },
  {
    "id": "montrack-135",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "ceosofbharat",
    "campaignName": "CEO PR",
    "contentLink": "https://www.linkedin.com/posts/emotorad-electricvehicles-startupindia-share-7465263872468254720-Q2Uu/?utm_source=share&utm_medium=member_desktop&rcm=ACoAAC9pP2wBgOKvPNdfzoa1XYmT0ToNMwDoZ8I",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 413,
    "comments": 5,
    "shares": 3,
    "saves": 0
  },
  {
    "id": "montrack-136",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "ceosofbharat",
    "campaignName": "CEO PR",
    "contentLink": "https://ceosofbharat.com/emotorad-appoints-former-cars24-ceo-himanshu-ratnoo-as-co-founder/",
    "contentType": "PR seeding",
    "product": "",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-137",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "hiring.today",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1nVRnmk93/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 13,
    "comments": 1,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-138",
    "date": "2026-05-26",
    "month": "May",
    "platform": "LinkedIn",
    "influencerName": "hiring.today",
    "campaignName": "CEO PR",
    "contentLink": "https://www.linkedin.com/feed/update/urn:li:activity:7465338737133031424",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 45,
    "comments": 0,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-139",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "hiring.today",
    "campaignName": "CEO PR",
    "contentLink": "https://thehiringtoday.com/emotorad-welcomes-ex-cars24-ceo-himanshu-ratnoo-as-co-founder/",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-140",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "investupmedia",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1xfmOzWet/?igsh=MWpwdXUwaGlmeGhmbQ=",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 84,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-141",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "viestories__com",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1SzsZxQyx/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 21,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-142",
    "date": "2026-05-26",
    "month": "May",
    "platform": "LinkedIn",
    "influencerName": "viestories__com",
    "campaignName": "CEO PR",
    "contentLink": "https://www.linkedin.com/posts/viestories_emotorad-cofounder-appointment-activity-7465252808200560640-zyJY?utm_source=share&utm_medium=member_desktop&rcm=ACoAAC9pP2wBgOKvPNdfzoa1XYmT0ToNMwDoZ8I",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 45,
    "comments": 1,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-143",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "entrepreneur.in you",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1N2C1NTSq/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 27,
    "comments": 15,
    "shares": 15,
    "saves": 0
  },
  {
    "id": "montrack-144",
    "date": "2026-05-26",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "InterestingFacts",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/reel/DY2MZVvzoc3/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 29,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-145",
    "date": "2026-05-27",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "indianbuzz",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY1h9SGkWbS/?igsh=cmZtdHkzaWJzMzc4",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 68,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-146",
    "date": "2026-05-28",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "ceovineindia",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY14Pe8isqc/?igsh=NW9pcXlyM3dyMjQx",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 2,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-147",
    "date": "2026-05-29",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Carbike360",
    "campaignName": "CEO PR",
    "contentLink": "https://www.instagram.com/p/DY3uFvDGPAx/?igsh=MXJseDZkd2dnZWFteQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 7,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-148",
    "date": "2026-05-29",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "thestockmarketlive",
    "campaignName": "",
    "contentLink": "https://www.instagram.com/p/DY7GH_kR2bL/?igsh=MWVuZndieTNnc3ExMQ==",
    "contentType": "Instagram Post",
    "product": "",
    "views": 0,
    "likes": 105,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-149",
    "date": "2026-05-29",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "thestockmarketlive",
    "campaignName": "",
    "contentLink": "https://www.threads.com/@thestockmarketlive/post/DY7GawCgTQK?xmt=AQG0PjJCCmYsvCJnjC3PjqULbOaxTvC9ZELCED1iu_03lI7JOWxfJvbkFht8lZk0xaL7kLth&slof=1",
    "contentType": "Instagram Post",
    "product": "",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-150",
    "date": "2026-05-29",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "Indian Finance",
    "campaignName": "",
    "contentLink": "https://www.instagram.com/p/DY7GOFzI2qK/?igsh=eG93eWtzcXRrOTln",
    "contentType": "Instagram Post",
    "product": "",
    "views": 0,
    "likes": 120,
    "comments": 0,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-151",
    "date": "2026-05-29",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "youfinance.in",
    "campaignName": "",
    "contentLink": "https://www.instagram.com/p/DY7B7NXqC0K/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Instagram Post",
    "product": "",
    "views": 0,
    "likes": 75,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-152",
    "date": "2026-05-29",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "onevisionmedia.in",
    "campaignName": "",
    "contentLink": "https://www.instagram.com/p/DY62pJQmvhV/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Instagram Post",
    "product": "",
    "views": 0,
    "likes": 4515,
    "comments": 4500,
    "shares": 7,
    "saves": 8
  },
  {
    "id": "montrack-153",
    "date": "2026-05-29",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "onevisionmedia.in",
    "campaignName": "",
    "contentLink": "https://www.threads.com/@onevisionmedia.in/post/DY62gzLAZGq?xmt=AQG0C2QRdj6qUNuD7ZIVTQx4-n8ARVIDPj5__Km8BaOeMA",
    "contentType": "Instagram Post",
    "product": "",
    "views": 0,
    "likes": 8,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-154",
    "date": "2026-05-29",
    "month": "May",
    "platform": "X",
    "influencerName": "onevisionmedia.in",
    "campaignName": "",
    "contentLink": "https://x.com/onevision_media/status/2060310517261193647",
    "contentType": "Instagram Post",
    "product": "",
    "views": 116,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-155",
    "date": "2026-05-29",
    "month": "May",
    "platform": "Instagram",
    "influencerName": "indian.feeds",
    "campaignName": "",
    "contentLink": "https://www.instagram.com/p/DY6_LLkpA4D/?igsh=aWMyZTNjdTJ1a2hk",
    "contentType": "Instagram Post",
    "product": "",
    "views": 0,
    "likes": 115,
    "comments": 1,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-156",
    "date": "2026-06-03",
    "month": "June",
    "platform": "YouTube",
    "influencerName": "RC Mech Jino",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/uiVrB44HSfQ?si=SyIfMAgPxSnIJY0a",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 265494,
    "likes": 4600,
    "comments": 193,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-157",
    "date": "2026-06-04",
    "month": "June",
    "platform": "Facebook",
    "influencerName": "RC Mech Jino",
    "campaignName": "Regular",
    "contentLink": "https://www.facebook.com/share/r/1JUNtvBizN/",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 725000,
    "likes": 6500,
    "comments": 13,
    "shares": 5,
    "saves": 0
  },
  {
    "id": "montrack-158",
    "date": "2026-06-05",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "Amal Km",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/p/DZNEqUZk_cc/?img_index=1",
    "contentType": "Lifestyle",
    "product": "Viper",
    "views": 0,
    "likes": 433,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-159",
    "date": "2026-06-07",
    "month": "June",
    "platform": "Facebook",
    "influencerName": "RC Mech Jino",
    "campaignName": "Regular",
    "contentLink": "https://www.facebook.com/share/v/1JVQrkG7rD/",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 115000,
    "likes": 3300,
    "comments": 15,
    "shares": 16,
    "saves": 0
  },
  {
    "id": "montrack-160",
    "date": "2026-06-10",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "Shlok",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DZXktlJo_hL/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "X1",
    "views": 13900,
    "likes": 606,
    "comments": 28,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-161",
    "date": "2026-06-10",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "Amal Km",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/p/DZZ8ximBrOY/",
    "contentType": "Lifestyle",
    "product": "Viper",
    "views": 22600,
    "likes": 631,
    "comments": 9,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-162",
    "date": "2026-06-12",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "Kartik",
    "campaignName": "Dealer - Agarwal Cycles Nagpur",
    "contentLink": "https://www.instagram.com/reel/DZeoFPvILXL/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "All Bikes",
    "views": 37400,
    "likes": 730,
    "comments": 35,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-163",
    "date": "2026-06-13",
    "month": "June",
    "platform": "YouTube",
    "influencerName": "MTB Imran",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/gcpV8u9uqtU?si=yy4AIoKNRpvYjZMW",
    "contentType": "Integration",
    "product": "Trex Pro",
    "views": 59891,
    "likes": 85,
    "comments": 1200,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-164",
    "date": "2026-06-13",
    "month": "June",
    "platform": "YouTube",
    "influencerName": "Saurav Joshi",
    "campaignName": "Random",
    "contentLink": "https://youtu.be/m3lO1Hj2svQ?si=_uZuSvrH5sUXz2EP",
    "contentType": "Integration",
    "product": "Doodle",
    "views": 120690,
    "likes": 0,
    "comments": 10,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-165",
    "date": "2026-06-15",
    "month": "June",
    "platform": "YouTube",
    "influencerName": "MTB Imran",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/FdXsN1LMqUM?si=ot0xsDTOXnaWJQi5",
    "contentType": "Integration",
    "product": "Trex Pro",
    "views": 95677,
    "likes": 141,
    "comments": 1700,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-166",
    "date": "2026-06-16",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "Prasad Joshi",
    "campaignName": "Dealer - New Singh Cycles",
    "contentLink": "https://www.instagram.com/reel/DZpa8kxKbtC/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "X1",
    "views": 1261,
    "likes": 39,
    "comments": 0,
    "shares": 10,
    "saves": 0
  },
  {
    "id": "montrack-167",
    "date": "2026-06-16",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "Prasad Joshi",
    "campaignName": "Dealer - New Singh Cycles",
    "contentLink": "https://www.instagram.com/reel/DZpZ59eNDQx/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "X1",
    "views": 20200,
    "likes": 464,
    "comments": 25,
    "shares": 153,
    "saves": 0
  },
  {
    "id": "montrack-168",
    "date": "2026-06-16",
    "month": "June",
    "platform": "YouTube",
    "influencerName": "Prasad Joshi",
    "campaignName": "Dealer - New Singh Cycles",
    "contentLink": "https://youtube.com/shorts/EMtuwX70FGg?si=Nvhtw6xSiL-n_4p3",
    "contentType": "Store Visit",
    "product": "X1",
    "views": 11000,
    "likes": 207,
    "comments": 10,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-169",
    "date": "2026-06-17",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "Deepak Ranjan",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DZsGbrzyUQg/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Review",
    "product": "Doodle V3",
    "views": 96300,
    "likes": 2084,
    "comments": 29,
    "shares": 431,
    "saves": 0
  },
  {
    "id": "montrack-170",
    "date": "2026-06-17",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "Deepak Ranjan",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/zFiJfWPfbe8?si=5fr-z-PQYaR4jBzd",
    "contentType": "Product Review",
    "product": "Doodle V3",
    "views": 149000,
    "likes": 3000,
    "comments": 47,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-171",
    "date": "2026-06-19",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "Neha Nenani",
    "campaignName": "Dealer - The Cycle Junchtion",
    "contentLink": "https://www.instagram.com/reel/DZxIMDZTE6o/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "All Bikes",
    "views": 1500000,
    "likes": 63900,
    "comments": 825,
    "shares": 74614,
    "saves": 0
  },
  {
    "id": "montrack-172",
    "date": "2026-06-21",
    "month": "June",
    "platform": "YouTube",
    "influencerName": "Harshita",
    "campaignName": "Social Content - Yoga Day",
    "contentLink": "https://www.instagram.com/reel/DZ1oQY8u1HY/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Yoga Day",
    "product": "STX",
    "views": 9570,
    "likes": 257,
    "comments": 32,
    "shares": 17,
    "saves": 0
  },
  {
    "id": "montrack-173",
    "date": "2026-06-27",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "Naresh",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DaF84Lbs9CZ/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Doodle V3",
    "views": 20800,
    "likes": 684,
    "comments": 10,
    "shares": 4,
    "saves": 0,
    "spend": 20000
  },
  {
    "id": "montrack-174",
    "date": "2026-06-27",
    "month": "June",
    "platform": "Instagram",
    "influencerName": "APLI WARDHA",
    "campaignName": "Dealer - Let's ride cycles",
    "contentLink": "https://www.instagram.com/reel/DaHcMywSQzz/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "All Bikes",
    "views": 46200,
    "likes": 660,
    "comments": 19,
    "shares": 180,
    "saves": 0
  },
  {
    "id": "montrack-175",
    "date": "2026-06-27",
    "month": "June",
    "platform": "YouTube",
    "influencerName": "VD Chawala",
    "campaignName": "Dealer - VD Chawala",
    "contentLink": "https://youtube.com/shorts/OjEaE0Zlm2s?si=a3gmiILxBygDTFFk",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 2400000,
    "likes": 29000,
    "comments": 238,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-176",
    "date": "2026-07-10",
    "month": "July",
    "platform": "YouTube",
    "influencerName": "cycle ki duniya",
    "campaignName": "cycle ki duniya",
    "contentLink": "https://youtu.be/bx3D32Rh2ac?si=zlzLaEPhh9UyPoS2",
    "contentType": "Product Review",
    "product": "Dope",
    "views": 17280,
    "likes": 334,
    "comments": 16,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-177",
    "date": "2026-07-11",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "ahmedabadi.vlogss",
    "campaignName": "Dealer - The Cycle Junchtion",
    "contentLink": "https://www.instagram.com/reel/DanPcaSMCe4/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "Doodle Pro",
    "views": 82900,
    "likes": 86,
    "comments": 2,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-178",
    "date": "2026-07-14",
    "month": "July",
    "platform": "YouTube",
    "influencerName": "Deepak Ranjan",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/LM7z70DBd44?si=xYcUiNRDTXTiSZ6_",
    "contentType": "Product Review",
    "product": "Doodle Pro",
    "views": 2636,
    "likes": 49,
    "comments": 2,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-179",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "CEOS OF BHARAT (@ceosofbharat) • Instagram photos and videos",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DacPf0Apn4E/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 54,
    "comments": 0,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-180",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "CEOS OF BHARAT (@ceosofbharat) • Instagram photos and videos",
    "campaignName": "KADA Seeding",
    "contentLink": "https://lnkd.in/p/dGiRnE_K",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 89,
    "comments": 3,
    "shares": 3,
    "saves": 0
  },
  {
    "id": "montrack-181",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "social.shor",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/Dafbg6Sv36W/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 11,
    "comments": 0,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-182",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "risingstartup",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DacBzsFSM3W/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 69,
    "comments": 3,
    "shares": 3,
    "saves": 0
  },
  {
    "id": "montrack-183",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "thejustindia",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/Dac8ldkh6Lk/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 5,
    "comments": 2,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-184",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "corporatecurrent",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/Daa7o3dS2HF/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 41,
    "comments": 0,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-185",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "businesshustle.in",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DacTMtRB37r/?igsh=MWx6OXdueXNodjk2aA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 85,
    "comments": 5,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-186",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "investupmedia",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DacbFkpR-bW/?igsh=Ymd5MXRnY3R4Nzg0",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 88,
    "comments": 0,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-187",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "viestories__com",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/Dab5b6JJ5JT/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 9,
    "comments": 0,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-188",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "ceoindiaweekly",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/Dab_oCSxpFV/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 10,
    "comments": 0,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-189",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "startup.age",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DacCWUjgTX8/?igsh=MXY4Mm12dTlob2xnYQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 32,
    "comments": 0,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-190",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "startup.age",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.linkedin.com/posts/emotorad-manufacturing-andhrapradesh-share-7479621291587698688-J21v?utm_source=social_share_send&utm_medium=android_app&rcm=ACoAACgqMPsBvNcJ1cA9SWGVpo6pzdB__cvWahg&utm_campaign=whatsapp",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 13,
    "comments": 0,
    "shares": 1,
    "saves": 0
  },
  {
    "id": "montrack-191",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "startup.age",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.threads.com/@startup.age/post/DacCWThgZtd?xmt=AQG0UfJlzixg9DIyEtyuXehCiI0wB2Zzw6FbV2R-zD4Q5o6Bi2wCj_hUQzP9THnNLfsrv8m0&source_surface=35&slof=1",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 7,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-192",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "startup.age",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.facebook.com/share/p/1ChfZ79z43/",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-193",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "viralvista.india",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/reel/Dab51WGzElL/?igsh=a2FpOHF5eXVzNXJv",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 47,
    "comments": 1,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-194",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "startupbyvstdy",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/Dac3dLVyYlB/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-195",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "entrepreneur.in you",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DacmWpYt3ol/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 31,
    "comments": 17,
    "shares": 16,
    "saves": 0
  },
  {
    "id": "montrack-196",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "founder.inyou",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DackmrguwsY/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 36,
    "comments": 19,
    "shares": 16,
    "saves": 0
  },
  {
    "id": "montrack-197",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "indianbuzz",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/Dachla5xVIh/?igsh=MTdjNGE5ZmUybDB6NQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 43,
    "comments": 5,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-198",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "indialinked",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DahzcfwvMZ7/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 152,
    "comments": 2,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-199",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "tbv_insight",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DaflTMPS_YM/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 1100,
    "comments": 12,
    "shares": 13,
    "saves": 0
  },
  {
    "id": "montrack-200",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "marketingmedia.inn",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DacWTRrzz0j/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 35,
    "comments": 0,
    "shares": 3,
    "saves": 0
  },
  {
    "id": "montrack-201",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "startup_universe",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DahxzfxpsrP/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 41,
    "comments": 0,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-202",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "Startup_flash",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DahvqoHzctK/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 38,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-203",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "Startup Media",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DahxzfxpsrP/?igsh=MWpjb3JoN2FiODRzcQ==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 40,
    "comments": 0,
    "shares": 2,
    "saves": 0
  },
  {
    "id": "montrack-204",
    "date": "2026-07-06",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "foundersind",
    "campaignName": "KADA Seeding",
    "contentLink": "https://www.instagram.com/p/DavbxWhTBhV/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "PR seeding",
    "product": "-",
    "views": 0,
    "likes": 5,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-205",
    "date": "2026-07-08",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "fatbikervaibhav",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/Dahr-ZEp9me/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Integration",
    "product": "Nigh Hawk",
    "views": 625000,
    "likes": 12800,
    "comments": 50,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-206",
    "date": "2026-07-12",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "fatbikervaibhav",
    "campaignName": "Product Integration",
    "contentLink": "https://www.instagram.com/reel/Das72LxhHx2/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Integration",
    "product": "Nigh Hawk",
    "views": 53600,
    "likes": 829,
    "comments": 21,
    "shares": 213,
    "saves": 0
  },
  {
    "id": "montrack-207",
    "date": "2026-07-14",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "shubhamrevankar_",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DaxlSsfMEu8/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Doodle pro",
    "views": 630000,
    "likes": 18000,
    "comments": 92,
    "shares": 351,
    "saves": 0
  },
  {
    "id": "montrack-208",
    "date": "2026-07-19",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "sakxhmm",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/Da9srB4ItdR/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Trex Air",
    "views": 147000,
    "likes": 6620,
    "comments": 100,
    "shares": 185,
    "saves": 0
  },
  {
    "id": "montrack-209",
    "date": "2026-07-20",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "fatbikervaibhav",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/Da7uhjHJ2PU/?igsh=MTZkMWVyZjRhMGQydw==",
    "contentType": "Store Visit",
    "product": "All Bikes",
    "views": 80700,
    "likes": 1142,
    "comments": 22,
    "shares": 183,
    "saves": 0
  },
  {
    "id": "montrack-210",
    "date": "2026-07-22",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "_aish_journey_",
    "campaignName": "Dealer - Agarwal Cycles Nagpur",
    "contentLink": "https://www.instagram.com/reel/DbDgF-GuLFz/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "Trex Air",
    "views": 542000,
    "likes": 15000,
    "comments": 324,
    "shares": 6605,
    "saves": 0
  },
  {
    "id": "montrack-211",
    "date": "2026-07-22",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "Abhishek Moto",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/buTliCrlQ2c",
    "contentType": "Product Review",
    "product": "Trex Air",
    "views": 633,
    "likes": 17,
    "comments": 2,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-212",
    "date": "2026-07-24",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "mumbaiwala_vlogs",
    "campaignName": "Dealer - Kohinoor Cycles",
    "contentLink": "https://www.instagram.com/reel/DbIxzlUzf-w/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Store Visit",
    "product": "All Bikes",
    "views": 27100,
    "likes": 480,
    "comments": 11,
    "shares": 66,
    "saves": 0
  },
  {
    "id": "montrack-213",
    "date": "2026-07-24",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "iamronaksagar",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DbIzSZPu1ez/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "gf-bf",
    "product": "Doodle",
    "views": 54300,
    "likes": 1475,
    "comments": 14,
    "shares": 144,
    "saves": 0
  },
  {
    "id": "montrack-214",
    "date": "2026-07-25",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "shivv.dutt",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DbND8aYoWfP/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Trex Air",
    "views": 19400,
    "likes": 321,
    "comments": 10,
    "shares": 28,
    "saves": 0
  },
  {
    "id": "montrack-215",
    "date": "2026-07-26",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "mr_dakol",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DbQmD41tX7Y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Doodle",
    "views": 10200,
    "likes": 369,
    "comments": 11,
    "shares": 53,
    "saves": 0
  },
  {
    "id": "montrack-216",
    "date": "2026-07-27",
    "month": "July",
    "platform": "YouTube",
    "influencerName": "Abhishek Moto",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/yLTnAtWy2gs?si=cF84tMs_JzEjAPwq",
    "contentType": "Product Review",
    "product": "Trex Air",
    "views": 79427,
    "likes": 675,
    "comments": 11,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-217",
    "date": "2026-07-27",
    "month": "July",
    "platform": "YouTube",
    "influencerName": "Abhishek Moto",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DbTH4g_zRKt/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Review",
    "product": "Trex Air",
    "views": 2271,
    "likes": 38,
    "comments": 0,
    "shares": 4,
    "saves": 0
  },
  {
    "id": "montrack-218",
    "date": "2026-07-27",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "nagpur_buzz",
    "campaignName": "Dealer - Agarwal Cycles Nagpur",
    "contentLink": "https://www.instagram.com/reel/DbS-CkNsNO4/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "Doodle",
    "views": 32200,
    "likes": 371,
    "comments": 29,
    "shares": 293,
    "saves": 0
  },
  {
    "id": "montrack-219",
    "date": "2026-07-27",
    "month": "July",
    "platform": "YouTube",
    "influencerName": "@vdchawlacycles",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/qe5x_GRgGTA?si=KRi4FizdxCPCsO5u",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 1195514,
    "likes": 12000,
    "comments": 137,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-220",
    "date": "1995-07-29",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "thevogueandstyle",
    "campaignName": "Social Content",
    "contentLink": "https://www.instagram.com/reel/DbYNhTaoebi/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Trex Air",
    "views": 125000,
    "likes": 1125,
    "comments": 43,
    "shares": 6,
    "saves": 0
  },
  {
    "id": "montrack-221",
    "date": "2026-07-30",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "nagpurchakartik",
    "campaignName": "Dealer - Agarwal Cycles Nagpur",
    "contentLink": "https://www.instagram.com/reel/DbZ84gUT2GA/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "Doodle",
    "views": 70600,
    "likes": 904,
    "comments": 20,
    "shares": 672,
    "saves": 0
  },
  {
    "id": "montrack-222",
    "date": "2026-07-30",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "abhijit.shete",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/Dba_EbZC1ya/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Cycle Gift",
    "product": "STX",
    "views": 26500,
    "likes": 364,
    "comments": 2,
    "shares": 13,
    "saves": 0
  },
  {
    "id": "montrack-223",
    "date": "2026-07-30",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "explorewithsahil01",
    "campaignName": "Dealer - Jalaram Cycles",
    "contentLink": "https://www.instagram.com/reel/DbasZs3NYUK/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Store Visit",
    "product": "Doodle",
    "views": 98800,
    "likes": 269,
    "comments": 13,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-224",
    "date": "2026-07-31",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "shagamedia_official",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DbbVqFHDbeo/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Doodle Pro + X2",
    "views": 1150,
    "likes": 32,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-225",
    "date": "2026-07-31",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "shagamedia_official",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DbbqJ4rDcvs/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Doodle Pro + X2",
    "views": 810,
    "likes": 13,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-226",
    "date": "2026-07-31",
    "month": "July",
    "platform": "Instagram",
    "influencerName": "shagamedia_official",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DbcHV5ODZQF/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "Doodle Pro + X2",
    "views": 623,
    "likes": 29,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-227",
    "date": "2026-08-01",
    "month": "Aug",
    "platform": "YouTube",
    "influencerName": "VD Chawala",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/-Gg1zoqqJyo?si=MMIaQaWk9cTrj_FK",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 1173015,
    "likes": 20000,
    "comments": 220,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-228",
    "date": "2026-08-03",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "bhandari_g_",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DblEv2Oz6qC/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Lifestyle",
    "product": "L07",
    "views": 12500,
    "likes": 376,
    "comments": 21,
    "shares": 86,
    "saves": 11
  },
  {
    "id": "montrack-229",
    "date": "2026-08-03",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "suvanpranay",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DblWPUtoeEl/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Review",
    "product": "L07",
    "views": 222487,
    "likes": 8000,
    "comments": 191,
    "shares": 2000,
    "saves": 363
  },
  {
    "id": "montrack-230",
    "date": "2026-08-06",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "adityaasindhu",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DbstPi6qEtk/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "Lifestyle",
    "product": "Trex Air",
    "views": 520675,
    "likes": 17000,
    "comments": 130,
    "shares": 839,
    "saves": 117
  },
  {
    "id": "montrack-231",
    "date": "2026-08-08",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "imotorbyte",
    "campaignName": "Dealer - Radhe shyam and sons",
    "contentLink": "https://www.instagram.com/reel/Dbve0y3hXeA/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Review",
    "product": "Doodle Pro",
    "views": 5809,
    "likes": 60,
    "comments": 4,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-232",
    "date": "2026-08-07",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "imotorbyte",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/-aEEoAGblOQ?si=Q8UAmQZ04qAvbFB_",
    "contentType": "Product Review",
    "product": "Doodle Pro",
    "views": 1748,
    "likes": 1,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-233",
    "date": "2026-08-11",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "ka_09_rider",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/Db4kD4IJcmI/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Product Review",
    "product": "X1",
    "views": 101000,
    "likes": 5414,
    "comments": 16,
    "shares": 329,
    "saves": 233
  },
  {
    "id": "montrack-234",
    "date": "2026-08-11",
    "month": "Aug",
    "platform": "YouTube",
    "influencerName": "ka_09_rider",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/tKmdufGVd_0?si=QkrgpWxVCJ71gmEA",
    "contentType": "Product Review",
    "product": "X2",
    "views": 1626,
    "likes": 75,
    "comments": 2,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-235",
    "date": "2026-08-11",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "drdrive_official",
    "campaignName": "Amazon Sale",
    "contentLink": "https://www.instagram.com/reel/Db5thtKSvQq/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Aamzon",
    "product": "Doodle Pro",
    "views": 89600,
    "likes": 545,
    "comments": 19,
    "shares": 35,
    "saves": 15
  },
  {
    "id": "montrack-236",
    "date": "2026-08-12",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "fatbikervaibhav",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/Db7y2l-JBYh/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Integration",
    "product": "Night Hawk",
    "views": 85300,
    "likes": 1120,
    "comments": 21,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-237",
    "date": "2026-08-13",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "akashprasad0",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/Db-vrwkiBEP/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==",
    "contentType": "lifestyle",
    "product": "X1",
    "views": 34029,
    "likes": 1287,
    "comments": 17,
    "shares": 80,
    "saves": 41
  },
  {
    "id": "montrack-238",
    "date": "2026-08-14",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "jinocyriac",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/DcBVItJvLTG/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "Onam",
    "product": "Viper",
    "views": 71600,
    "likes": 2014,
    "comments": 9,
    "shares": 12,
    "saves": 0
  },
  {
    "id": "montrack-239",
    "date": "2026-08-14",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "jinocyriac",
    "campaignName": "ONAM",
    "contentLink": "https://youtube.com/shorts/EdGkIVV4Jjg?si=BMAQbbCa8q3nY865",
    "contentType": "Onam",
    "product": "Viper",
    "views": 274963,
    "likes": 6700,
    "comments": 14,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-240",
    "date": "2026-08-14",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "jinocyriac",
    "campaignName": "ONAM",
    "contentLink": "https://www.facebook.com/share/r/1JKW6tdNdB/?mibextid=wwXIfr",
    "contentType": "Onam",
    "product": "Viper",
    "views": 131000,
    "likes": 1300,
    "comments": 12,
    "shares": 35,
    "saves": 0
  },
  {
    "id": "montrack-241",
    "date": "2026-08-14",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "editorbhai_",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DcBVQw4BWv2/?utm_source=ig_web_copy_link",
    "contentType": "lifestyle",
    "product": "x1",
    "views": 11646,
    "likes": 470,
    "comments": 26,
    "shares": 30,
    "saves": 31
  },
  {
    "id": "montrack-242",
    "date": "2026-08-15",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "vikramfilmss",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DcCAsu6Px-p/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "contentType": "lifestyle",
    "product": "x1",
    "views": 95460,
    "likes": 251,
    "comments": 29,
    "shares": 33,
    "saves": 12
  },
  {
    "id": "montrack-243",
    "date": "2026-08-16",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "jinocyriac",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DcGkjuYvUGp/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "lifestyle",
    "product": "Viper",
    "views": 296000,
    "likes": 13300,
    "comments": 35,
    "shares": 76,
    "saves": 0
  },
  {
    "id": "montrack-244",
    "date": "2026-08-18",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "kruzin_singhania_official",
    "campaignName": "Dealer - The Cycle Junchtion",
    "contentLink": "https://www.instagram.com/reel/DcL045as_-Q/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "Store Promotion",
    "product": "All Bikes",
    "views": 768000,
    "likes": 9926,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-245",
    "date": "2026-08-18",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "arr__y__a",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/DcOPwUDyLSa/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 33500,
    "likes": 563,
    "comments": 14,
    "shares": 9,
    "saves": 0
  },
  {
    "id": "montrack-246",
    "date": "2026-08-19",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "harsh_epic_life",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/DcOgDunSSAk/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "lifestyle",
    "product": "STX",
    "views": 4285,
    "likes": 202,
    "comments": 16,
    "shares": 8,
    "saves": 0
  },
  {
    "id": "montrack-247",
    "date": "2026-08-22",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "akshataa60",
    "campaignName": "Dealer - Pedal Power International",
    "contentLink": "https://www.instagram.com/reel/DcTzWiTsaxn/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "Store Promotion",
    "product": "Doodle Pro",
    "views": 154000,
    "likes": 3399,
    "comments": 59,
    "shares": 49,
    "saves": 0
  },
  {
    "id": "montrack-248",
    "date": "2026-08-23",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "hellonagpur_",
    "campaignName": "Dealer - Agarwal Cycles Nagpur",
    "contentLink": "https://www.instagram.com/reel/DcaM86uMEjx/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "Store Promotion",
    "product": "Doodle Pro",
    "views": 1010000,
    "likes": 22100,
    "comments": 119,
    "shares": 355,
    "saves": 0
  },
  {
    "id": "montrack-249",
    "date": "2026-08-23",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "salmanulfarisi_",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/DcabLIHJygz/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 16600,
    "likes": 239,
    "comments": 9,
    "shares": 4,
    "saves": 0
  },
  {
    "id": "montrack-250",
    "date": "2026-08-23",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "ronniisshhh",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/DcawKITTTAr/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 31700,
    "likes": 661,
    "comments": 7,
    "shares": 10,
    "saves": 0
  },
  {
    "id": "montrack-251",
    "date": "2026-08-23",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "sajitha_das_",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/Dca4tkbx9hx/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 143000,
    "likes": 2545,
    "comments": 76,
    "shares": 81,
    "saves": 0
  },
  {
    "id": "montrack-252",
    "date": "2026-08-23",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "bhagya_s_nath",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/DcbESB0Rh6_/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 16800,
    "likes": 11,
    "comments": 10,
    "shares": 3,
    "saves": 0
  },
  {
    "id": "montrack-253",
    "date": "2026-08-24",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "sekharankutty_vlogs",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/Dcc8KFxPFIX/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 33000,
    "likes": 523,
    "comments": 9,
    "shares": 3,
    "saves": 0
  },
  {
    "id": "montrack-254",
    "date": "2026-08-24",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "sona___mary",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/DcdmSzJIdFT/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 9341,
    "likes": 9,
    "comments": 10,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-255",
    "date": "2026-08-24",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "neffzcapture",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/DcdrI7rJ9yj/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 2489,
    "likes": 62,
    "comments": 1,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-256",
    "date": "2026-08-24",
    "month": "Aug",
    "platform": "YouTube",
    "influencerName": "VD Chawala",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/VRItyUTIQaA?si=AJ2xBV71n-w8rEvh",
    "contentType": "Product Review",
    "product": "Viper and Doodle Pro",
    "views": 3260345,
    "likes": 37000,
    "comments": 119,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-257",
    "date": "2026-08-25",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "i_am_noel_shorts",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/DcdwLzTTItY/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 58700,
    "likes": 996,
    "comments": 5,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-258",
    "date": "2026-08-25",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "abhinav_varghese",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/Dcd8NBmJBlO/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 5908,
    "likes": 2,
    "comments": 3,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-259",
    "date": "2026-08-26",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "stories_of_harika",
    "campaignName": "ONAM",
    "contentLink": "https://www.instagram.com/reel/DcfVlVPvhex/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "ONAM",
    "product": "All Bikes",
    "views": 15800,
    "likes": 487,
    "comments": 13,
    "shares": 5,
    "saves": 0
  },
  {
    "id": "montrack-260",
    "date": "2026-08-25",
    "month": "Aug",
    "platform": "Instagram",
    "influencerName": "bhandari_g_",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/Syj8t2mzf0M?si=nX7oTArNi9rdaikv",
    "contentType": "Product Review",
    "product": "X1",
    "views": 1067,
    "likes": 36,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-261",
    "date": "2026-09-04",
    "month": "Sept",
    "platform": "Instagram",
    "influencerName": "jinocyriac",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/Dc25DvBRD5e/?utm_source=ig_web_copy_link&igsi=MzRlODBiNWFlZA==",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-262",
    "date": "2026-09-04",
    "month": "Sept",
    "platform": "YouTube",
    "influencerName": "jinocyriac",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/TDGV84vE-BI?si=NNGrTuGI8Q6_LBoK",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-263",
    "date": "2026-09-06",
    "month": "Sept",
    "platform": "Instagram",
    "influencerName": "jinocyriac",
    "campaignName": "Regular",
    "contentLink": "https://www.instagram.com/reel/Dc73k3jRO4g/?utm_source=ig_web_copy_link&stkn=MzRlODBiNWFlZA==",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-264",
    "date": "2026-09-06",
    "month": "Sept",
    "platform": "YouTube",
    "influencerName": "jinocyriac",
    "campaignName": "Regular",
    "contentLink": "https://youtube.com/shorts/8JzbPUqLEAw?si=CKEvm4KgpY9AP01u",
    "contentType": "Product Review",
    "product": "Viper",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-265",
    "date": "2026-09-05",
    "month": "Sept",
    "platform": "YouTube",
    "influencerName": "Cycle n Parts Room",
    "campaignName": "Random",
    "contentLink": "https://youtube.com/shorts/BVX6OEXoZgU?si=FhRIje22wMiEFyVZ",
    "contentType": "Product Review",
    "product": "All Bikes",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-266",
    "date": "2026-09-13",
    "month": "Sept",
    "platform": "YouTube",
    "influencerName": "Bhavik Rajput",
    "campaignName": "Regular",
    "contentLink": "https://youtu.be/LhdhBZmPx88?si=cHPnE1CoLV6X8h20",
    "contentType": "Product Review",
    "product": "X2",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  },
  {
    "id": "montrack-267",
    "date": "2026-09-07",
    "month": "Sept",
    "platform": "Instagram",
    "influencerName": "suru24_",
    "campaignName": "Flipkart",
    "contentLink": "https://www.instagram.com/reel/Dc_ORD5OTsF/?utm_source=ig_web_copy_link&stkn=MzRlODBiNWFlZA==",
    "contentType": "Product Review",
    "product": "Doodle Pro",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0
  }
];

const MONTHLY_TRACKING_KEY = "emotorad-monthly-tracking-v1";
const TRACKING_CONTENT_TYPES = ["Reel", "Story", "YouTube Video", "Instagram Post", "Unboxing Video", "Live Stream", "Pre-event", "Other"];

function formatNumber(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(num);
}

function emptyTrackingDraft() {
  return {
    id: null,
    date: new Date().toISOString().slice(0, 10),
    platform: PLATFORMS[0],
    influencerName: "",
    useOther: false,
    campaignName: "",
    useOtherCampaign: false,
    contentLink: "",
    contentType: TRACKING_CONTENT_TYPES[0],
    product: "",
    views: "",
    reach: "",
    likes: "",
    comments: "",
    shares: "",
    saves: "",
    spend: "",
  };
}

function EMotoradMonthlyTracking() {
  const [records, setRecords] = useState([]);
  const [crmInfluencers, setCrmInfluencers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterMonths, setFilterMonths] = useState([]);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(emptyTrackingDraft());
  const [isNew, setIsNew] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let loadedRecords = null;
      let loadedInfluencers = null;
      let loadedCampaigns = null;
      let loadedPayments = null;
      try {
        const r = await window.storage.get(MONTHLY_TRACKING_KEY, true);
        if (r && r.value) loadedRecords = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(INFLUENCERS_KEY, true);
        if (r && r.value) loadedInfluencers = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(CAMPAIGNS_KEY, true);
        if (r && r.value) loadedCampaigns = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(PAYMENTS_KEY, true);
        if (r && r.value) loadedPayments = JSON.parse(r.value);
      } catch (e) {}
      if (cancelled) return;
      if (loadedRecords) {
        setRecords(loadedRecords);
      } else {
        setRecords(SEED_MONTHLY_TRACKING);
        try {
          await window.storage.set(MONTHLY_TRACKING_KEY, JSON.stringify(SEED_MONTHLY_TRACKING), true);
        } catch (e) {}
      }
      setCrmInfluencers(loadedInfluencers || []);
      setCampaigns(loadedCampaigns || []);
      if (loadedPayments) {
        setPayments(loadedPayments);
      } else {
        setPayments(SEED_PAYMENTS);
        try {
          await window.storage.set(PAYMENTS_KEY, JSON.stringify(SEED_PAYMENTS), true);
        } catch (e) {}
      }
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next) => {
    setRecords(next);
    try {
      const res = await window.storage.set(MONTHLY_TRACKING_KEY, JSON.stringify(next), true);
      if (!res) showToast("Couldn't save — try again");
    } catch (e) {
      showToast("Couldn't save — try again");
    }
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  const resolvePayment = useMemo(() => makePaymentResolver(payments, campaigns), [payments, campaigns]);
  usePaymentsRefresh(setPayments);

  const availableMonths = useMemo(() => {
    const set = new Set(records.map((r) => monthKey(r.date)).filter(isPlausibleMonthKey));
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterPlatform !== "all" && r.platform !== filterPlatform) return false;
      if (!inSelectedMonths(r.date, filterMonths)) return false;
      if (!inCustomRange(r.date, customRange.start, customRange.end)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = (r.influencerName + " " + r.campaignName + " " + r.product).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, filterPlatform, filterMonths, customRange, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [filtered]
  );

  const stats = useMemo(() => {
    const posts = filtered.length;
    const views = filtered.reduce((s, r) => s + (Number(r.views) || 0), 0);
    const reach = filtered.reduce((s, r) => s + (Number(r.reach) || 0), 0);
    const spend = filtered.reduce((s, r) => s + (Number(r.spend) || 0), 0);
    const engagement = filtered.reduce(
      (s, r) => s + (Number(r.likes) || 0) + (Number(r.comments) || 0) + (Number(r.shares) || 0) + (Number(r.saves) || 0),
      0
    );
    const influencers = new Set(filtered.map((r) => r.influencerName)).size;
    return { posts, views, reach, spend, engagement, influencers };
  }, [filtered]);

  function exportRecords() {
    const headers = ["Date", "Month", "Platform", "Influencer Name", "Campaign Name", "Content Link", "Content Type", "Product", "Views", "Reach", "Likes", "Comments", "Shares", "Saves", "Spend", "Payment Status"];
    const rows = sorted.map((r) => {
      const paymentStatus = resolvePayment(r.influencerName, r.campaignName);
      return [
        r.date, monthLabelFromKey(monthKey(r.date)), r.platform, r.influencerName, r.campaignName,
        r.contentLink, r.contentType, r.product, r.views, r.reach, r.likes, r.comments, r.shares, r.saves, r.spend,
        paymentStatus === null ? "—" : paymentStatus,
      ];
    });
    const label = filterMonths.length > 0
      ? filterMonths.map(monthLabelFromKey).join("_").replace(/\s+/g, "-")
      : "all";
    downloadCSV(`monthly-tracking_${label}.csv`, headers, rows);
  }

  function openAddDrawer() {
    setDraft(emptyTrackingDraft());
    setIsNew(true);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function openEditDrawer(r) {
    const isKnown = crmInfluencers.some((i) => i.name === r.influencerName);
    const isKnownCampaign = !r.campaignName || campaigns.some((c) => c.name === r.campaignName);
    setDraft({
      ...r,
      useOther: !isKnown,
      useOtherCampaign: !isKnownCampaign,
      views: String(r.views), reach: String(r.reach || 0), likes: String(r.likes), comments: String(r.comments),
      shares: String(r.shares), saves: String(r.saves), spend: String(r.spend || 0),
    });
    setIsNew(false);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function saveDraft() {
    if (!draft.influencerName.trim()) {
      showToast("Pick or enter an influencer");
      return;
    }
    const record = {
      id: draft.id || "montrack-" + Date.now(),
      date: draft.date,
      month: monthLabelFromKey(monthKey(draft.date)),
      platform: draft.platform,
      influencerName: draft.influencerName,
      campaignName: draft.campaignName,
      contentLink: cleanVideoUrl(draft.contentLink),
      contentType: draft.contentType,
      product: draft.product,
      views: Number(draft.views) || 0,
      reach: Number(draft.reach) || 0,
      likes: Number(draft.likes) || 0,
      comments: Number(draft.comments) || 0,
      shares: Number(draft.shares) || 0,
      saves: Number(draft.saves) || 0,
      spend: Number(draft.spend) || 0,
    };
    if (isNew) {
      persist([record, ...records]);
      showToast("Record added");
    } else {
      persist(records.map((r) => (r.id === record.id ? record : r)));
      showToast("Changes saved");
    }
    closeDrawer();
  }

  function deleteDraft() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    persist(records.filter((r) => r.id !== draft.id));
    showToast("Record removed");
    closeDrawer();
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading monthly tracking data…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .input {
          width: 100%;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13.5px;
          color: #f4f4f5;
        }
        .input:focus { outline: none; border-color: #004DAC; }
      `}</style>

      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="font-display font-semibold text-lg">Monthly Tracking</div>
        <button
          onClick={openAddDrawer}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Log content
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-b border-zinc-800">
        <StatBlock label="Posts tracked" value={stats.posts} accent />
        <StatBlock label="Influencers" value={stats.influencers} />
        <StatBlock icon={Eye} label="Total views" value={formatNumber(stats.views)} />
        <StatBlock icon={Eye} label="Total reach" value={formatNumber(stats.reach)} />
        <StatBlock icon={Heart} label="Total engagement" value={formatNumber(stats.engagement)} />
        <StatBlock icon={IndianRupee} label="Total spend" value={formatINR(stats.spend)} />
      </div>

      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-zinc-800">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search influencer, campaign, product"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <Select value={filterPlatform} onChange={setFilterPlatform} options={["all", ...PLATFORMS]} labelAll="All platforms" />
        <MonthFilter
          availableMonths={availableMonths}
          selected={filterMonths}
          onChange={setFilterMonths}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
        <button
          onClick={exportRecords}
          className="flex items-center gap-1.5 border border-zinc-800 hover:border-zinc-600 text-zinc-300 text-sm px-3 py-1.5 rounded-md transition-colors ml-auto"
        >
          <Download size={14} />
          Download CSV
        </button>
      </div>

      <div className="px-6 py-5">
        {sorted.length === 0 ? (
          <div className="text-center text-zinc-600 text-sm py-16">
            No content tracked yet. Click "Log content" to add the first one.
          </div>
        ) : (
          <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 text-zinc-500 text-xs">
                  <th className="text-left font-medium px-3 py-2.5">Date</th>
                  <th className="text-left font-medium px-3 py-2.5">Month</th>
                  <th className="text-left font-medium px-3 py-2.5">Platform</th>
                  <th className="text-left font-medium px-3 py-2.5">Influencer Name</th>
                  <th className="text-left font-medium px-3 py-2.5">Campaign Name</th>
                  <th className="text-left font-medium px-3 py-2.5">Content Type</th>
                  <th className="text-left font-medium px-3 py-2.5">Product</th>
                  <th className="text-left font-medium px-3 py-2.5">Views</th>
                  <th className="text-left font-medium px-3 py-2.5">Reach</th>
                  <th className="text-left font-medium px-3 py-2.5">Likes</th>
                  <th className="text-left font-medium px-3 py-2.5">Comments</th>
                  <th className="text-left font-medium px-3 py-2.5">Shares</th>
                  <th className="text-left font-medium px-3 py-2.5">Saves</th>
                  <th className="text-left font-medium px-3 py-2.5">Spend</th>
                  <th className="text-left font-medium px-3 py-2.5">Payment Status</th>
                  <th className="text-left font-medium px-3 py-2.5">Link</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openEditDrawer(r)}
                    className="border-t border-zinc-800 hover:bg-zinc-900/60 cursor-pointer"
                  >
                    <td className="px-3 py-2.5 text-zinc-400">{r.date || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{monthLabelFromKey(monthKey(r.date))}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{r.platform}</td>
                    <td className="px-3 py-2.5 font-medium">{r.influencerName}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{r.campaignName || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{r.contentType}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{r.product || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatNumber(r.views)}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatNumber(r.reach)}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatNumber(r.likes)}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatNumber(r.comments)}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatNumber(r.shares)}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatNumber(r.saves)}</td>
                    <td className="px-3 py-2.5 text-blue-400">{formatINR(r.spend)}</td>
                    <td className="px-3 py-2.5">
                      <PaymentStatusBadge status={resolvePayment(r.influencerName, r.campaignName)} />
                    </td>
                    <td className="px-3 py-2.5">
                      {r.contentLink ? (
                        <a
                          href={cleanVideoUrl(r.contentLink)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link2 size={12} />
                          View
                        </a>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">{isNew ? "Log content" : "Edit content"}</div>
              <button onClick={closeDrawer} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <Field label="Influencer">
                {!draft.useOther ? (
                  <select
                    value={draft.influencerName}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setDraft({ ...draft, useOther: true, influencerName: "" });
                      } else {
                        setDraft({ ...draft, influencerName: e.target.value });
                      }
                    }}
                    className="input"
                  >
                    <option value="">Select from CRM</option>
                    {crmInfluencers.map((i) => (
                      <option key={i.id} value={i.name}>
                        {i.name}
                      </option>
                    ))}
                    <option value="__other__">Other (type manually)</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={draft.influencerName}
                      onChange={(e) => setDraft({ ...draft, influencerName: e.target.value })}
                      className="input"
                      placeholder="Influencer name"
                      autoFocus
                    />
                    <button
                      onClick={() => setDraft({ ...draft, useOther: false, influencerName: "" })}
                      className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap px-2"
                    >
                      Use CRM list
                    </button>
                  </div>
                )}
              </Field>

              <Field label="Campaign (optional)">
                {!draft.useOtherCampaign ? (
                  <select
                    value={draft.campaignName}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setDraft({ ...draft, useOtherCampaign: true, campaignName: "" });
                      } else {
                        setDraft({ ...draft, campaignName: e.target.value });
                      }
                    }}
                    className="input"
                  >
                    <option value="">Not linked to a campaign</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__other__">Other / Add manually</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={draft.campaignName}
                      onChange={(e) => setDraft({ ...draft, campaignName: e.target.value })}
                      className="input"
                      placeholder="Campaign name"
                      autoFocus
                    />
                    <button
                      onClick={() => setDraft({ ...draft, useOtherCampaign: false, campaignName: "" })}
                      className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap px-2"
                    >
                      Use campaign list
                    </button>
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Platform">
                  <select
                    value={draft.platform}
                    onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
                    className="input"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Content type">
                  <select
                    value={draft.contentType}
                    onChange={(e) => setDraft({ ...draft, contentType: e.target.value })}
                    className="input"
                  >
                    {TRACKING_CONTENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Product">
                  <input
                    value={draft.product}
                    onChange={(e) => setDraft({ ...draft, product: e.target.value })}
                    className="input"
                    placeholder="e.g. Doodle Pro"
                  />
                </Field>
              </div>

              <Field label="Content link">
                <input
                  value={draft.contentLink}
                  onChange={(e) => setDraft({ ...draft, contentLink: e.target.value })}
                  className="input"
                  placeholder="Optional"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Views">
                  <input
                    type="number"
                    value={draft.views}
                    onChange={(e) => setDraft({ ...draft, views: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Reach">
                  <input
                    type="number"
                    value={draft.reach}
                    onChange={(e) => setDraft({ ...draft, reach: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Likes">
                  <input
                    type="number"
                    value={draft.likes}
                    onChange={(e) => setDraft({ ...draft, likes: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Comments">
                  <input
                    type="number"
                    value={draft.comments}
                    onChange={(e) => setDraft({ ...draft, comments: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Shares">
                  <input
                    type="number"
                    value={draft.shares}
                    onChange={(e) => setDraft({ ...draft, shares: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Saves">
                  <input
                    type="number"
                    value={draft.saves}
                    onChange={(e) => setDraft({ ...draft, saves: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
              </div>

              <Field label="Spend (₹)">
                <input
                  type="number"
                  value={draft.spend}
                  onChange={(e) => setDraft({ ...draft, spend: e.target.value })}
                  className="input"
                  placeholder="0"
                />
              </Field>
            </div>

            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-5 flex gap-2">
              <button
                onClick={saveDraft}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors"
              >
                {isNew ? "Add record" : "Save changes"}
              </button>
              {!isNew && (
                <button
                  onClick={deleteDraft}
                  className={`px-3 rounded-md border text-sm transition-colors ${
                    confirmDelete
                      ? "border-red-500 text-red-400 bg-red-500/10"
                      : "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                  }`}
                >
                  {confirmDelete ? "Confirm delete" : <Trash2 size={16} />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 text-sm px-4 py-2 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ==================== PRODUCT LOGISTICS MODULE ====================

// ---------- constants ----------

const LOGISTICS_STAGES = [
  { key: "preparing", label: "Preparing" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
  { key: "return_due", label: "Return Due" },
  { key: "closed", label: "Closed" },
];

const PRODUCT_MODELS = ["T-Rex+", "Doodle V2", "X1", "Neomatic", "EMX"];
const COURIERS = ["Delhivery", "Blue Dart", "Ecom Express", "Xpressbees", "DTDC", "Self Delivery", "Other"];
const UNIT_TYPES = ["Returnable", "Non-Returnable"];

const SEED_UNITS = [
  {
    "id": "loginp-0",
    "influencerName": "Auto Review 46 / Sanjay Rajput",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Haryana",
    "courier": "Other",
    "trackingNumber": "E40324106",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "return_due",
    "assignedTo": "",
    "notes": "Model: T-Rex Air, Colour: Suncrest Yellow. Status: Reverse Pickup initiated. said we dont have bike. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Suncrest Yellow"
  },
  {
    "id": "loginp-1",
    "influencerName": "Ishu Finds",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Dehradun",
    "courier": "Other",
    "trackingNumber": "E40725125",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: T-rex Air, Colour: Suncrest Yellow. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Suncrest Yellow"
  },
  {
    "id": "loginp-2",
    "influencerName": "Yellow Cruiser / Muhammed Musammil",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Kerala",
    "courier": "Other",
    "trackingNumber": "E40725174",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "return_due",
    "assignedTo": "",
    "notes": "Model: Trex Air, Colour: Suncrest Yellow. Status: Reverse Pickup initiated. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Suncrest Yellow"
  },
  {
    "id": "loginp-3",
    "influencerName": "Anurag Gupta",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Gurgaon",
    "courier": "Other",
    "trackingNumber": "E40825358",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Trex Air, Colour: Suncrest Yellow. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Suncrest Yellow"
  },
  {
    "id": "loginp-4",
    "influencerName": "Vaibhav Malik",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Delhi",
    "courier": "Other",
    "trackingNumber": "EM07AV01C04",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Dope, Colour: Sea Green. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Sea Green"
  },
  {
    "id": "loginp-5",
    "influencerName": "Jzyyll",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Bangalore",
    "courier": "Other",
    "trackingNumber": "EMIN11F0048",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "delivered",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Military Blue. Status: Bike with Influencer. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Military Blue"
  },
  {
    "id": "loginp-6",
    "influencerName": "Sanchit Bansal",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Delhi",
    "courier": "Other",
    "trackingNumber": "Dealer",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Native Pop. Status: Bikes Returned to Store. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Native Pop"
  },
  {
    "id": "loginp-7",
    "influencerName": "KSN TALKS",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Delhi",
    "courier": "Other",
    "trackingNumber": "Dealer",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Trex Air, Colour: Green. Status: Bikes Returned to Store. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Green"
  },
  {
    "id": "loginp-8",
    "influencerName": "Priyanka Artist",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Delhi",
    "courier": "Other",
    "trackingNumber": "Dealer",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Native Pop. Status: Bikes Returned to Store. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Native Pop"
  },
  {
    "id": "loginp-9",
    "influencerName": "RC mech Jino",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Kerala",
    "courier": "Other",
    "trackingNumber": "EMIN123F105",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Ranger, Colour: Sunstorm Yellow. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Sunstorm Yellow"
  },
  {
    "id": "loginp-10",
    "influencerName": "Siddhant Ingole",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Aurangabad",
    "courier": "Other",
    "trackingNumber": "EMIN123F144",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Ranger, Colour: Green. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Green"
  },
  {
    "id": "loginp-11",
    "influencerName": "Virender Singh",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Rajasthan",
    "courier": "Other",
    "trackingNumber": "EMIN123F196",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Ranger, Colour: Green. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Green"
  },
  {
    "id": "loginp-12",
    "influencerName": "Rachna Godwa",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Bangalore",
    "courier": "Other",
    "trackingNumber": "EMIN123F291",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Ranger, Colour: Green. Status: Bikes Returned to Store. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Green"
  },
  {
    "id": "loginp-13",
    "influencerName": "MTB Imran",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "West Bengal",
    "courier": "Other",
    "trackingNumber": "EMIN123F332",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Ranger, Colour: Green. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Green"
  },
  {
    "id": "loginp-14",
    "influencerName": "Master Wheels",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Rajasthan",
    "courier": "Other",
    "trackingNumber": "EMIN47F0173",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Military Blue. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Military Blue"
  },
  {
    "id": "loginp-15",
    "influencerName": "Vivek Dubey",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "EMIN49F0007",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Native Pop. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Native Pop"
  },
  {
    "id": "loginp-16",
    "influencerName": "Microtech 07",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Indore",
    "courier": "Other",
    "trackingNumber": "EMIN71F0010",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Native Pop. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Native Pop"
  },
  {
    "id": "loginp-17",
    "influencerName": "Chalte Firte",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "EMIN71F0266",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Native Pop. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Native Pop"
  },
  {
    "id": "loginp-18",
    "influencerName": "ARUN MAVI",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Goregaon",
    "courier": "Other",
    "trackingNumber": "EMIN71F0266",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: doodle Pro, Colour: Native Pop. Status: Bikes Returned to Store. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Native Pop"
  },
  {
    "id": "loginp-19",
    "influencerName": "Yashasvi Singh",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "",
    "courier": "Other",
    "trackingNumber": "EMIN90F0091",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "preparing",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Native Pop. Status: Dispatch Pending. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Native Pop"
  },
  {
    "id": "loginp-20",
    "influencerName": "Bhavik Rajput",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Faridabad",
    "courier": "Other",
    "trackingNumber": "F032FV01C12",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Native Pop. Status: Returned In Warehouse. Ask vishwajit to arrange the technician. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Native Pop"
  },
  {
    "id": "loginp-21",
    "influencerName": "MTB Imran",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "West Bengal",
    "courier": "Other",
    "trackingNumber": "SK25066772",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Dope, Colour: Racer Red. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Racer Red"
  },
  {
    "id": "loginp-22",
    "influencerName": "Sourabh Saini",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Delhi",
    "courier": "Other",
    "trackingNumber": "SK25067156",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Dope, Colour: Inferno Black. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Inferno Black"
  },
  {
    "id": "loginp-23",
    "influencerName": "RC mech Jino",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Kerala",
    "courier": "Other",
    "trackingNumber": "EMIN156010039",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Viper, Colour: Viper Stealth Black. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Viper Stealth Black"
  },
  {
    "id": "loginp-24",
    "influencerName": "Samruddhi",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Pune",
    "courier": "Other",
    "trackingNumber": "EMIN156010122",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Viper, Colour: Viper Stealth Black. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Viper Stealth Black"
  },
  {
    "id": "loginp-25",
    "influencerName": "Deepak Ranjan",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Kerala",
    "courier": "Other",
    "trackingNumber": "EMIN47F0159",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "return_due",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Military Blue. Status: Reverse Pickup initiated. call not received from courier. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Military Blue"
  },
  {
    "id": "loginp-26",
    "influencerName": "Samar / Irshad Saifi",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Hapur",
    "courier": "Other",
    "trackingNumber": "EMIN190F678",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "return_due",
    "assignedTo": "",
    "notes": "Model: Ranger, Colour: Citrus Blue (M). Status: Reverse Pickup initiated. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Citrus Blue (M)"
  },
  {
    "id": "loginp-27",
    "influencerName": "Naresh",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Kochi",
    "courier": "Other",
    "trackingNumber": "EMIN71F0010",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Native Pop. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Native Pop"
  },
  {
    "id": "loginp-28",
    "influencerName": "Winni - The Cycle Junction",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Auragabad",
    "courier": "Other",
    "trackingNumber": "Dealer",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: All ebikes, Colour: All ebikes. Status: Bikes Returned to Store. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "All ebikes"
  },
  {
    "id": "loginp-29",
    "influencerName": "imdivyansh._ - Rajesh Cycles Store",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Delhi",
    "courier": "Other",
    "trackingNumber": "Dealer",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: All ebikes, Colour: All ebikes. Status: Bikes Returned to Store. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "All ebikes"
  },
  {
    "id": "loginp-30",
    "influencerName": "GurjeetSingh - bikeportcycling",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Hyderabad",
    "courier": "Other",
    "trackingNumber": "Dealer",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: All ebikes, Colour: All ebikes. Status: Bikes Returned to Store. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "All ebikes"
  },
  {
    "id": "loginp-31",
    "influencerName": "Kartik - Agarwal Cycle",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Nagpur",
    "courier": "Other",
    "trackingNumber": "Dealer",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: All ebikes, Colour: All ebikes. Status: Bikes Returned to Store. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "All ebikes"
  },
  {
    "id": "loginp-32",
    "influencerName": "Anshika",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Delhi",
    "courier": "Other",
    "trackingNumber": "EMIN190F574",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Ranger, Colour: Blue. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Blue"
  },
  {
    "id": "loginp-33",
    "influencerName": "Vidit - Social",
    "campaignName": "",
    "productModel": "X1",
    "unitType": "Returnable",
    "city": "Noida",
    "courier": "Other",
    "trackingNumber": "N2253000102RP",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "return_due",
    "assignedTo": "",
    "notes": "Model: X1, Colour: Blue. Status: Reverse Pickup initiated. Ask vishwajit to arrange the tecnician. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Blue"
  },
  {
    "id": "loginp-34",
    "influencerName": "VD Chawala Prashant",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Faridabad",
    "courier": "Other",
    "trackingNumber": "EMIN156010082",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Viper, Colour: Viper Stealth Black. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Viper Stealth Black"
  },
  {
    "id": "loginp-35",
    "influencerName": "Neeraj Bhandari",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Dehradun",
    "courier": "Other",
    "trackingNumber": "E106241084",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: L07, Colour: Yellow. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Yellow"
  },
  {
    "id": "loginp-36",
    "influencerName": "Shlok Jaiswal",
    "campaignName": "",
    "productModel": "X1",
    "unitType": "Returnable",
    "city": "Dahanu",
    "courier": "Other",
    "trackingNumber": "Y24434383",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: X1, Colour: Blue. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Blue"
  },
  {
    "id": "loginp-37",
    "influencerName": "Abhishek Soni",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Ajmer",
    "courier": "Other",
    "trackingNumber": "N2260901120",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "return_due",
    "assignedTo": "",
    "notes": "Model: Trex Air, Colour: . Status: Reverse Pickup initiated. Ask vishwajit to arrange the tecnician. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": ""
  },
  {
    "id": "loginp-38",
    "influencerName": "Neeraj Bhandari",
    "campaignName": "",
    "productModel": "X1",
    "unitType": "Returnable",
    "city": "Dehradun",
    "courier": "Other",
    "trackingNumber": "N2253904510",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "return_due",
    "assignedTo": "",
    "notes": "Model: X1, Colour: Grey. Status: Reverse Pickup initiated. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Grey"
  },
  {
    "id": "loginp-39",
    "influencerName": "Soumya Jaiswal",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "N2260503410",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "return_due",
    "assignedTo": "",
    "notes": "Model: Trex Air, Colour: Forest Furry. Status: Reverse Pickup initiated. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Forest Furry"
  },
  {
    "id": "loginp-40",
    "influencerName": "Abhijit Shete",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "E52409059",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: STX, Colour: Beige. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Beige"
  },
  {
    "id": "loginp-41",
    "influencerName": "Saksham Sharma",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "E40825258",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Trex Air, Colour: Metallic Red. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Metallic Red"
  },
  {
    "id": "loginp-42",
    "influencerName": "Shiv Dutt",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "E40925448",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Trex Air, Colour: Metallic Red. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Metallic Red"
  },
  {
    "id": "loginp-43",
    "influencerName": "Suvan Pranay",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "N2261201665",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: L07, Colour: Black. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Black"
  },
  {
    "id": "loginp-44",
    "influencerName": "Ronak Sagar",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "E52409034",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: STX, Colour: Teal Blue. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Teal Blue"
  },
  {
    "id": "loginp-45",
    "influencerName": "Ayaz Ahmed",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "N2260900343",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Trex Air, Colour: Forest Furry. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Forest Furry"
  },
  {
    "id": "loginp-46",
    "influencerName": "Rajat Dakol",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "EMIN126F0139",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: . Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": ""
  },
  {
    "id": "loginp-47",
    "influencerName": "ka_09_rider",
    "campaignName": "",
    "productModel": "X1",
    "unitType": "Returnable",
    "city": "Mysuru",
    "courier": "Other",
    "trackingNumber": "N2260805748",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: X1, Colour: Sky Blue. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Sky Blue"
  },
  {
    "id": "loginp-48",
    "influencerName": "Akash Prasad",
    "campaignName": "",
    "productModel": "X1",
    "unitType": "Returnable",
    "city": "Kolkata",
    "courier": "Other",
    "trackingNumber": "SK25D67994",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "dispatched",
    "assignedTo": "",
    "notes": "Model: X1, Colour: Sky Blue. Status: Dispatched. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Sky Blue"
  },
  {
    "id": "loginp-49",
    "influencerName": "Shubham Revankar",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "EMIN49F0096",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: Native Pop. Status: Returned In Warehouse. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Native Pop"
  },
  {
    "id": "loginp-50",
    "influencerName": "Rohit",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "",
    "courier": "Other",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "return_due",
    "assignedTo": "",
    "notes": "Model: Dope, Colour: Red. Status: Reverse Pickup initiated. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Red"
  },
  {
    "id": "loginp-51",
    "influencerName": "Harsh Shetty",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "EM05AV01C37",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "return_due",
    "assignedTo": "",
    "notes": "Model: STX, Colour: Blue. Status: Reverse Pickup initiated. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": "Blue"
  },
  {
    "id": "loginp-52",
    "influencerName": "Samrat (Gopu)",
    "campaignName": "",
    "productModel": "Other",
    "unitType": "Returnable",
    "city": "Mumbai",
    "courier": "Other",
    "trackingNumber": "EMIN126F0139",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "delivered",
    "assignedTo": "",
    "notes": "Model: Doodle Pro, Colour: . Status: Bike with Influencer. Imported from Excel tracker.",
    "createdAt": "2026-09-11T12:06:02.705055",
    "stageUpdatedAt": "2026-09-11T12:06:02.705055",
    "colour": ""
  },
  {
    "id": "loginp-ff-0",
    "influencerName": "prachitaranshofficial",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "951905224003001.0",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: JR. LIL E. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-1",
    "influencerName": "Chatpat Toy TV",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "91694737168.0",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "delivered",
    "assignedTo": "",
    "notes": "Bike: Bentley EXP 12. Courier: . Status: Pickup Reqst Sent. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-2",
    "influencerName": "Sakshi Agarwal",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Bentley EXP 12. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-3",
    "influencerName": "Rituka and baby saksham",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Delhi Expo. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-4",
    "influencerName": "Manpreet Kaur Chawla",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Delhi Expo. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-5",
    "influencerName": "Vandita Chaurasia",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Delhi Expo. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-6",
    "influencerName": "Avinash",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Delhi Expo. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-7",
    "influencerName": "Explore Vlogs A.R",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Delhi Expo. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-8",
    "influencerName": "Abhishek Jha",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Delhi Expo. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-9",
    "influencerName": "prachitaranshofficial",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Giveaway Video. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-10",
    "influencerName": "Palak Chopra",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Delhi Expo. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-11",
    "influencerName": "Jassimran kaur",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Delhi Expo. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-12",
    "influencerName": "innocent_hiccups",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: Bentley EXP 12. Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  },
  {
    "id": "loginp-ff-15",
    "influencerName": "prachitaranshofficial",
    "campaignName": "FF Regular Activity",
    "productModel": "Other",
    "unitType": "Non-Returnable",
    "city": "",
    "courier": "Self Delivery",
    "trackingNumber": "",
    "trackingLink": "",
    "dispatchDate": "",
    "expectedDelivery": "",
    "returnDueDate": "",
    "stage": "closed",
    "assignedTo": "",
    "notes": "Bike: . Courier: . Status: Deal Closed. Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646",
    "stageUpdatedAt": "2026-09-11T12:39:47.715646",
    "colour": ""
  }
]

// ---------- helpers ----------

function isDelayed(unit) {
  if (unit.stage !== "dispatched" || !unit.expectedDelivery) return false;
  return new Date(unit.expectedDelivery) < new Date(new Date().toDateString());
}

function isReturnOverdue(unit) {
  if (unit.stage !== "return_due" || !unit.returnDueDate) return false;
  return new Date(unit.returnDueDate) < new Date(new Date().toDateString());
}

function emptyLogisticsDraft() {
  return {
    id: null,
    influencerName: "",
    useOtherInfluencer: false,
    campaignName: "",
    useOtherCampaign: false,
    productModel: PRODUCT_MODELS[0],
    useOtherProductModel: false,
    colour: "",
    unitType: UNIT_TYPES[0],
    city: "",
    courier: COURIERS[0],
    trackingNumber: "",
    trackingLink: "",
    dispatchDate: daysFromNow(0),
    expectedDelivery: daysFromNow(4),
    returnDueDate: "",
    stage: "preparing",
    assignedTo: "",
    notes: "",
  };
}

// ---------- main component ----------

function EMotoradProductLogistics() {
  const [units, setUnits] = useState([]);
  const [crmInfluencers, setCrmInfluencers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [filterUnitType, setFilterUnitType] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(emptyLogisticsDraft());
  const [isNew, setIsNew] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState("");
  const [dragOverStage, setDragOverStage] = useState(null);

  // load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let loadedUnits = null;
      let loadedInfluencers = null;
      let loadedCampaigns = null;
      try {
        const res = await window.storage.get(LOGISTICS_KEY, true);
        if (res && res.value) loadedUnits = JSON.parse(res.value);
      } catch (e) {
        loadedUnits = null;
      }
      try {
        const res2 = await window.storage.get(INFLUENCERS_KEY, true);
        if (res2 && res2.value) loadedInfluencers = JSON.parse(res2.value);
      } catch (e) {
        loadedInfluencers = null;
      }
      try {
        const res3 = await window.storage.get(CAMPAIGNS_KEY, true);
        if (res3 && res3.value) loadedCampaigns = JSON.parse(res3.value);
      } catch (e) {
        loadedCampaigns = null;
      }
      if (cancelled) return;
      if (loadedUnits) {
        setUnits(loadedUnits);
      } else {
        setUnits(SEED_UNITS);
        try {
          await window.storage.set(LOGISTICS_KEY, JSON.stringify(SEED_UNITS), true);
        } catch (e) {}
      }
      setCrmInfluencers(loadedInfluencers || []);
      setCampaigns(loadedCampaigns || []);
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next) => {
    setUnits(next);
    try {
      const res = await window.storage.set(LOGISTICS_KEY, JSON.stringify(next), true);
      if (!res) showToast("Couldn't save — try again");
    } catch (e) {
      showToast("Couldn't save — try again");
    }
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  // ---------- derived data ----------

  const filtered = useMemo(() => {
    return units.filter((u) => {
      if (filterStage !== "all" && u.stage !== filterStage) return false;
      if (filterUnitType !== "all" && u.unitType !== filterUnitType) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = (u.influencerName + " " + u.city + " " + u.trackingNumber + " " + u.campaignName).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [units, filterStage, filterUnitType, search]);

  const stats = useMemo(() => {
    const inTransit = units.filter((u) => u.stage === "dispatched").length;
    const pendingReturns = units.filter((u) => u.stage === "return_due").length;
    const flagged = units.filter((u) => isDelayed(u) || isReturnOverdue(u)).length;
    return { total: units.length, inTransit, pendingReturns, flagged };
  }, [units]);

  // ---------- actions ----------

  function openAddDrawer() {
    setDraft(emptyLogisticsDraft());
    setIsNew(true);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function openEditDrawer(unit) {
    const isKnown = crmInfluencers.some((i) => i.name === unit.influencerName);
    const isKnownCampaign = !unit.campaignName || campaigns.some((c) => c.name === unit.campaignName);
    const isKnownModel = PRODUCT_MODELS.includes(unit.productModel);
    setDraft({
      ...unit,
      useOtherInfluencer: !isKnown,
      useOtherCampaign: !isKnownCampaign,
      useOtherProductModel: !isKnownModel,
    });
    setIsNew(false);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function saveDraft() {
    if (!draft.influencerName.trim()) {
      showToast("Pick or enter an influencer");
      return;
    }
    const now = new Date().toISOString();
    if (isNew) {
      const record = {
        ...draft,
        id: "unit-" + Date.now(),
        stage: "preparing",
        createdAt: now,
        stageUpdatedAt: now,
      };
      delete record.useOtherInfluencer;
      delete record.useOtherCampaign;
      delete record.useOtherProductModel;
      persist([record, ...units]);
      showToast("Unit added");
    } else {
      const next = units.map((u) => {
        if (u.id !== draft.id) return u;
        const record = { ...u, ...draft };
        delete record.useOtherInfluencer;
        delete record.useOtherCampaign;
        delete record.useOtherProductModel;
        if (draft.stage !== u.stage) record.stageUpdatedAt = now;
        return record;
      });
      persist(next);
      showToast("Changes saved");
    }
    closeDrawer();
  }

  function deleteDraft() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    persist(units.filter((u) => u.id !== draft.id));
    showToast("Unit removed");
    closeDrawer();
  }

  function moveStage(id, direction) {
    const next = units.map((u) => {
      if (u.id !== id) return u;
      const idx = LOGISTICS_STAGES.findIndex((s) => s.key === u.stage);
      const newIdx = Math.min(LOGISTICS_STAGES.length - 1, Math.max(0, idx + direction));
      if (newIdx === idx) return u;
      return { ...u, stage: LOGISTICS_STAGES[newIdx].key, stageUpdatedAt: new Date().toISOString() };
    });
    persist(next);
  }

  function setStageDirect(id, stageKey) {
    const next = units.map((u) =>
      u.id === id ? { ...u, stage: stageKey, stageUpdatedAt: new Date().toISOString() } : u
    );
    persist(next);
  }

  function handleDrop(stageKey, e) {
    e.preventDefault();
    setDragOverStage(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) setStageDirect(id, stageKey);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading logistics board…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .input {
          width: 100%;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13.5px;
          color: #f4f4f5;
        }
        .input:focus { outline: none; border-color: #004DAC; }
      `}</style>

      {/* top bar */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="font-display font-semibold text-lg">Product Logistics</div>
        <button
          onClick={openAddDrawer}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Log a unit
        </button>
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800">
        <StatBlock label="Units tracked" value={stats.total} />
        <StatBlock label="In transit" value={stats.inTransit} accent />
        <StatBlock label="Pending returns" value={stats.pendingReturns} />
        <StatBlock label="Needs attention" value={stats.flagged} warn={stats.flagged > 0} />
      </div>

      {/* controls */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-zinc-800">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
          <TabButton active={activeTab === "pipeline"} onClick={() => setActiveTab("pipeline")} icon={LayoutGrid}>
            Pipeline
          </TabButton>
          <TabButton active={activeTab === "directory"} onClick={() => setActiveTab("directory")} icon={Table2}>
            Directory
          </TabButton>
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search influencer, city, AWB"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <Select value={filterUnitType} onChange={setFilterUnitType} options={["all", ...UNIT_TYPES]} labelAll="Gift & loaner" />
        {activeTab === "directory" && (
          <Select
            value={filterStage}
            onChange={setFilterStage}
            options={["all", ...LOGISTICS_STAGES.map((s) => s.key)]}
            labelAll="All stages"
            labelMap={Object.fromEntries(LOGISTICS_STAGES.map((s) => [s.key, s.label]))}
          />
        )}
      </div>

      {/* body */}
      <div className="px-6 py-5">
        {activeTab === "pipeline" ? (
          <LogisticsBoard
            filtered={filtered}
            onCardClick={openEditDrawer}
            onMoveStage={moveStage}
            onDrop={handleDrop}
            dragOverStage={dragOverStage}
            setDragOverStage={setDragOverStage}
          />
        ) : (
          <LogisticsDirectoryTable filtered={filtered} onRowClick={openEditDrawer} />
        )}
      </div>

      {/* drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">{isNew ? "Log a unit" : "Edit unit"}</div>
              <button onClick={closeDrawer} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <Field label="Influencer">
                {!draft.useOtherInfluencer ? (
                  <select
                    value={draft.influencerName}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setDraft({ ...draft, useOtherInfluencer: true, influencerName: "" });
                      } else {
                        setDraft({ ...draft, influencerName: e.target.value });
                      }
                    }}
                    className="input"
                  >
                    <option value="">Select from CRM</option>
                    {crmInfluencers.map((i) => (
                      <option key={i.id} value={i.name}>
                        {i.name}
                      </option>
                    ))}
                    <option value="__other__">Other (type manually)</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={draft.influencerName}
                      onChange={(e) => setDraft({ ...draft, influencerName: e.target.value })}
                      className="input"
                      placeholder="Influencer name"
                      autoFocus
                    />
                    <button
                      onClick={() => setDraft({ ...draft, useOtherInfluencer: false, influencerName: "" })}
                      className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap px-2"
                    >
                      Use CRM list
                    </button>
                  </div>
                )}
              </Field>

              <Field label="Campaign (optional)">
                {!draft.useOtherCampaign ? (
                  <select
                    value={draft.campaignName}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setDraft({ ...draft, useOtherCampaign: true, campaignName: "" });
                      } else {
                        setDraft({ ...draft, campaignName: e.target.value });
                      }
                    }}
                    className="input"
                  >
                    <option value="">Not linked to a campaign</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__other__">Other / Add manually</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={draft.campaignName}
                      onChange={(e) => setDraft({ ...draft, campaignName: e.target.value })}
                      className="input"
                      placeholder="Campaign name"
                      autoFocus
                    />
                    <button
                      onClick={() => setDraft({ ...draft, useOtherCampaign: false, campaignName: "" })}
                      className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap px-2"
                    >
                      Use campaign list
                    </button>
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Product model">
                  {!draft.useOtherProductModel ? (
                    <select
                      value={draft.productModel}
                      onChange={(e) => {
                        if (e.target.value === "__other__") {
                          setDraft({ ...draft, useOtherProductModel: true, productModel: "" });
                        } else {
                          setDraft({ ...draft, productModel: e.target.value });
                        }
                      }}
                      className="input"
                    >
                      {PRODUCT_MODELS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value="__other__">Other / Add manually</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={draft.productModel}
                        onChange={(e) => setDraft({ ...draft, productModel: e.target.value })}
                        className="input"
                        placeholder="Model name"
                        autoFocus
                      />
                      <button
                        onClick={() => setDraft({ ...draft, useOtherProductModel: false, productModel: PRODUCT_MODELS[0] })}
                        className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap px-2"
                      >
                        Use list
                      </button>
                    </div>
                  )}
                </Field>
                <Field label="Unit type">
                  <select
                    value={draft.unitType}
                    onChange={(e) => setDraft({ ...draft, unitType: e.target.value })}
                    className="input"
                  >
                    {UNIT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Colour">
                  <input
                    value={draft.colour}
                    onChange={(e) => setDraft({ ...draft, colour: e.target.value })}
                    className="input"
                    placeholder="e.g. Matte Black"
                  />
                </Field>
                <Field label="Frame No. / Item Code">
                  <input
                    value={draft.trackingNumber}
                    onChange={(e) => setDraft({ ...draft, trackingNumber: e.target.value })}
                    className="input"
                    placeholder="Frame number or item code"
                  />
                </Field>
              </div>

              <Field label="Delivery city / Location">
                <input
                  value={draft.city}
                  onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                  className="input"
                  placeholder="City"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Courier">
                  <select
                    value={draft.courier}
                    onChange={(e) => setDraft({ ...draft, courier: e.target.value })}
                    className="input"
                  >
                    {COURIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tracking link">
                  <input
                    value={draft.trackingLink}
                    onChange={(e) => setDraft({ ...draft, trackingLink: e.target.value })}
                    className="input"
                    placeholder="Optional"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Dispatch date">
                  <input
                    type="date"
                    value={draft.dispatchDate}
                    onChange={(e) => setDraft({ ...draft, dispatchDate: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Expected delivery">
                  <input
                    type="date"
                    value={draft.expectedDelivery}
                    onChange={(e) => setDraft({ ...draft, expectedDelivery: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              {draft.unitType === "Returnable" && (
                <Field label="Return due date">
                  <input
                    type="date"
                    value={draft.returnDueDate}
                    onChange={(e) => setDraft({ ...draft, returnDueDate: e.target.value })}
                    className="input"
                  />
                </Field>
              )}

              {!isNew && (
                <Field label="Stage">
                  <select
                    value={draft.stage}
                    onChange={(e) => setDraft({ ...draft, stage: e.target.value })}
                    className="input"
                  >
                    {LOGISTICS_STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Assigned to">
                <input
                  value={draft.assignedTo}
                  onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })}
                  className="input"
                  placeholder="Who's handling this"
                />
              </Field>

              <Field label="Notes">
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="input min-h-[70px] resize-none"
                  placeholder="Anything the team should know"
                />
              </Field>
            </div>

            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-5 flex gap-2">
              <button
                onClick={saveDraft}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors"
              >
                {isNew ? "Add unit" : "Save changes"}
              </button>
              {!isNew && (
                <button
                  onClick={deleteDraft}
                  className={`px-3 rounded-md border text-sm transition-colors ${
                    confirmDelete
                      ? "border-red-500 text-red-400 bg-red-500/10"
                      : "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                  }`}
                >
                  {confirmDelete ? "Confirm delete" : <Trash2 size={16} />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-800 text-sm px-4 py-2 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------- subcomponents ----------

function UnitCard({ unit, onClick, onMoveStage }) {
  const idx = LOGISTICS_STAGES.findIndex((s) => s.key === unit.stage);
  const delayed = isDelayed(unit);
  const returnOverdue = isReturnOverdue(unit);
  const stageLabel = LOGISTICS_STAGES.find((s) => s.key === unit.stage)?.label || unit.stage;

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", unit.id)}
      onClick={() => onClick(unit)}
      className="bg-zinc-900 border border-zinc-800 rounded-md p-3 cursor-pointer hover:border-zinc-800 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{unit.influencerName}</div>
          <div className="text-xs text-zinc-500 truncate flex items-center gap-1">
            <MapPin size={11} />
            {unit.city || "No location set"}
          </div>
        </div>
        <span className="text-[11px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
          {unit.productModel}
        </span>
      </div>

      {unit.campaignName && (
        <div className="text-[11px] text-zinc-600 mb-2 truncate">{unit.campaignName}</div>
      )}

      <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
        <span>{unit.unitType}</span>
        {unit.trackingNumber && <span className="truncate">Frame: {unit.trackingNumber}</span>}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">{stageLabel}</span>
        {returnOverdue ? (
          <span className="flex items-center gap-1 text-[11px] text-red-400">
            <AlertTriangle size={11} />
            Return overdue
          </span>
        ) : delayed ? (
          <span className="flex items-center gap-1 text-[11px] text-amber-400">
            <Clock size={11} />
            Delayed
          </span>
        ) : (
          <span className="text-[11px] text-zinc-600">{unit.assignedTo || "Unassigned"}</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
        <button
          disabled={idx === 0}
          onClick={(e) => {
            e.stopPropagation();
            onMoveStage(unit.id, -1);
          }}
          className="text-zinc-500 hover:text-blue-400 disabled:opacity-20 disabled:hover:text-zinc-500"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="text-[10px] text-zinc-600">move stage</span>
        <button
          disabled={idx === LOGISTICS_STAGES.length - 1}
          onClick={(e) => {
            e.stopPropagation();
            onMoveStage(unit.id, 1);
          }}
          className="text-zinc-500 hover:text-blue-400 disabled:opacity-20 disabled:hover:text-zinc-500"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function LogisticsBoard({ filtered, onCardClick, onMoveStage, onDrop, dragOverStage, setDragOverStage }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {LOGISTICS_STAGES.map((stage) => {
        const cards = filtered.filter((u) => u.stage === stage.key);
        return (
          <div
            key={stage.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage.key);
            }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => onDrop(stage.key, e)}
            className={`w-64 flex-shrink-0 rounded-md border transition-colors ${
              dragOverStage === stage.key ? "border-blue-500/60 bg-blue-600/5" : "border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
              <span className="text-sm font-medium">{stage.label}</span>
              <span className="text-xs text-zinc-500 bg-zinc-900 rounded px-1.5 py-0.5">{cards.length}</span>
            </div>
            <div className="p-2 flex flex-col gap-2 min-h-[80px]">
              {cards.length === 0 ? (
                <div className="border border-dashed border-zinc-800 rounded-md py-6 text-center text-xs text-zinc-600">
                  Drag a unit here
                </div>
              ) : (
                cards.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} onClick={onCardClick} onMoveStage={onMoveStage} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogisticsDirectoryTable({ filtered, onRowClick }) {
  if (filtered.length === 0) {
    return <div className="text-center text-zinc-600 text-sm py-16">No units match these filters.</div>;
  }
  return (
    <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-500 text-xs">
            <th className="text-left font-medium px-3 py-2.5">Name</th>
            <th className="text-left font-medium px-3 py-2.5">Model</th>
            <th className="text-left font-medium px-3 py-2.5">Colour</th>
            <th className="text-left font-medium px-3 py-2.5">Frame No. / Item Code</th>
            <th className="text-left font-medium px-3 py-2.5">Location</th>
            <th className="text-left font-medium px-3 py-2.5">Bike Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => {
            const stageLabel = LOGISTICS_STAGES.find((s) => s.key === u.stage)?.label || u.stage;
            const delayed = isDelayed(u);
            const returnOverdue = isReturnOverdue(u);
            return (
              <tr
                key={u.id}
                onClick={() => onRowClick(u)}
                className="border-t border-zinc-800 hover:bg-zinc-900/60 cursor-pointer"
              >
                <td className="px-3 py-2.5">
                  <div className="font-medium">{u.influencerName}</div>
                  <div className="text-xs text-zinc-500">{u.unitType}</div>
                </td>
                <td className="px-3 py-2.5 text-zinc-400">{u.productModel}</td>
                <td className="px-3 py-2.5 text-zinc-400">{u.colour || "—"}</td>
                <td className="px-3 py-2.5 text-zinc-400">{u.trackingNumber || "—"}</td>
                <td className="px-3 py-2.5 text-zinc-400">{u.city || "—"}</td>
                <td className="px-3 py-2.5">
                  <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">{stageLabel}</span>
                  {returnOverdue ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-400">
                      <AlertTriangle size={12} />
                      Return overdue
                    </span>
                  ) : delayed ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-400">
                      <Clock size={12} />
                      Delayed
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ==================== TEAM COORDINATION MODULE ====================

// ---------- constants ----------

const TASK_STATUSES = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

const PRIORITIES = ["Low", "Medium", "High"];

const TASKS_KEY = "emotorad-tasks-v2";

const SEED_TASKS = [
  {
    id: "task-1",
    title: "Prep rate card for Q4 influencer outreach",
    assignee: "Shikha",
    dueDate: daysFromNow(2),
    priority: "High",
    status: "in_progress",
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    title: "Follow up with Delhivery on delayed shipments",
    assignee: "Rohan",
    dueDate: daysFromNow(-1),
    priority: "High",
    status: "todo",
    notes: "Two units flagged as delayed in logistics board.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-3",
    title: "Draft Diwali campaign brief for creative team",
    assignee: "Ananya",
    dueDate: daysFromNow(5),
    priority: "Medium",
    status: "todo",
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-4",
    title: "Review last month's content performance screenshots",
    assignee: "Shikha",
    dueDate: daysFromNow(-3),
    priority: "Low",
    status: "done",
    notes: "",
    createdAt: new Date().toISOString(),
  },
];

// ---------- helpers ----------

function isPastToday(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

function emptyTaskDraft() {
  return {
    id: null,
    title: "",
    assignee: "",
    dueDate: daysFromNow(3),
    priority: "Medium",
    status: "todo",
    notes: "",
  };
}

// campaign deliverable overdue check (mirrors campaign module logic)
function isDeliverableOverdue(dueDate, status) {
  if (!dueDate) return false;
  if (status === "Posted" || status === "Paid") return false;
  return isPastToday(dueDate);
}

// logistics flags (mirrors logistics module logic)
function isUnitDelayed(unit) {
  if (unit.stage !== "dispatched" || !unit.expectedDelivery) return false;
  return isPastToday(unit.expectedDelivery);
}
function isUnitReturnOverdue(unit) {
  if (unit.stage !== "return_due" || !unit.returnDueDate) return false;
  return isPastToday(unit.returnDueDate);
}

// ---------- main component ----------

function EMotoradTeamCoordination() {
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState(SEED_TEAM);
  const [influencers, setInfluencers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [logisticsUnits, setLogisticsUnits] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState("workload");
  const [digestFilter, setDigestFilter] = useState("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(emptyTaskDraft());
  const [isNew, setIsNew] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAddTeammate, setShowAddTeammate] = useState(false);
  const [newTeammate, setNewTeammate] = useState("");
  const [toast, setToast] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState(null);

  const [teamDrawerOpen, setTeamDrawerOpen] = useState(false);
  const [memberEdits, setMemberEdits] = useState({});
  const [newMemberName, setNewMemberName] = useState("");
  const [confirmDeleteMember, setConfirmDeleteMember] = useState(null);

  // load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let loadedTasks = null;
      let loadedTeam = null;
      let loadedInfluencers = null;
      let loadedCampaigns = null;
      let loadedLogistics = null;
      try {
        const r = await window.storage.get(TASKS_KEY, true);
        if (r && r.value) loadedTasks = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(TEAM_KEY, true);
        if (r && r.value) loadedTeam = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(INFLUENCERS_KEY, true);
        if (r && r.value) loadedInfluencers = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(CAMPAIGNS_KEY, true);
        if (r && r.value) loadedCampaigns = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(LOGISTICS_KEY, true);
        if (r && r.value) loadedLogistics = JSON.parse(r.value);
      } catch (e) {}

      if (cancelled) return;

      if (loadedTasks) {
        setTasks(loadedTasks);
      } else {
        setTasks(SEED_TASKS);
        try {
          await window.storage.set(TASKS_KEY, JSON.stringify(SEED_TASKS), true);
        } catch (e) {}
      }
      setTeam(loadedTeam || SEED_TEAM);
      setInfluencers(loadedInfluencers || []);
      setCampaigns(loadedCampaigns || []);
      setLogisticsUnits(loadedLogistics || []);
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistTasks = useCallback(async (next) => {
    setTasks(next);
    try {
      const res = await window.storage.set(TASKS_KEY, JSON.stringify(next), true);
      if (!res) showToast("Couldn't save — try again");
    } catch (e) {
      showToast("Couldn't save — try again");
    }
  }, []);

  const persistTeam = useCallback(async (next) => {
    setTeam(next);
    try {
      await window.storage.set(TEAM_KEY, JSON.stringify(next), true);
    } catch (e) {}
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  // ---------- cross-module digest ----------

  const digestItems = useMemo(() => {
    const items = [];

    influencers.forEach((inf) => {
      if (inf.dropped || inf.stage === "paid") return;
      const stale = daysSince(inf.stageUpdatedAt);
      if (stale >= 5) {
        items.push({
          id: "crm-" + inf.id,
          type: "CRM",
          title: inf.name,
          subtitle: `${stale}d without movement in "${inf.stage}"`,
          assignee: inf.assignedTo || "",
        });
      }
    });

    campaigns.forEach((c) => {
      (c.deliverables || []).forEach((d) => {
        if (isDeliverableOverdue(d.dueDate, d.status)) {
          items.push({
            id: "camp-" + d.id,
            type: "Campaign",
            title: `${d.influencerName} — ${(d.contentTypes || []).join(", ")}`,
            subtitle: `${c.name} · overdue since ${formatDate(d.dueDate)}`,
            assignee: "",
          });
        }
      });
    });

    logisticsUnits.forEach((u) => {
      if (isUnitDelayed(u)) {
        items.push({
          id: "log-delay-" + u.id,
          type: "Logistics",
          title: `${u.influencerName} — ${u.productModel}`,
          subtitle: `Delayed, expected ${formatDate(u.expectedDelivery)}`,
          assignee: u.assignedTo || "",
        });
      }
      if (isUnitReturnOverdue(u)) {
        items.push({
          id: "log-return-" + u.id,
          type: "Logistics",
          title: `${u.influencerName} — ${u.productModel}`,
          subtitle: `Return overdue since ${formatDate(u.returnDueDate)}`,
          assignee: u.assignedTo || "",
        });
      }
    });

    tasks.forEach((t) => {
      if (t.status !== "done" && isPastToday(t.dueDate)) {
        items.push({
          id: "task-overdue-" + t.id,
          type: "Task",
          title: t.title,
          subtitle: `Overdue since ${formatDate(t.dueDate)}`,
          assignee: t.assignee || "",
        });
      }
    });

    return items.filter((item) => digestFilter === "all" || item.assignee === digestFilter);
  }, [influencers, campaigns, logisticsUnits, tasks, digestFilter]);

  const digestCounts = useMemo(() => {
    const byType = { CRM: 0, Campaign: 0, Logistics: 0, Task: 0 };
    digestItems.forEach((i) => (byType[i.type] = (byType[i.type] || 0) + 1));
    return byType;
  }, [digestItems]);

  // ---------- workload aggregation ----------

  const workload = useMemo(() => {
    return team.map((member) => {
      const crmCount = influencers.filter(
        (i) => i.assignedTo === member && !i.dropped && i.stage !== "paid"
      ).length;
      const logisticsCount = logisticsUnits.filter(
        (u) => u.assignedTo === member && u.stage !== "closed"
      ).length;
      const openTasks = tasks.filter((t) => t.assignee === member && t.status !== "done").length;
      const overdueTasks = tasks.filter(
        (t) => t.assignee === member && t.status !== "done" && isPastToday(t.dueDate)
      ).length;
      return {
        member,
        crmCount,
        logisticsCount,
        openTasks,
        overdueTasks,
        total: crmCount + logisticsCount + openTasks,
      };
    });
  }, [team, influencers, logisticsUnits, tasks]);

  // ---------- task stats ----------

  const taskStats = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "done").length;
    const overdue = tasks.filter((t) => t.status !== "done" && isPastToday(t.dueDate)).length;
    return { open, overdue };
  }, [tasks]);

  // ---------- task actions ----------

  function openAddTask() {
    setDraft(emptyTaskDraft());
    setIsNew(true);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function openEditTask(t) {
    setDraft({ ...t });
    setIsNew(false);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setShowAddTeammate(false);
    setNewTeammate("");
  }

  function saveTask() {
    if (!draft.title.trim()) {
      showToast("Task title is required");
      return;
    }
    if (isNew) {
      const record = {
        ...draft,
        id: "task-" + Date.now(),
        createdAt: new Date().toISOString(),
      };
      persistTasks([record, ...tasks]);
      showToast("Task added");
    } else {
      const next = tasks.map((t) => (t.id === draft.id ? { ...t, ...draft } : t));
      persistTasks(next);
      showToast("Task updated");
    }
    closeDrawer();
  }

  function deleteTask() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    persistTasks(tasks.filter((t) => t.id !== draft.id));
    showToast("Task removed");
    closeDrawer();
  }

  function setTaskStatus(id, status) {
    persistTasks(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  function handleDrop(statusKey, e) {
    e.preventDefault();
    setDragOverStatus(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) setTaskStatus(id, statusKey);
  }

  function addTeammate() {
    const name = newTeammate.trim();
    if (!name) return;
    if (team.includes(name)) {
      showToast("Already on the team list");
      return;
    }
    persistTeam([...team, name]);
    setDraft((d) => ({ ...d, assignee: name }));
    setNewTeammate("");
    setShowAddTeammate(false);
  }

  // ---------- manage team members ----------

  function openTeamDrawer() {
    setMemberEdits(Object.fromEntries(team.map((name) => [name, name])));
    setNewMemberName("");
    setConfirmDeleteMember(null);
    setTeamDrawerOpen(true);
  }

  function closeTeamDrawer() {
    setTeamDrawerOpen(false);
  }

  function commitMemberRename(originalName) {
    const newName = (memberEdits[originalName] || "").trim();
    if (!newName || newName === originalName) return;
    if (team.includes(newName)) {
      showToast("Someone with that name is already on the team");
      setMemberEdits((e) => ({ ...e, [originalName]: originalName }));
      return;
    }
    const next = team.map((n) => (n === originalName ? newName : n));
    persistTeam(next);
    showToast("Member renamed");
  }

  function deleteMember(name) {
    if (confirmDeleteMember !== name) {
      setConfirmDeleteMember(name);
      return;
    }
    persistTeam(team.filter((n) => n !== name));
    setConfirmDeleteMember(null);
    showToast("Member removed");
  }

  function addNewMember() {
    const name = newMemberName.trim();
    if (!name) return;
    if (team.includes(name)) {
      showToast("Already on the team list");
      return;
    }
    persistTeam([...team, name]);
    setMemberEdits((e) => ({ ...e, [name]: name }));
    setNewMemberName("");
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading team board…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .input {
          width: 100%;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13.5px;
          color: #f4f4f5;
        }
        .input:focus { outline: none; border-color: #004DAC; }
      `}</style>

      {/* top bar */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="font-display font-semibold text-lg">Team Coordination</div>
        <div className="flex items-center gap-2">
          <button
            onClick={openTeamDrawer}
            className="flex items-center gap-1.5 border border-zinc-800 hover:border-zinc-800 text-zinc-300 font-medium text-sm px-4 py-2 rounded-md transition-colors"
          >
            <Users size={16} />
            Edit members
          </button>
          {activeTab === "tasks" && (
            <button
              onClick={openAddTask}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              New task
            </button>
          )}
        </div>
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800">
        <StatBlock label="Needs attention" value={digestCounts.CRM + digestCounts.Campaign + digestCounts.Logistics + digestCounts.Task} accent />
        <StatBlock label="Open tasks" value={taskStats.open} />
        <StatBlock label="Overdue tasks" value={taskStats.overdue} warn={taskStats.overdue > 0} />
        <StatBlock label="Team members" value={team.length} />
      </div>

      {/* tabs */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-zinc-800">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
          <TabButton active={activeTab === "workload"} onClick={() => setActiveTab("workload")} icon={Users}>
            Workload
          </TabButton>
          <TabButton active={activeTab === "tasks"} onClick={() => setActiveTab("tasks")} icon={ListChecks}>
            Tasks
          </TabButton>
        </div>
      </div>

      {/* body */}
      <div className="px-6 py-5">
        {activeTab === "workload" && <WorkloadTable rows={workload} />}
        {activeTab === "tasks" && (
          <TaskBoard
            tasks={tasks}
            onCardClick={openEditTask}
            onDrop={handleDrop}
            dragOverStatus={dragOverStatus}
            setDragOverStatus={setDragOverStatus}
          />
        )}
      </div>

      {/* task drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">{isNew ? "New task" : "Edit task"}</div>
              <button onClick={closeDrawer} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <Field label="Title">
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="input"
                  placeholder="What needs to get done?"
                />
              </Field>

              <Field label="Assignee">
                {!showAddTeammate ? (
                  <div className="flex gap-2">
                    <select
                      value={draft.assignee}
                      onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
                      className="input flex-1"
                    >
                      <option value="">Unassigned</option>
                      {team.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowAddTeammate(true)}
                      className="px-2.5 border border-zinc-800 rounded-md text-zinc-400 hover:text-blue-400 hover:border-blue-500/50"
                      title="Add teammate"
                    >
                      <UserPlus size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={newTeammate}
                      onChange={(e) => setNewTeammate(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTeammate()}
                      className="input flex-1"
                      placeholder="Teammate name"
                    />
                    <button onClick={addTeammate} className="px-3 bg-blue-600 text-white rounded-md text-sm font-medium">
                      Add
                    </button>
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Due date">
                  <input
                    type="date"
                    value={draft.dueDate}
                    onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Priority">
                  <select
                    value={draft.priority}
                    onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                    className="input"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {!isNew && (
                <Field label="Status">
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                    className="input"
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Notes">
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="input min-h-[70px] resize-none"
                  placeholder="Optional context"
                />
              </Field>
            </div>

            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-5 flex gap-2">
              <button
                onClick={saveTask}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors"
              >
                {isNew ? "Add task" : "Save changes"}
              </button>
              {!isNew && (
                <button
                  onClick={deleteTask}
                  className={`px-3 rounded-md border text-sm transition-colors ${
                    confirmDelete
                      ? "border-red-500 text-red-400 bg-red-500/10"
                      : "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                  }`}
                >
                  {confirmDelete ? "Confirm delete" : <Trash2 size={16} />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* manage team members drawer */}
      {teamDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeTeamDrawer} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[380px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">Edit team members</div>
              <button onClick={closeTeamDrawer} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              {team.length === 0 && (
                <div className="text-sm text-zinc-600 text-center py-6">No team members yet.</div>
              )}
              {team.map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <input
                    value={memberEdits[name] !== undefined ? memberEdits[name] : name}
                    onChange={(e) => setMemberEdits((edits) => ({ ...edits, [name]: e.target.value }))}
                    onBlur={() => commitMemberRename(name)}
                    onKeyDown={(e) => e.key === "Enter" && commitMemberRename(name)}
                    className="input flex-1"
                  />
                  <button
                    onClick={() => deleteMember(name)}
                    className={`px-2.5 py-2 rounded-md border text-sm transition-colors ${
                      confirmDeleteMember === name
                        ? "border-red-500 text-red-400 bg-red-500/10"
                        : "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                    }`}
                  >
                    {confirmDeleteMember === name ? "Confirm" : <Trash2 size={14} />}
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800 mt-1">
                <input
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNewMember()}
                  className="input flex-1"
                  placeholder="New teammate name"
                />
                <button
                  onClick={addNewMember}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium"
                >
                  Add
                </button>
              </div>

              <div className="text-[11px] text-zinc-600 pt-2">
                Renaming or removing someone here updates the team list everywhere it's used. It won't change who's
                already assigned on existing influencers, units, or tasks — reassign those individually if needed.
              </div>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-800 text-sm px-4 py-2 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------- subcomponents ----------

const TYPE_ICONS = {
  CRM: UserCheck,
  Campaign: Megaphone,
  Logistics: Package,
  Task: ListChecks,
};

function TodayDigest({ items }) {
  if (items.length === 0) {
    return (
      <div className="border border-dashed border-zinc-800 rounded-md py-16 text-center text-sm text-zinc-600">
        Nothing needs attention right now. Clean slate.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {items.map((item) => {
        const Icon = TYPE_ICONS[item.type] || AlertCircle;
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-md px-4 py-3"
          >
            <div className="w-7 h-7 rounded-md bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon size={14} className="text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{item.title}</span>
                <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{item.type}</span>
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">{item.subtitle}</div>
            </div>
            <div className="text-xs text-zinc-500 flex-shrink-0">{item.assignee || "Unassigned"}</div>
          </div>
        );
      })}
    </div>
  );
}

function WorkloadTable({ rows }) {
  if (rows.length === 0) {
    return <div className="text-center text-zinc-600 text-sm py-16">No team members yet.</div>;
  }
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="border border-zinc-800 rounded-md overflow-hidden max-w-3xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-500 text-xs">
            <th className="text-left font-medium px-4 py-2.5">Team member</th>
            <th className="text-left font-medium px-4 py-2.5">CRM leads</th>
            <th className="text-left font-medium px-4 py-2.5">Logistics units</th>
            <th className="text-left font-medium px-4 py-2.5">Open tasks</th>
            <th className="text-left font-medium px-4 py-2.5">Overdue tasks</th>
            <th className="text-left font-medium px-4 py-2.5">Load</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.member} className="border-t border-zinc-800">
              <td className="px-4 py-3 font-medium flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-300">
                  {initials(r.member)}
                </div>
                {r.member}
              </td>
              <td className="px-4 py-3 text-zinc-400">{r.crmCount}</td>
              <td className="px-4 py-3 text-zinc-400">{r.logisticsCount}</td>
              <td className="px-4 py-3 text-zinc-400">{r.openTasks}</td>
              <td className={`px-4 py-3 ${r.overdueTasks > 0 ? "text-amber-400" : "text-zinc-400"}`}>{r.overdueTasks}</td>
              <td className="px-4 py-3 w-40">
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: (r.total / maxTotal) * 100 + "%" }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2.5 text-[11px] text-zinc-600 border-t border-zinc-800">
        Campaign deliverables aren't attributed to a person yet, so they're not counted here — only in the "Today" digest.
      </div>
    </div>
  );
}

function priorityColor(p) {
  if (p === "High") return "text-amber-400";
  if (p === "Low") return "text-zinc-500";
  return "text-zinc-300";
}

function TaskCard({ task, onClick }) {
  const overdue = task.status !== "done" && isPastToday(task.dueDate);
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
      onClick={() => onClick(task)}
      className="bg-zinc-900 border border-zinc-800 rounded-md p-3 cursor-pointer hover:border-zinc-800 transition-colors"
    >
      <div className="text-sm font-medium mb-2">{task.title}</div>
      <div className="flex items-center justify-between text-xs">
        <span className={priorityColor(task.priority)}>{task.priority}</span>
        <span className={overdue ? "text-amber-400" : "text-zinc-500"}>
          {formatDate(task.dueDate)}
          {overdue && " · overdue"}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
        <span className="text-[11px] text-zinc-600">{task.assignee || "Unassigned"}</span>
        {task.assignee && (
          <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-800 flex items-center justify-center text-[9px] font-semibold text-zinc-300">
            {initials(task.assignee)}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskBoard({ tasks, onCardClick, onDrop, dragOverStatus, setDragOverStatus }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {TASK_STATUSES.map((status) => {
        const cards = tasks.filter((t) => t.status === status.key);
        return (
          <div
            key={status.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status.key);
            }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => onDrop(status.key, e)}
            className={`w-72 flex-shrink-0 rounded-md border transition-colors ${
              dragOverStatus === status.key ? "border-blue-500/60 bg-blue-600/5" : "border-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
              <span className="text-sm font-medium">{status.label}</span>
              <span className="text-xs text-zinc-500 bg-zinc-900 rounded px-1.5 py-0.5">{cards.length}</span>
            </div>
            <div className="p-2 flex flex-col gap-2 min-h-[80px]">
              {cards.length === 0 ? (
                <div className="border border-dashed border-zinc-800 rounded-md py-6 text-center text-xs text-zinc-600">
                  Drag a task here
                </div>
              ) : (
                cards.map((task) => <TaskCard key={task.id} task={task} onClick={onCardClick} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== SALES MODULE ====================

const SEED_SALES_TRACKING = [
  {
    "id": "sale-0",
    "orderDate": "2022-11-04",
    "promoCode": "NEWTUBER",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "j k",
    "state": "Maharashtra",
    "city": "Mumbai"
  },
  {
    "id": "sale-1",
    "orderDate": "2022-11-06",
    "promoCode": "NEWTUBER",
    "model": "LilE R",
    "totalAmount": 29999,
    "name": "srinivas Gogula",
    "state": "Andhra Pradesh",
    "city": "Guntur"
  },
  {
    "id": "sale-2",
    "orderDate": "2022-12-08",
    "promoCode": "NEWTUBER",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "RAHUL",
    "state": "Haryana",
    "city": "Panchkula"
  },
  {
    "id": "sale-3",
    "orderDate": "2022-12-09",
    "promoCode": "BLUERIDER",
    "model": "EMX",
    "totalAmount": 54999,
    "name": "ANGAD SINGH BINDRA",
    "state": "Karnataka",
    "city": "Mysuru"
  },
  {
    "id": "sale-4",
    "orderDate": "2022-12-11",
    "promoCode": "NEWTUBER",
    "model": "LilE R",
    "totalAmount": 29999,
    "name": "Mannan dar",
    "state": "Srinagar",
    "city": "Jammu and Kashmir"
  },
  {
    "id": "sale-5",
    "orderDate": "2022-12-14",
    "promoCode": "TECHRIDER",
    "model": "EMX",
    "totalAmount": 54999,
    "name": "KAMLESH SAHU",
    "state": "Raipur",
    "city": "Chattisgarh"
  },
  {
    "id": "sale-6",
    "orderDate": "2022-12-14",
    "promoCode": "PRTECHS",
    "model": "Doodle v2",
    "totalAmount": 50498,
    "name": "Arijit Samanta",
    "state": "West Bengal",
    "city": "Ashram"
  },
  {
    "id": "sale-7",
    "orderDate": "2022-12-19",
    "promoCode": "PRTECHS",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "vaishali rasal",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-8",
    "orderDate": "2023-01-01",
    "promoCode": "ANUBHAV100",
    "model": "T-Rex+",
    "totalAmount": 37999,
    "name": "Jagan Kumar Govindarajan",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-9",
    "orderDate": "2023-01-01",
    "promoCode": "NEWTUBER",
    "model": "Lil E",
    "totalAmount": 29999,
    "name": "KAUSTUBH AREKAR",
    "state": "Daman and Diu",
    "city": "Daman"
  },
  {
    "id": "sale-10",
    "orderDate": "2023-01-02",
    "promoCode": "GEARUPDATE",
    "model": "T-Rex+",
    "totalAmount": 37999,
    "name": "Kiran Deshmukh",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-11",
    "orderDate": "2023-01-02",
    "promoCode": "NEWTUBER",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "VEER SHARMA",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-12",
    "orderDate": "2023-01-03",
    "promoCode": "VEDDUBEY",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "Mansoor",
    "state": "Kerala",
    "city": "Kasargod"
  },
  {
    "id": "sale-13",
    "orderDate": "2023-01-06",
    "promoCode": "BLUERIDER",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "Naval Rishi",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-14",
    "orderDate": "2023-01-07",
    "promoCode": "ARJUNTECH",
    "model": "T-Rex+",
    "totalAmount": 37999,
    "name": "SANJU MORE",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-15",
    "orderDate": "2023-01-08",
    "promoCode": "NIKHIL1000",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "Bharat patel",
    "state": "Ahemdabad",
    "city": "Gujrat"
  },
  {
    "id": "sale-16",
    "orderDate": "2023-01-10",
    "promoCode": "THROTTLER",
    "model": "T-Rex+",
    "totalAmount": 37999,
    "name": "Rajashekhar Reddy",
    "state": "Hyderabad",
    "city": "Telangana"
  },
  {
    "id": "sale-17",
    "orderDate": "2023-01-18",
    "promoCode": "BLUERIDER",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "Nomad Adventures Overland pvt ltd",
    "state": "Delhi",
    "city": "Delhi"
  },
  {
    "id": "sale-18",
    "orderDate": "2023-01-22",
    "promoCode": "PRTECHS",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "Vamsi Yadav",
    "state": "Andhra Pradesh",
    "city": "Vishakhapatnam"
  },
  {
    "id": "sale-19",
    "orderDate": "2023-02-02",
    "promoCode": "NEWTUBER",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "Ashish Khatri",
    "state": "Tamil Nadu",
    "city": "Ramanthapuram"
  },
  {
    "id": "sale-20",
    "orderDate": "2023-02-05",
    "promoCode": "ARJUNTECH",
    "model": "T-Rex+",
    "totalAmount": 37999,
    "name": "Jitendra Sattigeri",
    "state": "Karnataka",
    "city": "Gokak"
  },
  {
    "id": "sale-21",
    "orderDate": "2023-06-02",
    "promoCode": "PRTECHS",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "Shubham Kumar",
    "state": "Jharkhand",
    "city": "Ranchi"
  },
  {
    "id": "sale-22",
    "orderDate": "2023-09-02",
    "promoCode": "BLUERIDER",
    "model": "EMX",
    "totalAmount": 58999,
    "name": "vinay sabarad",
    "state": "Karnataka",
    "city": "Belgaum"
  },
  {
    "id": "sale-23",
    "orderDate": "2023-11-02",
    "promoCode": "BLUERIDER",
    "model": "T-Rex+",
    "totalAmount": 37999,
    "name": "padda reddy tadi",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-24",
    "orderDate": "2023-02-19",
    "promoCode": "ARJUNTECH",
    "model": "T-Rex+",
    "totalAmount": 37999,
    "name": "Manjunath Reddy",
    "state": "Tamil Nadu",
    "city": "Chennai"
  },
  {
    "id": "sale-25",
    "orderDate": "2023-09-03",
    "promoCode": "GTTECH1000",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "Aditya",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-26",
    "orderDate": "2023-03-13",
    "promoCode": "BLUERIDER",
    "model": "EMX Aqua",
    "totalAmount": 58999,
    "name": "SAMIM ALAM",
    "state": "West Bengal",
    "city": "Chandpara"
  },
  {
    "id": "sale-27",
    "orderDate": "2023-03-13",
    "promoCode": "NEWTUBER",
    "model": "X3",
    "totalAmount": 32999,
    "name": "HARSH",
    "state": "Bihar",
    "city": "Patna"
  },
  {
    "id": "sale-28",
    "orderDate": "2023-03-20",
    "promoCode": "TRAVELANDTECH",
    "model": "EMX",
    "totalAmount": 58999,
    "name": "Rohan Garg",
    "state": "Uttar Pradesh",
    "city": "Lucknow"
  },
  {
    "id": "sale-29",
    "orderDate": "2023-03-22",
    "promoCode": "TRAVELANDTECH",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "NANOIN MOTORS PRIVATE LIMITED",
    "state": "Maharashtra",
    "city": "Mumbai"
  },
  {
    "id": "sale-30",
    "orderDate": "2023-03-24",
    "promoCode": "PRTECH",
    "model": "Doodle v2",
    "totalAmount": 49999,
    "name": "dipen ambalia",
    "state": "Maharashtra",
    "city": "Kalyan"
  },
  {
    "id": "sale-31",
    "orderDate": "2023-03-24",
    "promoCode": "ARJUNTECH",
    "model": "X2",
    "totalAmount": 27999,
    "name": "Rahul Shrivastava",
    "state": "Maharashtra",
    "city": "Mumbai"
  },
  {
    "id": "sale-32",
    "orderDate": "2023-03-27",
    "promoCode": "NEWTUBER",
    "model": "X2",
    "totalAmount": 27999,
    "name": "Anju Kumari",
    "state": "Uttar Pradesh",
    "city": "Agra"
  },
  {
    "id": "sale-33",
    "orderDate": "2023-03-27",
    "promoCode": "NEWTUBER",
    "model": "T-Rex+",
    "totalAmount": 39999,
    "name": "Prasad Salwe",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-34",
    "orderDate": "2023-03-31",
    "promoCode": "NEWTUBER",
    "model": "X2",
    "totalAmount": 27999,
    "name": "Anshuman Suryawanshi",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-35",
    "orderDate": "2023-01-04",
    "promoCode": "BLUERIDER",
    "model": "X2",
    "totalAmount": 27999,
    "name": "mUSKAN kAPOOR",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-36",
    "orderDate": "2023-02-04",
    "promoCode": "NEWTUBER",
    "model": "X2",
    "totalAmount": 27999,
    "name": "Rohit Jaiswal",
    "state": "Andhra Pradesh",
    "city": "Vishakhapatnam"
  },
  {
    "id": "sale-37",
    "orderDate": "2025-07-16",
    "promoCode": "Direct Contact",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "Sushant Bodne",
    "state": "Maharashtra",
    "city": "Nagpur"
  },
  {
    "id": "sale-38",
    "orderDate": "2025-08-07",
    "promoCode": "INFLUENCER",
    "model": "STX",
    "totalAmount": 34999,
    "name": "Penvi Benmyo",
    "state": "Assam",
    "city": "Dhemaji"
  },
  {
    "id": "sale-39",
    "orderDate": "2025-08-08",
    "promoCode": "01AKASH",
    "model": "STX",
    "totalAmount": 28499,
    "name": "Erika Soldi",
    "state": "Tamil Nadu",
    "city": "Kanchipuram"
  },
  {
    "id": "sale-40",
    "orderDate": "2025-08-14",
    "promoCode": "01KSN",
    "model": "T-Rex+ V3",
    "totalAmount": 42999,
    "name": "Anuja Damani",
    "state": "Karnataka",
    "city": "Udupi"
  },
  {
    "id": "sale-41",
    "orderDate": "2025-08-19",
    "promoCode": "01KSN",
    "model": "Trex Pro",
    "totalAmount": 48499,
    "name": "SOVENJIT BASU",
    "state": "West Bengal",
    "city": "Kalna"
  },
  {
    "id": "sale-42",
    "orderDate": "2025-08-29",
    "promoCode": "001AKASH",
    "model": "Doodle Pro",
    "totalAmount": 55999,
    "name": "Robert Laltluangkima",
    "state": "Assam",
    "city": "Kokrajhar"
  },
  {
    "id": "sale-43",
    "orderDate": "2025-11-06",
    "promoCode": "01FUEL",
    "model": "X2",
    "totalAmount": 27999,
    "name": "Naman Singh",
    "state": "Uttar Pradesh",
    "city": "Agra"
  },
  {
    "id": "sale-44",
    "orderDate": "2025-10-29",
    "promoCode": "01IMRAN",
    "model": "Trex Pro",
    "totalAmount": 49999,
    "name": "Kishor Kumar Biswas",
    "state": "West Bengal",
    "city": "Darjaling"
  },
  {
    "id": "sale-45",
    "orderDate": "2025-11-08",
    "promoCode": "01SURAJ",
    "model": "Trex Air",
    "totalAmount": 36246,
    "name": "Jagdish Nadar",
    "state": "Tamil Nadu",
    "city": "Tamil Nadu"
  },
  {
    "id": "sale-46",
    "orderDate": "2025-12-09",
    "promoCode": "01CRUISER",
    "model": "Doodle Pro",
    "totalAmount": 56999,
    "name": "shailesh jain",
    "state": "Madhya Pradesh",
    "city": "Jabalpur"
  },
  {
    "id": "sale-47",
    "orderDate": "2025-12-14",
    "promoCode": "01MANIAC",
    "model": "T-Rex Air",
    "totalAmount": 35999,
    "name": "Karthik K",
    "state": "Tamil Nadu",
    "city": "Kanchipuram"
  },
  {
    "id": "sale-48",
    "orderDate": "2025-12-13",
    "promoCode": "SOCIAL",
    "model": "Doodle Pro",
    "totalAmount": 56999,
    "name": "Amit Verma",
    "state": "",
    "city": ""
  },
  {
    "id": "sale-49",
    "orderDate": "2025-12-22",
    "promoCode": "01RANJITH",
    "model": "Trex Pro",
    "totalAmount": 50598,
    "name": "Jeevan Raj Angamuthu",
    "state": "Tamil Nadu",
    "city": "Coimbatore"
  },
  {
    "id": "sale-50",
    "orderDate": "2025-12-26",
    "promoCode": "NY1000",
    "model": "X1",
    "totalAmount": 25298,
    "name": "MURALI V",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-51",
    "orderDate": "2026-01-05",
    "promoCode": "NY1000",
    "model": "Doodle Pro",
    "totalAmount": 54999,
    "name": "Gaurav Goswami",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-52",
    "orderDate": "2026-01-03",
    "promoCode": "NY1000",
    "model": "Doodle Pro",
    "totalAmount": 58996,
    "name": "Manikandan Manickam",
    "state": "Salem",
    "city": "Tamil Nadu"
  },
  {
    "id": "sale-53",
    "orderDate": "2026-01-11",
    "promoCode": "",
    "model": "Doodle Pro",
    "totalAmount": 54000,
    "name": "Amarnath",
    "state": "Store",
    "city": "Store"
  },
  {
    "id": "sale-54",
    "orderDate": "2025-10-24",
    "promoCode": "",
    "model": "X2",
    "totalAmount": 26500,
    "name": "Mitesh Gjbhiye",
    "state": "Store",
    "city": "Store"
  },
  {
    "id": "sale-55",
    "orderDate": "2026-01-09",
    "promoCode": "01WHEELS",
    "model": "Doodle Pro",
    "totalAmount": 57197,
    "name": "Aneesh Raj",
    "state": "Alappuzha",
    "city": "Kerala"
  },
  {
    "id": "sale-56",
    "orderDate": "2026-01-01",
    "promoCode": "01MANIAC",
    "model": "X1",
    "totalAmount": 25499,
    "name": "Shubham Mane",
    "state": "",
    "city": ""
  },
  {
    "id": "sale-57",
    "orderDate": "2026-02-09",
    "promoCode": "",
    "model": "Trex Pro",
    "totalAmount": 49999,
    "name": "Dr Anoop Kumar",
    "state": "",
    "city": ""
  },
  {
    "id": "sale-58",
    "orderDate": "2026-02-20",
    "promoCode": "",
    "model": "Doodle Pro",
    "totalAmount": 56999,
    "name": "Nairit Nandi",
    "state": "Store",
    "city": "Store"
  },
  {
    "id": "sale-59",
    "orderDate": "2026-02-21",
    "promoCode": "",
    "model": "Doodle Pro",
    "totalAmount": 56999,
    "name": "Nairit Nandi",
    "state": "Store",
    "city": "Store"
  },
  {
    "id": "sale-60",
    "orderDate": "2026-02-09",
    "promoCode": "",
    "model": "Trex Pro",
    "totalAmount": 49999,
    "name": "Dr Anoop Kumar",
    "state": "Store",
    "city": "Store"
  },
  {
    "id": "sale-61",
    "orderDate": "2025-07-12",
    "promoCode": "01MANIAC",
    "model": "X1",
    "totalAmount": 25499,
    "name": "Ashwani Nandan",
    "state": "Store",
    "city": "Store"
  },
  {
    "id": "sale-62",
    "orderDate": "",
    "promoCode": "Social",
    "model": "Toy Car",
    "totalAmount": 0,
    "name": "Manish Jethmalani",
    "state": "",
    "city": ""
  },
  {
    "id": "sale-63",
    "orderDate": "2026-04-17",
    "promoCode": "Social",
    "model": "Viper",
    "totalAmount": 66999,
    "name": "Shiv Sutar",
    "state": "Maharashtra",
    "city": "Thane"
  },
  {
    "id": "sale-64",
    "orderDate": "",
    "promoCode": "Social",
    "model": "X1",
    "totalAmount": 25999,
    "name": "ashish bhalla",
    "state": "",
    "city": ""
  },
  {
    "id": "sale-65",
    "orderDate": "2026-07-01",
    "promoCode": "001DRDRIVE",
    "model": "Doodle V2",
    "totalAmount": 32999,
    "name": "Ranjit Sule",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-66",
    "orderDate": "2026-07-18",
    "promoCode": "001SHUBH",
    "model": "Doodle Pro",
    "totalAmount": 55999,
    "name": "Sunu Robinson",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-67",
    "orderDate": "2026-08-02",
    "promoCode": "001SHUBH",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "Mohammed Farook Kallungal",
    "state": "Kerala",
    "city": "Chemmad"
  },
  {
    "id": "sale-68",
    "orderDate": "2026-08-04",
    "promoCode": "001SHUBH",
    "model": "MSD L07",
    "totalAmount": 30499,
    "name": "Sai Srikanth",
    "state": "Telangana",
    "city": "Hyderabad"
  },
  {
    "id": "sale-69",
    "orderDate": "2026-08-04",
    "promoCode": "001SHUBH",
    "model": "X1",
    "totalAmount": 27999,
    "name": "Akash Sendil",
    "state": "Karnataka",
    "city": "Udupi"
  },
  {
    "id": "sale-70",
    "orderDate": "2026-08-07",
    "promoCode": "01SUVAN",
    "model": "MSD L07",
    "totalAmount": 32999,
    "name": "Amit Patil",
    "state": "Telangana",
    "city": "Hyderabad"
  },
  {
    "id": "sale-71",
    "orderDate": "2026-08-09",
    "promoCode": "001SHUBH",
    "model": "Viper",
    "totalAmount": 66999,
    "name": "Ronik sharma",
    "state": "Tamil Nadu",
    "city": "Tirucallur"
  },
  {
    "id": "sale-72",
    "orderDate": "2026-08-13",
    "promoCode": "001NEERAJ",
    "model": "MSD L07",
    "totalAmount": 30499,
    "name": "Vishal Kumar Biswas",
    "state": "",
    "city": ""
  },
  {
    "id": "sale-73",
    "orderDate": "2026-08-16",
    "promoCode": "001NEERAJ",
    "model": "MSD L07",
    "totalAmount": 32999,
    "name": "Sandeep Thakur",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-74",
    "orderDate": "2026-08-18",
    "promoCode": "ONAM",
    "model": "X1",
    "totalAmount": 28000,
    "name": "Saidali.A",
    "state": "Karnataka",
    "city": "Kollam"
  },
  {
    "id": "sale-75",
    "orderDate": "2026-08-18",
    "promoCode": "001NEERAJ",
    "model": "Doodle Pro",
    "totalAmount": 55999,
    "name": "K Vishnu Vardhan",
    "state": "Karnataka",
    "city": "Bellary"
  },
  {
    "id": "sale-76",
    "orderDate": "2026-08-18",
    "promoCode": "001NEERAJ",
    "model": "MSD L07",
    "totalAmount": 32999,
    "name": "Dr sarada prasanna samantaray",
    "state": "Orissa",
    "city": "Khamar"
  },
  {
    "id": "sale-77",
    "orderDate": "2026-08-22",
    "promoCode": "001SHUBH",
    "model": "MSD L07",
    "totalAmount": 32999,
    "name": "Pravin Shende",
    "state": "Maharashtra",
    "city": "Chandrapur"
  },
  {
    "id": "sale-78",
    "orderDate": "2026-08-17",
    "promoCode": "01AMAN",
    "model": "X1",
    "totalAmount": 27999,
    "name": "Piryank Kumar Dhimaan",
    "state": "UP",
    "city": "Saharanpur"
  },
  {
    "id": "sale-79",
    "orderDate": "2026-08-15",
    "promoCode": "001SHUBH",
    "model": "Dope",
    "totalAmount": 24012,
    "name": "Naveen Rao",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-80",
    "orderDate": "2026-08-17",
    "promoCode": "01AMAN",
    "model": "X1",
    "totalAmount": 27999,
    "name": "Tanmay Agrawal",
    "state": "UP",
    "city": "Kanpur"
  },
  {
    "id": "sale-81",
    "orderDate": "2026-08-13",
    "promoCode": "001SHUBH",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "Dr. Girija Shankar Bal",
    "state": "Orissa",
    "city": "Bhubaneshwar"
  },
  {
    "id": "sale-82",
    "orderDate": "2026-08-22",
    "promoCode": "001SHUBH",
    "model": "MSD L07",
    "totalAmount": 32999,
    "name": "Pravin Shende",
    "state": "Maharashtra",
    "city": "Chandrapur"
  },
  {
    "id": "sale-83",
    "orderDate": "2026-08-22",
    "promoCode": "001NEERAJ",
    "model": "X1",
    "totalAmount": 27999,
    "name": "Hanuman godara",
    "state": "Rajasthan",
    "city": "Sikar"
  },
  {
    "id": "sale-84",
    "orderDate": "2026-08-24",
    "promoCode": "001NEERAJ",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "MURIFATH FAROOQ",
    "state": "J&K",
    "city": "SriNagar"
  },
  {
    "id": "sale-85",
    "orderDate": "2026-08-20",
    "promoCode": "001NEERAJ",
    "model": "MSD L07",
    "totalAmount": 32999,
    "name": "Sooraj Mon V S",
    "state": "Karnataka",
    "city": "Kerala"
  },
  {
    "id": "sale-86",
    "orderDate": "2026-08-21",
    "promoCode": "01SHUBH",
    "model": "Viper",
    "totalAmount": 66999,
    "name": "VIDYA SAGAR H J",
    "state": "Karnataka",
    "city": "Tiptur"
  },
  {
    "id": "sale-87",
    "orderDate": "2026-08-25",
    "promoCode": "001NEERAJ",
    "model": "MSD L07",
    "totalAmount": 32999,
    "name": "Ravikant Pathak",
    "state": "Telangana",
    "city": "Medak"
  },
  {
    "id": "sale-88",
    "orderDate": "2026-08-29",
    "promoCode": "001NEERAJ",
    "model": "Viper",
    "totalAmount": 66999,
    "name": "Rohini Tandale",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-89",
    "orderDate": "2026-08-29",
    "promoCode": "001NEERAJ",
    "model": "MSD L07",
    "totalAmount": 32999,
    "name": "Bikash Kumar Behera",
    "state": "Karnataka",
    "city": "Karwar"
  },
  {
    "id": "sale-90",
    "orderDate": "2026-08-27",
    "promoCode": "001NEERAJ",
    "model": "Doodle Pro",
    "totalAmount": 55999,
    "name": "Abu Tahirud Doza",
    "state": "Assam",
    "city": "Assam"
  },
  {
    "id": "sale-91",
    "orderDate": "2026-08-30",
    "promoCode": "001NEERAJ",
    "model": "Viper",
    "totalAmount": 67000,
    "name": "Harsh Vardhan",
    "state": "Maharashtra",
    "city": "Mumbai"
  },
  {
    "id": "sale-92",
    "orderDate": "2026-09-04",
    "promoCode": "001NEERAJ",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "Yogesh Electricals",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-93",
    "orderDate": "2026-09-04",
    "promoCode": "001NEERAJ",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "Jayachandran G",
    "state": "Karnataka",
    "city": "Kerala"
  },
  {
    "id": "sale-94",
    "orderDate": "2026-09-06",
    "promoCode": "01ADITYA",
    "model": "X2",
    "totalAmount": 31999,
    "name": "Mohd Mateen",
    "state": "UP",
    "city": "Bareilly"
  },
  {
    "id": "sale-95",
    "orderDate": "2026-09-06",
    "promoCode": "001NEERAJ",
    "model": "MSD L07",
    "totalAmount": 32999,
    "name": "Bhupendra Singh",
    "state": "West Bengal",
    "city": "Naxalbari"
  },
  {
    "id": "sale-96",
    "orderDate": "2026-09-06",
    "promoCode": "001NEERAJ",
    "model": "Viper",
    "totalAmount": 66999,
    "name": "Ramesh Jayaraman",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-97",
    "orderDate": "2026-09-08",
    "promoCode": "001NEERAJ",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "Faheem",
    "state": "UP",
    "city": "Mawana"
  },
  {
    "id": "sale-98",
    "orderDate": "2026-09-11",
    "promoCode": "01SUVAN",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "Benu Dhar Mohapatra",
    "state": "Odisa",
    "city": "Baripada"
  },
  {
    "id": "sale-99",
    "orderDate": "2026-09-11",
    "promoCode": "01ADITYA",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "Aboobucker siddiq",
    "state": "Tamil Nadu",
    "city": "Salem"
  },
  {
    "id": "sale-100",
    "orderDate": "2026-09-12",
    "promoCode": "01ADITYA",
    "model": "MSD L07",
    "totalAmount": 32999,
    "name": "Krishnaveni G",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-101",
    "orderDate": "2026-09-12",
    "promoCode": "01ADITYA",
    "model": "Doodle Pro",
    "totalAmount": 56999,
    "name": "Mohseenahmad Hasan Tamboli",
    "state": "Maharashtra",
    "city": "Pune"
  },
  {
    "id": "sale-102",
    "orderDate": "2026-09-12",
    "promoCode": "01ADITYA",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "Vishwanath Tirlapur",
    "state": "Karnataka",
    "city": "Bangalore"
  },
  {
    "id": "sale-103",
    "orderDate": "2026-09-14",
    "promoCode": "01ADITYA",
    "model": "X2",
    "totalAmount": 31999,
    "name": "Madhan",
    "state": "Tamil Nadu",
    "city": "Ramanathpuram"
  },
  {
    "id": "sale-104",
    "orderDate": "2026-09-11",
    "promoCode": "01ADITYA",
    "model": "Trex Air",
    "totalAmount": 37499,
    "name": "Monika agarwal",
    "state": "",
    "city": ""
  },
  {
    "id": "sale-105",
    "orderDate": "2026-09-14",
    "promoCode": "01ADITYA",
    "model": "Doodle Pro",
    "totalAmount": 55999,
    "name": "Amit Jadhav",
    "state": "Maharashtra",
    "city": "Pune"
  }
];

const SALES_TRACKING_KEY = "emotorad-sales-tracking-v1";

function emptySalesDraft() {
  return {
    id: null,
    orderDate: new Date().toISOString().slice(0, 10),
    promoCode: "",
    model: "",
    totalAmount: "",
    name: "",
    state: "",
    city: "",
  };
}

function EMotoradSales() {
  const [sales, setSales] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMonths, setFilterMonths] = useState([]);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(emptySalesDraft());
  const [isNew, setIsNew] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let loadedSales = null;
      try {
        const r = await window.storage.get(SALES_TRACKING_KEY, true);
        if (r && r.value) loadedSales = JSON.parse(r.value);
      } catch (e) {}
      if (cancelled) return;
      if (loadedSales) {
        setSales(loadedSales);
      } else {
        setSales(SEED_SALES_TRACKING);
        try {
          await window.storage.set(SALES_TRACKING_KEY, JSON.stringify(SEED_SALES_TRACKING), true);
        } catch (e) {}
      }
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next) => {
    setSales(next);
    try {
      const res = await window.storage.set(SALES_TRACKING_KEY, JSON.stringify(next), true);
      if (!res) showToast("Couldn't save — try again");
    } catch (e) {
      showToast("Couldn't save — try again");
    }
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  const availableMonths = useMemo(() => {
    const set = new Set(sales.map((s) => monthKey(s.orderDate)).filter(isPlausibleMonthKey));
    return Array.from(set).sort();
  }, [sales]);

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (!inSelectedMonths(s.orderDate, filterMonths)) return false;
      if (!inCustomRange(s.orderDate, customRange.start, customRange.end)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = (s.promoCode + " " + s.model + " " + s.name + " " + s.city + " " + s.state).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sales, filterMonths, customRange, search]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)),
    [filtered]
  );

  const stats = useMemo(() => {
    const totalOrders = filtered.length;
    const totalRevenue = filtered.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const uniquePromo = new Set(filtered.map((r) => r.promoCode).filter(Boolean)).size;
    return { totalOrders, totalRevenue, avgOrder, uniquePromo };
  }, [filtered]);

  function exportSales() {
    const headers = ["Order Date", "Month", "Promo Code", "Model", "Total Amount", "Name", "State", "City"];
    const rows = sorted.map((s) => [
      s.orderDate, monthLabelFromKey(monthKey(s.orderDate)), s.promoCode, s.model, s.totalAmount, s.name, s.state, s.city,
    ]);
    const label = filterMonths.length > 0
      ? filterMonths.map(monthLabelFromKey).join("_").replace(/\s+/g, "-")
      : "all";
    downloadCSV(`sales_${label}.csv`, headers, rows);
  }

  function openAddDrawer() {
    setDraft(emptySalesDraft());
    setIsNew(true);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function openEditDrawer(s) {
    setDraft({ ...s, totalAmount: String(s.totalAmount) });
    setIsNew(false);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function saveDraft() {
    if (!draft.orderDate) {
      showToast("Order date is required");
      return;
    }
    const record = {
      id: draft.id || "sale-" + Date.now(),
      orderDate: draft.orderDate,
      promoCode: draft.promoCode,
      model: draft.model,
      totalAmount: Number(draft.totalAmount) || 0,
      name: draft.name,
      state: draft.state,
      city: draft.city,
    };
    if (isNew) {
      persist([record, ...sales]);
      showToast("Sale added");
    } else {
      persist(sales.map((s) => (s.id === record.id ? record : s)));
      showToast("Changes saved");
    }
    closeDrawer();
  }

  function deleteDraft() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    persist(sales.filter((s) => s.id !== draft.id));
    showToast("Sale removed");
    closeDrawer();
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading sales data…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .input {
          width: 100%;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13.5px;
          color: #f4f4f5;
        }
        .input:focus { outline: none; border-color: #004DAC; }
      `}</style>

      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="font-display font-semibold text-lg">Sales</div>
        <button
          onClick={openAddDrawer}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add sale
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800">
        <StatBlock icon={ShoppingCart} label="Total orders" value={stats.totalOrders} accent />
        <StatBlock icon={IndianRupee} label="Total revenue" value={formatINR(stats.totalRevenue)} />
        <StatBlock label="Avg. order value" value={formatINR(Math.round(stats.avgOrder))} />
        <StatBlock label="Unique promo codes" value={stats.uniquePromo} />
      </div>

      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-zinc-800">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search promo code, model, name, city"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <MonthFilter
          availableMonths={availableMonths}
          selected={filterMonths}
          onChange={setFilterMonths}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
        <button
          onClick={exportSales}
          className="flex items-center gap-1.5 border border-zinc-800 hover:border-zinc-600 text-zinc-300 text-sm px-3 py-1.5 rounded-md transition-colors ml-auto"
        >
          <Download size={14} />
          Download CSV
        </button>
      </div>

      <div className="px-6 py-5">
        {sorted.length === 0 ? (
          <div className="text-center text-zinc-600 text-sm py-16">No sales match these filters.</div>
        ) : (
          <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 text-zinc-500 text-xs">
                  <th className="text-left font-medium px-3 py-2.5">Order Date</th>
                  <th className="text-left font-medium px-3 py-2.5">Month</th>
                  <th className="text-left font-medium px-3 py-2.5">Promo Code</th>
                  <th className="text-left font-medium px-3 py-2.5">Model</th>
                  <th className="text-left font-medium px-3 py-2.5">Total Amount</th>
                  <th className="text-left font-medium px-3 py-2.5">Name</th>
                  <th className="text-left font-medium px-3 py-2.5">State</th>
                  <th className="text-left font-medium px-3 py-2.5">City</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openEditDrawer(s)}
                    className="border-t border-zinc-800 hover:bg-zinc-900/60 cursor-pointer"
                  >
                    <td className="px-3 py-2.5 text-zinc-400">{formatDate(s.orderDate)}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{monthLabelFromKey(monthKey(s.orderDate))}</td>
                    <td className="px-3 py-2.5 font-medium">{s.promoCode || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{s.model || "—"}</td>
                    <td className="px-3 py-2.5 text-blue-400">{formatINR(s.totalAmount)}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{s.name || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{s.state || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{s.city || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">{isNew ? "Add sale" : "Edit sale"}</div>
              <button onClick={closeDrawer} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <Field label="Order date">
                <input
                  type="date"
                  value={draft.orderDate}
                  onChange={(e) => setDraft({ ...draft, orderDate: e.target.value })}
                  className="input"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Promo code">
                  <input
                    value={draft.promoCode}
                    onChange={(e) => setDraft({ ...draft, promoCode: e.target.value })}
                    className="input"
                    placeholder="e.g. NEWTUBER"
                  />
                </Field>
                <Field label="Model">
                  <input
                    value={draft.model}
                    onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                    className="input"
                    placeholder="e.g. Doodle Pro"
                  />
                </Field>
              </div>

              <Field label="Total amount (₹)">
                <input
                  type="number"
                  value={draft.totalAmount}
                  onChange={(e) => setDraft({ ...draft, totalAmount: e.target.value })}
                  className="input"
                  placeholder="0"
                />
              </Field>

              <Field label="Customer name">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="input"
                  placeholder="Optional"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="State">
                  <input
                    value={draft.state}
                    onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                    className="input"
                    placeholder="State"
                  />
                </Field>
                <Field label="City">
                  <input
                    value={draft.city}
                    onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                    className="input"
                    placeholder="City"
                  />
                </Field>
              </div>
            </div>

            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-5 flex gap-2">
              <button
                onClick={saveDraft}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors"
              >
                {isNew ? "Add sale" : "Save changes"}
              </button>
              {!isNew && (
                <button
                  onClick={deleteDraft}
                  className={`px-3 rounded-md border text-sm transition-colors ${
                    confirmDelete
                      ? "border-red-500 text-red-400 bg-red-500/10"
                      : "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                  }`}
                >
                  {confirmDelete ? "Confirm delete" : <Trash2 size={16} />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 text-sm px-4 py-2 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ==================== PAYMENT APPROVALS MODULE ====================

const SEED_PAYMENTS = [
  {
    "id": "payment-0",
    "srNo": 1,
    "vendorName": "Shivam Mishra",
    "campaign": "Regular Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-05",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-05",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-09",
    "paymentMonth": "Jan",
    "totalAmount": 40000,
    "remark": ""
  },
  {
    "id": "payment-1",
    "srNo": 2,
    "vendorName": "Rohan Dalpe",
    "campaign": "Regular Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-05",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-05",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-12",
    "paymentMonth": "Jan",
    "totalAmount": 25000,
    "remark": ""
  },
  {
    "id": "payment-2",
    "srNo": 3,
    "vendorName": "Prachi Taransh",
    "campaign": "FF Giveaway",
    "month": "Jan",
    "dateOfRequest": "2026-01-09",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-19",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-21",
    "paymentMonth": "Jan",
    "totalAmount": 12000,
    "remark": ""
  },
  {
    "id": "payment-3",
    "srNo": 4,
    "vendorName": "Saloni Jain",
    "campaign": "FF Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-13",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-13",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-17",
    "paymentMonth": "Jan",
    "totalAmount": 5000,
    "remark": ""
  },
  {
    "id": "payment-4",
    "srNo": 5,
    "vendorName": "Kuppam Kurralu",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-15",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-15",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-17",
    "paymentMonth": "Jan",
    "totalAmount": 8000,
    "remark": ""
  },
  {
    "id": "payment-5",
    "srNo": 6,
    "vendorName": "Namaste Kuppam",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-15",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-15",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-17",
    "paymentMonth": "Jan",
    "totalAmount": 12000,
    "remark": ""
  },
  {
    "id": "payment-6",
    "srNo": 7,
    "vendorName": "Swapnil Valkunde",
    "campaign": "Regular Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-19",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-19",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-21",
    "paymentMonth": "Jan",
    "totalAmount": 20000,
    "remark": ""
  },
  {
    "id": "payment-7",
    "srNo": 8,
    "vendorName": "Telugu Travel Vlogger",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-19",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-19",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-21",
    "paymentMonth": "Jan",
    "totalAmount": 55000,
    "remark": "Pay 50% (27500) Done"
  },
  {
    "id": "payment-8",
    "srNo": 9,
    "vendorName": "Hyderabad Travle Freak",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-19",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-19",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-21",
    "paymentMonth": "Jan",
    "totalAmount": 2000,
    "remark": ""
  },
  {
    "id": "payment-9",
    "srNo": 10,
    "vendorName": "Auto Review",
    "campaign": "Regular Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-19",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-19",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-21",
    "paymentMonth": "Jan",
    "totalAmount": 30000,
    "remark": "Pay 15000 advance Done"
  },
  {
    "id": "payment-10",
    "srNo": 11,
    "vendorName": "KTM Buddy (Upendra )",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-23",
    "hodApproval": "Approved",
    "approvalDate": "",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-27",
    "paymentMonth": "Jan",
    "totalAmount": 10000,
    "remark": ""
  },
  {
    "id": "payment-11",
    "srNo": 12,
    "vendorName": "Wow Originals",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-27",
    "paymentMonth": "Jan",
    "totalAmount": 5000,
    "remark": ""
  },
  {
    "id": "payment-12",
    "srNo": 13,
    "vendorName": "Vellore Reels",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-27",
    "paymentMonth": "Jan",
    "totalAmount": 9000,
    "remark": ""
  },
  {
    "id": "payment-13",
    "srNo": 14,
    "vendorName": "Chittore Now",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-27",
    "paymentMonth": "Jan",
    "totalAmount": 11000,
    "remark": ""
  },
  {
    "id": "payment-14",
    "srNo": 15,
    "vendorName": "Voice Of Chittore",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-27",
    "paymentMonth": "Jan",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-15",
    "srNo": 16,
    "vendorName": "Hyderabad Bakasurulu",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-27",
    "paymentMonth": "Jan",
    "totalAmount": 24000,
    "remark": ""
  },
  {
    "id": "payment-16",
    "srNo": 17,
    "vendorName": "Chittore Central",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-01-27",
    "paymentMonth": "Jan",
    "totalAmount": 12000,
    "remark": ""
  },
  {
    "id": "payment-17",
    "srNo": 18,
    "vendorName": "I love my chittore",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-03",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-04",
    "paymentMonth": "Feb",
    "totalAmount": 12000,
    "remark": ""
  },
  {
    "id": "payment-18",
    "srNo": 19,
    "vendorName": "Chittoor Chinnodu",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-03",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-04",
    "paymentMonth": "Feb",
    "totalAmount": 8000,
    "remark": ""
  },
  {
    "id": "payment-19",
    "srNo": 20,
    "vendorName": "aamir foodie traveler + The Hyderabadi Event",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-03",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-04",
    "paymentMonth": "Feb",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-20",
    "srNo": 21,
    "vendorName": "Beautiful Chittor",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-03",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-04",
    "paymentMonth": "Feb",
    "totalAmount": 9000,
    "remark": ""
  },
  {
    "id": "payment-21",
    "srNo": 22,
    "vendorName": "chittoor Abbai 08",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-03",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-04",
    "paymentMonth": "Feb",
    "totalAmount": 5000,
    "remark": ""
  },
  {
    "id": "payment-22",
    "srNo": 23,
    "vendorName": "Bhavik Rajput",
    "campaign": "Regular Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-04",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-04",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-06",
    "paymentMonth": "Feb",
    "totalAmount": 30000,
    "remark": ""
  },
  {
    "id": "payment-23",
    "srNo": 24,
    "vendorName": "Saloni Jain",
    "campaign": "FF Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-05",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-05",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-11",
    "paymentMonth": "Feb",
    "totalAmount": 5000,
    "remark": ""
  },
  {
    "id": "payment-24",
    "srNo": 25,
    "vendorName": "Joy Mojundar",
    "campaign": "FF Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-05",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-05",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-06",
    "paymentMonth": "Feb",
    "totalAmount": 8000,
    "remark": ""
  },
  {
    "id": "payment-25",
    "srNo": 26,
    "vendorName": "Vaishnav",
    "campaign": "FF Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-05",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-05",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-06",
    "paymentMonth": "Feb",
    "totalAmount": 4000,
    "remark": ""
  },
  {
    "id": "payment-26",
    "srNo": 27,
    "vendorName": "aa_dronography amaravathi_ammaye",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-05",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-06",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-06",
    "paymentMonth": "Feb",
    "totalAmount": 5000,
    "remark": ""
  },
  {
    "id": "payment-27",
    "srNo": 28,
    "vendorName": "kuppam_diaries",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-05",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-06",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-06",
    "paymentMonth": "Feb",
    "totalAmount": 12000,
    "remark": ""
  },
  {
    "id": "payment-28",
    "srNo": 29,
    "vendorName": "kuppam_kurralu",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-06",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-06",
    "paymentMonth": "Feb",
    "totalAmount": 5000,
    "remark": ""
  },
  {
    "id": "payment-29",
    "srNo": 30,
    "vendorName": "rupeshtelugutraveller",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-09",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-28",
    "paymentMonth": "Feb",
    "totalAmount": 7000,
    "remark": ""
  },
  {
    "id": "payment-30",
    "srNo": 31,
    "vendorName": "Naveen Adventures",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-09",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-09",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-11",
    "paymentMonth": "Feb",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-31",
    "srNo": 32,
    "vendorName": "SOCIAL TRENDS",
    "campaign": "Kuppam Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-09",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-09",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-18",
    "paymentMonth": "Feb",
    "totalAmount": 55000,
    "remark": ""
  },
  {
    "id": "payment-32",
    "srNo": 33,
    "vendorName": "Gaurav Thakur - 485,000",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-04-16",
    "paymentMonth": "April",
    "totalAmount": 880000,
    "remark": "50% advance paid (475200) 06/02/2026"
  },
  {
    "id": "payment-33",
    "srNo": 34,
    "vendorName": "Peepoye - 315,000",
    "campaign": "Kuppam Influencer",
    "month": "Jan",
    "dateOfRequest": "2026-01-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-01-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-04-16",
    "paymentMonth": "April",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-34",
    "srNo": 35,
    "vendorName": "Imran Azam",
    "campaign": "Regular Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-10",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-10",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-15",
    "paymentMonth": "Feb",
    "totalAmount": 50000,
    "remark": ""
  },
  {
    "id": "payment-35",
    "srNo": 36,
    "vendorName": "RC Mech Jino",
    "campaign": "Regular Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-10",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-10",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-28",
    "paymentMonth": "Feb",
    "totalAmount": 35000,
    "remark": ""
  },
  {
    "id": "payment-36",
    "srNo": 37,
    "vendorName": "Saurabh Saini",
    "campaign": "Regular Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-16",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-19",
    "paymentStatus": "Done",
    "paymentDate": "2026-03-06",
    "paymentMonth": "March",
    "totalAmount": 25000,
    "remark": "25000 done + X1 barter (17850) pendind"
  },
  {
    "id": "payment-37",
    "srNo": 38,
    "vendorName": "Chalte Firte",
    "campaign": "Regular Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-16",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-16",
    "paymentStatus": "Done",
    "paymentDate": "2026-02-18",
    "paymentMonth": "Feb",
    "totalAmount": 80000,
    "remark": "40% Advance Paid ( 32000 )"
  },
  {
    "id": "payment-38",
    "srNo": 39,
    "vendorName": "Vaibhav Malik",
    "campaign": "Regular Influencer",
    "month": "Feb",
    "dateOfRequest": "2026-02-19",
    "hodApproval": "Approved",
    "approvalDate": "2026-02-19",
    "paymentStatus": "Done",
    "paymentDate": "2026-03-06",
    "paymentMonth": "March",
    "totalAmount": 40000,
    "remark": ""
  },
  {
    "id": "payment-39",
    "srNo": 40,
    "vendorName": "Sanchit Bansal",
    "campaign": "Regular Influencer",
    "month": "March",
    "dateOfRequest": "2026-03-02",
    "hodApproval": "Approved",
    "approvalDate": "2026-03-02",
    "paymentStatus": "Done",
    "paymentDate": "2026-03-06",
    "paymentMonth": "March",
    "totalAmount": 12000,
    "remark": ""
  },
  {
    "id": "payment-40",
    "srNo": 41,
    "vendorName": "Shivam Rajput | Motor Mitra",
    "campaign": "Dealer Influencer",
    "month": "March",
    "dateOfRequest": "2026-03-02",
    "hodApproval": "Approved",
    "approvalDate": "2026-03-02",
    "paymentStatus": "Done",
    "paymentDate": "2026-03-06",
    "paymentMonth": "March",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-41",
    "srNo": 42,
    "vendorName": "Cretornity",
    "campaign": "Agency Dealer Influencers",
    "month": "March",
    "dateOfRequest": "2026-03-09",
    "hodApproval": "Approved",
    "approvalDate": "2026-03-10",
    "paymentStatus": "Done",
    "paymentDate": "2026-03-16",
    "paymentMonth": "March",
    "totalAmount": 162840,
    "remark": ""
  },
  {
    "id": "payment-42",
    "srNo": 43,
    "vendorName": "KNS Talks",
    "campaign": "Regular Influencer",
    "month": "March",
    "dateOfRequest": "2026-03-11",
    "hodApproval": "Approved",
    "approvalDate": "2026-03-16",
    "paymentStatus": "Done",
    "paymentDate": "2026-03-17",
    "paymentMonth": "March",
    "totalAmount": 7000,
    "remark": ""
  },
  {
    "id": "payment-43",
    "srNo": 44,
    "vendorName": "Anurag Sah",
    "campaign": "Regular Influencer",
    "month": "March",
    "dateOfRequest": "2026-03-16",
    "hodApproval": "Approved",
    "approvalDate": "2026-03-16",
    "paymentStatus": "Done",
    "paymentDate": "2026-03-17",
    "paymentMonth": "March",
    "totalAmount": 20000,
    "remark": ""
  },
  {
    "id": "payment-44",
    "srNo": 45,
    "vendorName": "Jazeel AV",
    "campaign": "Regular Influencer",
    "month": "April",
    "dateOfRequest": "2026-04-03",
    "hodApproval": "Approved",
    "approvalDate": "2026-04-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-03-08",
    "paymentMonth": "April",
    "totalAmount": 8000,
    "remark": ""
  },
  {
    "id": "payment-45",
    "srNo": 46,
    "vendorName": "Prasad Joshi",
    "campaign": "Viper Launch",
    "month": "April",
    "dateOfRequest": "2026-04-23",
    "hodApproval": "Approved",
    "approvalDate": "2026-04-23",
    "paymentStatus": "Done",
    "paymentDate": "2026-04-27",
    "paymentMonth": "April",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-46",
    "srNo": 47,
    "vendorName": "Shubhamofficial",
    "campaign": "Viper Launch",
    "month": "April",
    "dateOfRequest": "2024-04-21",
    "hodApproval": "Approved",
    "approvalDate": "2026-04-23",
    "paymentStatus": "Done",
    "paymentDate": "2026-04-27",
    "paymentMonth": "April",
    "totalAmount": 18000,
    "remark": ""
  },
  {
    "id": "payment-47",
    "srNo": 48,
    "vendorName": "Vaibhav Malik",
    "campaign": "Viper Launch Video",
    "month": "April",
    "dateOfRequest": "2026-04-23",
    "hodApproval": "Approved",
    "approvalDate": "2026-04-28",
    "paymentStatus": "Done",
    "paymentDate": "2026-04-29",
    "paymentMonth": "April",
    "totalAmount": 10000,
    "remark": ""
  },
  {
    "id": "payment-48",
    "srNo": 49,
    "vendorName": "Mtb Imran",
    "campaign": "Viper Launch Video",
    "month": "April",
    "dateOfRequest": "2026-04-23",
    "hodApproval": "Approved",
    "approvalDate": "2026-04-28",
    "paymentStatus": "Done",
    "paymentDate": "2026-04-29",
    "paymentMonth": "April",
    "totalAmount": 5000,
    "remark": ""
  },
  {
    "id": "payment-49",
    "srNo": 50,
    "vendorName": "Rakesh Choudhary",
    "campaign": "Viper Launch",
    "month": "April",
    "dateOfRequest": "2026-04-29",
    "hodApproval": "Approved",
    "approvalDate": "2026-04-29",
    "paymentStatus": "Done",
    "paymentDate": "2026-04-29",
    "paymentMonth": "April",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-50",
    "srNo": 51,
    "vendorName": "Roshan Patil",
    "campaign": "Viper Launch",
    "month": "April",
    "dateOfRequest": "2026-04-29",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-05",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-05",
    "paymentMonth": "May",
    "totalAmount": 10000,
    "remark": ""
  },
  {
    "id": "payment-51",
    "srNo": 52,
    "vendorName": "Vaibhavi Pote",
    "campaign": "Viper Launch",
    "month": "April",
    "dateOfRequest": "2026-04-30",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-05",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-05",
    "paymentMonth": "May",
    "totalAmount": 9000,
    "remark": ""
  },
  {
    "id": "payment-52",
    "srNo": 53,
    "vendorName": "Varsha and Prasad",
    "campaign": "Viper Launch",
    "month": "April",
    "dateOfRequest": "2026-04-30",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-05",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-05",
    "paymentMonth": "May",
    "totalAmount": 35000,
    "remark": ""
  },
  {
    "id": "payment-53",
    "srNo": 54,
    "vendorName": "Avishkar Malavade",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-05-05",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-05",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-05",
    "paymentMonth": "May",
    "totalAmount": 13000,
    "remark": ""
  },
  {
    "id": "payment-54",
    "srNo": 56,
    "vendorName": "Siddhant Ingole",
    "campaign": "Regular Influencer",
    "month": "May",
    "dateOfRequest": "2026-05-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-12",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-20",
    "paymentMonth": "May",
    "totalAmount": 8500,
    "remark": ""
  },
  {
    "id": "payment-55",
    "srNo": 57,
    "vendorName": "Prasad Donti",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-05-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-15",
    "paymentMonth": "May",
    "totalAmount": 6000,
    "remark": ""
  },
  {
    "id": "payment-56",
    "srNo": 58,
    "vendorName": "Charandeep Singh",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-05-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-15",
    "paymentMonth": "May",
    "totalAmount": 11000,
    "remark": ""
  },
  {
    "id": "payment-57",
    "srNo": 59,
    "vendorName": "Mrunal Rajput",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-05-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-20",
    "paymentMonth": "May",
    "totalAmount": 12000,
    "remark": ""
  },
  {
    "id": "payment-58",
    "srNo": 60,
    "vendorName": "Gurjeet Singh",
    "campaign": "Dealer Influencer",
    "month": "May",
    "dateOfRequest": "2026-05-11",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-12",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-15",
    "paymentMonth": "May",
    "totalAmount": 7000,
    "remark": ""
  },
  {
    "id": "payment-59",
    "srNo": 61,
    "vendorName": "Divyansh Singh",
    "campaign": "Dealer Influencer",
    "month": "May",
    "dateOfRequest": "2026-05-12",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-12",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-15",
    "paymentMonth": "May",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-60",
    "srNo": 62,
    "vendorName": "Gaurav Singh",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-05-13",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-15",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-20",
    "paymentMonth": "May",
    "totalAmount": 7000,
    "remark": ""
  },
  {
    "id": "payment-61",
    "srNo": 63,
    "vendorName": "Mahendra Singh",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-05-13",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-15",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-20",
    "paymentMonth": "May",
    "totalAmount": 14000,
    "remark": ""
  },
  {
    "id": "payment-62",
    "srNo": 64,
    "vendorName": "Barkat",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-05-18",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-19",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-20",
    "paymentMonth": "May",
    "totalAmount": 18000,
    "remark": ""
  },
  {
    "id": "payment-63",
    "srNo": 65,
    "vendorName": "Sahil Sethi",
    "campaign": "Social Content",
    "month": "May",
    "dateOfRequest": "2026-05-19",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-19",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-20",
    "paymentMonth": "May",
    "totalAmount": 20000,
    "remark": ""
  },
  {
    "id": "payment-64",
    "srNo": 66,
    "vendorName": "Aditya",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-05-19",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-19",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-20",
    "paymentMonth": "May",
    "totalAmount": 9000,
    "remark": ""
  },
  {
    "id": "payment-65",
    "srNo": 67,
    "vendorName": "Rohan Dalpe",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-05-21",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-05",
    "paymentStatus": "Done",
    "paymentDate": "",
    "paymentMonth": "June",
    "totalAmount": 30000,
    "remark": ""
  },
  {
    "id": "payment-66",
    "srNo": 68,
    "vendorName": "Swapnil Valkunde",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-06-01",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-05",
    "paymentStatus": "Done",
    "paymentDate": "",
    "paymentMonth": "June",
    "totalAmount": 75000,
    "remark": ""
  },
  {
    "id": "payment-67",
    "srNo": 69,
    "vendorName": "Mayur Valkunde",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-06-01",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-05",
    "paymentStatus": "Done",
    "paymentDate": "",
    "paymentMonth": "June",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-68",
    "srNo": 70,
    "vendorName": "Preeti Singh",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-06-01",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-05",
    "paymentStatus": "Done",
    "paymentDate": "",
    "paymentMonth": "June",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-69",
    "srNo": 71,
    "vendorName": "Pavan Nayak",
    "campaign": "Viper Launch",
    "month": "May",
    "dateOfRequest": "2026-06-01",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-05",
    "paymentStatus": "Done",
    "paymentDate": "",
    "paymentMonth": "June",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-70",
    "srNo": 72,
    "vendorName": "ceosofbharat",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 2000,
    "remark": ""
  },
  {
    "id": "payment-71",
    "srNo": 73,
    "vendorName": "hiring.today",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 2500,
    "remark": ""
  },
  {
    "id": "payment-72",
    "srNo": 74,
    "vendorName": "businesshustle.in",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-73",
    "srNo": 75,
    "vendorName": "viestories__com",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 1000,
    "remark": ""
  },
  {
    "id": "payment-74",
    "srNo": 76,
    "vendorName": "ceoindiaweekly",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-75",
    "srNo": 77,
    "vendorName": "startup.age",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-76",
    "srNo": 78,
    "vendorName": "viralvista.india",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 2500,
    "remark": ""
  },
  {
    "id": "payment-77",
    "srNo": 79,
    "vendorName": "The stock market live",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 63000,
    "remark": ""
  },
  {
    "id": "payment-78",
    "srNo": 80,
    "vendorName": "Indian Finance",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-79",
    "srNo": 81,
    "vendorName": "You Finance",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-80",
    "srNo": 82,
    "vendorName": "Onevision Media",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-81",
    "srNo": 83,
    "vendorName": "Indian Feeds",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-82",
    "srNo": 84,
    "vendorName": "Filmyvision",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-83",
    "srNo": 85,
    "vendorName": "entrepreneur_hype",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-84",
    "srNo": 86,
    "vendorName": "entrepreneur.in you",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 600,
    "remark": ""
  },
  {
    "id": "payment-85",
    "srNo": 87,
    "vendorName": "founder.inyou",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 1100,
    "remark": ""
  },
  {
    "id": "payment-86",
    "srNo": 88,
    "vendorName": "indianbuzz",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-87",
    "srNo": 89,
    "vendorName": "indialinked",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-88",
    "srNo": 90,
    "vendorName": "tbv_insight",
    "campaign": "PR pages",
    "month": "May",
    "dateOfRequest": "2026-05-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-05-27",
    "paymentMonth": "May",
    "totalAmount": 1499,
    "remark": ""
  },
  {
    "id": "payment-89",
    "srNo": 91,
    "vendorName": "Social.shor",
    "campaign": "PR pages",
    "month": "June",
    "dateOfRequest": "2026-06-01",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-06-09",
    "paymentMonth": "June",
    "totalAmount": 1000,
    "remark": ""
  },
  {
    "id": "payment-90",
    "srNo": 92,
    "vendorName": "Rising Startup",
    "campaign": "PR pages",
    "month": "June",
    "dateOfRequest": "2026-06-01",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-01",
    "paymentStatus": "Done",
    "paymentDate": "2026-06-02",
    "paymentMonth": "June",
    "totalAmount": 4000,
    "remark": ""
  },
  {
    "id": "payment-91",
    "srNo": 93,
    "vendorName": "Samruddhi Kallur",
    "campaign": "Regular Influencer",
    "month": "June",
    "dateOfRequest": "2026-06-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-17",
    "paymentStatus": "Done",
    "paymentDate": "2026-06-17",
    "paymentMonth": "June",
    "totalAmount": 5000,
    "remark": "5000 bakance"
  },
  {
    "id": "payment-92",
    "srNo": 94,
    "vendorName": "Shlok",
    "campaign": "Regular Influencer",
    "month": "June",
    "dateOfRequest": "2026-06-17",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-17",
    "paymentStatus": "Done",
    "paymentDate": "2026-06-19",
    "paymentMonth": "June",
    "totalAmount": 10000,
    "remark": ""
  },
  {
    "id": "payment-93",
    "srNo": 95,
    "vendorName": "Kartik",
    "campaign": "Dealer Influencer - Agarwal Cycles",
    "month": "June",
    "dateOfRequest": "2026-06-19",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-17",
    "paymentStatus": "Done",
    "paymentDate": "2026-06-22",
    "paymentMonth": "June",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-94",
    "srNo": 96,
    "vendorName": "Anshika",
    "campaign": "Regular Influencer",
    "month": "June",
    "dateOfRequest": "2026-06-23",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-23",
    "paymentStatus": "Done",
    "paymentDate": "2026-06-24",
    "paymentMonth": "June",
    "totalAmount": 12500,
    "remark": "12500 balance"
  },
  {
    "id": "payment-95",
    "srNo": 97,
    "vendorName": "Prasad Joshi",
    "campaign": "Dealer Influencer - New Singh Cycles",
    "month": "June",
    "dateOfRequest": "2026-06-24",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-30",
    "paymentStatus": "Done",
    "paymentDate": "2026-06-30",
    "paymentMonth": "June",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-96",
    "srNo": 98,
    "vendorName": "Harshita",
    "campaign": "Yoga Day",
    "month": "June",
    "dateOfRequest": "2026-06-25",
    "hodApproval": "Approved",
    "approvalDate": "2026-05-25",
    "paymentStatus": "Done",
    "paymentDate": "2026-06-30",
    "paymentMonth": "June",
    "totalAmount": 25000,
    "remark": ""
  },
  {
    "id": "payment-97",
    "srNo": 99,
    "vendorName": "Aapli Wardha",
    "campaign": "Dealer Influencer - Let's Ride Cycle",
    "month": "June",
    "dateOfRequest": "2026-06-30",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-30",
    "paymentStatus": "Done",
    "paymentDate": "2026-06-30",
    "paymentMonth": "June",
    "totalAmount": 7500,
    "remark": ""
  },
  {
    "id": "payment-98",
    "srNo": 100,
    "vendorName": "Deepak Ranjan",
    "campaign": "Regular Influencer",
    "month": "July",
    "dateOfRequest": "2026-06-02",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-09",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-10",
    "paymentMonth": "July",
    "totalAmount": 35000,
    "remark": ""
  },
  {
    "id": "payment-99",
    "srNo": 101,
    "vendorName": "Naresh",
    "campaign": "Social Content",
    "month": "July",
    "dateOfRequest": "2026-06-02",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-03",
    "paymentMonth": "July",
    "totalAmount": 20000,
    "remark": ""
  },
  {
    "id": "payment-100",
    "srNo": 102,
    "vendorName": "ceosofbharat",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-07",
    "paymentMonth": "July",
    "totalAmount": 2000,
    "remark": ""
  },
  {
    "id": "payment-101",
    "srNo": 103,
    "vendorName": "businesshustle.in",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-07",
    "paymentMonth": "July",
    "totalAmount": 5000,
    "remark": ""
  },
  {
    "id": "payment-102",
    "srNo": 104,
    "vendorName": "marketingmedia.inn",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-07",
    "paymentMonth": "July",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-103",
    "srNo": 105,
    "vendorName": "viestories__com",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-07",
    "paymentMonth": "July",
    "totalAmount": 1000,
    "remark": ""
  },
  {
    "id": "payment-104",
    "srNo": 106,
    "vendorName": "ceoindiaweekly",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-07",
    "paymentMonth": "July",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-105",
    "srNo": 107,
    "vendorName": "startup.age",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-07",
    "paymentMonth": "July",
    "totalAmount": 4000,
    "remark": ""
  },
  {
    "id": "payment-106",
    "srNo": 108,
    "vendorName": "viralvista.india",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-07",
    "paymentMonth": "July",
    "totalAmount": 2500,
    "remark": ""
  },
  {
    "id": "payment-107",
    "srNo": 109,
    "vendorName": "founder.inyou,",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-07",
    "paymentMonth": "July",
    "totalAmount": 1500,
    "remark": ""
  },
  {
    "id": "payment-108",
    "srNo": 110,
    "vendorName": "entrepreneur.in you",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-06-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-07",
    "paymentMonth": "July",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-109",
    "srNo": 111,
    "vendorName": "Startup Universe",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-08",
    "paymentMonth": "July",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-110",
    "srNo": 112,
    "vendorName": "tbv_insight",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-08",
    "paymentMonth": "July",
    "totalAmount": 1499,
    "remark": ""
  },
  {
    "id": "payment-111",
    "srNo": 113,
    "vendorName": "social.shor",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-08",
    "paymentMonth": "July",
    "totalAmount": 1000,
    "remark": ""
  },
  {
    "id": "payment-112",
    "srNo": 114,
    "vendorName": "startupbyvstdy",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-08",
    "paymentMonth": "July",
    "totalAmount": 2500,
    "remark": ""
  },
  {
    "id": "payment-113",
    "srNo": 115,
    "vendorName": "indialinked",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-08",
    "paymentMonth": "July",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-114",
    "srNo": 116,
    "vendorName": "Corporatecurrent",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-08",
    "paymentMonth": "July",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-115",
    "srNo": 117,
    "vendorName": "indianbuzz",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-08",
    "paymentMonth": "July",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-116",
    "srNo": 118,
    "vendorName": "risingstartup",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-08",
    "paymentMonth": "July",
    "totalAmount": 5000,
    "remark": ""
  },
  {
    "id": "payment-117",
    "srNo": 119,
    "vendorName": "thejustindia",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-08",
    "paymentMonth": "July",
    "totalAmount": 0,
    "remark": ""
  },
  {
    "id": "payment-118",
    "srNo": 120,
    "vendorName": "Corporatecurrent",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-08",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-08",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-08",
    "paymentMonth": "July",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-119",
    "srNo": 121,
    "vendorName": "Shubham Revankar",
    "campaign": "Mumbai",
    "month": "July",
    "dateOfRequest": "2026-07-23",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-23",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-24",
    "paymentMonth": "July",
    "totalAmount": 65000,
    "remark": ""
  },
  {
    "id": "payment-120",
    "srNo": 122,
    "vendorName": "Saksham Sharma",
    "campaign": "Mumbai",
    "month": "July",
    "dateOfRequest": "2026-07-23",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-23",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-24",
    "paymentMonth": "July",
    "totalAmount": 30000,
    "remark": ""
  },
  {
    "id": "payment-121",
    "srNo": 123,
    "vendorName": "Aishwarya Dongre",
    "campaign": "Dealer Influencer - Agarwal Cycles",
    "month": "July",
    "dateOfRequest": "2026-07-23",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-23",
    "paymentStatus": "Done",
    "paymentDate": "2026-07-24",
    "paymentMonth": "July",
    "totalAmount": 3000,
    "remark": ""
  },
  {
    "id": "payment-122",
    "srNo": 124,
    "vendorName": "Vaibhav Malik",
    "campaign": "Regular Influencer",
    "month": "July",
    "dateOfRequest": "2026-07-24",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-04",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-05",
    "paymentMonth": "Aug",
    "totalAmount": 7000,
    "remark": ""
  },
  {
    "id": "payment-123",
    "srNo": 125,
    "vendorName": "Laksh Dadwani",
    "campaign": "Dealer Influencer - Agarwal Cycles",
    "month": "July",
    "dateOfRequest": "2026-07-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-05",
    "paymentMonth": "Aug",
    "totalAmount": 13000,
    "remark": ""
  },
  {
    "id": "payment-124",
    "srNo": 126,
    "vendorName": "Shiv Dutt",
    "campaign": "Regular Influencer",
    "month": "July",
    "dateOfRequest": "2026-07-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-05",
    "paymentMonth": "Aug",
    "totalAmount": 20000,
    "remark": ""
  },
  {
    "id": "payment-125",
    "srNo": 127,
    "vendorName": "investupmedia",
    "campaign": "Andhra Pradesh Seeding",
    "month": "July",
    "dateOfRequest": "2026-07-30",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-04",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-05",
    "paymentMonth": "Aug",
    "totalAmount": 7000,
    "remark": ""
  },
  {
    "id": "payment-126",
    "srNo": 128,
    "vendorName": "Abhishek Soni",
    "campaign": "Regular Influencer",
    "month": "July",
    "dateOfRequest": "2026-07-30",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-30",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-06",
    "paymentMonth": "Aug",
    "totalAmount": 30000,
    "remark": ""
  },
  {
    "id": "payment-127",
    "srNo": 129,
    "vendorName": "Ronak",
    "campaign": "Regular Influencer",
    "month": "July",
    "dateOfRequest": "2026-07-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-05",
    "paymentMonth": "Aug",
    "totalAmount": 10000,
    "remark": ""
  },
  {
    "id": "payment-128",
    "srNo": 130,
    "vendorName": "Kartik Ramchandani",
    "campaign": "Dealer Influencer - Agarwal Cycles",
    "month": "July",
    "dateOfRequest": "2026-07-30",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-07",
    "paymentMonth": "Aug",
    "totalAmount": 10000,
    "remark": "Invoice not received"
  },
  {
    "id": "payment-129",
    "srNo": 131,
    "vendorName": "Abhijit Shtte",
    "campaign": "Regular Influencer",
    "month": "July",
    "dateOfRequest": "2026-07-31",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-31",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-04",
    "paymentMonth": "Aug",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-130",
    "srNo": 132,
    "vendorName": "Shahil Qureshi",
    "campaign": "Dealer Influencer - Jalaram Cycles",
    "month": "July",
    "dateOfRequest": "2026-07-31",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-31",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-05",
    "paymentMonth": "Aug",
    "totalAmount": 20000,
    "remark": ""
  },
  {
    "id": "payment-131",
    "srNo": 133,
    "vendorName": "Akshay Yadav",
    "campaign": "Dealer Influencer - Kohinoor Cycles",
    "month": "July",
    "dateOfRequest": "2026-07-31",
    "hodApproval": "Approved",
    "approvalDate": "2026-07-31",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-04",
    "paymentMonth": "Aug",
    "totalAmount": 8000,
    "remark": ""
  },
  {
    "id": "payment-132",
    "srNo": 134,
    "vendorName": "Soumya Jaiswal",
    "campaign": "Regular Influencer",
    "month": "July",
    "dateOfRequest": "2026-07-30",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-03",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-05",
    "paymentMonth": "Aug",
    "totalAmount": 40000,
    "remark": ""
  },
  {
    "id": "payment-133",
    "srNo": 135,
    "vendorName": "Rajat Dakol",
    "campaign": "Regular Influencer",
    "month": "Aug",
    "dateOfRequest": "2026-08-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-06",
    "paymentMonth": "Aug",
    "totalAmount": 27000,
    "remark": ""
  },
  {
    "id": "payment-134",
    "srNo": 136,
    "vendorName": "Akash Prasad",
    "campaign": "Regular Influencer",
    "month": "Aug",
    "dateOfRequest": "2026-08-04",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-10",
    "paymentMonth": "Aug",
    "totalAmount": 25000,
    "remark": ""
  },
  {
    "id": "payment-135",
    "srNo": 137,
    "vendorName": "Suvan Pranay",
    "campaign": "Regular Influencer",
    "month": "Aug",
    "dateOfRequest": "2026-08-06",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-10",
    "paymentMonth": "Aug",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-136",
    "srNo": 138,
    "vendorName": "Aditya Sindhu",
    "campaign": "Regular Influencer",
    "month": "Aug",
    "dateOfRequest": "2026-08-07",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-07",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-10",
    "paymentMonth": "Aug",
    "totalAmount": 40000,
    "remark": ""
  },
  {
    "id": "payment-137",
    "srNo": 139,
    "vendorName": "Sahil Sethi",
    "campaign": "Regular Influencer",
    "month": "Aug",
    "dateOfRequest": "2026-08-22",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 22000,
    "remark": ""
  },
  {
    "id": "payment-138",
    "srNo": 140,
    "vendorName": "Akshata",
    "campaign": "Dealer Influencer - Peddal Power International",
    "month": "Aug",
    "dateOfRequest": "2026-08-24",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-139",
    "srNo": 141,
    "vendorName": "Ayush Gode",
    "campaign": "Dealer Influencer - Agarwal Cycles",
    "month": "Aug",
    "dateOfRequest": "2026-08-24",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 8000,
    "remark": ""
  },
  {
    "id": "payment-140",
    "srNo": 142,
    "vendorName": "Yashwant",
    "campaign": "Regular Influencer",
    "month": "Aug",
    "dateOfRequest": "2026-08-24",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-24",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-26",
    "paymentMonth": "Aug",
    "totalAmount": 60000,
    "remark": ""
  },
  {
    "id": "payment-141",
    "srNo": 143,
    "vendorName": "Joyal Joshy",
    "campaign": "Regular Influencer",
    "month": "Aug",
    "dateOfRequest": "2026-08-24",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-24",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-26",
    "paymentMonth": "Aug",
    "totalAmount": 25000,
    "remark": ""
  },
  {
    "id": "payment-142",
    "srNo": 144,
    "vendorName": "Arya Lali",
    "campaign": "ONAM",
    "month": "Aug",
    "dateOfRequest": "2026-08-24",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-24",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-25",
    "paymentMonth": "Aug",
    "totalAmount": 8000,
    "remark": ""
  },
  {
    "id": "payment-143",
    "srNo": 145,
    "vendorName": "Bhagya Nath",
    "campaign": "ONAM",
    "month": "Aug",
    "dateOfRequest": "2026-08-24",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-24",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-25",
    "paymentMonth": "Aug",
    "totalAmount": 11000,
    "remark": ""
  },
  {
    "id": "payment-144",
    "srNo": 146,
    "vendorName": "Vikram Films",
    "campaign": "Independence Day",
    "month": "Aug",
    "dateOfRequest": "2026-08-24",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-24",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-26",
    "paymentMonth": "Aug",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-145",
    "srNo": 147,
    "vendorName": "Amandeep Singh",
    "campaign": "Regular Influencer",
    "month": "Aug",
    "dateOfRequest": "2026-08-24",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-24",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-26",
    "paymentMonth": "Aug",
    "totalAmount": 20000,
    "remark": ""
  },
  {
    "id": "payment-146",
    "srNo": 148,
    "vendorName": "Santosh",
    "campaign": "Facelift",
    "month": "Aug",
    "dateOfRequest": "2026-08-25",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-25",
    "paymentStatus": "Advance Paid",
    "paymentDate": "2026-08-27",
    "paymentMonth": "Aug",
    "totalAmount": 15000,
    "remark": "10k paid, 5k balance"
  },
  {
    "id": "payment-147",
    "srNo": 149,
    "vendorName": "Sona Marry",
    "campaign": "ONAM",
    "month": "Aug",
    "dateOfRequest": "2026-08-26",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 35000,
    "remark": ""
  },
  {
    "id": "payment-148",
    "srNo": 150,
    "vendorName": "Ronish Chand",
    "campaign": "ONAM",
    "month": "Aug",
    "dateOfRequest": "2026-08-26",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 5000,
    "remark": ""
  },
  {
    "id": "payment-149",
    "srNo": 151,
    "vendorName": "Noel",
    "campaign": "ONAM",
    "month": "Aug",
    "dateOfRequest": "2026-08-26",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 27000,
    "remark": ""
  },
  {
    "id": "payment-150",
    "srNo": 152,
    "vendorName": "NEPHY SABU",
    "campaign": "ONAM",
    "month": "Aug",
    "dateOfRequest": "2026-08-26",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 18000,
    "remark": ""
  },
  {
    "id": "payment-151",
    "srNo": 153,
    "vendorName": "Irfan Farisi",
    "campaign": "ONAM",
    "month": "Aug",
    "dateOfRequest": "2026-08-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-152",
    "srNo": 154,
    "vendorName": "Sekhar Santosh",
    "campaign": "ONAM",
    "month": "Aug",
    "dateOfRequest": "2026-08-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 20000,
    "remark": ""
  },
  {
    "id": "payment-153",
    "srNo": 155,
    "vendorName": "Abhinav Varghase",
    "campaign": "ONAM",
    "month": "Aug",
    "dateOfRequest": "2026-08-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 25000,
    "remark": ""
  },
  {
    "id": "payment-154",
    "srNo": 156,
    "vendorName": "Ambika Hari",
    "campaign": "ONAM",
    "month": "Aug",
    "dateOfRequest": "2026-08-27",
    "hodApproval": "Approved",
    "approvalDate": "2026-08-27",
    "paymentStatus": "Done",
    "paymentDate": "2026-08-28",
    "paymentMonth": "Aug",
    "totalAmount": 12000,
    "remark": ""
  },
  {
    "id": "payment-155",
    "srNo": 157,
    "vendorName": "Deepak Ranjan",
    "campaign": "Amazon Sale",
    "month": "Sep",
    "dateOfRequest": "2026-09-01",
    "hodApproval": "Approved",
    "approvalDate": "2026-09-04",
    "paymentStatus": "Pending",
    "paymentDate": "",
    "paymentMonth": "",
    "totalAmount": 25000,
    "remark": ""
  },
  {
    "id": "payment-156",
    "srNo": 158,
    "vendorName": "Ashlyn Sam",
    "campaign": "Facelift",
    "month": "Sep",
    "dateOfRequest": "2026-09-01",
    "hodApproval": "Approved",
    "approvalDate": "2026-09-04",
    "paymentStatus": "Done",
    "paymentDate": "2026-09-07",
    "paymentMonth": "Sep",
    "totalAmount": 6000,
    "remark": ""
  },
  {
    "id": "payment-157",
    "srNo": 159,
    "vendorName": "Avishkar - Trending Pune",
    "campaign": "Facelift",
    "month": "Sep",
    "dateOfRequest": "2026-09-01",
    "hodApproval": "Approved",
    "approvalDate": "2026-09-04",
    "paymentStatus": "Done",
    "paymentDate": "2026-09-07",
    "paymentMonth": "Sep",
    "totalAmount": 15000,
    "remark": ""
  },
  {
    "id": "payment-158",
    "srNo": 160,
    "vendorName": "Harsh Cheepirishetty",
    "campaign": "Regular Influencer",
    "month": "Sep",
    "dateOfRequest": "2026-09-01",
    "hodApproval": "Approved",
    "approvalDate": "2026-09-04",
    "paymentStatus": "Pending",
    "paymentDate": "",
    "paymentMonth": "",
    "totalAmount": 30000,
    "remark": ""
  },
  {
    "id": "payment-159",
    "srNo": 161,
    "vendorName": "Neeraj Bhandari",
    "campaign": "Regular Influencer",
    "month": "Sep",
    "dateOfRequest": "2026-09-02",
    "hodApproval": "Approved",
    "approvalDate": "2026-09-04",
    "paymentStatus": "Done",
    "paymentDate": "2026-09-07",
    "paymentMonth": "Sep",
    "totalAmount": 30000,
    "remark": ""
  }
];


const PAYMENT_STATUSES = ["Pending", "Advance Paid", "Done"];
const APPROVAL_STATUSES = ["Pending", "Approved", "Rejected"];
const PAYMENTS_KEY = "emotorad-payments-v1";

function emptyPaymentDraft() {
  return {
    id: null,
    srNo: "",
    vendorName: "",
    useOther: false,
    campaign: "",
    useOtherCampaign: false,
    month: "",
    dateOfRequest: daysFromNow(0),
    hodApproval: "Pending",
    approvalDate: "",
    paymentStatus: "Pending",
    paymentDate: "",
    paymentMonth: "",
    totalAmount: "",
    remark: "",
  };
}

function EMotoradPaymentApprovals() {
  const [payments, setPayments] = useState([]);
  const [crmInfluencers, setCrmInfluencers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCampaign, setFilterCampaign] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonths, setFilterMonths] = useState([]);
  const [filterUnknownPaymentDate, setFilterUnknownPaymentDate] = useState(false);
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(emptyPaymentDraft());
  const [isNew, setIsNew] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let loadedPayments = null;
      let loadedInfluencers = null;
      let loadedCampaigns = null;
      try {
        const r = await window.storage.get(PAYMENTS_KEY, true);
        if (r && r.value) loadedPayments = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(INFLUENCERS_KEY, true);
        if (r && r.value) loadedInfluencers = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(CAMPAIGNS_KEY, true);
        if (r && r.value) loadedCampaigns = JSON.parse(r.value);
      } catch (e) {}
      if (cancelled) return;
      if (loadedPayments) {
        setPayments(loadedPayments);
      } else {
        setPayments(SEED_PAYMENTS);
        try {
          await window.storage.set(PAYMENTS_KEY, JSON.stringify(SEED_PAYMENTS), true);
        } catch (e) {}
      }
      setCrmInfluencers(loadedInfluencers || []);
      if (loadedCampaigns) {
        setCampaigns(loadedCampaigns);
      } else {
        setCampaigns(SEED_CAMPAIGNS);
        try {
          await window.storage.set(CAMPAIGNS_KEY, JSON.stringify(SEED_CAMPAIGNS), true);
        } catch (e) {}
      }
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next) => {
    setPayments(next);
    try {
      const res = await window.storage.set(PAYMENTS_KEY, JSON.stringify(next), true);
      if (!res) showToast("Couldn't save — try again");
    } catch (e) {
      showToast("Couldn't save — try again");
    }
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  const campaignOptions = useMemo(() => {
    const set = new Set(payments.map((p) => p.campaign).filter(Boolean));
    return Array.from(set).sort();
  }, [payments]);

  const availableMonths = useMemo(() => {
    const set = new Set(payments.map((p) => monthKey(p.dateOfRequest)).filter(isPlausibleMonthKey));
    return Array.from(set).sort();
  }, [payments]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (filterCampaign !== "all" && p.campaign !== filterCampaign) return false;
      if (filterStatus !== "all" && p.paymentStatus !== filterStatus) return false;
      if (filterUnknownPaymentDate) {
        if (isPlausibleMonthKey(monthKey(p.paymentDate))) return false;
      } else {
        if (!inSelectedMonths(p.dateOfRequest, filterMonths)) return false;
        if (!inCustomRange(p.dateOfRequest, customRange.start, customRange.end)) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = (p.vendorName + " " + p.campaign).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [payments, filterCampaign, filterStatus, filterMonths, filterUnknownPaymentDate, customRange, search]);

  const monthlyBreakdown = useMemo(() => {
    const map = {};
    function bucket(key) {
      if (!map[key]) map[key] = { key, requestCount: 0, spend: 0 };
      return map[key];
    }
    // Requests are counted by the request month (dateOfRequest)
    payments.forEach((p) => {
      const rawKey = monthKey(p.dateOfRequest);
      const key = isPlausibleMonthKey(rawKey) ? rawKey : "unknown";
      bucket(key).requestCount += 1;
    });
    // Spend is counted by the payment month (paymentDate) — money actually paid out that month
    payments.forEach((p) => {
      const rawKey = monthKey(p.paymentDate);
      const key = isPlausibleMonthKey(rawKey) ? rawKey : "unknown";
      bucket(key).spend += Number(p.totalAmount) || 0;
    });
    return Object.values(map).sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [payments]);

  const stats = useMemo(() => {
    const totalAmount = filtered.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
    const pendingApproval = filtered.filter((p) => p.hodApproval !== "Approved").length;
    const pendingPayment = filtered.filter((p) => p.paymentStatus !== "Done").length;
    return { total: filtered.length, totalAmount, pendingApproval, pendingPayment };
  }, [filtered]);

  function exportPayments() {
    const headers = [
      "Sr. No", "Vendor Name", "Campaign", "Month", "Date Of Request",
      "HOD Approval", "Approval Date", "Payment Status", "Payment Date", "Payment Month",
      "Total Amount", "Remark",
    ];
    const rows = filtered.map((p) => [
      p.srNo, p.vendorName, p.campaign, p.month, p.dateOfRequest,
      p.hodApproval, p.approvalDate, p.paymentStatus, p.paymentDate, p.paymentMonth,
      p.totalAmount, p.remark,
    ]);
    const label = filterMonths.length > 0
      ? filterMonths.map(monthLabelFromKey).join("_").replace(/\s+/g, "-")
      : customRange.start || customRange.end
      ? `${customRange.start || "start"}_to_${customRange.end || "end"}`
      : "all";
    downloadCSV(`payment-approvals_${label}.csv`, headers, rows);
  }

  function openAddDrawer() {
    setDraft(emptyPaymentDraft());
    setIsNew(true);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function openEditDrawer(p) {
    const isKnown = crmInfluencers.some((i) => i.name === p.vendorName);
    const isKnownCampaign = !p.campaign || campaigns.some((c) => c.name === p.campaign);
    setDraft({ ...p, useOther: !isKnown, useOtherCampaign: !isKnownCampaign, totalAmount: String(p.totalAmount) });
    setIsNew(false);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function saveDraft() {
    if (!draft.vendorName.trim()) {
      showToast("Vendor name is required");
      return;
    }
    const record = {
      ...draft,
      id: draft.id || "payment-" + Date.now(),
      srNo: Number(draft.srNo) || payments.length + 1,
      totalAmount: Number(draft.totalAmount) || 0,
    };
    delete record.useOtherCampaign;
    if (isNew) {
      persist([record, ...payments]);
      showToast("Payment request added");
    } else {
      persist(payments.map((p) => (p.id === record.id ? record : p)));
      showToast("Changes saved");
    }
    closeDrawer();
  }

  function deleteDraft() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    persist(payments.filter((p) => p.id !== draft.id));
    showToast("Payment request removed");
    closeDrawer();
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading payment approvals…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .input {
          width: 100%;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13.5px;
          color: #f4f4f5;
        }
        .input:focus { outline: none; border-color: #004DAC; }
      `}</style>

      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="font-display font-semibold text-lg">Payment Approvals</div>
        <button
          onClick={openAddDrawer}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add payment request
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800">
        <StatBlock label="Total requests" value={stats.total} accent />
        <StatBlock label="Total amount" value={formatINR(stats.totalAmount)} />
        <StatBlock label="Pending approvals" value={stats.pendingApproval} warn={stats.pendingApproval > 0} />
        <StatBlock label="Pending payments" value={stats.pendingPayment} warn={stats.pendingPayment > 0} />
      </div>

      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-zinc-800">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor, location"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <Select value={filterCampaign} onChange={setFilterCampaign} options={["all", ...campaignOptions]} labelAll="All campaigns" />
        <Select value={filterStatus} onChange={setFilterStatus} options={["all", ...PAYMENT_STATUSES]} labelAll="All payment statuses" />
        <MonthFilter
          availableMonths={availableMonths}
          selected={filterMonths}
          onChange={(months) => {
            setFilterMonths(months);
            setFilterUnknownPaymentDate(false);
          }}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
        {filterUnknownPaymentDate && (
          <button
            onClick={() => setFilterUnknownPaymentDate(false)}
            className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm px-3 py-1.5 rounded-md"
          >
            Showing: missing Payment Date
            <X size={13} />
          </button>
        )}
        <button
          onClick={exportPayments}
          className="flex items-center gap-1.5 border border-zinc-800 hover:border-zinc-800 text-zinc-300 text-sm px-3 py-1.5 rounded-md transition-colors ml-auto"
        >
          <Download size={14} />
          Download CSV
        </button>
      </div>

      <div className="px-6 pt-5">
        <button
          onClick={() => setShowMonthlyBreakdown((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 mb-3"
        >
          <ChevronDown size={14} className={`transition-transform ${showMonthlyBreakdown ? "" : "-rotate-90"}`} />
          Spend by month
        </button>
        {showMonthlyBreakdown && (
          <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 text-zinc-500 text-xs">
                  <th className="text-left font-medium px-3 py-2">Month</th>
                  <th className="text-left font-medium px-3 py-2">Requests (by Month)</th>
                  <th className="text-left font-medium px-3 py-2">Total Spend (by Payment Month)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((m) => (
                  <tr
                    key={m.key}
                    onClick={() => {
                      if (m.key === "unknown") {
                        setFilterUnknownPaymentDate(true);
                        setFilterMonths([]);
                      } else {
                        setFilterUnknownPaymentDate(false);
                        setFilterMonths([m.key]);
                      }
                    }}
                    className="border-t border-zinc-800 hover:bg-zinc-900/60 cursor-pointer"
                  >
                    <td className="px-3 py-2 font-medium">{m.key === "unknown" ? "Unknown date" : monthLabelFromKey(m.key)}</td>
                    <td className="px-3 py-2 text-zinc-400">{m.requestCount || "—"}</td>
                    <td className="px-3 py-2 text-blue-400">{formatINR(m.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-2 text-[11px] text-zinc-600 border-t border-zinc-800">
              Requests are counted by the month they were requested in; spend is counted by the month they were
              actually paid in — so the two columns can point to different underlying records in the same row.
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-5">
        {filtered.length === 0 ? (
          <div className="text-center text-zinc-600 text-sm py-16">No payment requests match these filters.</div>
        ) : (
          <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 text-zinc-500 text-xs">
                  <th className="text-left font-medium px-3 py-2.5">Sr. No</th>
                  <th className="text-left font-medium px-3 py-2.5">Vendor Name</th>
                  <th className="text-left font-medium px-3 py-2.5">Campaign</th>
                  <th className="text-left font-medium px-3 py-2.5">Month</th>
                  <th className="text-left font-medium px-3 py-2.5">Date Of Request</th>
                  <th className="text-left font-medium px-3 py-2.5">HOD Approval</th>
                  <th className="text-left font-medium px-3 py-2.5">Approval Date</th>
                  <th className="text-left font-medium px-3 py-2.5">Payment Status</th>
                  <th className="text-left font-medium px-3 py-2.5">Payment Date</th>
                  <th className="text-left font-medium px-3 py-2.5">Payment Month</th>
                  <th className="text-left font-medium px-3 py-2.5">Total Amount</th>
                  <th className="text-left font-medium px-3 py-2.5">Remark</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openEditDrawer(p)}
                    className="border-t border-zinc-800 hover:bg-zinc-900/60 cursor-pointer"
                  >
                    <td className="px-3 py-2.5 text-zinc-500">{p.srNo}</td>
                    <td className="px-3 py-2.5 font-medium">{p.vendorName}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{p.campaign || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{p.month || "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatDate(p.dateOfRequest)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          p.hodApproval === "Approved"
                            ? "bg-zinc-800 text-zinc-300"
                            : p.hodApproval === "Rejected"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-400/10 text-amber-400"
                        }`}
                      >
                        {p.hodApproval}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatDate(p.approvalDate)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          p.paymentStatus === "Done"
                            ? "bg-zinc-800 text-zinc-300"
                            : "bg-amber-400/10 text-amber-400"
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-zinc-400">{formatDate(p.paymentDate)}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{p.paymentMonth || "—"}</td>
                    <td className="px-3 py-2.5 text-blue-400">{formatINR(p.totalAmount)}</td>
                    <td className="px-3 py-2.5 text-zinc-400">{p.remark || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">
                {isNew ? "Add payment request" : "Edit payment request"}
              </div>
              <button onClick={closeDrawer} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <Field label="Vendor / influencer name">
                {!draft.useOther ? (
                  <select
                    value={draft.vendorName}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setDraft({ ...draft, useOther: true, vendorName: "" });
                      } else {
                        setDraft({ ...draft, vendorName: e.target.value });
                      }
                    }}
                    className="input"
                  >
                    <option value="">Select from CRM</option>
                    {crmInfluencers.map((i) => (
                      <option key={i.id} value={i.name}>
                        {i.name}
                      </option>
                    ))}
                    <option value="__other__">Other (type manually)</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={draft.vendorName}
                      onChange={(e) => setDraft({ ...draft, vendorName: e.target.value })}
                      className="input"
                      placeholder="Vendor name"
                      autoFocus
                    />
                    <button
                      onClick={() => setDraft({ ...draft, useOther: false, vendorName: "" })}
                      className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap px-2"
                    >
                      Use CRM list
                    </button>
                  </div>
                )}
              </Field>

              <Field label="Campaign">
                {!draft.useOtherCampaign ? (
                  <select
                    value={draft.campaign}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setDraft({ ...draft, useOtherCampaign: true, campaign: "" });
                      } else {
                        setDraft({ ...draft, campaign: e.target.value });
                      }
                    }}
                    className="input"
                  >
                    <option value="">Not linked to a campaign</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__other__">Other / Add manually</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={draft.campaign}
                      onChange={(e) => setDraft({ ...draft, campaign: e.target.value })}
                      className="input"
                      placeholder="e.g. Regular Influencer"
                      autoFocus
                    />
                    <button
                      onClick={() => setDraft({ ...draft, useOtherCampaign: false, campaign: "" })}
                      className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap px-2"
                    >
                      Use campaign list
                    </button>
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date of request">
                  <input
                    type="date"
                    value={draft.dateOfRequest}
                    onChange={(e) => setDraft({ ...draft, dateOfRequest: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Month">
                  <input
                    value={draft.month}
                    onChange={(e) => setDraft({ ...draft, month: e.target.value })}
                    className="input"
                    placeholder="e.g. Jan"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="HOD approval">
                  <select
                    value={draft.hodApproval}
                    onChange={(e) => setDraft({ ...draft, hodApproval: e.target.value })}
                    className="input"
                  >
                    {APPROVAL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Approval date">
                  <input
                    type="date"
                    value={draft.approvalDate}
                    onChange={(e) => setDraft({ ...draft, approvalDate: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment status">
                  <select
                    value={draft.paymentStatus}
                    onChange={(e) => setDraft({ ...draft, paymentStatus: e.target.value })}
                    className="input"
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Payment date">
                  <input
                    type="date"
                    value={draft.paymentDate}
                    onChange={(e) => setDraft({ ...draft, paymentDate: e.target.value })}
                    className="input"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Payment Month">
                  <input
                    value={draft.paymentMonth}
                    onChange={(e) => setDraft({ ...draft, paymentMonth: e.target.value })}
                    className="input"
                    placeholder="e.g. Jan"
                  />
                </Field>
                <Field label="Total amount (₹)">
                  <input
                    type="number"
                    value={draft.totalAmount}
                    onChange={(e) => setDraft({ ...draft, totalAmount: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
              </div>

              <Field label="Remark">
                <textarea
                  value={draft.remark}
                  onChange={(e) => setDraft({ ...draft, remark: e.target.value })}
                  className="input min-h-[60px] resize-none"
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-5 flex gap-2">
              <button
                onClick={saveDraft}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors"
              >
                {isNew ? "Add request" : "Save changes"}
              </button>
              {!isNew && (
                <button
                  onClick={deleteDraft}
                  className={`px-3 rounded-md border text-sm transition-colors ${
                    confirmDelete
                      ? "border-red-500 text-red-400 bg-red-500/10"
                      : "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                  }`}
                >
                  {confirmDelete ? "Confirm delete" : <Trash2 size={16} />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-800 text-sm px-4 py-2 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ==================== PERFORMANCE DASHBOARD MODULE ====================

// ---------- constants ----------

const CONTENT_TYPES = ["Reel", "Story", "YouTube Video", "Instagram Post", "Unboxing Video", "Live Stream"];

const PERFORMANCE_KEY = "emotorad-performance-v2";
const SALES_KEY = "emotorad-sales-v2";

const SEED_ENTRIES = [
  {
    "id": "vidimp-em-yt-0",
    "influencerName": "Swati Rojha",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "https://youtu.be/EGJlnumlE5o?si=9Ea5Ys9v8GPdhWs7",
    "views": 43000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-0",
    "influencerName": "Swati Rojha",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DK1nU8zpbH8/?utm_source=ig_web_copy_link&igsh=ZDZtbW9laGF5ZjN5",
    "views": 136200,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-1",
    "influencerName": "Virender Singh",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "https://youtu.be/5GhzcuW9c5c?si=sXQYJrsbOL0wsUUY",
    "views": 257000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-1",
    "influencerName": "Virender Singh",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DTfd-jzExM5/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 264338,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-2",
    "influencerName": "EV Auto Gyan EV Auto Gyan 2",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "https://youtu.be/uemt1tGiM-A?si=CdkEC703tVba517u https://youtu.be/BS_0KPA3Y3w?si=vRZngW7PyY7osbUl",
    "views": 1000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-3",
    "influencerName": "Only Desi",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "https://youtu.be/mcjd0s0aknE?si=4h5byTjT3e-7CgKM",
    "views": 838000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-4",
    "influencerName": "Harry Archana Singh",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "https://youtu.be/ZwMlzffX-MU?si=9UkWdCbcsdbOURYv",
    "views": 1000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-4",
    "influencerName": "Harry Archana Singh",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DJ1WqT9ztjV/?utm_source=ig_web_copy_link&igsh=MWM3eXFoejR3aDk2Zg==",
    "views": 5450,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-5",
    "influencerName": "Abhishek Moto",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "https://youtu.be/5Q3cXXeT4E4?si=aCPu3PdKh-WeBs59",
    "views": 500,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-5",
    "influencerName": "Abhishek Moto",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DLpeDQTSppb/?utm_source=ig_web_copy_link&igsh=NnF6aTd0MXJ4YXNh",
    "views": 17027,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-6",
    "influencerName": "urvishkaushik_",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 186000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-7",
    "influencerName": "Dev Mtr",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Link",
    "views": 43212,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-8",
    "influencerName": "New Tuber",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "https://youtu.be/BwSLDCqQfYA?si=2B8B_BO49VbAdI-o",
    "views": 2200,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-9",
    "influencerName": "King Indian Media",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 217915,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-9",
    "influencerName": "King Indian Media",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 1322915,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-10",
    "influencerName": "Vaibhav Malik",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Video is shared",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-11",
    "influencerName": "Soumya Jaiswal",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 307000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-12",
    "influencerName": "Dr Drive",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Dr Drive",
    "views": 2772,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-12",
    "influencerName": "Dr Drive",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DLCrSUmy8Xg/?utm_source=ig_web_copy_link&igsh=cnBoYTV0djl3eWwy https://www.instagram.com/reel/DLSMLyWSrKT/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 183372,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-13",
    "influencerName": "I am Noel",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 123134,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-13",
    "influencerName": "I am Noel",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 953134,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-14",
    "influencerName": "KL Rider",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "KL RIDER",
    "views": 3143,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-14",
    "influencerName": "KL Rider",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "KL rider",
    "views": 480143,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-15",
    "influencerName": "Punekar_Ig",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DKUbjm7pUhZ/?utm_source=ig_web_copy_link&igsh=MTFqYTQ1dnEwcm5hZw== https://www.facebook.com/share/r/167vgcEkvD/",
    "views": 11200000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-16",
    "influencerName": "Kon Kunal",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Kunal Ingle",
    "views": 18000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-17",
    "influencerName": "Samar Experiment",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "https://youtu.be/ISU-vfQRyDo?si=zdCBm0oHP6Vrkab5",
    "views": 55853,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-18",
    "influencerName": "Suvan",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Suvan Pranay",
    "views": 59800,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-19",
    "influencerName": "EV Gyan",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Link",
    "views": 47388,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-19",
    "influencerName": "EV Gyan",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 82788,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-20",
    "influencerName": "Dil Toota Biker",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 26328,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-20",
    "influencerName": "Dil Toota Biker",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 108728,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-21",
    "influencerName": "Karan Gade",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Video",
    "views": 32000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-22",
    "influencerName": "K2K Motovlogs",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Video",
    "views": 4648,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-22",
    "influencerName": "K2K Motovlogs",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 29648,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-23",
    "influencerName": "Akash Chaturvedi",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Video",
    "views": 1500,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-23",
    "influencerName": "Akash Chaturvedi",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DL4qBVgTD4F/?utm_source=ig_web_copy_link&igsh=MWs1aTkzOXY1NjBtMA==",
    "views": 7100,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-24",
    "influencerName": "Vaishnavi India",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Vaishnavi",
    "views": 124000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-25",
    "influencerName": "Kishan Sharma",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Video",
    "views": 2800,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-25",
    "influencerName": "Kishan Sharma",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Video",
    "views": 13296,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-26",
    "influencerName": "Swati Rojha",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "https://youtu.be/EGJlnumlE5o?si=9Ea5Ys9v8GPdhWs7",
    "views": 86050,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-26",
    "influencerName": "Swati Rojha",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DK1nU8zpbH8/?utm_source=ig_web_copy_link&igsh=ZDZtbW9laGF5ZjN5",
    "views": 334050,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-27",
    "influencerName": "Vishal Singh",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Vishal",
    "views": 500000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-28",
    "influencerName": "4 Traction",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Link",
    "views": 15000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-28",
    "influencerName": "4 Traction",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 197000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-29",
    "influencerName": "Amandeep Singh Gulati",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Link",
    "views": 13000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-29",
    "influencerName": "Amandeep Singh Gulati",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 144000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-30",
    "influencerName": "Duke Sanal",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 5000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-30",
    "influencerName": "Duke Sanal",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 54100,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-31",
    "influencerName": "Fuel Injected",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 69000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-31",
    "influencerName": "Fuel Injected",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 254700,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-32",
    "influencerName": "Amrit Singh",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Video",
    "views": 126000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-33",
    "influencerName": "NAVEEN JANGID",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Video",
    "views": 67800,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-34",
    "influencerName": "Himalayan Moosa",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 334,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-34",
    "influencerName": "Himalayan Moosa",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 25434,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-35",
    "influencerName": "Abhinav Thul",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 74500,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-37",
    "influencerName": "Nagpur Wow",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 61800,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-38",
    "influencerName": "Rc Mech",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 152000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-38",
    "influencerName": "Rc Mech",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 238900,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-39",
    "influencerName": "MTB Imran",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-39",
    "influencerName": "MTB Imran",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 100000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-40",
    "influencerName": "Urvishkaushik_",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 405000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-41",
    "influencerName": "RACHNA GOWDA",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-42",
    "influencerName": "Virender Singh",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 66000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-42",
    "influencerName": "Virender Singh",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 76900,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-43",
    "influencerName": "Fatbiker Vaibhav",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-43",
    "influencerName": "Fatbiker Vaibhav",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-44",
    "influencerName": "Fatbiker Vaibhav",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 49100,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-45",
    "influencerName": "design.Shraddha",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 18700,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-46",
    "influencerName": "suraj_bl_vlogs",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 5000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-46",
    "influencerName": "suraj_bl_vlogs",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 1855000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-47",
    "influencerName": "typography.studio",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 45500,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-48",
    "influencerName": "Shaga Media",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-48",
    "influencerName": "Shaga Media",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-49",
    "influencerName": "Bhawna Choudhary",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 7300,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-49",
    "influencerName": "Bhawna Choudhary",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 123800,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-50",
    "influencerName": "Moto Maniac 46",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 173,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-50",
    "influencerName": "Moto Maniac 46",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 11773,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-51",
    "influencerName": "Moto Fuel",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 660,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-51",
    "influencerName": "Moto Fuel",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 660,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-52",
    "influencerName": "Jagmohan Yadav",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "LINK",
    "views": 4200,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-52",
    "influencerName": "Jagmohan Yadav",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "LINK",
    "views": 10464,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-54",
    "influencerName": "Kunal Ingle",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 14000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-55",
    "influencerName": "Karan gade",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 18800,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-56",
    "influencerName": "Fatbiker Vaibhav",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 70700,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-57",
    "influencerName": "Swapnil Valkunde",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 105000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-58",
    "influencerName": "Yellow cruiser",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Link",
    "views": 541,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-58",
    "influencerName": "Yellow cruiser",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 17541,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-59",
    "influencerName": "MTB Imran",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "235300",
    "views": 312000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-60",
    "influencerName": "Mrinmay",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-61",
    "influencerName": "Rohan Dalape",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-62",
    "influencerName": "Amrit Singh",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Video",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-65",
    "influencerName": "Ishu Finds",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-66",
    "influencerName": "Microtech 007",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Link",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-66",
    "influencerName": "Microtech 007",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-67",
    "influencerName": "Auto Review 46",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Static",
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-68",
    "influencerName": "Master Wheels",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Link",
    "views": 54000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-68",
    "influencerName": "Master Wheels",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 19574000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-71",
    "influencerName": "Chalte Firte",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 174000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-74",
    "influencerName": "Chalte Firte",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 2870000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-75",
    "influencerName": "Its Sanchit Bansal",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 30200,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-yt-76",
    "influencerName": "KSN TALKS",
    "campaignName": "EM Regular Activity",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "",
    "postLink": "Link",
    "views": 11709,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (YouTube video link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-76",
    "influencerName": "KSN TALKS",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 16900,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-77",
    "influencerName": "Y4shiiiii1",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 48900,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-78",
    "influencerName": "Siddhant Ingole",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 16200,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-79",
    "influencerName": "imdivyansh._",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 213000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-em-ig-81",
    "influencerName": "Sahil Sethi",
    "campaignName": "EM Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "Link",
    "views": 12200,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from EM Regular Influencer Activity (Instagram link).",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-0",
    "influencerName": "prachitaranshofficial",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 65900,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-2",
    "influencerName": "Sakshi Agarwal",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 84100,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-3",
    "influencerName": "Rituka and baby saksham",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 83100,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-4",
    "influencerName": "Manpreet Kaur Chawla",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 140000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-5",
    "influencerName": "Vandita Chaurasia",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 103000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-6",
    "influencerName": "Avinash",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 10409,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-7",
    "influencerName": "Explore Vlogs A.R",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 6701,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-8",
    "influencerName": "Abhishek Jha",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 7146,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-9",
    "influencerName": "prachitaranshofficial",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 23400,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-10",
    "influencerName": "Palak Chopra",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 125000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-11",
    "influencerName": "Jassimran kaur",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 82200,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "vidimp-ff-15",
    "influencerName": "prachitaranshofficial",
    "campaignName": "FF Regular Activity",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "IG Reel",
    "views": 16600,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Imported from FF Regular Influencer Activity.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-0",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger Sound",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-01-06",
    "postLink": "https://www.instagram.com/reel/DTKxiUEjwzA/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 14645,
    "likes": 375,
    "comments": 17,
    "shares": 69,
    "saves": 36,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger Sound. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-1",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger Sound",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-01-06",
    "postLink": "https://www.facebook.com/share/r/1G4hoAgmnx/",
    "views": 5019,
    "likes": 96,
    "comments": 8,
    "shares": 2,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger Sound. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-2",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger Sound",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "2026-01-06",
    "postLink": "https://youtube.com/shorts/_2zwqOHGI-4?si=Y0EcuCssFd0uYegm",
    "views": 4644,
    "likes": 97,
    "comments": 1,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger Sound. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-3",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger Billy",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "2026-01-09",
    "postLink": "https://www.instagram.com/reel/DTSp7UsjCvq/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 354317,
    "likes": 14295,
    "comments": 173,
    "shares": 487,
    "saves": 745,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger Billy. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-4",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger Billy",
    "platform": "Facebook",
    "contentType": "Instagram Post",
    "postDate": "2026-01-09",
    "postLink": "https://www.facebook.com/share/r/1HexxCJKsN/",
    "views": 1326,
    "likes": 29,
    "comments": 4,
    "shares": 2,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger Billy. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-5",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger Billy",
    "platform": "YouTube",
    "contentType": "Instagram Post",
    "postDate": "2026-01-10",
    "postLink": "https://youtube.com/shorts/WumrDeBuAzs?si=QvZrhJfazWozpex5",
    "views": 2595,
    "likes": 106,
    "comments": 5,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger Billy. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-6",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Kai po che",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-01-13",
    "postLink": "https://www.instagram.com/reel/DTc94ANACCH/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 9124,
    "likes": 159,
    "comments": 4,
    "shares": 16,
    "saves": 6,
    "spend": 0,
    "notes": "Brand-owned content, theme: Kai po che. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-7",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Kai po che",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-01-13",
    "postLink": "https://www.facebook.com/share/r/1CJNpTArmN/",
    "views": 1705,
    "likes": 23,
    "comments": 0,
    "shares": 1,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Kai po che. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-8",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Kai po che",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "2026-01-13",
    "postLink": "https://youtube.com/shorts/QAIKeoZX0sU?si=d7zuc09jnMFIOhhk",
    "views": 1673,
    "likes": 39,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Kai po che. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-9",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Da's Joke",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-01-15",
    "postLink": "https://www.instagram.com/reel/DTiJGNNjEqI/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 10628,
    "likes": 204,
    "comments": 12,
    "shares": 22,
    "saves": 13,
    "spend": 0,
    "notes": "Brand-owned content, theme: Da's Joke. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-10",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Da's Joke",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-01-15",
    "postLink": "https://www.facebook.com/share/r/1HmcC88vY3/",
    "views": 2294,
    "likes": 20,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Da's Joke. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-11",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Factory Reel",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-01-19",
    "postLink": "https://www.instagram.com/reel/DTsa5BYD_Fc/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 9034,
    "likes": 244,
    "comments": 16,
    "shares": 35,
    "saves": 11,
    "spend": 0,
    "notes": "Brand-owned content, theme: Factory Reel. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-12",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Factory Reel",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-01-19",
    "postLink": "https://www.facebook.com/share/r/17pQphiMpJ/",
    "views": 2207,
    "likes": 32,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Factory Reel. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-13",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Factory Reel",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "2026-01-19",
    "postLink": "https://youtube.com/shorts/D9zrKUrDk_U?si=aysUVrUEgLF7_d29",
    "views": 5447,
    "likes": 10,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Factory Reel. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-14",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "South Trend Theme",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-01-22",
    "postLink": "https://www.instagram.com/reel/DT0IJlqDTUq/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 9025,
    "likes": 151,
    "comments": 7,
    "shares": 25,
    "saves": 14,
    "spend": 0,
    "notes": "Brand-owned content, theme: South Trend Theme. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-15",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "South Trend Theme",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-01-22",
    "postLink": "https://www.facebook.com/share/r/1C63XbL5yY/",
    "views": 2081,
    "likes": 22,
    "comments": 2,
    "shares": 2,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: South Trend Theme. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-16",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Doodle V3 Review",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "2026-01-23",
    "postLink": "https://www.instagram.com/reel/DT12628k8S0/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 70767,
    "likes": 1670,
    "comments": 50,
    "shares": 127,
    "saves": 93,
    "spend": 0,
    "notes": "Brand-owned content, theme: Doodle V3 Review. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-17",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger Off Road",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "2026-01-24",
    "postLink": "https://www.instagram.com/reel/DT5L5YEkiTb/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 47063,
    "likes": 1835,
    "comments": 16,
    "shares": 115,
    "saves": 71,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger Off Road. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-18",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Republic Day",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "2026-01-26",
    "postLink": "https://www.instagram.com/reel/DT9ZRGHk2Oo/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 166514,
    "likes": 5941,
    "comments": 72,
    "shares": 80,
    "saves": 156,
    "spend": 0,
    "notes": "Brand-owned content, theme: Republic Day. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-19",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Zero Civic Sense",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-01-27",
    "postLink": "https://www.instagram.com/reel/DUA-sIxDPHA/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 21531,
    "likes": 303,
    "comments": 18,
    "shares": 45,
    "saves": 15,
    "spend": 0,
    "notes": "Brand-owned content, theme: Zero Civic Sense. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-20",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Zero Civic Sense",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-01-27",
    "postLink": "https://www.facebook.com/share/r/1KoRMFYnWt/",
    "views": 4418,
    "likes": 30,
    "comments": 2,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Zero Civic Sense. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-21",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger Off Road",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "2026-01-30",
    "postLink": "https://www.instagram.com/reel/DUIo0AFkf-w/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 96206,
    "likes": 2823,
    "comments": 23,
    "shares": 125,
    "saves": 71,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger Off Road. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-22",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Kuppam Guineess world Record",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "2026-01-31",
    "postLink": "https://www.instagram.com/p/DULhATskg8O/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 51402,
    "likes": 1038,
    "comments": 61,
    "shares": 176,
    "saves": 39,
    "spend": 0,
    "notes": "Brand-owned content, theme: Kuppam Guineess world Record. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-23",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Kuppam Guineess world Record",
    "platform": "Facebook",
    "contentType": "Instagram Post",
    "postDate": "2026-01-31",
    "postLink": "https://www.facebook.com/share/p/1b7Lc3Gcg4/",
    "views": 10126,
    "likes": 84,
    "comments": 11,
    "shares": 13,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Kuppam Guineess world Record. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-24",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Carousel Kuppam Post",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "2026-02-04",
    "postLink": "https://www.instagram.com/p/DUVs1j3jOrg/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 51539,
    "likes": 907,
    "comments": 45,
    "shares": 42,
    "saves": 14,
    "spend": 0,
    "notes": "Brand-owned content, theme: Carousel Kuppam Post. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-25",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Carousel Kuppam Post",
    "platform": "Facebook",
    "contentType": "Instagram Post",
    "postDate": "2026-02-04",
    "postLink": "https://www.facebook.com/share/p/1GXswpRXZr/",
    "views": 4425,
    "likes": 47,
    "comments": 4,
    "shares": 7,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Carousel Kuppam Post. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-26",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Kuppam Full Video",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-02-06",
    "postLink": "https://www.instagram.com/reel/DUajbsYAaQl/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 7838,
    "likes": 286,
    "comments": 18,
    "shares": 38,
    "saves": 6,
    "spend": 0,
    "notes": "Brand-owned content, theme: Kuppam Full Video. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-27",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Kuppam Full Video",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-02-06",
    "postLink": "https://www.facebook.com/share/v/1BeweqsZU7/",
    "views": 1081,
    "likes": 32,
    "comments": 4,
    "shares": 5,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Kuppam Full Video. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-28",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Kuppam Full Video",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "2026-02-06",
    "postLink": "https://youtu.be/W54w9RN5QdI?si=mkJIHElUDa37eYQv",
    "views": 2379,
    "likes": 100,
    "comments": 10,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Kuppam Full Video. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-29",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Peepoye Kuppam Collab",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-02-10",
    "postLink": "https://www.instagram.com/reel/DUk2lYiElCL/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 7499,
    "likes": 206,
    "comments": 10,
    "shares": 22,
    "saves": 8,
    "spend": 0,
    "notes": "Brand-owned content, theme: Peepoye Kuppam Collab. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-30",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Gaurav Kuppam Collab",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-02-11",
    "postLink": "https://www.instagram.com/reel/DUnyKq_DRFn/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 50669,
    "likes": 3049,
    "comments": 33,
    "shares": 626,
    "saves": 157,
    "spend": 0,
    "notes": "Brand-owned content, theme: Gaurav Kuppam Collab. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-31",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Valentine Reel",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-02-13",
    "postLink": "https://www.instagram.com/reel/DUsmUCSDB3N/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 7497,
    "likes": 168,
    "comments": 20,
    "shares": 52,
    "saves": 6,
    "spend": 0,
    "notes": "Brand-owned content, theme: Valentine Reel. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-32",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Valentine Reel",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-02-13",
    "postLink": "https://www.facebook.com/share/r/186t2iBDwz/",
    "views": 567,
    "likes": 7,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Valentine Reel. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-33",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Valentine 3D",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-02-14",
    "postLink": "https://www.instagram.com/reel/DUuLx3ajBlD/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 6052,
    "likes": 188,
    "comments": 9,
    "shares": 32,
    "saves": 5,
    "spend": 0,
    "notes": "Brand-owned content, theme: Valentine 3D. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-34",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Valentine 3D",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-02-14",
    "postLink": "https://www.facebook.com/share/r/1CUUVgEoCJ/",
    "views": 1346,
    "likes": 36,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Valentine 3D. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-35",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Valentine 3D",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "2026-02-14",
    "postLink": "https://youtube.com/shorts/m_SI1Z-UZMw?si=4hmF-jubyeETUBLF",
    "views": 3479,
    "likes": 124,
    "comments": 6,
    "shares": 5,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Valentine 3D. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-36",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "IKF Video",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-02-15",
    "postLink": "https://www.instagram.com/reel/DUxuaNbjM40/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 3190,
    "likes": 123,
    "comments": 2,
    "shares": 13,
    "saves": 4,
    "spend": 0,
    "notes": "Brand-owned content, theme: IKF Video. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-37",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "IKF Video",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-02-15",
    "postLink": "https://www.facebook.com/share/r/17YfRUQvEy/",
    "views": 1067,
    "likes": 21,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: IKF Video. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-38",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "IKF Video",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "2026-02-15",
    "postLink": "https://youtube.com/shorts/yJy6wN0H2a0?si=iIw5XSHPpM4NCfe2",
    "views": 7969,
    "likes": 158,
    "comments": 8,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: IKF Video. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-39",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "You are this close",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "2026-02-16",
    "postLink": "https://www.instagram.com/p/DU0Z6IzDCtO/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 5353,
    "likes": 52,
    "comments": 8,
    "shares": 12,
    "saves": 1,
    "spend": 0,
    "notes": "Brand-owned content, theme: You are this close. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-40",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "I have two moods",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "2026-02-18",
    "postLink": "https://www.instagram.com/p/DU5lFlLjKHc/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 8614,
    "likes": 149,
    "comments": 10,
    "shares": 14,
    "saves": 11,
    "spend": 0,
    "notes": "Brand-owned content, theme: I have two moods. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-41",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "I have two moods",
    "platform": "Facebook",
    "contentType": "Instagram Post",
    "postDate": "2026-02-18",
    "postLink": "https://www.facebook.com/share/p/1FGBWREaRS/",
    "views": 447,
    "likes": 8,
    "comments": 0,
    "shares": 1,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: I have two moods. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-42",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger New Colour",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-02-20",
    "postLink": "https://www.instagram.com/reel/DU-mPtggk0c/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 13530,
    "likes": 193,
    "comments": 10,
    "shares": 37,
    "saves": 14,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger New Colour. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-43",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger New Colour",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-02-20",
    "postLink": "https://www.facebook.com/share/r/18Ly6s27mY/",
    "views": 1600,
    "likes": 29,
    "comments": 2,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger New Colour. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-44",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger New Colour",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "2026-02-20",
    "postLink": "https://youtu.be/zgLI-uGcBR0?si=_rkVTjbJ11erD4oM",
    "views": 368,
    "likes": 9,
    "comments": 4,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger New Colour. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-45",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ranger New Colour",
    "platform": "X",
    "contentType": "YouTube Video",
    "postDate": "2026-02-20",
    "postLink": "https://x.com/e_motorad/status/2024808600129183930?s=20",
    "views": 145,
    "likes": 4,
    "comments": 0,
    "shares": 1,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ranger New Colour. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-46",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Cahlte Firte Influencer",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-02-21",
    "postLink": "https://www.instagram.com/reel/DVBK35PCAdp/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 24533726,
    "likes": 447265,
    "comments": 2500,
    "shares": 62692,
    "saves": 13569,
    "spend": 0,
    "notes": "Brand-owned content, theme: Cahlte Firte Influencer. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-47",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Bottle spin",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "2026-02-23",
    "postLink": "https://www.instagram.com/reel/DVGb76qET4u/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 11253,
    "likes": 168,
    "comments": 9,
    "shares": 26,
    "saves": 16,
    "spend": 0,
    "notes": "Brand-owned content, theme: Bottle spin. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-48",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Bottle spin",
    "platform": "Facebook",
    "contentType": "Reel",
    "postDate": "2026-02-23",
    "postLink": "https://www.facebook.com/share/r/1HCJNPaUqy/",
    "views": 1673,
    "likes": 11,
    "comments": 0,
    "shares": 1,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Bottle spin. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-49",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Bottle spin",
    "platform": "YouTube",
    "contentType": "YouTube Video",
    "postDate": "2026-02-23",
    "postLink": "https://youtube.com/shorts/fsmiKRUar4g?si=sQ1_kMTbYm-AhNjo",
    "views": 13698,
    "likes": 42,
    "comments": 3,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Bottle spin. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-50",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Customer UGC Post",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "2026-02-26",
    "postLink": "https://www.instagram.com/p/DVOEzPPjKmQ/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 10588,
    "likes": 210,
    "comments": 2,
    "shares": 7,
    "saves": 10,
    "spend": 0,
    "notes": "Brand-owned content, theme: Customer UGC Post. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-51",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Customer UGC Post",
    "platform": "Facebook",
    "contentType": "Instagram Post",
    "postDate": "2026-02-26",
    "postLink": "https://www.facebook.com/share/p/14Y6njwx7Y1/",
    "views": 2339,
    "likes": 17,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Brand-owned content, theme: Customer UGC Post. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "brandimp-52",
    "influencerName": "EMotorad (Brand Channel)",
    "campaignName": "Ever been fired?",
    "platform": "Instagram",
    "contentType": "Instagram Post",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DVTZkD3kv1H/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==",
    "views": 85600,
    "likes": 4712,
    "comments": 126,
    "shares": 785,
    "saves": 173,
    "spend": 0,
    "notes": "Brand-owned content, theme: Ever been fired?. Imported from Content Performance sheet.",
    "createdAt": "2026-09-11T12:39:47.715646"
  },
  {
    "id": "rangerperfinp-8",
    "influencerName": "EPIC MEMES",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMITRcaNi_T/?utm_source=ig_web_copy_link&igsh=cWNocHV6a2p0Y2do",
    "views": 2664,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-9",
    "influencerName": "epic.sarcasm",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMITG7LMonp/?utm_source=ig_web_copy_link&igsh=MTFzdjh6OG8ydTd1ag==",
    "views": 647,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-10",
    "influencerName": "Ultra legend memer",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMIS3D_swlv/?utm_source=ig_web_copy_link&igsh=a2Y2OGx2c295dDds",
    "views": 2100,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-11",
    "influencerName": "okayurbroken",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMITBANM2vk/?utm_source=ig_web_copy_link&igsh=bW10ZGE0cDMzemln",
    "views": 676,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-14",
    "influencerName": "laughtercolours",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNfm07t66k/?utm_source=ig_web_copy_link&igsh=MTVqaTQycHU5cnRqdA==",
    "views": 218000,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-15",
    "influencerName": "NAGARPALIKA MEMES",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNz3-7vfWk/?utm_source=ig_web_copy_link&igsh=dDVvbHVmd2cwbXZk",
    "views": 78200,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-16",
    "influencerName": "desithuglife",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNbVoSp8VI/?utm_source=ig_web_copy_link&igsh=dmIwMzhjbDdjMmhn",
    "views": 6788,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-17",
    "influencerName": "Naughty Duniya",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNdj5OPZwy/?igsh=N3FmYnp4ZnZtb25t\n",
    "views": 4157,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-18",
    "influencerName": "Dosti aur pyarr",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNcJbhSUhk/?igsh=MWM2dnhzN2Vqa2drYg==",
    "views": 3887,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-19",
    "influencerName": "Ghantareel",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNdZo0T3w7/?igsh=MTQzNmJpNGNsb",
    "views": 8170,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-20",
    "influencerName": "Desitroll.In",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNetphzuLt/?igsh=MTQ5aThkd",
    "views": 14800,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-21",
    "influencerName": "Viralvicharr",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNfVE3p9AQ/?igsh=MTg0cjB1emRsa2tscQ==",
    "views": 2814,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-22",
    "influencerName": "Flirtygrram",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNeLvOT0Iy/?igsh=MW42ajR1OHYzcmlweA==",
    "views": 3755,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-23",
    "influencerName": "Baba.ji.officiial",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNdU-hxKSy/?igsh=MTNoNDhiZngwbGxlbA==",
    "views": 2253,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-24",
    "influencerName": "Funnycartoon0o",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNhd9dhxH-/?igsh=em9ucWtydjYxYWph",
    "views": 14600,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-25",
    "influencerName": "Motivational man",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNdOpqSvKe/?igsh=MXdqNWQwMGxiNDdmbA==",
    "views": 6033,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-26",
    "influencerName": "Cartoon famly",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNe6Xez0oF/?igsh=MTJycWd2ZTVtMDMxYQ==",
    "views": 4398,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-27",
    "influencerName": "Yobros.In",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNck-CxLXD/?igsh=ODZ3bTJ1NHowM3Zq",
    "views": 3460,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-28",
    "influencerName": "Dostiyariii",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNfOq2PG2s/?igsh=MWwzdXV3Z3RoZnFleA==",
    "views": 1329,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-29",
    "influencerName": "Laughtergram",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNeZzdRy0Y/?igsh=MTZybDhhM2czYTE2dQ==",
    "views": 890,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-30",
    "influencerName": "Cartoon media",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNdJxtzVVM/?igsh=MWQ5NnZ5d3R4dzhpZA==",
    "views": 7792,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-31",
    "influencerName": "Dreamcartoon5",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNgo7-zMy5/?igsh=MTA5YXJnZ3V0OGtpZA==",
    "views": 1913,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-32",
    "influencerName": "Timepass",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNfstjhE1_/?igsh=MWx3NnIwbWFpMGpoNw==",
    "views": 7271,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-33",
    "influencerName": "Tomnjerry_videos_",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNg3SayiGu/?igsh=MXRibm02bmpkNnB0NQ==",
    "views": 3344,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-34",
    "influencerName": "Tom_jerry_fanny2",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNhPMcygUG/?igsh=cTQwOTdlM3k4dmYw",
    "views": 1275,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-35",
    "influencerName": "Tomandjerry.fandom",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNhnfjJSy5/?igsh=Nzd3OGpqaXpoN2Nl",
    "views": 2457,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-36",
    "influencerName": "Tomnjerry.Videos",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNgZZ7yEok/?igsh=Z2c0Y3J3bzVxNXI=",
    "views": 1074,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-37",
    "influencerName": "Tomjerrymemes8",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNgJZEyPbM/?igsh=bzAxaW43c292NW51",
    "views": 925,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-38",
    "influencerName": "Ghantaflix",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNeRZDzgb5/?igsh=aGoweGNvdmZ2cHlw",
    "views": 739,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  },
  {
    "id": "rangerperfinp-39",
    "influencerName": "Naughtyduniya",
    "campaignName": "Ranger Pre-Buzz Seeding",
    "platform": "Instagram",
    "contentType": "Reel",
    "postDate": "",
    "postLink": "https://www.instagram.com/reel/DMNelCzTOsI/?igsh=NDV1Y3JkNW4yNnpr",
    "views": 1838,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "spend": 0,
    "notes": "Ranger pre-buzz meme-page seeding post. Imported from Ranger Seeding sheet.",
    "createdAt": "2026-09-11T13:08:13.436780"
  }
]

const SEED_SALES = [
  {
    "id": "salesimp-2",
    "promoCode": "001NEERAJ",
    "influencerName": "",
    "ordersCount": 17,
    "revenue": 719484,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-22",
    "promoCode": "NEWTUBER",
    "influencerName": "",
    "ordersCount": 12,
    "revenue": 446988,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-3",
    "promoCode": "001SHUBH",
    "influencerName": "",
    "ordersCount": 9,
    "revenue": 346504,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-19",
    "promoCode": "BLUERIDER",
    "influencerName": "",
    "ordersCount": 7,
    "revenue": 338993,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-27",
    "promoCode": "PRTECHS",
    "influencerName": "",
    "ordersCount": 4,
    "revenue": 200495,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-18",
    "promoCode": "ARJUNTECH",
    "influencerName": "",
    "ordersCount": 4,
    "revenue": 141996,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-24",
    "promoCode": "NY1000",
    "influencerName": "",
    "ordersCount": 3,
    "revenue": 139293,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-31",
    "promoCode": "TRAVELANDTECH",
    "influencerName": "",
    "ordersCount": 2,
    "revenue": 108998,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-10",
    "promoCode": "01KSN",
    "influencerName": "",
    "ordersCount": 2,
    "revenue": 91498,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-11",
    "promoCode": "01MANIAC",
    "influencerName": "",
    "ordersCount": 3,
    "revenue": 86997,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-15",
    "promoCode": "01SUVAN",
    "influencerName": "",
    "ordersCount": 2,
    "revenue": 70498,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-4",
    "promoCode": "01ADITYA",
    "influencerName": "",
    "ordersCount": 2,
    "revenue": 69498,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-13",
    "promoCode": "01SHUBH",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 66999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-16",
    "promoCode": "01WHEELS",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 57197,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-7",
    "promoCode": "01CRUISER",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 56999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-28",
    "promoCode": "SOCIAL",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 56999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-0",
    "promoCode": "001AKASH",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 55999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-6",
    "promoCode": "01AMAN",
    "influencerName": "",
    "ordersCount": 2,
    "revenue": 55998,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-29",
    "promoCode": "TECHRIDER",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 54999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-12",
    "promoCode": "01RANJITH",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 50598,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-32",
    "promoCode": "VEDDUBEY",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 49999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-9",
    "promoCode": "01IMRAN",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 49999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-26",
    "promoCode": "PRTECH",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 49999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-23",
    "promoCode": "NIKHIL1000",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 49999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-21",
    "promoCode": "GTTECH1000",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 49999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-17",
    "promoCode": "ANUBHAV100",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 37999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-20",
    "promoCode": "GEARUPDATE",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 37999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-30",
    "promoCode": "THROTTLER",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 37999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-14",
    "promoCode": "01SURAJ",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 36246,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-1",
    "promoCode": "001DRDRIVE",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 32999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-5",
    "promoCode": "01AKASH",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 28499,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-25",
    "promoCode": "ONAM",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 28000,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  },
  {
    "id": "salesimp-8",
    "promoCode": "01FUEL",
    "influencerName": "",
    "ordersCount": 1,
    "revenue": 27999,
    "month": "",
    "notes": "Imported from Sales Tracking sheet. Assign the influencer this promo code belongs to."
  }
];

// ---------- helpers ----------

function engagementRate(entry) {
  const eng =
    (Number(entry.likes) || 0) +
    (Number(entry.comments) || 0) +
    (Number(entry.shares) || 0) +
    (Number(entry.saves) || 0);
  const views = Number(entry.views) || 0;
  if (views === 0) return 0;
  return (eng / views) * 100;
}

function monthLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function emptyPerformanceDraft() {
  return {
    id: null,
    influencerName: "",
    useOther: false,
    campaignName: "",
    platform: PLATFORMS[0],
    contentType: CONTENT_TYPES[0],
    postDate: daysFromNow(0),
    postLink: "",
    views: "",
    likes: "",
    comments: "",
    shares: "",
    saves: "",
    spend: "",
    notes: "",
  };
}

function emptySaleDraft() {
  return {
    id: null,
    promoCode: "",
    influencerName: "",
    useOther: false,
    ordersCount: "",
    revenue: "",
    month: "",
    notes: "",
  };
}

// ---------- main component ----------

function EMotoradPerformanceDashboard() {
  const [entries, setEntries] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);
  const [crmInfluencers, setCrmInfluencers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [payments, setPayments] = useState([]);
  const [salesTracking, setSalesTracking] = useState([]);
  const [monthlyTrackingRecords, setMonthlyTrackingRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(emptyPerformanceDraft());
  const [isNew, setIsNew] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState("");

  const [entryFilterMonths, setEntryFilterMonths] = useState([]);
  const [entryCustomRange, setEntryCustomRange] = useState({ start: "", end: "" });

  const [saleDrawerOpen, setSaleDrawerOpen] = useState(false);
  const [saleDraft, setSaleDraft] = useState(emptySaleDraft());
  const [isNewSale, setIsNewSale] = useState(true);
  const [confirmDeleteSale, setConfirmDeleteSale] = useState(false);

  // load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      let loadedEntries = null;
      let loadedSales = null;
      let loadedInfluencers = null;
      let loadedCampaigns = null;
      let loadedPayments = null;
      try {
        const r = await window.storage.get(PERFORMANCE_KEY, true);
        if (r && r.value) loadedEntries = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(SALES_KEY, true);
        if (r && r.value) loadedSales = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(INFLUENCERS_KEY, true);
        if (r && r.value) loadedInfluencers = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(CAMPAIGNS_KEY, true);
        if (r && r.value) loadedCampaigns = JSON.parse(r.value);
      } catch (e) {}
      try {
        const r = await window.storage.get(PAYMENTS_KEY, true);
        if (r && r.value) loadedPayments = JSON.parse(r.value);
      } catch (e) {}
      let loadedSalesTracking = null;
      try {
        const r = await window.storage.get(SALES_TRACKING_KEY, true);
        if (r && r.value) loadedSalesTracking = JSON.parse(r.value);
      } catch (e) {}
      let loadedMonthlyTracking = null;
      try {
        const r = await window.storage.get(MONTHLY_TRACKING_KEY, true);
        if (r && r.value) loadedMonthlyTracking = JSON.parse(r.value);
      } catch (e) {}
      if (cancelled) return;
      if (loadedEntries) {
        setEntries(loadedEntries);
      } else {
        setEntries(SEED_ENTRIES);
        try {
          await window.storage.set(PERFORMANCE_KEY, JSON.stringify(SEED_ENTRIES), true);
        } catch (e) {}
      }
      if (loadedSales) {
        setSalesRecords(loadedSales);
      } else {
        setSalesRecords(SEED_SALES);
        try {
          await window.storage.set(SALES_KEY, JSON.stringify(SEED_SALES), true);
        } catch (e) {}
      }
      setCrmInfluencers(loadedInfluencers || []);
      if (loadedCampaigns) {
        setCampaigns(loadedCampaigns);
      } else {
        setCampaigns(SEED_CAMPAIGNS);
        try {
          await window.storage.set(CAMPAIGNS_KEY, JSON.stringify(SEED_CAMPAIGNS), true);
        } catch (e) {}
      }
      if (loadedPayments) {
        setPayments(loadedPayments);
      } else {
        setPayments(SEED_PAYMENTS);
        try {
          await window.storage.set(PAYMENTS_KEY, JSON.stringify(SEED_PAYMENTS), true);
        } catch (e) {}
      }
      if (loadedSalesTracking) {
        setSalesTracking(loadedSalesTracking);
      } else {
        setSalesTracking(SEED_SALES_TRACKING);
        try {
          await window.storage.set(SALES_TRACKING_KEY, JSON.stringify(SEED_SALES_TRACKING), true);
        } catch (e) {}
      }
      if (loadedMonthlyTracking) {
        setMonthlyTrackingRecords(loadedMonthlyTracking);
      } else {
        setMonthlyTrackingRecords(SEED_MONTHLY_TRACKING);
        try {
          await window.storage.set(MONTHLY_TRACKING_KEY, JSON.stringify(SEED_MONTHLY_TRACKING), true);
        } catch (e) {}
      }
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next) => {
    setEntries(next);
    try {
      const res = await window.storage.set(PERFORMANCE_KEY, JSON.stringify(next), true);
      if (!res) showToast("Couldn't save — try again");
    } catch (e) {
      showToast("Couldn't save — try again");
    }
  }, []);

  const persistSales = useCallback(async (next) => {
    setSalesRecords(next);
    try {
      const res = await window.storage.set(SALES_KEY, JSON.stringify(next), true);
      if (!res) showToast("Couldn't save — try again");
    } catch (e) {
      showToast("Couldn't save — try again");
    }
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  // ---------- derived data ----------

  // Monthly Tracking is the authoritative log for per-post data going forward —
  // merge it in here (read-only) so Overview/Leaderboard reflect it without
  // needing the same content logged twice. The single Month filter below
  // applies to this combined set, so Overview, Leaderboard, and Entries all
  // stay in sync with whatever month(s) are selected.
  const combinedEntries = useMemo(() => {
    const fromTracking = monthlyTrackingRecords.map((r) => ({
      influencerName: r.influencerName,
      campaignName: r.campaignName,
      platform: r.platform,
      contentType: r.contentType,
      postDate: r.date,
      postLink: r.contentLink,
      views: r.views,
      reach: r.reach,
      likes: r.likes,
      comments: r.comments,
      shares: r.shares,
      saves: r.saves,
      spend: r.spend || 0,
    }));
    // Deliverables in Campaigns with Views/Comments/Cost filled in count too
    // (dated by due date) — as long as the same post isn't also logged in
    // Monthly Tracking, to avoid counting it twice.
    const fromDeliverables = [];
    (campaigns || []).forEach((c) => {
      (c.deliverables || []).forEach((d) => {
        if (d.views || d.likes || d.comments || d.cost) {
          fromDeliverables.push({
            _links: d.postLinks || [],
            influencerName: d.influencerName,
            campaignName: c.name,
            platform: "",
            contentType: (d.contentTypes || []).join(", "),
            postDate: d.dueDate,
            postLink: (d.postLinks || [])[0] || "",
            views: d.views || 0,
            reach: 0,
            likes: d.likes || 0,
            comments: d.comments || 0,
            shares: 0,
            saves: 0,
            spend: d.cost || 0,
          });
        }
      });
    });
    // Monthly Tracking is the main log, so it's counted first; anything in
    // Performance's own entries or in a deliverable that is the same post is
    // skipped rather than added again.
    const seen = new Set();
    fromTracking.forEach((t) => postKeys(t.postLink, t.influencerName, t.postDate, t.views).forEach((k) => seen.add(k)));
    const ownEntries = keepNewPosts(entries, seen, (e) => postKeys(e.postLink, e.influencerName, e.postDate, e.views));
    const newDeliverables = keepNewPosts(fromDeliverables, seen, (d) =>
      [...d._links.map(postLinkKey).filter(Boolean), postFingerprint(d.influencerName, d.postDate, d.views)].filter(Boolean)
    );
    return [...ownEntries, ...fromTracking, ...newDeliverables];
  }, [entries, monthlyTrackingRecords, campaigns]);

  const monthFilteredEntries = useMemo(() => {
    return combinedEntries.filter((e) => {
      if (!inSelectedMonths(e.postDate, entryFilterMonths)) return false;
      if (!inCustomRange(e.postDate, entryCustomRange.start, entryCustomRange.end)) return false;
      return true;
    });
  }, [combinedEntries, entryFilterMonths, entryCustomRange]);

  const globalStats = useMemo(() => {
    const totalViews = monthFilteredEntries.reduce((s, e) => s + (Number(e.views) || 0), 0);
    const totalReach = monthFilteredEntries.reduce((s, e) => s + (Number(e.reach) || 0), 0);
    const totalEngagement = monthFilteredEntries.reduce(
      (s, e) => s + (Number(e.likes) || 0) + (Number(e.comments) || 0) + (Number(e.shares) || 0),
      0
    );
    const totalSpend = monthFilteredEntries.reduce((s, e) => s + (Number(e.spend) || 0), 0);
    const avgEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;
    const totalInfluencers = new Set(monthFilteredEntries.map((e) => e.influencerName).filter(Boolean)).size;
    const cpv = totalViews > 0 && totalSpend > 0 ? totalSpend / totalViews : null;
    return { totalViews, totalReach, totalEngagement, totalSpend, avgEngagementRate, totalInfluencers, cpv };
  }, [monthFilteredEntries]);

  // Revenue via Promo Codes, scoped to the selected month(s) — sourced from
  // Sales (dated orders), the same source Monthly Trends already uses, so
  // this stays consistent with the rest of the dashboard.
  const monthlySalesRevenue = useMemo(() => {
    return salesTracking
      .filter((s) => inSelectedMonths(s.orderDate, entryFilterMonths) && inCustomRange(s.orderDate, entryCustomRange.start, entryCustomRange.end))
      .reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  }, [salesTracking, entryFilterMonths, entryCustomRange]);

  // "ONAM", "Onam" and "onam " are one campaign. Show the name as it's
  // written in Campaigns when it exists there, otherwise the most-used spelling.
  const campaignLabelFor = useMemo(() => {
    const variants = {};
    combinedEntries.forEach((e) => {
      const n = String(e.campaignName || "").trim();
      const k = campaignKey(n);
      if (!k) return;
      variants[k] = variants[k] || {};
      variants[k][n] = (variants[k][n] || 0) + 1;
    });
    const labels = {};
    Object.keys(variants).forEach((k) => {
      const fromCampaigns = (campaigns || []).find((c) => campaignKey(c.name) === k);
      labels[k] = fromCampaigns
        ? fromCampaigns.name
        : Object.entries(variants[k]).sort((a, b) => b[1] - a[1])[0][0];
    });
    return (name) => {
      const n = String(name || "").trim();
      if (!n) return "Unlinked";
      return labels[campaignKey(n)] || n;
    };
  }, [combinedEntries, campaigns]);

  const campaignResults = useMemo(() => {
    const map = {};
    monthFilteredEntries.forEach((e) => {
      const key = campaignLabelFor(e.campaignName);
      if (!map[key]) map[key] = { campaignName: key, views: 0, reach: 0, engagement: 0, spend: 0, posts: 0 };
      map[key].views += Number(e.views) || 0;
      map[key].reach += Number(e.reach) || 0;
      map[key].engagement += (Number(e.likes) || 0) + (Number(e.comments) || 0) + (Number(e.shares) || 0);
      map[key].spend += Number(e.spend) || 0;
      map[key].posts += 1;
    });
    return Object.values(map).sort((a, b) => b.views - a.views);
  }, [monthFilteredEntries, campaignLabelFor]);

  const campaignChartData = useMemo(() => {
    const map = {};
    monthFilteredEntries.forEach((e) => {
      const key = campaignLabelFor(e.campaignName);
      map[key] = (map[key] || 0) + (Number(e.views) || 0);
    });
    return Object.entries(map)
      .map(([name, views]) => ({ name, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 6);
  }, [monthFilteredEntries, campaignLabelFor]);

  const trendChartData = useMemo(() => {
    const map = {};
    monthFilteredEntries.forEach((e) => {
      const key = monthKey(e.postDate);
      if (!isPlausibleMonthKey(key)) return;
      map[key] = (map[key] || 0) + (Number(e.views) || 0);
    });
    return Object.keys(map)
      .sort()
      .map((key) => ({ month: monthLabelFromKey(key), views: map[key] }));
  }, [monthFilteredEntries]);

  const leaderboard = useMemo(() => {
    const map = {};
    monthFilteredEntries.forEach((e) => {
      const name = e.influencerName;
      if (!map[name]) map[name] = { influencerName: name, views: 0, engagement: 0, posts: 0, spend: 0 };
      map[name].views += Number(e.views) || 0;
      map[name].engagement += (Number(e.likes) || 0) + (Number(e.comments) || 0) + (Number(e.shares) || 0);
      map[name].posts += 1;
      map[name].spend += Number(e.spend) || 0;
    });
    return Object.values(map)
      .map((r) => ({
        ...r,
        engagementRate: r.views > 0 ? (r.engagement / r.views) * 100 : 0,
        cpm: r.views > 0 && r.spend > 0 ? (r.spend / r.views) * 1000 : null,
      }))
      .sort((a, b) => b.views - a.views);
  }, [monthFilteredEntries]);

  // Same shape as the monthly leaderboard above, but across all-time
  // combinedEntries (ignores the month filter) — used for "Top performers,
  // overall" so it stays a fixed reference point regardless of which month
  // is selected.
  const overallLeaderboard = useMemo(() => {
    const map = {};
    combinedEntries.forEach((e) => {
      const name = e.influencerName;
      if (!map[name]) map[name] = { influencerName: name, views: 0, engagement: 0, posts: 0, spend: 0 };
      map[name].views += Number(e.views) || 0;
      map[name].engagement += (Number(e.likes) || 0) + (Number(e.comments) || 0) + (Number(e.shares) || 0);
      map[name].posts += 1;
      map[name].spend += Number(e.spend) || 0;
    });
    return Object.values(map)
      .map((r) => ({
        ...r,
        engagementRate: r.views > 0 ? (r.engagement / r.views) * 100 : 0,
      }))
      .sort((a, b) => b.views - a.views);
  }, [combinedEntries]);

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => new Date(b.postDate) - new Date(a.postDate)),
    [entries]
  );

  const entryAvailableMonths = useMemo(() => {
    const set = new Set(combinedEntries.map((e) => monthKey(e.postDate)).filter(isPlausibleMonthKey));
    return Array.from(set).sort();
  }, [combinedEntries]);

  const filteredEntries = useMemo(() => {
    return sortedEntries.filter((e) => {
      if (!inSelectedMonths(e.postDate, entryFilterMonths)) return false;
      if (!inCustomRange(e.postDate, entryCustomRange.start, entryCustomRange.end)) return false;
      return true;
    });
  }, [sortedEntries, entryFilterMonths, entryCustomRange]);

  function exportEntries() {
    const headers = [
      "Influencer", "Campaign", "Platform", "Content Type", "Post Date", "Post Link",
      "Views", "Likes", "Comments", "Shares", "Saves", "Spend", "Notes",
    ];
    const rows = filteredEntries.map((e) => [
      e.influencerName, e.campaignName, e.platform, e.contentType, e.postDate, e.postLink,
      e.views, e.likes, e.comments, e.shares, e.saves, e.spend, e.notes,
    ]);
    const label = entryFilterMonths.length > 0
      ? entryFilterMonths.map(monthLabelFromKey).join("_").replace(/\s+/g, "-")
      : "all";
    downloadCSV(`performance-entries_${label}.csv`, headers, rows);
  }

  const monthlyTrends = useMemo(() => {
    const map = {};
    function bucket(key) {
      if (!map[key]) {
        map[key] = {
          key,
          spend: 0,
          influencersClosed: new Set(),
          campaigns: new Set(),
          videos: 0,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          salesOrders: 0,
          salesRevenue: 0,
        };
      }
      return map[key];
    }
    // Monthly Influencer has been removed — influencers, campaigns, and
    // videos/content now come entirely from Monthly Tracking, the single
    // per-post log. "Influencers closed" here means any influencer with
    // tracked content live that month.
    monthlyTrackingRecords.forEach((r) => {
      const key = monthKey(r.date);
      if (!isPlausibleMonthKey(key)) return;
      const b = bucket(key);
      if (r.influencerName) b.influencersClosed.add(r.influencerName);
      if (r.campaignName) b.campaigns.add(r.campaignName);
      b.videos += 1;
      b.views += Number(r.views) || 0;
      b.likes += Number(r.likes) || 0;
      b.comments += Number(r.comments) || 0;
      b.shares += Number(r.shares) || 0;
    });
    // Spend comes from Payment Approvals, counted by the month it was
    // actually paid (Payment Date) — same rule used in the Payments tab.
    payments.forEach((p) => {
      const key = monthKey(p.paymentDate);
      if (!isPlausibleMonthKey(key)) return;
      const b = bucket(key);
      b.spend += Number(p.totalAmount) || 0;
    });
    // Sales figures now come from the dated Sales tab (accurate by order date),
    // rather than the free-text month on individual promo-code records.
    salesTracking.forEach((s) => {
      const key = monthKey(s.orderDate);
      if (!isPlausibleMonthKey(key)) return;
      const b = bucket(key);
      b.salesOrders += 1;
      b.salesRevenue += Number(s.totalAmount) || 0;
    });
    return Object.values(map)
      .map((b) => ({
        key: b.key,
        spend: b.spend,
        influencersClosed: b.influencersClosed.size,
        campaigns: b.campaigns.size,
        videos: b.videos,
        views: b.views,
        likes: b.likes,
        comments: b.comments,
        shares: b.shares,
        salesOrders: b.salesOrders,
        salesRevenue: b.salesRevenue,
      }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [monthlyTrackingRecords, payments, salesTracking]);

  function exportMonthlyTrends() {
    const headers = [
      "Month", "Influencers Tracked", "Videos / Content Live", "Total Views", "Total Likes",
      "Total Comments", "Total Shares", "Total Spend", "Campaigns", "Sales Orders", "Sales Revenue",
    ];
    const rows = monthlyTrends.map((m) => [
      monthLabelFromKey(m.key), m.influencersClosed, m.videos, m.views, m.likes, m.comments,
      m.shares, m.spend, m.campaigns, m.salesOrders, m.salesRevenue,
    ]);
    downloadCSV("monthly-performance-trends.csv", headers, rows);
  }

  // ---------- actions ----------

  function openAddDrawer() {
    setDraft(emptyPerformanceDraft());
    setIsNew(true);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function openEditDrawer(entry) {
    const isKnown = crmInfluencers.some((i) => i.name === entry.influencerName);
    setDraft({
      ...entry,
      useOther: !isKnown,
      views: String(entry.views),
      likes: String(entry.likes),
      comments: String(entry.comments),
      shares: String(entry.shares),
      saves: String(entry.saves || 0),
      spend: String(entry.spend),
    });
    setIsNew(false);
    setConfirmDelete(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function saveDraft() {
    if (!draft.influencerName.trim()) {
      showToast("Pick or enter an influencer");
      return;
    }
    const record = {
      id: draft.id || "perf-" + Date.now(),
      influencerName: draft.influencerName,
      campaignName: draft.campaignName,
      platform: draft.platform,
      contentType: draft.contentType,
      postDate: draft.postDate,
      postLink: draft.postLink,
      views: Number(draft.views) || 0,
      likes: Number(draft.likes) || 0,
      comments: Number(draft.comments) || 0,
      shares: Number(draft.shares) || 0,
      saves: Number(draft.saves) || 0,
      spend: Number(draft.spend) || 0,
      notes: draft.notes,
      createdAt: draft.createdAt || new Date().toISOString(),
    };
    if (isNew) {
      persist([record, ...entries]);
      showToast("Entry added");
    } else {
      persist(entries.map((e) => (e.id === record.id ? record : e)));
      showToast("Entry updated");
    }
    closeDrawer();
  }

  function deleteDraft() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    persist(entries.filter((e) => e.id !== draft.id));
    showToast("Entry removed");
    closeDrawer();
  }

  // ---------- sales / promo code actions ----------

  const salesStats = useMemo(() => {
    const totalRevenue = salesRecords.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
    const totalOrders = salesRecords.reduce((s, r) => s + (Number(r.ordersCount) || 0), 0);
    const unassigned = salesRecords.filter((r) => !r.influencerName).length;
    return { totalRevenue, totalOrders, unassigned };
  }, [salesRecords]);

  function openAddSale() {
    setSaleDraft(emptySaleDraft());
    setIsNewSale(true);
    setConfirmDeleteSale(false);
    setSaleDrawerOpen(true);
  }

  function openEditSale(record) {
    const isKnown = crmInfluencers.some((i) => i.name === record.influencerName);
    setSaleDraft({
      ...record,
      useOther: !!record.influencerName && !isKnown,
      ordersCount: String(record.ordersCount),
      revenue: String(record.revenue),
    });
    setIsNewSale(false);
    setConfirmDeleteSale(false);
    setSaleDrawerOpen(true);
  }

  function closeSaleDrawer() {
    setSaleDrawerOpen(false);
  }

  function saveSale() {
    if (!saleDraft.promoCode.trim()) {
      showToast("Promo code is required");
      return;
    }
    const record = {
      id: saleDraft.id || "sale-" + Date.now(),
      promoCode: saleDraft.promoCode,
      influencerName: saleDraft.influencerName,
      ordersCount: Number(saleDraft.ordersCount) || 0,
      revenue: Number(saleDraft.revenue) || 0,
      month: saleDraft.month,
      notes: saleDraft.notes,
    };
    if (isNewSale) {
      persistSales([record, ...salesRecords]);
      showToast("Promo code added");
    } else {
      persistSales(salesRecords.map((r) => (r.id === record.id ? record : r)));
      showToast("Promo code updated");
    }
    closeSaleDrawer();
  }

  function deleteSale() {
    if (!confirmDeleteSale) {
      setConfirmDeleteSale(true);
      return;
    }
    persistSales(salesRecords.filter((r) => r.id !== saleDraft.id));
    showToast("Promo code removed");
    closeSaleDrawer();
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading performance data…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .input {
          width: 100%;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13.5px;
          color: #f4f4f5;
        }
        .input:focus { outline: none; border-color: #004DAC; }
      `}</style>

      {/* top bar */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="font-display font-semibold text-lg">Performance Dashboard</div>
        {activeTab === "entries" && (
          <button
            onClick={openAddDrawer}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Log content result
          </button>
        )}
        {activeTab === "sales" && (
          <button
            onClick={openAddSale}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add promo code
          </button>
        )}
      </div>

      {/* stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-zinc-800">
        <StatBlock icon={Eye} label="Total views" value={formatNumber(globalStats.totalViews)} accent />
        <StatBlock icon={Users} label="Total influencers" value={globalStats.totalInfluencers} />
        <StatBlock icon={Heart} label="Total engagement" value={formatNumber(globalStats.totalEngagement)} />
        <StatBlock icon={TrendingUp} label="Engagement rate" value={globalStats.avgEngagementRate.toFixed(1) + "%"} />
        <StatBlock icon={IndianRupee} label="Total cost" value={formatINR(globalStats.totalSpend)} />
        <StatBlock icon={IndianRupee} label="CPV" value={globalStats.cpv !== null ? "₹" + globalStats.cpv.toFixed(2) : "—"} />
        <StatBlock icon={IndianRupee} label="Revenue via promo codes" value={formatINR(monthlySalesRevenue)} />
      </div>

      {/* tabs */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-zinc-800">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5">
          <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={LayoutDashboard}>
            Overview
          </TabButton>
          <TabButton active={activeTab === "entries"} onClick={() => setActiveTab("entries")} icon={ListChecks}>
            Entries
          </TabButton>
          <TabButton active={activeTab === "leaderboard"} onClick={() => setActiveTab("leaderboard")} icon={Trophy}>
            Leaderboard
          </TabButton>
          <TabButton active={activeTab === "sales"} onClick={() => setActiveTab("sales")} icon={IndianRupee}>
            Sales / Promo Codes
          </TabButton>
          <TabButton active={activeTab === "trends"} onClick={() => setActiveTab("trends")} icon={Calendar}>
            Monthly Trends
          </TabButton>
        </div>
        <MonthFilter
          availableMonths={entryAvailableMonths}
          selected={entryFilterMonths}
          onChange={setEntryFilterMonths}
          customRange={entryCustomRange}
          onCustomRangeChange={setEntryCustomRange}
        />
        {activeTab === "entries" && (
          <button
            onClick={exportEntries}
            className="flex items-center gap-1.5 border border-zinc-800 hover:border-zinc-800 text-zinc-300 text-sm px-3 py-1.5 rounded-md transition-colors"
          >
            <Download size={14} />
            Download CSV
          </button>
        )}
        {activeTab === "trends" && (
          <button
            onClick={exportMonthlyTrends}
            className="flex items-center gap-1.5 border border-zinc-800 hover:border-zinc-800 text-zinc-300 text-sm px-3 py-1.5 rounded-md transition-colors"
          >
            <Download size={14} />
            Download CSV
          </button>
        )}
      </div>

      {/* body */}
      <div className="px-6 py-5">
        {activeTab === "overview" && (
          <Overview
            campaignChartData={campaignChartData}
            trendChartData={trendChartData}
            leaderboard={leaderboard}
            overallLeaderboard={overallLeaderboard}
            campaignResults={campaignResults}
          />
        )}
        {activeTab === "entries" && <EntriesTable entries={filteredEntries} onRowClick={openEditDrawer} />}
        {activeTab === "leaderboard" && <Leaderboard rows={leaderboard} />}
        {activeTab === "sales" && (
          <SalesTable rows={salesRecords} onRowClick={openEditSale} unassignedCount={salesStats.unassigned} totalOrders={salesStats.totalOrders} />
        )}
        {activeTab === "trends" && <MonthlyTrendsTable rows={monthlyTrends} />}
      </div>

      {/* drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">
                {isNew ? "Log content result" : "Edit entry"}
              </div>
              <button onClick={closeDrawer} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <Field label="Influencer">
                {!draft.useOther ? (
                  <select
                    value={draft.influencerName}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setDraft({ ...draft, useOther: true, influencerName: "" });
                      } else {
                        setDraft({ ...draft, influencerName: e.target.value });
                      }
                    }}
                    className="input"
                  >
                    <option value="">Select from CRM</option>
                    {crmInfluencers.map((i) => (
                      <option key={i.id} value={i.name}>
                        {i.name}
                      </option>
                    ))}
                    <option value="__other__">Other (type manually)</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={draft.influencerName}
                      onChange={(e) => setDraft({ ...draft, influencerName: e.target.value })}
                      className="input"
                      placeholder="Influencer name"
                      autoFocus
                    />
                    <button
                      onClick={() => setDraft({ ...draft, useOther: false, influencerName: "" })}
                      className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap px-2"
                    >
                      Use CRM list
                    </button>
                  </div>
                )}
              </Field>

              <Field label="Campaign (optional)">
                <select
                  value={draft.campaignName}
                  onChange={(e) => setDraft({ ...draft, campaignName: e.target.value })}
                  className="input"
                >
                  <option value="">Not linked to a campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Platform">
                  <select
                    value={draft.platform}
                    onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
                    className="input"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Content type">
                  <select
                    value={draft.contentType}
                    onChange={(e) => setDraft({ ...draft, contentType: e.target.value })}
                    className="input"
                  >
                    {CONTENT_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Post date">
                <input
                  type="date"
                  value={draft.postDate}
                  onChange={(e) => setDraft({ ...draft, postDate: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Post link">
                <input
                  value={draft.postLink}
                  onChange={(e) => setDraft({ ...draft, postLink: e.target.value })}
                  className="input"
                  placeholder="Optional"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Views">
                  <input
                    type="number"
                    value={draft.views}
                    onChange={(e) => setDraft({ ...draft, views: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Likes">
                  <input
                    type="number"
                    value={draft.likes}
                    onChange={(e) => setDraft({ ...draft, likes: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Comments">
                  <input
                    type="number"
                    value={draft.comments}
                    onChange={(e) => setDraft({ ...draft, comments: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Shares">
                  <input
                    type="number"
                    value={draft.shares}
                    onChange={(e) => setDraft({ ...draft, shares: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
              </div>

              <Field label="Saves">
                <input
                  type="number"
                  value={draft.saves}
                  onChange={(e) => setDraft({ ...draft, saves: e.target.value })}
                  className="input"
                  placeholder="0"
                />
              </Field>

              <Field label="Spend for this post (₹)">
                <input
                  type="number"
                  value={draft.spend}
                  onChange={(e) => setDraft({ ...draft, spend: e.target.value })}
                  className="input"
                  placeholder="0"
                />
              </Field>

              <Field label="Notes">
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="input min-h-[60px] resize-none"
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-5 flex gap-2">
              <button
                onClick={saveDraft}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors"
              >
                {isNew ? "Add entry" : "Save changes"}
              </button>
              {!isNew && (
                <button
                  onClick={deleteDraft}
                  className={`px-3 rounded-md border text-sm transition-colors ${
                    confirmDelete
                      ? "border-red-500 text-red-400 bg-red-500/10"
                      : "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                  }`}
                >
                  {confirmDelete ? "Confirm delete" : <Trash2 size={16} />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* sale drawer */}
      {saleDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={closeSaleDrawer} />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-zinc-950 border-l border-zinc-800 z-50 overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
              <div className="font-display font-semibold text-base">
                {isNewSale ? "Add promo code" : "Edit promo code"}
              </div>
              <button onClick={closeSaleDrawer} className="text-zinc-500 hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <Field label="Promo code">
                <input
                  value={saleDraft.promoCode}
                  onChange={(e) => setSaleDraft({ ...saleDraft, promoCode: e.target.value })}
                  className="input"
                  placeholder="e.g. NEWTUBER"
                />
              </Field>

              <Field label="Belongs to influencer">
                {!saleDraft.useOther ? (
                  <select
                    value={saleDraft.influencerName}
                    onChange={(e) => {
                      if (e.target.value === "__other__") {
                        setSaleDraft({ ...saleDraft, useOther: true, influencerName: "" });
                      } else {
                        setSaleDraft({ ...saleDraft, influencerName: e.target.value });
                      }
                    }}
                    className="input"
                  >
                    <option value="">Not yet assigned</option>
                    {crmInfluencers.map((i) => (
                      <option key={i.id} value={i.name}>
                        {i.name}
                      </option>
                    ))}
                    <option value="__other__">Other (type manually)</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={saleDraft.influencerName}
                      onChange={(e) => setSaleDraft({ ...saleDraft, influencerName: e.target.value })}
                      className="input"
                      placeholder="Influencer name"
                      autoFocus
                    />
                    <button
                      onClick={() => setSaleDraft({ ...saleDraft, useOther: false, influencerName: "" })}
                      className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap px-2"
                    >
                      Use CRM list
                    </button>
                  </div>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Orders / bikes sold">
                  <input
                    type="number"
                    value={saleDraft.ordersCount}
                    onChange={(e) => setSaleDraft({ ...saleDraft, ordersCount: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
                <Field label="Revenue (₹)">
                  <input
                    type="number"
                    value={saleDraft.revenue}
                    onChange={(e) => setSaleDraft({ ...saleDraft, revenue: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                </Field>
              </div>

              <Field label="Month (optional)">
                <input
                  value={saleDraft.month}
                  onChange={(e) => setSaleDraft({ ...saleDraft, month: e.target.value })}
                  className="input"
                  placeholder="e.g. Jan"
                />
              </Field>

              <Field label="Notes">
                <textarea
                  value={saleDraft.notes}
                  onChange={(e) => setSaleDraft({ ...saleDraft, notes: e.target.value })}
                  className="input min-h-[60px] resize-none"
                  placeholder="Optional"
                />
              </Field>
            </div>

            <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 p-5 flex gap-2">
              <button
                onClick={saveSale}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-2.5 rounded-md transition-colors"
              >
                {isNewSale ? "Add promo code" : "Save changes"}
              </button>
              {!isNewSale && (
                <button
                  onClick={deleteSale}
                  className={`px-3 rounded-md border text-sm transition-colors ${
                    confirmDeleteSale
                      ? "border-red-500 text-red-400 bg-red-500/10"
                      : "border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/50"
                  }`}
                >
                  {confirmDeleteSale ? "Confirm delete" : <Trash2 size={16} />}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-800 text-sm px-4 py-2 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------- subcomponents (performance) ----------

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
      <div className="text-sm font-medium">{title}</div>
      {subtitle && <div className="text-[11px] text-zinc-600 mb-3">{subtitle}</div>}
      <div className={subtitle ? "mt-1" : "mb-4"} style={{ width: "100%", height: subtitle ? 210 : 220 }}>{children}</div>
    </div>
  );
}

function chartTooltipStyle() {
  return {
    contentStyle: { background: "#18181b", border: "1px solid #27272a", borderRadius: 6, fontSize: 12.5 },
    labelStyle: { color: "#a1a1aa" },
    itemStyle: { color: "#f4f4f5" },
  };
}

function Overview({ campaignChartData, trendChartData, leaderboard, overallLeaderboard, campaignResults }) {
  const topMonthly = leaderboard.slice(0, 3);
  const topOverall = overallLeaderboard.slice(0, 3);
  const tooltipProps = chartTooltipStyle();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Views by campaign">
          {campaignChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer>
              <BarChart data={campaignChartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "#27272a" }} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "#27272a" }} tickLine={false} tickFormatter={formatNumber} />
                <Tooltip {...tooltipProps} formatter={(v) => formatNumber(v)} />
                <Bar dataKey="views" fill="#004DAC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Views over time" subtitle="Combines Monthly Tracking with Performance's own logged entries — totals can be higher than Monthly Tracking alone for a given month.">
          {trendChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer>
              <LineChart data={trendChartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "#27272a" }} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={{ stroke: "#27272a" }} tickLine={false} tickFormatter={formatNumber} />
                <Tooltip {...tooltipProps} formatter={(v) => formatNumber(v)} />
                <Line type="monotone" dataKey="views" stroke="#004DAC" strokeWidth={2} dot={{ fill: "#004DAC", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div>
        <div className="text-sm font-medium mb-3">Campaign results</div>
        {campaignResults.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-md py-10 text-center text-sm text-zinc-600">
            No campaign activity for the selected month(s) yet.
          </div>
        ) : (
          <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900 text-zinc-500 text-xs">
                  <th className="text-left font-medium px-4 py-2.5">Campaign</th>
                  <th className="text-left font-medium px-4 py-2.5">Views</th>
                  <th className="text-left font-medium px-4 py-2.5">Engagement</th>
                  <th className="text-left font-medium px-4 py-2.5">Spend</th>
                </tr>
              </thead>
              <tbody>
                {campaignResults.map((c) => (
                  <tr key={c.campaignName} className="border-t border-zinc-800">
                    <td className="px-4 py-3 font-medium">{c.campaignName}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatNumber(c.views)}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatNumber(c.engagement)}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatINR(c.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 text-[11px] text-zinc-600 border-t border-zinc-800">
              Sales/revenue isn't shown per campaign since promo codes aren't currently linked to a specific campaign.
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="text-sm font-medium mb-3">Top performers — overall</div>
          {topOverall.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-md py-10 text-center text-sm text-zinc-600">
              Log a few content results to see your top performers here.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {topOverall.map((r, idx) => (
                <div key={r.influencerName} className="bg-zinc-900 border border-zinc-800 rounded-md p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded flex-shrink-0">#{idx + 1}</span>
                    <div className="font-medium text-sm truncate">{r.influencerName}</div>
                  </div>
                  <div className="text-xs text-zinc-500 text-right flex-shrink-0">
                    {formatNumber(r.views)} views · <span className="text-blue-400">{r.engagementRate.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-sm font-medium mb-3">Top performers — selected month</div>
          {topMonthly.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-md py-10 text-center text-sm text-zinc-600">
              No content logged for the selected month(s) yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {topMonthly.map((r, idx) => (
                <div key={r.influencerName} className="bg-zinc-900 border border-zinc-800 rounded-md p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded flex-shrink-0">#{idx + 1}</span>
                    <div className="font-medium text-sm truncate">{r.influencerName}</div>
                  </div>
                  <div className="text-xs text-zinc-500 text-right flex-shrink-0">
                    {formatNumber(r.views)} views · <span className="text-blue-400">{r.engagementRate.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
      No data logged yet
    </div>
  );
}

function EntriesTable({ entries, onRowClick }) {
  if (entries.length === 0) {
    return (
      <div className="text-center text-zinc-600 text-sm py-16">
        No content results logged yet. Click "Log content result" to add your first one.
      </div>
    );
  }
  return (
    <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-500 text-xs">
            <th className="text-left font-medium px-3 py-2.5">Influencer</th>
            <th className="text-left font-medium px-3 py-2.5">Campaign</th>
            <th className="text-left font-medium px-3 py-2.5">Platform</th>
            <th className="text-left font-medium px-3 py-2.5">Post date</th>
            <th className="text-left font-medium px-3 py-2.5">Views</th>
            <th className="text-left font-medium px-3 py-2.5">Engagement</th>
            <th className="text-left font-medium px-3 py-2.5">Spend</th>
            <th className="text-left font-medium px-3 py-2.5">Link</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.id}
              onClick={() => onRowClick(e)}
              className="border-t border-zinc-800 hover:bg-zinc-900/60 cursor-pointer"
            >
              <td className="px-3 py-2.5 font-medium">{e.influencerName}</td>
              <td className="px-3 py-2.5 text-zinc-400">{e.campaignName || "—"}</td>
              <td className="px-3 py-2.5 text-zinc-400">{e.platform}</td>
              <td className="px-3 py-2.5 text-zinc-400">{formatDate(e.postDate)}</td>
              <td className="px-3 py-2.5 text-zinc-400">{formatNumber(e.views)}</td>
              <td className="px-3 py-2.5 text-zinc-400">{engagementRate(e).toFixed(1)}%</td>
              <td className="px-3 py-2.5 text-zinc-400">{formatINR(e.spend)}</td>
              <td className="px-3 py-2.5">
                {e.postLink ? (
                  <a
                    href={cleanVideoUrl(e.postLink)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <Link2 size={12} />
                    View
                  </a>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Leaderboard({ rows }) {
  if (rows.length === 0) {
    return <div className="text-center text-zinc-600 text-sm py-16">No performance data yet.</div>;
  }
  return (
    <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto max-w-4xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-500 text-xs">
            <th className="text-left font-medium px-4 py-2.5">Rank</th>
            <th className="text-left font-medium px-4 py-2.5">Influencer</th>
            <th className="text-left font-medium px-4 py-2.5">Posts</th>
            <th className="text-left font-medium px-4 py-2.5">Total views</th>
            <th className="text-left font-medium px-4 py-2.5">Engagement rate</th>
            <th className="text-left font-medium px-4 py-2.5">Spend</th>
            <th className="text-left font-medium px-4 py-2.5">CPM</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.influencerName} className="border-t border-zinc-800">
              <td className="px-4 py-3 text-zinc-500">#{idx + 1}</td>
              <td className="px-4 py-3 font-medium">{r.influencerName}</td>
              <td className="px-4 py-3 text-zinc-400">{r.posts}</td>
              <td className="px-4 py-3 text-zinc-400">{formatNumber(r.views)}</td>
              <td className="px-4 py-3 text-blue-400">{r.engagementRate.toFixed(1)}%</td>
              <td className="px-4 py-3 text-zinc-400">{formatINR(r.spend)}</td>
              <td className="px-4 py-3 text-zinc-400">{r.cpm ? formatINR(Math.round(r.cpm)) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2.5 text-[11px] text-zinc-600 border-t border-zinc-800">
        CPM = spend per 1,000 views, based on the spend you log against each post.
      </div>
    </div>
  );
}

function SalesTable({ rows, onRowClick, unassignedCount, totalOrders }) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-zinc-600 text-sm py-16">
        No promo codes logged yet. Click "Add promo code" to start tracking sales.
      </div>
    );
  }
  const sorted = [...rows].sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0));
  return (
    <div className="flex flex-col gap-3 max-w-4xl">
      {unassignedCount > 0 && (
        <div className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2">
          {unassignedCount} promo code{unassignedCount > 1 ? "s" : ""} still need an influencer assigned — click a row to link one.
        </div>
      )}
      <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 text-zinc-500 text-xs">
              <th className="text-left font-medium px-4 py-2.5">Promo code</th>
              <th className="text-left font-medium px-4 py-2.5">Influencer</th>
              <th className="text-left font-medium px-4 py-2.5">Orders</th>
              <th className="text-left font-medium px-4 py-2.5">Revenue</th>
              <th className="text-left font-medium px-4 py-2.5">Month</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.id}
                onClick={() => onRowClick(r)}
                className="border-t border-zinc-800 hover:bg-zinc-900/60 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium">{r.promoCode}</td>
                <td className="px-4 py-3 text-zinc-400">
                  {r.influencerName || <span className="text-amber-400">Unassigned</span>}
                </td>
                <td className="px-4 py-3 text-zinc-400">{r.ordersCount}</td>
                <td className="px-4 py-3 text-blue-400">{formatINR(r.revenue)}</td>
                <td className="px-4 py-3 text-zinc-400">{r.month || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 text-[11px] text-zinc-600 border-t border-zinc-800 flex justify-between">
          <span>{totalOrders} bikes sold in total via tracked promo codes.</span>
          <span>Customer personal and payment details are intentionally not stored here.</span>
        </div>
      </div>
    </div>
  );
}

function MonthlyTrendsTable({ rows }) {
  if (rows.length === 0) {
    return (
      <div className="text-center text-zinc-600 text-sm py-16">
        No dated activity yet — log a few entries in Monthly Influencer to see month-by-month trends here.
      </div>
    );
  }
  return (
    <div className="border border-zinc-800 rounded-md overflow-hidden overflow-x-auto max-w-6xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-500 text-xs">
            <th className="text-left font-medium px-4 py-2.5">Month</th>
            <th className="text-left font-medium px-4 py-2.5">Influencers Tracked</th>
            <th className="text-left font-medium px-4 py-2.5">Videos / Content Live</th>
            <th className="text-left font-medium px-4 py-2.5">Views</th>
            <th className="text-left font-medium px-4 py-2.5">Likes</th>
            <th className="text-left font-medium px-4 py-2.5">Comments</th>
            <th className="text-left font-medium px-4 py-2.5">Shares</th>
            <th className="text-left font-medium px-4 py-2.5">Total Spend</th>
            <th className="text-left font-medium px-4 py-2.5">Sales (orders / revenue)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.key} className="border-t border-zinc-800">
              <td className="px-4 py-3 font-medium">{monthLabelFromKey(m.key)}</td>
              <td className="px-4 py-3 text-zinc-400">{m.influencersClosed}</td>
              <td className="px-4 py-3 text-zinc-400">{m.videos}</td>
              <td className="px-4 py-3 text-zinc-400">{formatNumber(m.views)}</td>
              <td className="px-4 py-3 text-zinc-400">{formatNumber(m.likes)}</td>
              <td className="px-4 py-3 text-zinc-400">{formatNumber(m.comments)}</td>
              <td className="px-4 py-3 text-zinc-400">{formatNumber(m.shares)}</td>
              <td className="px-4 py-3 text-blue-400">{formatINR(m.spend)}</td>
              <td className="px-4 py-3 text-zinc-400">
                {m.salesOrders} / {formatINR(m.salesRevenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2.5 text-[11px] text-zinc-600 border-t border-zinc-800">
        Influencers, videos, views, likes, comments and shares are pulled automatically from Monthly Tracking —
        nothing needs to be re-entered here. Spend is pulled from Payment Approvals, counted by the month it was
        actually paid. Sales figures come from the Sales tab, grouped by each order's actual order date.
      </div>
    </div>
  );
}

// ==================== APP SHELL ====================

const NAV_ITEMS = [
  { key: "crm", label: "CRM & Pipeline", icon: UserCheck },
  { key: "campaigns", label: "Campaigns", icon: Megaphone },
  { key: "monthly-tracking", label: "Monthly Tracking", icon: ListChecks },
  { key: "logistics", label: "Logistics", icon: Package },
  { key: "team", label: "Team Coordination", icon: Users },
  { key: "sales", label: "Sales", icon: ShoppingCart },
  { key: "payments", label: "Payment Approvals", icon: Wallet },
  { key: "performance", label: "Performance", icon: TrendingUp },
];

export default function EMotoradDashboard() {
  // Installed during the first render, i.e. before any module loads its data.
  installStorageGuard();

  const [activeModule, setActiveModule] = useState("crm");
  const [dataVersion, setDataVersion] = useState(0);
  const [storageProblem, setStorageProblem] = useState(false);
  const [problemInfo, setProblemInfo] = useState({});
  const [backupNote, setBackupNote] = useState("");
  const [pendingRestore, setPendingRestore] = useState(null);
  const restoreInputRef = useRef(null);

  useEffect(() => {
    const onGuard = (ev) => {
      setStorageProblem(true);
      const d = (ev && ev.detail) || {};
      if (d.key) setProblemInfo((prev) => ({ ...prev, [d.key]: d.reason || "no details" }));
    };
    window.addEventListener("storage-guard", onGuard);
    return () => window.removeEventListener("storage-guard", onGuard);
  }, []);

  function flashNote(msg) {
    setBackupNote(msg);
    setTimeout(() => setBackupNote(""), 6000);
  }

  async function handleBackup() {
    try {
      const backup = await collectBackup();
      const count = Object.keys(backup.data).length;
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "emotorad-dashboard-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flashNote("Backed up " + count + " lists.");
    } catch (e) {
      flashNote("Couldn't create the backup — please try again.");
    }
  }

  async function handleRestoreFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      if (!obj || obj.app !== BACKUP_APP_ID || !obj.data || typeof obj.data !== "object") {
        flashNote("That file isn't a dashboard backup.");
        return;
      }
      setPendingRestore({ backup: obj, count: Object.keys(obj.data).length });
    } catch (err) {
      flashNote("Couldn't read that file.");
    }
  }

  async function confirmRestore() {
    const { backup } = pendingRestore;
    setPendingRestore(null);
    try {
      const count = await applyBackup(backup);
      setStorageProblem(false);
      setDataVersion((v) => v + 1); // reload every module from what was just restored
      flashNote("Restored " + count + " lists.");
    } catch (err) {
      flashNote("Restore failed — nothing was changed.");
    }
  }

  function renderModule() {
    switch (activeModule) {
      case "crm":
        return <EMotoradInfluencerCRM />;
      case "campaigns":
        return <EMotoradCampaignManagement />;
      case "monthly-tracking":
        return <EMotoradMonthlyTracking />;
      case "logistics":
        return <EMotoradProductLogistics />;
      case "team":
        return <EMotoradTeamCoordination />;
      case "sales":
        return <EMotoradSales />;
      case "payments":
        return <EMotoradPaymentApprovals />;
      case "performance":
        return <EMotoradPerformanceDashboard />;
      default:
        return null;
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="w-56 flex-shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="px-5 py-5 border-b border-zinc-800">
          <img
            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAABXCAYAAAAqJRN0AAA420lEQVR42u1dd5xcVfX/nplNIbQESEK10KRJV/hhoYmigggIilIFBQsqiKKioiIIShOxUG10C9KREoqF3iEUIQGRnkCAhJTdne/vj3cOe3J5M/PufW92l2Tu57OfSXbfvHvvuaffUwQVDZJ1EekneSqAvQD0Aqhj6EYDwAgAW4nIP219JfbXIyJ9JHcGcBaA/sj9EUANwHQAa4vIDJIiIqxgTdsCOF/3K7Gv0bNaX0SmkqyJSMPNIQDqItLnfrc+gK0AbAZgTQDjASyq+ys7+gDMAPAYgEkAzheRh20tzeBFsq5nvi6Af+rZCIZ29AMYBeBwETnKzitv3bYvkssC2Fzhux6AlQAsrmdbBU3MAvA0gNsAXCgil3v6bYFrBsvFANwDYHl9XydhLIqbrwCYAuB6AOeJyAPt8KEA7di6xwO4E8BSbs6qzr4HwE4icnmF/OfTAM5I4D+pYzaAaQDuBXAZgD+JyMyy+wk3VyMpJN9CciaHfvTr5026tlqFe/x3MEfsmEpyRIDESQJbP9cg+XxJOJ3t3xnOof8eR/IAkv8gOXcQz/Jlkse0g5mDx5klz6fq8QrJFQyHPAML4LslyT+QfHaQ1zeJ5Hrh+vIYmH5+YYjhO5PkiSTHVEhD+3ZwT5vm0VYi/6mRvF3f2xgi+D9E8hNV7CkPuY7XSXqHmGj79HO7ig7PEG2b4P0pa7qlAsQ3YbY0yUcS19RQgukluU6OwLA9jyZ5CMn/5eynT99TNTLb2vyeriA50vbeBB4rk5zToTXFDqOBE5vBVv+9lTLxULD36WcnYWsM81WSmzSjFYWtkBxF8jH3jsEaefhwA8kxefiQSNtXVMi7Gu5dq7YTzhFr/GgJ/lNmL3nw/0JVwsOQawLJl4YB8RpTu5tkvSrrQz+vrUCAXFpGqJnmSrKH5HUlkN7Wc2GApOL2uxXJewKmONiaZ0OFAkl+r4mlZArMScNEgTEaeI3k2wOY2lqXInl6jtAYbNqZp5+PKkOWHAFta959CBhYK3z4WVkF0Skfb1NBWsUZ2PdfIrl0FQqjft44DODf5xTPDarwWdfVD3kAgLHqmxtq37MAOFZ9dLWy1oeINNQU3Ur9vikIa77a50v6Ws33eDqALfTOoCcRRgRwjCG3fep+vw/gWr1T6NNneyq654hd5wiF+4EkF9e7NnHE1a93B3vpOutDjH9GA+eLyFQANYWp+bE3A3ALgH11X4anQ3FvM0LPdxUAOyoth/BrKJP+hsPjoaTtkQq3/Uku7fEh+mXZfV9NRB4H8B3de6OszqmfMwC8WhH/eR+A95XgP1WNuuMFh5ZlrqLEuwSAL7qL4qG8OK8BeBTAn2x9Fb37W26OMuPZCi7Svq/MMlV4GMO6VkRuVqK0fdVIngXgh/q7hs4xlEpBTecfD+Cd7ndQ4ieALwFYYpgoMDU9m2MVB+nOblcNDlhVn6kNA4FnTG/rJjjXAPBRVSYaw2C9dr6LA9g4wIckvqEC8pd6NmWFiAmQF0VkXtlgmYD/cBjgSk3X8f6yzN6sj70BTHSMiUPwY8xdAJwgInPd+sr4Hhsk1wWwnWOmgy5AHAPaXZl7XwlCNgI82iGE/VwA4DPIol8kkjCLnFEZ5YAAlrM9OAVmLIDPOwWiE2soiocmFC7WaKFapuhKH8nPIIuWG4mBKJ2q1lCWIQuAZXKYlDHSb3aQbsvgw7IlLXooj7DowxMqZNQvlFmbi2zdAMCHCuL3YJyD4cu4nhLM1Yh3EQAHO/Om1GGWHD3IQhT/UJX1ISIk+Q3dW18JTUdSBYgiUh/J9wM4EwMhfClwtu/eDGCS+VcVUc8AsJMKjxERTM20/nqBuSURhoa0s9y8BpfPAZjgCKwT2rlE4CAA/NRZSL0ktwTwB8eQ6xHnxQLnzQrcq3OaMLCtALzHuS464fKrl8SHMp4UO6OJAI6LPO9W8HzOKWhlLJpDnVU01Na1p4e5ZZChpsj1KWSx6nOH2LQ1d86JGqf8hpj7WKRS62NVALugvG/dDv75GA3HEfGqAP6CgfuAsoh0tArHkSIyl+R+AD4bKTyM8HsCYdLM7K0nMGQ412gvgIf9/CQXR3b/1uveK23WPCqBWPoi4PF3EblFL5/7lTGd6xhJreC8Ic71tXh2RAX0NznAVSodHKzwTbGa2u0xdd0Gy8mBpZSiCIPkSAB/BbB6hYpIGXe18dc1AWwPYB7mdzV3QoiPijg3AHi4DDLYRq4AsPIwkYwA8D/1OfaVfI/o5dVBCti+ksRjpue0ogLECbElAVykLoYyCURGGPcBuFRddL2ap3BcpAZr65ilzPESZHdPs4P9GV6MRJZ0+B0A74okUnv2LgCPK9E3VAD2AvhgAWvT7iV+iywYoggc7Zlfq0XRU1CQTHNI1CB5rLp4i+KQ7VcA3KjwvR1ZEiqb7G08gN0AfDVBQBscLvdnp2sXAAeiet+7CfrFAewH4MsRONHv8PhhpfdoxuqTZEn+DllibFk6r0SAOHg/DWAddO7uI4UuTKH7C7ojn3FraN8KGtpXNjTZvjuL5PJe82mF3BaGTPLvFYWnWvjf7jrHKP2MDX+191xkce4RsB1H8qlImNp8n9V39CSe62oReSL2zCxLBIx1O+rn+vqeoqGXFib9NMldEub9dcJZNjTpVqoIe088mzsikvkMlgeUxAdLTj0yCGmuKgdotzLrG0TYr+roomiI+gskJ/RUMHk7l8GgjhRNpIl7ro/kgchKN1SllbyMrCxDIa1Q13Cqathl1xBGqNUBzCO5HLIgiKIuOtNQThaRAx2BFLmM6xGRl0jeBmCHgtqOrfsJAOfm3W0VYHp1EekFcHiENWnumrNF5CllNkXv1DwcvomBkOmiZzQFwDYiMkX3VsSHbuG4l6pLL4YmBcAxatG9IQKpw0LFYNMoaJkbjJ4C8MfUu06SI/TeYz+1ivtQTbkYOCsqyl09BPy1DF2cISLPd82NfM3fsrynV5QYaVrVA2HORZM1WOLWtyrUjPp8BqmzPo6M0FhNW73RtOyYJC6Faw/JBxO0za+laHPOmlwlwfqYS3L1WM3czbmavqPonP161hs7v3zROQ1nvp1wnvdWlXQba6UprDaLyG63fX0rVbt3sPpAUFGhymRHFikRMwy8LCuTnJ1gla9YJjlyQRYghlyHVZjVbEzwhnYI5eb/pJu/CgHW0HIkiznkWUpN0aJC0gj8vbHE61w620dk09q6nyW5ZF6WdMS8J0ecpz1zrn9Hwpy/SZjzLO9eiVR6RmtGeaxw3mOwXS263pH67wsL4oTh6XRV8Mrgw5quckZ/B4THbJIrDWMBUoYufmPv6OmUdEP7aJiqRqMit5UPTV4cWWJa1YmRLePCXa7HpgB+h4FL7bJwtPyVkzVCbZSLvFomwnStA/iHVjeuRQYqmBl/aMK6fyUiL8dG1rkghOUA7Bnhpqvpfo9JYFA254oAdi8xZwxO112S4iqRrsHHECTdKnPpKO3qOc4juae6M4sEcJj75HQRmZ6CDxrZtDSyoJSx6FxV21fUZR3lwrKL/UR4xuLoCihevcGemQvgZ5YgW7U5OqwviyKsjy9XXHPGJPfJzTQ9V+/mrSSfqbA6qGlt09TiELVAFiX5ZIQGZs98OFYrd9rOFhH7snW/RHJ8orbZk+imI8lLEq0Pm/OYhDkvTJyzpq7B+yLO0+b8YrBuGSRaG0vyR269RV18MzW4JdataEEpI0he38GaaQb7hxxNyzDlcz9JsD7O9DhaxSW69TPod79bGcBqAN4KYJxeTpVNzmmmjfxLRCYx6GNRwvoYjSzuver1Ak3C+ty9yGKqGS1boWZkcDpFRF501sceAFZE8XDWGoA7AFxpmlzCWg6N0Mj8Zd0LCdqmnedSyLLUi1oCdubHlMChZQB8LnJOAjg6RUiq9bEDsnDPGOtjvqRbK7lBcicAa6EziZmCLOz/g8h6ihS18u2S+0gNaijcjyII1z0TWb+VokEpKTlLADBNw6AL8SV37mMBfFfXVlTDrwE4SkSebVc2xZ310pF0YXlYP63E+gjLKJP8P5LHahXcOYNYHfK9KVpbC6m8VwcqXpr03i+0QOj6QpC8tGLNyLT4V0gu77SwkczKwMdqq59IufvQeTfSuWKsj1kkV0oJL3XneWiCJXBdiu868f7M5rw6cU67z7o5Am/fcBEdBI/MGsTKrjH0c6MFbsQIWncuh0fSV6MErf81hi+5NR6SMOcDbNLqoMU83x2sO8GmLgn99y6uzHBoyvV26Ge2fv6lkg1hvgih+ztwsWaEsn0O/OxAf1FxLLo/+F/oHBZ59emEi+wHjNEkXtZdkICwpyS6dIwZprrpPpTgprM5F9ccjtg5tyrhGtw6wjXYn+PSlJwortkdpN+YtgCGC4+RXDbBdWX72jNSeNj6ZiTS3K+LKlvuDBYh+bi+Y24BGM7RdW5bBHfcPEuomzwGR/tJbsCgEVoKkzW/3rs40I/CpHUvO9MEp9nhblZqQ29Esp06YH14TWbTgPAtkemgDvhkTYufraF6JiDrJO+KSG6zZ/ZOsD5MO15DBWPHQ2iD8zwg4jwtlPPWknN+OcH6+Feq9aGfVydYH0flWB+xwq/Tw5SpKSRXiYWRo7PNdd9Fw3UNjheQ/GmitfSDCAFiuLNPAr7exYJdV908B0XOQ5bsYxS24/y2O9w+Dm6DE5trUgrRtWF0tzAuazhGePTRdSdzh/nxCsN18xD59zqPhUxul2B9TNEQ0aiLbEfApw1iCK3vnpfipts5QVD6MNrHEubcvoRrcJOI+fJcmh4Xv9ghBSpFQbQ13EryLSWss9U0VD02tPk/ahGcGqnc2XP7RwiQWuD9iGHshbLdHY6OIflEgoX8vmQB4jSdRUn+ySFj3xAhV5KboQ2ibVNh5FOeAHlJL1e95bGR+ps7YbWZC3HtwEXxzwTt48AS1sdbdI8xuSb9zEqACNOjoFLcdPcrIadaH3smapD1hDkNb/+SYH2cHAghSbgX6xRte0Z9Kgd6n9cTcG8cyckJePAiybX0XddEClV77uMF3UqGOzsmrPMRPbe2ip2bZ/8E+v9HsrLuIoSWcHcd8zg0bWuN6G5jRXV7nHCc1CHty4jxcbvo0vlWUP98O6HVSIQT3R3RyIQwWkPSp9S1EWt9GMIel+DSSTaXlXkMmpsuuD+7r1MaZBPrY+2I+4Q8l6a3PnYbIusj7M9ul8I75Hk/IsJ1a86111sQPuZN2dq96/ZIxdLodbOCAsT4wU0JjP2ASOsjNXjmYyl04Q9jFLMm9imXvFVeplt01y5JG2quxf1fApLMZbFoM3vnHY7BjVEh2A5hDBnnRN6PGPN/d2DxXJGgrX67hEtnAgeyfWMy3d+T6L6qD4GbLnRFxsz5UFENssk+f5fgGvx98I4UgVvGuvA/IU5MJnkgsx5DrwvKRGswxm3qn9vXzT2C5NQI3tBwz76jnfBjuSAIqyoRY33sHimkypW5cRs8M0F4VF1fxsYjerA1lkzQcfu7KALZ7JDPI/l8ASvBDusqp238tcB89s5p6jYsGgL7+nw57rJYX/l8kToJRPz9BOvjulRz2cF3UNx0OWG0sdbH50q4Bt/O4jWMPANfxymGdk4x5WWqHk+SPIvkx6hRgiWsz5R6YP65IwOLfRlVgIp6AuyZV0hOCPI7qg6CODTyjqVO8p4EHN2z1Tw9rZirpv3vCGAfxFWr9GUJ7gNwN4AXS3qbLLHsUq2iWauoXe16yPo9F+m2ZklFzwM4B8DOQfJZq8SiFzSx6EQAO7ZJZKLb70EAvo7iXc3CdrX2/0P13/0FErds7lM1+bBwEh8HEpWWAPDFiESxZusufJ6Kr5sj655XpDSGJco9A+D3jKzs6ubcGsAmkXP+F8DZjK8ma31qvgZgNIolxNkzF4nI/W7ddi7fiiWfiPOx/V6rvKCmvOBxZM2gHhSRmSFdxiaqciChcjcAR6F4y2eDzXkicpgySsP1scj6lcTCZQbaVN12Z7AJsl70RXDHkv6mAzitCO5w/kTTdRGXaDoVwAXROOr8o1acLeZizZ67guT7OUwrNjrr46wEN8CPSW5aUGt4XWMg+amCc70eyUFy1wRt+t/OLy/MCsfNY1y9/1dILsf0uPuvJqw7+W7LaXMpbrrvpFofCRetNudBJayPZUm+HGl9NJRZzVdFmeSWHQoeCfd7Ups7nXoqr3A4txkHciMaEWv7t7rpa5w/sXeTyHtIg+HdEfznwgT+c1SM9eHuWGKtj6+m3n3YgewdQRh+cQfnIEhPRT9Vhu3GlttuKCMe7y4dewuatVcVjEYKE5FSwkLt0ssSB09PQNKTEqJffELUVA5CpntwqZyS7T5dXRWp9xAxYbSlqgs7uvxRgmvwqoCh2OffE9xXryQw1afUZ9+jLuieMkIjh0G+XeEac5dgwS3LBu9KuUvzz7WsKuD4z7o5AQTt8PVVuhDsgji6VcIdyzMaOBVdgy4vLjmGCXzdkJ0VZIh32Pr4dQJjPUe/+71IP2uMtnZNiUuve7xGx6w446xIITlbCTLV+ohJiHpDpjvTs93PTzjPo1OFVnCfFWN9fL9EYMI4vXuLDUzYKtT2SW6ccC82heS+iZr5+6sIvc9hxIvrZW+MsmvMeL1wTQ6P9028Szmn1T5Lej9+WRSGTiBelYCj3y1rfeycwLxuccJjuLquDOlWZFbZM/YS0tL5T45ErnbzGJwfUCYxgmmJRWG72uMTkPTMROvDFI8HEhSPfUpeYqdku7/KtMquxoDXYVwYLZnlGIwvIZwPSXFpNtGw/5SAGz9UmM+IECL23Z9UET0ZRIgKycsi9tFwz22Xtx4H6+8kCpDjmu3T4evqCd6POczazxayPpieaPpiilUebvC2BOb18aoQpIMCpHS5bf3+eRVaIHa4z5NcLUGAmxb/H/XlGvJMUEIvKiTNRbd2AoOzaK9dE9Y9lQkhtAEzTMl2/1XJcOGUMNqfJd591NU1+N8E4byDU+xqOfdiRRnYKxxokhTju3/9boAVRE8GdPyrRCb/FY+3Td59UuK7v9lCgJTB17MirA+b528J8/w01fqwSbeN8JkNaVvMROG4jErZ2EvITd27rqso9NGYwVwOVBauMa66arN2tYcnCMmbY8JoFZ4mPCYyK5MQG3L8lZLWR0y2e7Q212TOmFagXlPfxARChLVjlsMvSrg0Q+sj5V7sZLeuvSPx35TRNWPwq6A1VjS9wJ47sRW+8Y0FQGPrYO3ZxLKpObfya5H8p0/vTNpWZ3AK5PoJdywzmVgB25u41ycwr31Uwxld4YV5T4esj8MS9ndNAKP7Kohe8eb0ZxySxZRVadaudkm9VIyteXNXcA/W6sf7jVdXDXPQLuscoR+XwAz/WNL6iNVOXy8AakI+ArbiLObYC93dc6yPVIG7CgcqU6yoTDDWjfW1Ml6KHBd7b+T8F7Vzszsaj1USW5ZZcms/IQFfL9fzG1WALk2BPCdhntOS7qkcYbw3IZLhLgzzwfkrjj6TwFg/4N4zRhl2zEViq0M7TN9tCUwxZVXCxKLR+vmVBBeb7fXLEXCdSPKbHEi4ii3T/e2S1kdKtnthbS7EIf2MDaP1FsEkkuOKMkv1BvwzEra+VpIPTzUGdmwZgVtS0bw61QJxPOpdKryKhuva3Hcxq+dXSFlJUBJtLRvlXMzbGUyMcCsbj5pDco1IWL0t8o6lT896jRjrI49ov+2SVoqOeeo360FcL+d2Yy6yDmSvsU2nrQLDOpLtg+Id/yzp7hYA13Ig+WdJZElGZYYlMJ0pIkeq1jBPNdQtEZdYNA3AqUoU8/TTeoDHaPU1/c4vSH4SwF0A5jV5dgSy/tubAlhaf1e0g531Op+qc1k/8JhR0/P8gp5FTF/3v4nIvYzoamc4pPPsCGAJFO9qZ9+lnu29atG+2ITWBMB4ABsDWDNYe5HRr+fzTe0+aXP3kxwPYF/E92r3negsqfVSZN39WPA9ALApyWWLdM8LFQalvZUA/A3AIroGKYBrdWTJojuIyCy26BLIga6MYwAsFcOzdS3zkCX6hefq8XXJCNypAXgNwL4FLXQ7m3cBGFmQJi1J/EQReSiaLpzPbMMI//VgjMtZTb8PX257SsIl5I6BhbCWk+plupZdw4GwStMOL0nQDn8cXGS/hQN1ulLWF/udmLI1PjBj80Q3kpRw071+l1XCffXnwP2YEjAR83zMd+blRdIxrbyMPfO34F1mgawdefZ27p+KsTpdhN+iJO+MsHoML2YXPXNnZS6n9wFF6cGeeYHk2OBdqfg6GMPO+H6Fb1SQw+sHqFL3UJVWfYjrhdyo2PJoqPT+hq6r7PvM+vgUgLdHWh/3A7gk0JKXUW0jpWe0lQl5CMAupo1reZb1AXzEaehFrI9XAfyS8/cpXgnAKKT3tLbSBSzwXC1CM6bTCL8kIjckWAGhNTkx4jzrAK4RkZuZ1tfdcPytuveUaKJaBL3UIs+vVzXJGwF8gQPleqy8zJKIKy9jz8zXH15LqQiABwE8gKxERhFcM3zaDsB5RSwXzt/P/GwAGxTU3n05oL30zIuU5DE6GgdgTIIFMkNpMg9f94rA1zwrIRbPilgePchKM+3krLPCDLfHIdmaapo3EjZXS2RUzQh9JIBLROSBRAYTImBDtZ1DIl1zAuBYPXyPsBMS3HzexTMdwMdE5CWDv/49RoAbcfxORJ5xbgq/rjLhklUngRrR1AF8XUR+xYgaW8F59jOr2PrVCDddqVpbTRhh6qiSXmw9fU547KCuq5oqYFYPad8EgTtJRG7KEbjGFK+IECA251YkF1WG1c6NZfOcCGCHCNeP0ce3ReSCCFyTRCXR9jBdXW3mCjN8HR2Jr0WuG6pwoT8D4MMi8kgKr62Z9aHMdURBv2Inh+RpPSWtj4Yi39qIK3g3BcD5fGMxsYkJjIROK9pZRP7jmH6DWfnnnVC8qGMdwBwAJzjrwwTRYwBmVcTsqmJutt49ReT4FOHhzpMAdgPwtoIEbtbkzQAmJVofngE+7M5zqEe/0swI1eq3FZEZ5ud3DGxRAF+rUODa3i8NrJV272wAWA5Z8cmW3yM5QoXHV5T5FhUe9tzpInJ0JK5JSSXxhWBfhq+7AFi5hFegSu+OCde7AWwuIvekKuo1ZV5vBfBpFL9Y6yQx1ABcLyL/KkHo8wFMiejQCGQwIjtRROY4JLCxbAITNY1uX3Xd9OjexAnwkSh2mWxM43wRmYrsgq6hGk9dRJ4DcIU+0zdEZ2mCQxRZ7wLwPhH5Y6rwCKzJrydoc0crrKXEngDgj87VMZS00nCC+esispuIzA4uiQ1391DXZozAvRXANU3o0N5/O7LKwkWrRdszH21lCSqO9DKr6/bzCLePCY9rAOyvSloKD4lVEu2554J9NXQN3xhifGk4z0YdwBlKj/8p6+WJjaPv5LCLpW11XVW1q/1QQn7C02F+AtOb1djF5g+C95RJLOrNyxh371yVWakOcvA6SPqubjZeIfkDF15cL3GeBrdPRFyk9ucl1JVYg10gW5LZ3EG6EG3wjS1fyaz68Lr+7L3A5UB/+P+w4v7wAT0UDSrod5e2ucUUHd1uoBfZseG6DzIrBxSdDOf2dERiFroFtPQwrdlYJ/DFn/n9TOz22OwOZLxqJ72JlzVValQ9AO4AcFVF1odJ/K/r/oq4r/qQ9Vn4pYi8EmjL9r6l9bm+gvsaBeAPIvIDRSrbl4X2fUmtj7ko1tthJICL8+6I1G1RE5FHmZWWORdZSKhpIY0OnV9dtS6D7zQAZwM4SUSmGLKWPFNb+8HuPFkQ/j9T33TZUHMq0e2D7JL1o8FcndAy7c5EnPVwrVrIr7f/zYGt3R/sqO6TeXo+jQJ3Hw8AuEjPrK8NfV2CLDS4vyBN9gNYDcA7RGSyt5hcuO54AH/GQM+TWgHcGIHsfnEHu18sgW/LRNC455vP5ODrIRH4WtU1QD3Al/sA/BrAb0VkDgf6rpTjBxyo5zNcxq6ttJ4E6+MjCWuYxZxiYs4SeSjyfdcxK45Yd+8wTXaVRDi9q1WIs9v/W5lVHX52EM7ueZKXkvwcyYl+Layue+QnE9b1hE+oK+2bmx8nPs+BdrCdHHM0hPUokhsHVkYtb436s5ha07Fj73Z06HB5rFpisePIQOu3cN3lmfUhStG6tyxj6To8uyHxnKzH/ajAWh7sYbXxTtNk1J5wj5VIKmaFvxbJuUQabH+5IEuYOUF9n1Ky46BdIm4PYEPEXZ7fKyJ/bZZwpJnay7TxwdO981ciMj1H02po1urHUKxToK3vORH5dVEY6L/HAVgfwOp6QVhHekSI399s1boeBfCwiLwYICpLaznzw2tnAOsUPE+D6T9EZFKrBLIUIeLxk+Q7AbxT7xlGl6QluvurFwA8obCdGjDvphadiwJaCcDn3L1ZO5wVtYRPUE21JR26efZCFtTQLkSYbp5HRORcd7b2+V617GapRd4OT40ubhORy8pYHm4/+yAL145Jjq0B+L2ITOX8HV3XRVp0awrezNA7qYcBPCoi8wJ6bJRMyO6OWC3zzfw+RhTuq2hdNQ7Dcv6dWg8HuecNK2qq9maAbZk7qu6Yz/qvd+qMhMOs9HpiaGc7hIpFKrbSYBJg1t9M6luiVKfhZBprBy1MDoZ204nzrIiBCjoXnslUSy4Vv1rhbAtBKlWcS+IZV3rOift5A9xK7KU0vig8utZGd3RHd3RHd3RHd3RHd3RHdywgQ7og6I43+wjuIVjVRXl3dEd3dAVIO+ZT+b1AE7+uBM90fZPVnJ8saLAM/Oa+RI3h6qDcNw2Hs+3STHd0x0LCyDUCq1ZVvkVRBsOsD/tFJM8g+TbHhN9s8IttqlUfbtFu3bFwjZ6FdeMu3ns1DBRZrIIYCeBaX2lUifwPyBowWbz4PiLycJW5CUNqymbaIQfx/CzOfk8Av3d/eof2GeGbBQ8xkM/Rp79bB1mjrvWR5VaMxUCp8IeQVdy9XkRe9rBYwOhyDIALkDV1IrIs+l1F5IUF0ersjjcfolr26+8rzgB9leQSXgvWFqj9QVbxUnlm+pvVzaANeDYkuZ5+Tuzk/hxsb9UaQ7M1G3qmtYwd7rANaphNJHkIydsL1qv6n2alTzAhsoDQpZ3rusF+n7SGad3RHcOJ8d2uDGieFh6bk/gzSz+vNEJwZRG20tICs3WuGxYE4eEZF8lzg6Jyu3lB3UFGM8kVNSTJf5gb7U0Ct9Ekv0PyuaDg4BzX09oX5ZwdFPh7ynX4qy0A+GSK3Z4Kh1lKM+csSIKy68JaMMzkCchKe9QxcEFZFiYP66cn5o2ce6wO4B737743MyzVjVRXd4vtuw9ZUUygc8UbrU7ZYcgKRq6gc+5nZTGGM5PUIoebADgFwHr6p7nICgLWkBWAhLpu7Pej9RMOb5YHcC7J1UTkiAXFJYqsH7wFE9QB3Gnn3mXbXQEy1MPa064FYHEMVCCdAeC3SLsPsXdc4BinOGLwyH9bGaupU/7fWN+yY1YrImsVbHWQngDwuD3WibW5rm83aR2qFZDVi6L+vjGcYJsjPPYG8BsVFL2B0LgBwGXI+nH8F1lNqEUArArgQ8h696yAgeZA/QB+RPJ/IvLb4XQnkgBXW/eGAY+6MwWfOnGu3TuYrvvKzOSD3Z0Ezf1UtatC+xP43hTrFnE5WGROGG3T7PexRKDf7wl88VKkfo5+b5R+bh+4kS7V79vfe5r1fXB/b7aOprWf1FU10lc4Lmp5tNl/TycinBzefS2nVwxJXqhWSbv3LEXy+OCO4Ey9h6oFME2qnZXznnqn4erOcUmS09zeZpJc1j9TYN0hzdRi9tEET2tFft8dC74AMf/zOYqgs/XzGEWI0TlEWPSn5oWDllOfE/isx7QihmZl2puFx8YgcJsS8LVmsGrzzu/q3l7Tz69UcT45665VcPaV7z8S5/ZwzYXsLmMGyU83YYI1FyJdD8pyH0DyZa0OXbnVMNhwdTB6d9CA6a6wtUIT2ihEM0VxKYbeWu2/68JawIa6P2oY8D3bwd+h7oUqijoa4q2jrol5yBpBTRaR11qUijf3Qz/J5QBsC2ALZHc1S2eP8DkA96qb40pfCrsdE3PvXkzfuxWyMuTLARhJ8mUAk5G1xL04b61KKLup+6+BrJc7MOCfX5Pk/hhocyoA/iwi06zwoK55S92Xuf9uAnC/a/y0je5/PV3fjgAmOzfQ+sh6a9v3HxSRGwvCdind+xbIwrgnAhhBcjqy5juXArhM5ynlEnJNkjYAcDoG7oV6ADwJYHvrS42BTPpw/QwYfE1EfkPyShF53JiawnVbZKXIDS53icitBXHESqpvguxey0riv2zu2dB9E8B1aYXr5g6uPSRfVJy9FMDlTeBqNLOBfvbq+u9R12QPcu4M/Xs0D+jDAN6nLr9xAPpIPqtusEtE5Hqlo6bwCN75PgAfUbfaCgBGkZylrtpbAFwlIrfr/rvurQXc+jDLYCVneVj7x7ViNfoC7orvh1aO/3sTDWwFkj8nOb1AOOetJDdrt2737nEkDyf5eIF3/4fk7jmwe2tCePNyoZtJNUs/dtLff0pb0Pox171jhH6eHTxzeAHYLkfyZySfKbDme7SfTFmLx1xt97hItX6SL5Jc2+8pxVJwezOcOyXYxyVFrCm31iWDqDBq36A3vMPNvTzJYwvC9e48uLr1nx7QzJfyztVr/STfQfK3ro1zq3FNK1oPLKHrCuL39SS3S7XguuPN5776cBB2+j+Si1SFAG6ei4N7lk+ExBAQwqeD7oFzW3So63PPfLCAa+DjJKcWePe8wDf/S+1sZwS+vXMxNOtXbT2yGyT/7fYpTpBN02d61Y0znuRJOf2z7Xzq/j0k79DvWnj0+0IYeHcFyb0LwnZusP8fWUfDEorEVxy+2bltnyo88twpbq4ddZ7X9HOyh12BtR7vOnP6sPNaE7juEwiconD9ge8UGYTWe9rcrM25HugERyOYoxnNTCO5Xs6+7J27un30tuiNPjfodX5KVe7W7hieAsSI5HsBY79OfcwjY+89WmiGI0lOcYjdR3L1FoT/owDZbTxL8kaSfyV5daDlzXPPjMtpw1sP9hu+e7q27zyH5F/chX/ICHZw7/yWXmy+5LREOqHyqv59hn6eYPt06/m/wM99B8k/5AihySQvI/m9gMCX1XfbeMUl1UmOYD6pyf6f01ySc7QcymNNnts08b7J2so+FTC335cVHi2s69UChjeH5Ftard999526xj4n7DYMcMkz718UhOuUJs+9O6CB8XqWNl4Kk26Dcz2lCb4+qfP/VWl7msMpe+5epdFa8M6NHV56YXSnWr2nkrwksOLtnZ+p8u6sO4avBfK3wEz+fgcIeXWnhVO1/5FN3A9H5Gg7/9aeyuOC9y+pTLzfafrWhtMTo30e6Zi1EcQUvYSdEApYkh8gebM+9wLJnQPX01h1AS5L8uSAKfxIs6pXUnfR8hY0EKzpi4GW6ZnKCyR/rNnIPU3Ob6vg+7eHGrab67Qc2N5LcndjTu47o1WDn+zObOsUrdLNv4ebv6Ga/Vur1lQdTo1wPcVtvx9qxdgcXK8JzuPnORZz6Gqa5+a5pwlcFyG5k1NQppLc0gcI6HPvD9Z9U4tzPcMxb7NW/649wBcL5h+vrkuzbE1AbOPw3gTJDYFQuJPke3JgNkbnulKfO6IrPBZs4eEJ7LEAUa/QKKyf6me7n6P18wiSiwfvNwT/RICIFwfEap+75RDi4TlhiPXAcjnTCcEGyRNzNP29c959NsmxOe/2LoJRJI8juUYr14fCzWtqmxdkqr8N4G8M4M8kVwyZW46f/xuBAnB68Pe6s5bsDGyuk0iObrP/8erKKRQ+2oYpX6bnY0z57E4xGjfnXwL4HFrgfmgXd5YNtZqW9NFI7tnDcuD6c5Kj2sB1Yh5cc0Kcbd2/anKuhwTCo8/uStrQzJVOQDZIHmzeAv1cy3kLGmrtTwze15NzF7St8pVBKSTaHUN7gb5aC59m7JhmRJNDDEcHxHB4jrazvJrp/Y4JH+QQticnB2S0IvJ+gQA51rnORLXcV/Xdtt/TAmtDmjGUFv+vOdfMM2G8vssFkByXmv3urhxt8JfB2vJCMI2BnB/A9oAc4bmh27vt/yi3jp4mIZ4t9x+prPicBlvDx1Kq70ZaPYcG8Dm/yVmaBbCYumS8m223JgrPxjlwPaIMXN27zw4soM/m0Mw6bm6b/5Ne2cjBuUX084iAZr5qlqe7g/Tz/85ZG7W8PXUFxsJ3/7Fz4H/vV00mpvbVTP08P4cYTFBdFVgg2+Vo1L8JEPZs50qpByXSQwS+Kvju7oE29cfg77fkaWUt/Pf1JlEqtr/1nLZGkne2sVYk5/6i1ydxtlqb14JJPhSc4bvD75O8NoD/Ja0EZ5XMwZ3vuwILa5aPSOugBbJ1AN/JDi557qAjA1y5ugVeh/XHLqoCroqb9wfnumHOuV4arPWYFjQjgVV9d2Axb2F/088vOGWuoZ6KNYI15gnIriBZiATITwLiKjMOD94tTmN5Kri4e1tA5CsoQ7G7jGf9fUGTPYwh+R4X3WWI/rxeohuRvd2Z96blb1yF68Ttde+AkM9s5iZpcn/R5+4EVm63Nre3twWFBqeRXDJY27uDOWZ24t6hAIx2CRjWQ3mMvANu2olBSOtscw36ZFeFx+oukq1Pz3PN4Fk7u01z4PqWMnB1c6wQBGU8Z3cZbv71g3u/yQXevwTJbbTQphd89zu3k53XB4L7Kkv0PJLkKjlCY6GOtlrYEgktaWij4P9nIkvKq6N48b+GPn+z/t8Soqxj3KrIkt+s/8cUZEljwEAtrh0BjEGWMDVCv3ueRubkJSMtDuAt+gMMJCcCwP4i8pJqUnMB7Kx/m4sskfEqEbm94jpJ7zJa0s92Nb7C2mC9yAoEXiQiUwqszb7/Tt2b7f9BEXk5IObdgjn+JCJPWBLiIOLcuADXXiya+JkyXC2w50g+rLhuMFgLwP8cHC2h83j9u+HKMSLyYHAe9p1PB3A9X0T+WxKuPul2tKOHySIyM+ga+mlHYwAwhuSlSovMee+SyJIqlw9oZh6Az4tIr+6zT+e5QWl6U12HveM7AL6mltnFAP4uIk+ZIFlQ+rF0R3vNbBFnGZgW894OaJ57BNr5BTnuq4uCC7uiwz/7PMldc8z8y4P596vK7+5geVPgbtiklRXh9n1B4J/fp8jaHGx/EHz/596F4nJEvOb/kU7dO7RZ6/7BOfyrU+6rnLlPDeD0jZx7ou0DS/Yx8/e3ubsyuG5btoyHW+93gvUeF7rGSN4W1JVLoZkpJLcKzyHobXN1Tg5JIwgv/p0W8sTCaoksTJs2YjDLgGqBzQbwuDLfERH5H/U2Pt+Nm2jnNVcCfU1dlyCu+q8gKxv/EwDri8gF+r6GapQ9AFYLrMy7tMRCo6zwUC13KQDmG64DmI6sWx6azeH2va7+yqynewuujQFsw+rGVkZiLLJOflBNdi6yEiml958wXgxobTmSI/ScOu0zvyWA04bzHyUXAXC8g6sAOEhEXnOw9NVnx6k2b3CdA+CBCrpRNjvX2/25ajj7Ku6ZGPg1kLVR+DaAjURkkloOjRzr7RkR2Uat2OuQlU8Z5SyfuYpjewG4jeSBw72FQNeFVY2wbCCr7yPOlH0MwNPIahBVYYY2AmI1zSwsR70EstpWRgzTAJzW5t0vIyvv/aASbq83oR1DGqNmt80/T99fFRz7VfiNVeLq8W6kJnWo7PcrYf7S7y8AeCSATTPB1a8uunUcEzPG4L8/FoDPA5ihP8Dgtbo1GPzH0RqVAa9B8n4Hy2jrr029JZv7roDO36lMjsrwDlGFylxXF4nIxU1qVJkA8XB9qSxc3bn2qGuy1bkuo3RDXdOTAM4KXFqhYJqBrLXAA4qjdPjY38IFSBE5T13KawH4ILJ6WJsrrKhnNxLASSSfaAK77lhAXFhmJv88MJPPauV2SXTt5JWjXi5w40wIMm4np+wpdDPo5xLq2vLZ4atWYWo7OB4YwPEk//cW7quw9Pv1RdblXHNrBu4LX4LG5nh7kEH84mC3EHZnMcplLNuej9e/jUh5Z8TciwZh1q9pgqeQXFnx0i7OZyrcJCfaz2C/SgDXaZZPVCJaLXy3net/XWitnesarm4dSU4qSzNtnq3nRFutTvIE53a2NV+3MLqyFqbNhpaBBJaBVAjPd6h1YZrIowCeVWS0dbyGrFEQnGtjgrrRirjS6gD6m2iis5zrxCqarmlVXNsRdBth2s6N1M6FuHFwHncWxEX7+7r67179/wMiMlsJ19453WnGDdWcV9FnagWYRmm6sOqxIjIX2aWr1+T3J7mGXuD2FGV8Tnse2Ypp69w1EZkF4H6HB4sAWFvfcxyARdWCrAM4UkSmqou1WSXgaQBecXBdCsCqJeHqAyNGuHO9X0TmmMWkv5ut1rS9Z6Wg50wyzeSFrYtIv8HS8lBE5BEROQjAVwL38/KukvFCE867UAgQ61CnoZ5rBmb9fYpYNZeEVPinCTGs74gWAO5WpK07E3mmmuDU58aqb7ZXkbcv/DEGqf835JaAcZgJfbe+25jB/roGaRGDXxeRRuAOayaI1w1cM+ZuaEZARrQbNfFzFx2hALLv1xzjfAVZSXq6M/icMsZ6C8FZU7hW5c+2NZ6Mga6DDXUxnk9yrEb/jGiWb2MCRp9bhuRlAC60Pbc4p1oAH1NmVtRw7o/rmkYqrI6ze7QWAunlAK5SAVwlwIs8xcJw51n9sf28Hdk9XH8bmqGnmWZC162xHtBVQ7/f0LMaiazdgV//XFtnt5z7gidAzEx+d5DU9UpYM6ci985pgXvny8Hf7fOneYl+ztTuyevop4l4p5NcJzSbnbm/Q1AxlyT38owpr9uc1jE6Ls+t51wjy2gUio2nrVpvm+KSo0g+4c6g35UzL+rCCpPYdmwC2y8GpdP7SH7YacPN9v9VV7ixCremncdxLnqp3xWQXCtHU6/n/G4PBzuSPLLVGoPKvB5ef9Yaaz7jfOt2+3Xv+3Kwj15fZ6sFXA8ieVg4T07UoK3z48G8Bsdzg7IwlwTuqZ4mpUZW1fI5ywbz+m6WJ1i30CZ04qPBfhxktP+xlQu3OxaM+4/9gxDEx0luUfJnjDOBw1DD3HLUDnnXcD5oC4W92BIOc/axqnb/e1qfvc2VLclr33lnwER7lQHkabtvCyqrfqMFsa/umGBDfeGLuucmev9+cH/hBdqTzs8tBXz6i7ly7JZMtmrIEPRncfWj+6Swmb6/STDHO4JqwHtUIUSca2SRILTYYPAqyaO0BlPob19F75ruDKovzw36p9RbCNyVHb43gnsxX/mgp8A+RO/XngzK9c/0HRWD763hKiLMV63Wnetod1Ym2FYJ9mG0s2WA09bOd0KT+ddRRc0UnksdjfiqwlaY8WWSP7TqxTnvG6V12PqD8kPvr0rpeDMNWVgEiLoATgOwHwYih8qOVwGs5KOPSC6DLLJrCX1mBoBVRORF363MRU4dB+Bg9e3W9WcmgGuQhcX2A5igPuINkEWA2B3KGADnIUuuqrkOaraWjZB1+RsR7PkeAFciSyobq26hrZFF2PRjIElsNxE5z0d5qTtjPLLEyEUxEE31d33n2gA+BuADInKf+ccV/p8CcC4GIuCuFJEPt0uqc/vZEMAdGEjOfAzAmnqXkAfbbdXVYO4bI+6bFL7PI4vs2QTAlgpbc3mNALCliFxfUUfCBsmVAExCFvlkLq26c8k8qGdCACsi69Y4KnCHmmD+A4DDMBBByBy3rXXxe0Df1XBuNOh9xtrmFira0ZLkR5Al3sbAdZ7ymxEAthCRGzScuVetsPucy+pRPde+4FwNjhcA2EXf2aPfmaawfdTuFNWVvK5bn9HMz0TkmyRHisg8reP1Xfd3o+1/IAuFflrXvQayDpmrOzfeSABnisi+3QisBfgORD9vVs1lrivENjfh5zX9vNrfH+i/36Pa3Wx9/015GrbTTEe6irb9LZrx2N/nBEmEBzSpk2Xr2clZQvNaNNsJ+ylcodrjG6wb/bzafScvoesn3q2g/z5a1/Kqfv64oPZr399LvzdTP//aQgOvB66ssCJxHmz9/s9zEUtVNBjz5TpuaGJR5CW/zQkaFt1PcudI99kFgUVsnwfGul3cO7+UCNdzHVyts+Suwbn+pZkLVXF9rLPm+trQTPj3qTqfuMTTLVwNrrC1QDs6udD3FOly2wX3/mN5Vj+Oz2GShwXPnNGMSIPGU7/MYR59QVc+G89oSeyVWrl/HLFvHhCIr4IbMv9HmfUzRxPBZ6b/+kEYciN4182O4Nu1sC0qQMIWtt9v9f3gPmhKwf3fo5YS2rnWSuBiXavlPteE4eYJ5JtJftYV/WvLsByDPDinG+LteZVrI4XIx/nG1siF4ZpzZ2jjewVoZpwKo6I087i2SHhDcyr9XFxdidMKvnOGNmmTqvGk68IaZgJEzd6V1UytIhO5oabzaSJykzEGnWdvAO93bpqzNOu1WYKdN9HfDeCzyJKVVlLTv6Eurf8iSwy7Glldq+nerVDA7bAIgN0B7Kpm/Vg1/eeqiX4ngIsAXCwis1olrAUupSMAbKburHnqVroIWVLk/+wdygx+giz00975PRF5xsOgmQWp7zhU3QfmjvuFiNzdygXm9j8WwN4AdkJWE2oJxf/Zus5bAfwNwGXqVqnluYaqwkf993g9j+3URbm07qsXWRj2IwBuBHC5iNwa7inCdbu1upb6nZvoPYq7SW6XAK77OLgurnB9LYDr5SFcHR4dhCw5tNC5BjSzNbKM8M3UbTVS9/kKsgTC29W9OklEXs2DX3AmyyKLUPuI0skEDCQ2zkBWAeIKAOdobbUiiZ1dAdIdHXex+TuMOoCJypT7AcwQkRdztMBGEcQNCVGJfillJLMAvOAL4RVhKgHRTUCW+f6aFZgbZvANGcZSyHJDRH3dLwTw6agvOzxv/d2iKkBGISsRMl1LiqSeuWCgOOhVesdlSs1pIvL5Cu52QrgurYpJx+Gq+xOHgyOV2S+iAniGiMwoCr8mZzJa73JGKx2+5N/ZvfNYiASII6gqRyPUkHKSqhpFq65a1dFmSOlM+v5YjcczlCZaXd2tlxHrRQ4MevLWqHN4nIvaR5nvu/03SySL3n+FONnsTAyXCuFQCB+1Pn4G4BAMJJROR5YL9VLe2ZXYQzJcc2gm5lzruo/+FmtjiuBtZv20+nt3dMewEHbNmuJ04P2lL4nD973J4CvDYc1lzrzFHdhX3d3HvDCMdkGCaydoptN02LVAuqM7umOoBY/dI5yi7qOb1Y2zDYAt1IXVh/nDTQe7J0p3dEd3dEd3DDfhoZ+rNQmj9V31/ubaEHQVx+7oju7ojoVcgFgY7AlB2Gl/kLNwrAmOrvDojipHt25Ld3THm3dY0cszkF2SfwBZv5ERyLLL/wngFBG5RQWNdAv9dUeV4/8BrHrIFu5MlZUAAAAASUVORK5CYII="
            alt="EMotorad"
            className="w-full max-w-[176px] h-auto"
          />
          <div className="text-xs text-zinc-500 leading-tight mt-2">Influencer Ops</div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveModule(item.key)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                activeModule === item.key
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-5 py-3 border-t border-zinc-800 flex flex-col gap-1.5">
          <button
            onClick={handleBackup}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 text-left"
          >
            <Download size={13} />
            Back up data
          </button>
          <button
            onClick={() => restoreInputRef.current && restoreInputRef.current.click()}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 text-left"
          >
            <Upload size={13} />
            Restore from backup
          </button>
          <input
            ref={restoreInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleRestoreFile}
          />
          {pendingRestore && (
            <div className="mt-1 text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-md p-2">
              Replace ALL current data with this backup
              {pendingRestore.backup.savedAt ? " from " + pendingRestore.backup.savedAt.slice(0, 10) : ""}?
              <div className="flex gap-2 mt-2">
                <button onClick={confirmRestore} className="text-blue-400 hover:text-blue-300 font-medium">
                  Restore
                </button>
                <button onClick={() => setPendingRestore(null)} className="text-zinc-500 hover:text-zinc-300">
                  Cancel
                </button>
              </div>
            </div>
          )}
          {backupNote && <div className="text-[11px] text-zinc-500">{backupNote}</div>}
        </div>
        <div className="px-5 pb-4 text-[11px] text-zinc-600">
          All five modules share the same live data — updates in one show up everywhere.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {storageProblem && (
          <div className="px-6 py-2 text-xs bg-amber-400/10 border-b border-amber-400/30 text-amber-400">
            Your saved data couldn't be loaded just now, so saving is paused to protect it.
            <button
              onClick={() => {
                if (window.storage && window.storage.clearProblems) window.storage.clearProblems();
                setProblemInfo({});
                setStorageProblem(false);
                setDataVersion((v) => v + 1);
              }}
              className="ml-2 underline hover:text-amber-300"
            >
              Try again
            </button>
            {Object.keys(problemInfo).length > 0 && (
              <div className="mt-1 text-[11px] opacity-80">
                Couldn't read:{" "}
                {Object.entries(problemInfo)
                  .map(([k, r]) => k.replace("emotorad-", "") + " (" + r + ")")
                  .join(", ")}
              </div>
            )}
          </div>
        )}
        <div key={dataVersion}>{renderModule()}</div>
      </div>
    </div>
  );
}

