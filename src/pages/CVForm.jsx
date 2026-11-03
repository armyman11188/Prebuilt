// ============================================================================
// src/pages/CVForm.jsx
// ============================================================================
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUser, FiGlobe, FiMessageCircle, FiBriefcase, FiBook, FiStar,
  FiPlus, FiChevronDown, FiFileText, FiArrowLeft, FiSave, FiDownload,
} from "react-icons/fi";
import AddSectionModal from "../components/AddSectionModal";
import { downloadResumePDF } from "../utils/cvPdf";
import { claimLocalFor, clearLocalCv, fetchCv, saveCv, hasCvContent, readHistory, writeHistory } from "../utils/cvStore";
import { useAuth } from "../context/AuthContext";
import "./CVForm.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ==========================================================================
// ROMAN URDU: DATE OF BIRTH — PARTIAL DATE FIX. Pehle "Date of Birth"
// sirf ek native <input type="date"> tha — jo tab tak KUCH bhi value
// nahi deta jab tak Day + Month + Year TEENO na bharo (browser ka apna
// all-or-nothing behavior). Is liye agar user sirf saal ya sirf mahina
// bharta, kuch bhi nazar nahi aata tha resume mein.
//
// Ab hum Day/Month/Year TEENO ko ALAG ALAG optional fields bana dete
// hain — jo bhi bharo, wahi turant CV mein dikhega, chahe baaki khaali
// hon. Neeche wale functions ISO string ("YYYY-MM-DD") ko in 3 parts
// mein todte hain (jab existing data ho), aur jo bhi parts filled hon
// unhe wapas ek readable text mein jod dete hain.
// ==========================================================================
// ==========================================================================
// DATE HELPERS
// Date of Birth is stored as 3 separate parts (dobDay/dobMonth/dobYear) INSIDE
// personalInfo, plus the readable text in personalInfo.dateOfBirth. Because the
// parts live in personalInfo they are saved/restored with the draft (before, the
// text "5 April 1999" could not be turned back into the 3 dropdowns after a
// reload, so the fields looked empty while the CV still showed the date).
// ==========================================================================
function parseDob(value) {
  const v = (value || "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return { year: m[1], month: String(Number(m[2])), day: String(Number(m[3])) };
  m = /^(?:(\d{1,2})\s+)?(?:([A-Za-z]+)\s+)?(\d{4})$/.exec(v);
  if (m) {
    const idx = m[2] ? MONTH_NAMES.findIndex((n) => n.toLowerCase() === m[2].toLowerCase()) : -1;
    return { day: m[1] || "", month: idx >= 0 ? String(idx + 1) : "", year: m[3] };
  }
  return { year: "", month: "", day: "" };
}
function composeDob({ day, month, year }) {
  const monthName = month ? MONTH_NAMES[Number(month) - 1] : "";
  if (day && monthName && year) return `${day} ${monthName} ${year}`;
  if (monthName && year) return `${monthName} ${year}`;
  if (year) return year;
  if (monthName) return monthName;
  return "";
}
function getDobParts(info) {
  if (info.dobDay || info.dobMonth || info.dobYear) return { day: info.dobDay || "", month: info.dobMonth || "", year: info.dobYear || "" };
  return parseDob(info.dateOfBirth);
}
function applyDobPart(info, part, value) {
  const next = { ...getDobParts(info), [part]: value };
  if (next.day && next.month) {
    const maxDay = new Date(Number(next.year) || 2000, Number(next.month), 0).getDate();
    if (Number(next.day) > maxDay) next.day = String(maxDay);
  }
  return { ...info, dobDay: next.day, dobMonth: next.month, dobYear: next.year, dateOfBirth: composeDob(next) };
}

const THIS_YEAR = new Date().getFullYear();

// Start/End dates. Stored as "YYYY-MM" (or just "YYYY" when no month is picked).
// Uses two dropdowns instead of <input type="month">, which Firefox and desktop
// Safari don't support (they showed a plain text box, so dates were typed wrongly
// or lost).
function MonthYearInput({ value, onChange, disabled }) {
  if (disabled) return <input className="input" value="Present" disabled />;
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(value || "");
  const year = m ? m[1] : "";
  const month = m && m[2] ? String(Number(m[2])) : "";
  const years = [];
  for (let y = THIS_YEAR + 6; y >= 1960; y--) years.push(y);
  if (year && !years.includes(Number(year))) years.push(Number(year));
  const emit = (y, mo) => onChange(!y ? "" : mo ? `${y}-${String(mo).padStart(2, "0")}` : String(y));
  return (
    <div className="date-row">
      <select className="input" value={year} onChange={(e) => emit(e.target.value, month)} aria-label="Year">
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select className="input" value={month} disabled={!year} onChange={(e) => emit(year, e.target.value)} aria-label="Month">
        <option value="">Month</option>
        {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
      </select>
    </div>
  );
}

function DobInput({ info, onPart }) {
  const dob = getDobParts(info);
  const maxYear = THIS_YEAR - 10;
  const years = [];
  for (let y = maxYear; y >= maxYear - 90; y--) years.push(y);
  if (dob.year && !years.includes(Number(dob.year))) years.push(Number(dob.year));
  const maxDay = dob.month ? new Date(Number(dob.year) || 2000, Number(dob.month), 0).getDate() : 31;
  return (
    <div className="date-row">
      <select className="input" value={dob.day} onChange={(e) => onPart("day", e.target.value)} aria-label="Day">
        <option value="">Day</option>
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <select className="input" value={dob.month} onChange={(e) => onPart("month", e.target.value)} aria-label="Month">
        <option value="">Month</option>
        {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
      </select>
      <select className="input" value={dob.year} onChange={(e) => onPart("year", e.target.value)} aria-label="Year">
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

// End date must not be before start date (same month is fine).
function dateOrderError(start, end, current) {
  if (current || !start || !end) return "";
  const a = start.length === 4 ? start + "-01" : start;
  const b = end.length === 4 ? end + "-12" : end;
  return b < a ? "End date can't be before the start date." : "";
}

// ==========================================================================
// ROMAN URDU: Nationality, Phone-code, aur Place-of-Birth teeno dropdowns
// isi list se banenge:
//   - "name"     -> country ka naam (Place of Birth ke liye)
//   - "iso2"     -> 2-letter country code (flag emoji banane ke liye)
//   - "dial"     -> phone country code (Phone Number ke liye)
//   - "demonym"  -> nationality ka adjective form (Nationality ke liye,
//                   jaise "Pakistan" ki jagah "Pakistani")
// ==========================================================================
const COUNTRIES = [
  { name: "Afghanistan", iso2: "AF", dial: "+93", demonym: "Afghan" },
  { name: "Albania", iso2: "AL", dial: "+355", demonym: "Albanian" },
  { name: "Algeria", iso2: "DZ", dial: "+213", demonym: "Algerian" },
  { name: "Argentina", iso2: "AR", dial: "+54", demonym: "Argentine" },
  { name: "Armenia", iso2: "AM", dial: "+374", demonym: "Armenian" },
  { name: "Australia", iso2: "AU", dial: "+61", demonym: "Australian" },
  { name: "Austria", iso2: "AT", dial: "+43", demonym: "Austrian" },
  { name: "Azerbaijan", iso2: "AZ", dial: "+994", demonym: "Azerbaijani" },
  { name: "Bahrain", iso2: "BH", dial: "+973", demonym: "Bahraini" },
  { name: "Bangladesh", iso2: "BD", dial: "+880", demonym: "Bangladeshi" },
  { name: "Belarus", iso2: "BY", dial: "+375", demonym: "Belarusian" },
  { name: "Belgium", iso2: "BE", dial: "+32", demonym: "Belgian" },
  { name: "Bolivia", iso2: "BO", dial: "+591", demonym: "Bolivian" },
  { name: "Bosnia and Herzegovina", iso2: "BA", dial: "+387", demonym: "Bosnian" },
  { name: "Brazil", iso2: "BR", dial: "+55", demonym: "Brazilian" },
  { name: "Bulgaria", iso2: "BG", dial: "+359", demonym: "Bulgarian" },
  { name: "Cambodia", iso2: "KH", dial: "+855", demonym: "Cambodian" },
  { name: "Cameroon", iso2: "CM", dial: "+237", demonym: "Cameroonian" },
  { name: "Canada", iso2: "CA", dial: "+1", demonym: "Canadian" },
  { name: "Chile", iso2: "CL", dial: "+56", demonym: "Chilean" },
  { name: "China", iso2: "CN", dial: "+86", demonym: "Chinese" },
  { name: "Colombia", iso2: "CO", dial: "+57", demonym: "Colombian" },
  { name: "Croatia", iso2: "HR", dial: "+385", demonym: "Croatian" },
  { name: "Cuba", iso2: "CU", dial: "+53", demonym: "Cuban" },
  { name: "Cyprus", iso2: "CY", dial: "+357", demonym: "Cypriot" },
  { name: "Czechia", iso2: "CZ", dial: "+420", demonym: "Czech" },
  { name: "Denmark", iso2: "DK", dial: "+45", demonym: "Danish" },
  { name: "Egypt", iso2: "EG", dial: "+20", demonym: "Egyptian" },
  { name: "Estonia", iso2: "EE", dial: "+372", demonym: "Estonian" },
  { name: "Ethiopia", iso2: "ET", dial: "+251", demonym: "Ethiopian" },
  { name: "Finland", iso2: "FI", dial: "+358", demonym: "Finnish" },
  { name: "France", iso2: "FR", dial: "+33", demonym: "French" },
  { name: "Georgia", iso2: "GE", dial: "+995", demonym: "Georgian" },
  { name: "Germany", iso2: "DE", dial: "+49", demonym: "German" },
  { name: "Ghana", iso2: "GH", dial: "+233", demonym: "Ghanaian" },
  { name: "Greece", iso2: "GR", dial: "+30", demonym: "Greek" },
  { name: "Hungary", iso2: "HU", dial: "+36", demonym: "Hungarian" },
  { name: "Iceland", iso2: "IS", dial: "+354", demonym: "Icelandic" },
  { name: "India", iso2: "IN", dial: "+91", demonym: "Indian" },
  { name: "Indonesia", iso2: "ID", dial: "+62", demonym: "Indonesian" },
  { name: "Iran", iso2: "IR", dial: "+98", demonym: "Iranian" },
  { name: "Iraq", iso2: "IQ", dial: "+964", demonym: "Iraqi" },
  { name: "Ireland", iso2: "IE", dial: "+353", demonym: "Irish" },
  { name: "Israel", iso2: "IL", dial: "+972", demonym: "Israeli" },
  { name: "Italy", iso2: "IT", dial: "+39", demonym: "Italian" },
  { name: "Japan", iso2: "JP", dial: "+81", demonym: "Japanese" },
  { name: "Jordan", iso2: "JO", dial: "+962", demonym: "Jordanian" },
  { name: "Kazakhstan", iso2: "KZ", dial: "+7", demonym: "Kazakhstani" },
  { name: "Kenya", iso2: "KE", dial: "+254", demonym: "Kenyan" },
  { name: "Kuwait", iso2: "KW", dial: "+965", demonym: "Kuwaiti" },
  { name: "Latvia", iso2: "LV", dial: "+371", demonym: "Latvian" },
  { name: "Lebanon", iso2: "LB", dial: "+961", demonym: "Lebanese" },
  { name: "Libya", iso2: "LY", dial: "+218", demonym: "Libyan" },
  { name: "Lithuania", iso2: "LT", dial: "+370", demonym: "Lithuanian" },
  { name: "Luxembourg", iso2: "LU", dial: "+352", demonym: "Luxembourgish" },
  { name: "Malaysia", iso2: "MY", dial: "+60", demonym: "Malaysian" },
  { name: "Maldives", iso2: "MV", dial: "+960", demonym: "Maldivian" },
  { name: "Malta", iso2: "MT", dial: "+356", demonym: "Maltese" },
  { name: "Mexico", iso2: "MX", dial: "+52", demonym: "Mexican" },
  { name: "Morocco", iso2: "MA", dial: "+212", demonym: "Moroccan" },
  { name: "Nepal", iso2: "NP", dial: "+977", demonym: "Nepalese" },
  { name: "Netherlands", iso2: "NL", dial: "+31", demonym: "Dutch" },
  { name: "New Zealand", iso2: "NZ", dial: "+64", demonym: "New Zealander" },
  { name: "Nigeria", iso2: "NG", dial: "+234", demonym: "Nigerian" },
  { name: "North Macedonia", iso2: "MK", dial: "+389", demonym: "Macedonian" },
  { name: "Norway", iso2: "NO", dial: "+47", demonym: "Norwegian" },
  { name: "Oman", iso2: "OM", dial: "+968", demonym: "Omani" },
  { name: "Pakistan", iso2: "PK", dial: "+92", demonym: "Pakistani" },
  { name: "Palau", iso2: "PW", dial: "+680", demonym: "Palauan" },
  { name: "Palestine", iso2: "PS", dial: "+970", demonym: "Palestinian" },
  { name: "Panama", iso2: "PA", dial: "+507", demonym: "Panamanian" },
  { name: "Peru", iso2: "PE", dial: "+51", demonym: "Peruvian" },
  { name: "Philippines", iso2: "PH", dial: "+63", demonym: "Filipino" },
  { name: "Poland", iso2: "PL", dial: "+48", demonym: "Polish" },
  { name: "Portugal", iso2: "PT", dial: "+351", demonym: "Portuguese" },
  { name: "Qatar", iso2: "QA", dial: "+974", demonym: "Qatari" },
  { name: "Romania", iso2: "RO", dial: "+40", demonym: "Romanian" },
  { name: "Russia", iso2: "RU", dial: "+7", demonym: "Russian" },
  { name: "Saudi Arabia", iso2: "SA", dial: "+966", demonym: "Saudi" },
  { name: "Serbia", iso2: "RS", dial: "+381", demonym: "Serbian" },
  { name: "Singapore", iso2: "SG", dial: "+65", demonym: "Singaporean" },
  { name: "Slovakia", iso2: "SK", dial: "+421", demonym: "Slovak" },
  { name: "Slovenia", iso2: "SI", dial: "+386", demonym: "Slovenian" },
  { name: "South Africa", iso2: "ZA", dial: "+27", demonym: "South African" },
  { name: "South Korea", iso2: "KR", dial: "+82", demonym: "South Korean" },
  { name: "Spain", iso2: "ES", dial: "+34", demonym: "Spanish" },
  { name: "Sri Lanka", iso2: "LK", dial: "+94", demonym: "Sri Lankan" },
  { name: "Sweden", iso2: "SE", dial: "+46", demonym: "Swedish" },
  { name: "Switzerland", iso2: "CH", dial: "+41", demonym: "Swiss" },
  { name: "Syria", iso2: "SY", dial: "+963", demonym: "Syrian" },
  { name: "Taiwan", iso2: "TW", dial: "+886", demonym: "Taiwanese" },
  { name: "Tajikistan", iso2: "TJ", dial: "+992", demonym: "Tajikistani" },
  { name: "Thailand", iso2: "TH", dial: "+66", demonym: "Thai" },
  { name: "Tunisia", iso2: "TN", dial: "+216", demonym: "Tunisian" },
  { name: "Turkey", iso2: "TR", dial: "+90", demonym: "Turkish" },
  { name: "Turkmenistan", iso2: "TM", dial: "+993", demonym: "Turkmen" },
  { name: "Uganda", iso2: "UG", dial: "+256", demonym: "Ugandan" },
  { name: "Ukraine", iso2: "UA", dial: "+380", demonym: "Ukrainian" },
  { name: "United Arab Emirates", iso2: "AE", dial: "+971", demonym: "Emirati" },
  { name: "United Kingdom", iso2: "GB", dial: "+44", demonym: "British" },
  { name: "United States", iso2: "US", dial: "+1", demonym: "American" },
  { name: "Uzbekistan", iso2: "UZ", dial: "+998", demonym: "Uzbekistani" },
  { name: "Vietnam", iso2: "VN", dial: "+84", demonym: "Vietnamese" },
  { name: "Yemen", iso2: "YE", dial: "+967", demonym: "Yemeni" },
];

// ROMAN URDU: 2-letter country code (jaise "PK") se flag emoji banata hai
// (🇵🇰) — koi image/library nahi chahiye, browser khud render kar deta hai.
function flagEmoji(iso2) {
  if (!iso2) return "";
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

// ==========================================================================
// ROMAN URDU: SEARCHABLE DROPDOWN — Europass website jaisa "type to
// search" select. Click karne par ek search box khulta hai, jo bhi type
// karo usi hisaab se list filter hoti hai. "renderOption" batata hai har
// option kaisa dikhna chahiye (flag+naam, ya sirf naam, waghera).
// ==========================================================================
function SearchableSelect({ options, value, onChange, placeholder, searchPlaceholder, renderOption, getSearchText }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? options.filter((opt) => getSearchText(opt).toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  const selected = options.find((opt) => getSearchText(opt) === value);

  return (
    <div
      style={{ position: "relative" }}
      onBlur={(e) => {
        // ROMAN URDU: agar focus isi dropdown ke ANDAR kisi cheez pe ja
        // raha hai (jaise search box ya option pe), to band mat karo —
        // sirf tab band karo jab bahar click ho
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
          setSearch("");
        }
      }}
    >
      <button
        type="button"
        className="input"
        style={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", width: "100%" }}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{selected ? renderOption(selected) : <span style={{ color: "#94a3b8" }}>{placeholder || "Select"}</span>}</span>
        <span style={{ opacity: 0.5 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
            background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 260, display: "flex", flexDirection: "column",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid #e2e8f0" }}>
            <input
              autoFocus
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder || "Search..."}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 14 }}>No matches</div>
            )}
            {filtered.map((opt) => (
              <div
                key={opt.name}
                tabIndex={0}
                onClick={() => {
                  onChange(getSearchText(opt));
                  setOpen(false);
                  setSearch("");
                }}
                style={{
                  padding: "9px 12px", cursor: "pointer", fontSize: 14,
                  background: getSearchText(opt) === value ? "#eff6ff" : "transparent",
                }}
                onMouseDown={(e) => e.preventDefault()} // ROMAN URDU: onBlur se pehle click register ho jaye
              >
                {renderOption(opt)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CVForm() {
  const navigate = useNavigate();
  // ROMAN URDU: Ab steps/pages nahi hain. Har section ek "dropdown" hai —
  // openSecs batata hai kaun sa khula hai. Personal Info shuru mein khula hai.
  const [openSecs, setOpenSecs] = useState({ personal: true });
  const sec = (id, defaultOpen = false) => ({
    collapsible: true,
    open: openSecs[id] === undefined ? defaultOpen : openSecs[id],
    onToggle: () => setOpenSecs((o) => ({ ...o, [id]: !(o[id] === undefined ? defaultOpen : o[id]) })),
  });
  const openSec = (id) => setOpenSecs((o) => ({ ...o, [id]: true }));
  const [formError, setFormError] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | error
  // ROMAN URDU: yeh flag batata hai ke saved draft/bridge data poori
  // tarah load ho chuka hai — jab tak yeh true na ho, auto-save effect
  // KUCH bhi save nahi karega (neeche dekho, yeh race-condition fix hai)
  const [isReady, setIsReady] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    professionalTitle: "",
    email: "",
    phone: "",
    linkedIn: "",
    nationality: "",
    placeOfBirth: "",
    dateOfBirth: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    gender: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    country: "",
    professionalSummary: "",
  });

  const [languages, setLanguages] = useState([
    { id: 1, language: "", proficiency: "Fluent", isMotherTongue: false },
  ]);

  // -------------------- WORK EXPERIENCE (naya) --------------------
  const [workExperience, setWorkExperience] = useState([
    { id: Date.now(), company: "", position: "", startDate: "", endDate: "", current: false, description: "" },
  ]);

  // -------------------- EDUCATION (naya) --------------------
  const [education, setEducation] = useState([
    { id: Date.now() + 1, degree: "", institution: "", startDate: "", endDate: "", current: false },
  ]);

  // -------------------- SKILLS (naya — "tag input" pattern) --------------------
  const [skills, setSkills] = useState({ technical: [], soft: [] });
  const [skillDraft, setSkillDraft] = useState({ technical: "", soft: "" });

  // -------------------- EXTRA SECTIONS (naya — modal se add hoti hain) --------------------
  const [extraSections, setExtraSections] = useState([]);
  const [showSectionModal, setShowSectionModal] = useState(false);

  // ==========================================================================
  // LOADING THE FORM
  //  1. Wait until we know who is signed in (so another account's leftover
  //     draft is never shown).
  //  2. Fill the form from: a fresh voice interview > this device's draft.
  //  3. If this device has nothing and the user is signed in, load their saved
  //     CV from the account.
  // Autosave only starts once loading is finished (isReady).
  // NOTE: the old code returned early when there was no draft and no voice data,
  // so isReady stayed false and a brand-new user's typing was never autosaved.
  // ==========================================================================
  const { user, loading: authLoading, logout } = useAuth();
  const initRef = useRef(false);
  const [phoneCode, setPhoneCode] = useState("+92");

  function applyDraft(data) {
    if (data.personalInfo) setPersonalInfo((prev) => ({ ...prev, ...data.personalInfo }));
    if (Array.isArray(data.workExperience) && data.workExperience.length) setWorkExperience(data.workExperience);
    if (Array.isArray(data.education) && data.education.length) setEducation(data.education);
    if (Array.isArray(data.languages) && data.languages.length) setLanguages(data.languages);
    if (data.skills) setSkills({ technical: data.skills.technical || [], soft: data.skills.soft || [] });
    if (Array.isArray(data.extraSections)) setExtraSections(data.extraSections);
  }

  function loadLocal() {
    // a just-finished voice interview is newer than any old draft
    try {
      const v = localStorage.getItem("voiceInterviewData");
      if (v) {
        const data = JSON.parse(v);
        const pi = { ...(data.personalInfo || {}) };
        if (pi.gender) pi.gender = pi.gender.toLowerCase().trim();
        applyDraft({ ...data, personalInfo: pi });
        localStorage.removeItem("voiceInterviewData");
        return true;
      }
    } catch (err) { console.error("Couldn't load voice interview data:", err); }
    try {
      const d = localStorage.getItem("cvFormDraft");
      if (d) { const data = JSON.parse(d); applyDraft(data); return hasCvContent(data); }
    } catch (err) { console.error("Couldn't load saved draft:", err); }
    return false;
  }

  useEffect(() => {
    if (authLoading || initRef.current) return;
    initRef.current = true;
    if (user) claimLocalFor(user.email);
    const hadLocal = loadLocal();
    if (user && !hadLocal) {
      fetchCv()
        .then((d) => {
          if (hasCvContent(d.draft)) applyDraft(d.draft);
          if (Array.isArray(d.history)) writeHistory(d.history);
        })
        .catch((e) => console.error("Couldn't load saved CV:", e))
        .finally(() => setIsReady(true));
    } else {
      setIsReady(true);
    }

  }, [authLoading, user]);

  // Autosave on this device (keeps any job-tailoring extras already in the draft)
  useEffect(() => {
    if (!isReady) return;
    try {
      const prev = JSON.parse(localStorage.getItem("cvFormDraft") || "{}") || {};
      localStorage.setItem("cvFormDraft", JSON.stringify({ ...prev, personalInfo, workExperience, education, languages, skills, extraSections }));
      if (user) localStorage.setItem("cvDraftOwner", user.email);
    } catch (err) { console.error("Couldn't save draft:", err); }
  }, [isReady, personalInfo, workExperience, education, languages, skills, extraSections, user]);

  function handleSignOut() { clearLocalCv(); logout(); }

  function updatePersonalInfo(field, value) {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  }

  // -------------------- LANGUAGES --------------------
  function addLanguage() {
    setLanguages((prev) => [
      ...prev,
      { id: Date.now(), language: "", proficiency: "Fluent", isMotherTongue: false },
    ]);
  }
  function updateLanguage(id, field, value) {
    setLanguages((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }
  function removeLanguage(id) {
    setLanguages((prev) => prev.filter((l) => l.id !== id));
  }

  // -------------------- WORK EXPERIENCE FUNCTIONS --------------------
  // ROMAN URDU: Yeh bilkul wahi 3-function pattern hai jo Languages mein
  // seekha tha (add / update / remove) — bas fields alag hain. Ek dafa
  // pattern samajh lo, phir kisi bhi list ke liye reuse kar sakte ho.
  function addExperience() {
    setWorkExperience((prev) => [
      ...prev,
      { id: Date.now(), company: "", position: "", startDate: "", endDate: "", current: false, description: "" },
    ]);
  }
  function updateExperience(id, field, value) {
    setWorkExperience((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  }
  function removeExperience(id) {
    setWorkExperience((prev) => prev.filter((exp) => exp.id !== id));
  }

  // -------------------- EDUCATION FUNCTIONS --------------------
  function addEducation() {
    setEducation((prev) => [
      ...prev,
      { id: Date.now(), degree: "", institution: "", startDate: "", endDate: "", current: false },
    ]);
  }
  function updateEducation(id, field, value) {
    setEducation((prev) => prev.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu)));
  }
  function removeEducation(id) {
    setEducation((prev) => prev.filter((edu) => edu.id !== id));
  }

  // -------------------- SKILLS FUNCTIONS (tag input) --------------------
  // ROMAN URDU: Yeh Languages/Experience se ALAG pattern hai — yahan har
  // skill sirf ek chhoti "text chip" hai, poora object nahi. User type
  // karta hai, Enter dabata hai ya "+" button dabata hai, aur woh text
  // list mein chip ban kar add ho jata hai.
  function addSkill(type) {
    const value = skillDraft[type].trim();
    if (!value) return; // khaali text add mat karo
    setSkills((prev) => ({ ...prev, [type]: [...prev[type], value] }));
    setSkillDraft((prev) => ({ ...prev, [type]: "" })); // input box khaali kar do
  }
  function removeSkill(type, index) {
    setSkills((prev) => ({
      ...prev,
      // .filter() se sirf woh cheez hatao jiska INDEX match ho
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  }

  // -------------------- EXTRA SECTIONS FUNCTIONS --------------------
  function handleAddSection(type) {
    setExtraSections((prev) => [
      ...prev,
      {
        id: Date.now(),
        type,
        entries: [{ id: Date.now(), title: "", subtitle: "", date: "", description: "" }],
      },
    ]);
    setShowSectionModal(false);
  }
  function removeSection(sectionId) {
    setExtraSections((prev) => prev.filter((s) => s.id !== sectionId));
  }
  function addSectionEntry(sectionId) {
    setExtraSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              entries: [
                ...s.entries,
                { id: Date.now(), title: "", subtitle: "", date: "", description: "" },
              ],
            }
          : s
      )
    );
  }
  function updateSectionEntry(sectionId, entryId, field, value) {
    setExtraSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              entries: s.entries.map((e) => (e.id === entryId ? { ...e, [field]: value } : e)),
            }
      )
    );
  }
  function removeSectionEntry(sectionId, entryId) {
    setExtraSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId ? s : { ...s, entries: s.entries.filter((e) => e.id !== entryId) }
      )
    );
  }


  // Section types jo ALREADY add ho chuki hain — modal ko batana hai
  // taake dropdown mein dobara na dikhein
  const alreadyUsedTypes = ["Language skills", ...extraSections.map((s) => s.type)];

  // ==========================================================================
  // ROMAN URDU: Yeh check karta hai "kya user ne itni info bhar di hai ke
  // ek MEANINGFUL resume ban sake?" — sirf naam kaafi nahi, kam az kam
  // ek work experience YA education entry bhi honi chahiye. Agar yeh
  // false ho, hum download button ki jagah ek helpful message dikhayenge,
  // taake koi khaali PDF download na ho.
  // ==========================================================================
  const hasEnoughInfoForResume =
    personalInfo.fullName.trim() !== "" &&
    (workExperience.some((exp) => exp.company.trim() || exp.position.trim()) ||
      education.some((edu) => edu.degree.trim() || edu.institution.trim()));

  const hasDateError =
    workExperience.some((e) => dateOrderError(e.startDate, e.endDate, e.current)) ||
    education.some((e) => dateOrderError(e.startDate, e.endDate, e.current));

  function validate() {
    if (!hasEnoughInfoForResume) {
      setFormError("Please fill in your Full Name and at least one Work Experience or Education entry first.");
      return false;
    }
    if (hasDateError) {
      setFormError("Please fix the date fields marked in red first.");
      return false;
    }
    setFormError("");
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    const draft = { personalInfo, workExperience, education, languages, skills, extraSections };
    try { localStorage.setItem("cvFormDraft", JSON.stringify(draft)); } catch { /* ignore */ }
    if (!user) { navigate("/login", { state: { from: "/profile" } }); return; } // sign in, then land on Profile
    setSaveState("saving");
    try {
      await saveCv(draft, readHistory());
      navigate("/profile");
    } catch (e) {
      console.error(e);
      setSaveState("error");
      setFormError(e.status === 401 ? "Your session has expired. Please sign in again, then press Save CV." : "Couldn't save your CV. Check your connection and try again.");
    }
  }

  function handleDownload() {
    if (!validate()) return;
    downloadResumePDF({ personalInfo, workExperience, education, languages, skills, extraSections, tailoredExperience: [] });
  }

  return (
    <div className="cv-form-page">
      <header className="cvf-top">
        <Link to="/" className="cvf-brand">
          <FiFileText />
          <span><b>CV Pro</b><small>Build. Apply. Get Hired.</small></span>
        </Link>
        {user && (
          <div className="cvf-account">
            <Link to="/profile" className="cvf-profile-link">My Profile</Link>
            <span className="cvf-email" title={user.email}>{user.email}</span>
            <button type="button" onClick={handleSignOut}>Sign out</button>
          </div>
        )}
      </header>
      <div className="cvf-intro">
        <Link to="/" className="cvf-back"><FiArrowLeft /> Back</Link>
        <h1>Build Your <span>Europass CV</span></h1>
        <p>Fill in your details and create a professional CV in minutes. Everything is on this one page.</p>
      </div>

      <div className="cv-form-container">
        {/* ============ STEP 0: PERSONAL INFO ============ */}
        {(
          <>
            <Card icon={<FiUser />} title="Personal Information" subtitle="Name, contact details and summary" {...sec("personal", true)}>
              <div className="field-grid">
                <Field label="Full Name" required>
                  <input className="input" value={personalInfo.fullName} onChange={(e) => updatePersonalInfo("fullName", e.target.value)} placeholder="Muhammad Ahmad Khan" />
                </Field>
                <Field label="Professional Title" required>
                  <input className="input" value={personalInfo.professionalTitle} onChange={(e) => updatePersonalInfo("professionalTitle", e.target.value)} placeholder="Warehouse Worker" />
                </Field>
                <Field label="Email">
                  <input className="input" type="email" value={personalInfo.email} onChange={(e) => updatePersonalInfo("email", e.target.value)} placeholder="ahmad@email.com" />
                </Field>
                <Field label="Phone Number">
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ width: 190, flexShrink: 0 }}>
                      <SearchableSelect
                        options={COUNTRIES}
                        value={phoneCode}
                        placeholder="Select"
                        searchPlaceholder="e.g: France"
                        getSearchText={(c) => c.dial}
                        renderOption={(c) => `${flagEmoji(c.iso2)}  ${c.name}  ${c.dial}`}
                        onChange={(newCode) => {
                          setPhoneCode(newCode);
                          // ROMAN URDU: jo bhi PEHLE se number type kiya hua
                          // hai, us mein se purana "+xx " prefix hatao aur
                          // naya country code aage laga do
                          setPersonalInfo((prev) => ({
                            ...prev,
                            phone: `${newCode} ${prev.phone.replace(/^\+\d+\s*/, "")}`.trim(),
                          }));
                        }}
                      />
                    </div>
                    <input
                      className="input"
                      type="tel"
                      value={personalInfo.phone}
                      onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                      placeholder="e.g: 555 22 33..."
                    />
                  </div>
                </Field>
                <Field label="LinkedIn / Website" full>
                  <input className="input" value={personalInfo.linkedIn} onChange={(e) => updatePersonalInfo("linkedIn", e.target.value)} placeholder="linkedin.com/in/ahmad" />
                </Field>
                <Field label="About Me / Professional Summary" full>
                  <textarea
                    className="input textarea"
                    rows={3}
                    value={personalInfo.professionalSummary}
                    onChange={(e) => updatePersonalInfo("professionalSummary", e.target.value)}
                    placeholder="A short 2-3 sentence summary of your experience and strengths (optional — appears at the top of your CV)."
                  />
                </Field>
              </div>
            </Card>

            <Card icon={<FiGlobe />} title="Additional Information" subtitle="Nationality, date of birth, LinkedIn" {...sec("additional")}>
              <div className="field-grid">
                <Field label="Nationality">
                  <SearchableSelect
                    options={COUNTRIES}
                    value={personalInfo.nationality}
                    placeholder="Select"
                    searchPlaceholder="e.g: Pakistani"
                    getSearchText={(c) => c.demonym}
                    renderOption={(c) => c.demonym}
                    onChange={(demonym) => updatePersonalInfo("nationality", demonym)}
                  />
                </Field>
                <Field label="Place of Birth">
                  <input className="input" value={personalInfo.placeOfBirth} onChange={(e) => updatePersonalInfo("placeOfBirth", e.target.value)} placeholder="Lahore" />
                </Field>
                <Field label="Date of Birth">
                  <DobInput info={personalInfo} onPart={(part, v) => setPersonalInfo((prev) => applyDobPart(prev, part, v))} />
                </Field>
                <Field label="Gender">
                  <select className="input" value={personalInfo.gender} onChange={(e) => updatePersonalInfo("gender", e.target.value)}>
                    <option value="">Select...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </Field>
                <Field label="Address line 1" full>
                  <input className="input" value={personalInfo.addressLine1} onChange={(e) => updatePersonalInfo("addressLine1", e.target.value)} placeholder="e.g: Street name, P.O, Box" />
                </Field>
                <Field label="Address line 2" full>
                  <input className="input" value={personalInfo.addressLine2} onChange={(e) => updatePersonalInfo("addressLine2", e.target.value)} placeholder="Apartment, suite, unit, building, floor, etc." />
                </Field>
                <Field label="Postal code">
                  <input className="input" value={personalInfo.postalCode} onChange={(e) => updatePersonalInfo("postalCode", e.target.value)} placeholder="e.g: 0035482" />
                </Field>
                <Field label="City">
                  <input className="input" value={personalInfo.city} onChange={(e) => updatePersonalInfo("city", e.target.value)} placeholder="e.g: Paris" />
                </Field>
                <Field label="Country">
                  <SearchableSelect
                    options={COUNTRIES}
                    value={personalInfo.country}
                    placeholder="Select"
                    searchPlaceholder="e.g: France"
                    getSearchText={(c) => c.name}
                    renderOption={(c) => `${flagEmoji(c.iso2)}  ${c.name}`}
                    onChange={(name) => updatePersonalInfo("country", name)}
                  />
                </Field>
              </div>
            </Card>

            <Card icon={<FiMessageCircle />} title="Language Skills" subtitle="Languages you speak" action={{ label: "Add Language", onClick: () => { openSec("languages"); addLanguage(); } }} {...sec("languages")}>
              <p className="hint">List the languages you speak, and mark your native language as "mother tongue."</p>
              {languages.map((lang) => (
                <div className="language-row" key={lang.id}>
                  <input className="input" placeholder="Select language..." value={lang.language} onChange={(e) => updateLanguage(lang.id, "language", e.target.value)} />
                  <select className="input lang-select" value={lang.proficiency} onChange={(e) => updateLanguage(lang.id, "proficiency", e.target.value)}>
                    <option>Native</option>
                    <option>Fluent</option>
                    <option>Intermediate</option>
                    <option>Basic</option>
                  </select>
                  <label className="mother-tongue-toggle">
                    <input type="checkbox" checked={lang.isMotherTongue} onChange={(e) => updateLanguage(lang.id, "isMotherTongue", e.target.checked)} />
                    Mother tongue
                  </label>
                  {languages.length > 1 && (
                    <button className="remove-btn" onClick={() => removeLanguage(lang.id)}>✕</button>
                  )}
                </div>
              ))}
              <button className="add-btn" onClick={addLanguage}>+ Add Language</button>
            </Card>
          </>
        )}

        {/* ============ STEP 1: EXPERIENCE & SKILLS ============ */}
        {(
          <>
            <Card icon={<FiBriefcase />} title="Work Experience" subtitle="Add your work experience..." action={{ label: "Add Experience", onClick: () => { openSec("experience"); if (workExperience.every((e) => e.company || e.position)) addExperience(); } }} {...sec("experience")}>
              {workExperience.map((exp, index) => (
                <div className="entry-box" key={exp.id}>
                  {workExperience.length > 1 && (
                    <button className="entry-remove" onClick={() => removeExperience(exp.id)}>✕</button>
                  )}
                  <div className="field-grid">
                    <Field label="Company">
                      <input className="input" value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} placeholder="e.g. Al-Futtaim Group" />
                    </Field>
                    <Field label="Position">
                      <input className="input" value={exp.position} onChange={(e) => updateExperience(exp.id, "position", e.target.value)} placeholder="e.g. Warehouse Supervisor" />
                    </Field>
                    <Field label="Start Date">
                      <MonthYearInput value={exp.startDate} onChange={(v) => updateExperience(exp.id, "startDate", v)} />
                    </Field>
                    <Field label="End Date">
                      <MonthYearInput value={exp.endDate} disabled={exp.current} onChange={(v) => updateExperience(exp.id, "endDate", v)} />
                      <label className="current-toggle">
                        <input
                          type="checkbox"
                          checked={exp.current}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setWorkExperience((prev) => prev.map((x) => (x.id === exp.id ? { ...x, current: checked, endDate: checked ? "" : x.endDate } : x)));
                          }}
                        />
                        I currently work here
                      </label>
                      {dateOrderError(exp.startDate, exp.endDate, exp.current) && <p className="date-error">{dateOrderError(exp.startDate, exp.endDate, exp.current)}</p>}
                    </Field>
                    <Field label="Responsibilities & Achievements" full>
                      <textarea
                        className="input textarea"
                        rows={4}
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                        placeholder="Describe what you did day-to-day, and any achievements (numbers help!) — write naturally, AI will polish it later."
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <button className="add-btn" onClick={addExperience}>+ Add Another Job</button>
            </Card>

            <Card icon={<FiBook />} title="Education" subtitle="Add your education details..." action={{ label: "Add Education", onClick: () => { openSec("education"); if (education.every((e) => e.degree || e.institution)) addEducation(); } }} {...sec("education")}>
              {education.map((edu) => (
                <div className="entry-box" key={edu.id}>
                  {education.length > 1 && (
                    <button className="entry-remove" onClick={() => removeEducation(edu.id)}>✕</button>
                  )}
                  <div className="field-grid">
                    <Field label="Degree">
                      <input className="input" value={edu.degree} onChange={(e) => updateEducation(edu.id, "degree", e.target.value)} placeholder="e.g. BSc Computer Science" />
                    </Field>
                    <Field label="Institution">
                      <input className="input" value={edu.institution} onChange={(e) => updateEducation(edu.id, "institution", e.target.value)} placeholder="e.g. University of the Punjab" />
                    </Field>
                    <Field label="Start Date">
                      <MonthYearInput value={edu.startDate} onChange={(v) => updateEducation(edu.id, "startDate", v)} />
                    </Field>
                    <Field label="End Date">
                      <MonthYearInput value={edu.endDate} disabled={edu.current} onChange={(v) => updateEducation(edu.id, "endDate", v)} />
                      <label className="current-toggle">
                        <input
                          type="checkbox"
                          checked={edu.current}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEducation((prev) => prev.map((x) => (x.id === edu.id ? { ...x, current: checked, endDate: checked ? "" : x.endDate } : x)));
                          }}
                        />
                        I'm currently studying here
                      </label>
                      {dateOrderError(edu.startDate, edu.endDate, edu.current) && <p className="date-error">{dateOrderError(edu.startDate, edu.endDate, edu.current)}</p>}
                    </Field>
                  </div>
                </div>
              ))}
              <button className="add-btn" onClick={addEducation}>+ Add Another Degree</button>
            </Card>

            <Card icon={<FiStar />} title="Skills" subtitle="Add your skills..." action={{ label: "Add Skills", onClick: () => openSec("skills") }} {...sec("skills")}>
              <SkillTagInput
                label="Technical Skills"
                placeholder="e.g. Excel, Forklift Operation, AutoCAD"
                items={skills.technical}
                draft={skillDraft.technical}
                onDraftChange={(v) => setSkillDraft((prev) => ({ ...prev, technical: v }))}
                onAdd={() => addSkill("technical")}
                onRemove={(i) => removeSkill("technical", i)}
              />
              <SkillTagInput
                label="Soft Skills"
                placeholder="e.g. Team Leadership, Communication"
                items={skills.soft}
                draft={skillDraft.soft}
                onDraftChange={(v) => setSkillDraft((prev) => ({ ...prev, soft: v }))}
                onAdd={() => addSkill("soft")}
                onRemove={(i) => removeSkill("soft", i)}
              />
            </Card>

            {/* ============ EXTRA SECTIONS (dynamically added) ============ */}
            {extraSections.map((section, sIndex) => (
              <Card
                key={section.id}
                icon={<FiPlus />}
                title={section.type}
                accent={sIndex % 2 === 0 ? "purple" : "teal"}
                {...sec("extra-" + section.id, true)}
              >
                <button className="entry-remove section-remove" onClick={() => removeSection(section.id)}>
                  ✕ Remove Section
                </button>
                {section.entries.map((entry) => (
                  <div className="entry-box" key={entry.id}>
                    {section.entries.length > 1 && (
                      <button className="entry-remove" onClick={() => removeSectionEntry(section.id, entry.id)}>✕</button>
                    )}
                    <div className="field-grid">
                      <Field label="Title">
                        <input className="input" value={entry.title} onChange={(e) => updateSectionEntry(section.id, entry.id, "title", e.target.value)} placeholder="e.g. Google Data Analytics Certificate" />
                      </Field>
                      <Field label="Organization / Issuer">
                        <input className="input" value={entry.subtitle} onChange={(e) => updateSectionEntry(section.id, entry.id, "subtitle", e.target.value)} placeholder="e.g. Coursera" />
                      </Field>
                      <Field label="Date" full>
                        <MonthYearInput value={entry.date} onChange={(v) => updateSectionEntry(section.id, entry.id, "date", v)} />
                      </Field>
                      <Field label="Description" full>
                        <textarea className="input textarea" rows={3} value={entry.description} onChange={(e) => updateSectionEntry(section.id, entry.id, "description", e.target.value)} placeholder="Any extra detail worth mentioning..." />
                      </Field>
                    </div>
                  </div>
                ))}
                <button className="add-btn" onClick={() => addSectionEntry(section.id)}>+ Add Another Entry</button>
              </Card>
            ))}

            {/* Yeh button hi modal kholta hai */}
            <button className="add-section-btn" onClick={() => setShowSectionModal(true)}>
              + Add New Section
            </button>
          </>
        )}

        {formError && <div className="error-box">{formError}</div>}
        <div className="cvf-actions">
          <button type="button" className="cvf-reset" onClick={handleDownload}><FiDownload /> Download CV</button>
          <button type="button" className="cvf-preview-btn" onClick={handleSave} disabled={saveState === "saving"}>
            <FiSave /> {saveState === "saving" ? "Saving…" : "Save CV"}
          </button>
        </div>
      </div>

      {/* Modal sirf tab render hota hai jab showSectionModal true ho —
          yeh bhi conditional rendering hai, jaisa currentStep ke liye kiya tha */}
      {showSectionModal && (
        <AddSectionModal
          excludeTypes={alreadyUsedTypes}
          onAdd={handleAddSection}
          onClose={() => setShowSectionModal(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function Card({ icon, title, subtitle, accent = "blue", collapsible, open, onToggle, action, anchor, children }) {
  if (!collapsible) {
    return (
      <div className={"card card-accent-" + accent}>
        <div className="card-title">
          <span className="card-icon">{icon}</span> {title}
        </div>
        {children}
      </div>
    );
  }
  return (
    <section id={anchor} className={"card acc" + (open ? " acc-open" : "")}>
      <div
        className="acc-head"
        role="button"
        tabIndex={0}
        aria-expanded={!!open}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      >
        <span className="acc-icon">{icon}</span>
        <span className="acc-text">
          <b>{title}</b>
          {subtitle && <small>{subtitle}</small>}
        </span>
        {action && (
          <button type="button" className="acc-action" onClick={(e) => { e.stopPropagation(); action.onClick(); }}>
            + {action.label}
          </button>
        )}
        <FiChevronDown className="acc-chevron" />
      </div>
      {open && <div className="acc-body">{children}</div>}
    </section>
  );
}

function Field({ label, required, full, children }) {
  return (
    <div className={"field" + (full ? " field-full" : "")}>
      <label className="field-label">
        {label} {required && <span className="required-star">*</span>}
      </label>
      {children}
    </div>
  );
}

// Reusable "tag input" — type + Enter/button se chip add hota hai
function SkillTagInput({ label, placeholder, items, draft, onDraftChange, onAdd, onRemove }) {
  return (
    <div className="skill-group">
      <label className="field-label">{label}</label>
      <div className="skill-input-row">
        <input
          className="input"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={placeholder}
          // ROMAN URDU: "onKeyDown" har keyboard press pe chalta hai.
          // Hum check karte hain agar dabaya gaya key "Enter" tha, to
          // form submit hone se roko (preventDefault) aur skill add karo.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <button className="skill-add-btn" onClick={onAdd}>Add</button>
      </div>
      <div className="skill-chips">
        {items.map((item, i) => (
          <span className="skill-chip" key={i}>
            {item}
            <button onClick={() => onRemove(i)}>✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}
