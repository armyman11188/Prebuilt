// ============================================================================
// src/utils/cvStore.js  (NEW) — one place for saving / loading the CV
// ============================================================================
const LOCAL_KEYS = [
  "cvFormDraft", "cvTailoredHistory", "voiceInterviewData",
  "atsCheckData", "atsMissingItems", "cvDraftOwner",
];

// Call on sign-out so the next person on this browser never sees your CV.
export function clearLocalCv() {
  LOCAL_KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
}

// Remember WHOSE draft is in localStorage. If a different account signs in
// on the same browser, the old draft is wiped instead of being shown to them.
export function claimLocalFor(email) {
  if (!email) return;
  try {
    const owner = localStorage.getItem("cvDraftOwner");
    if (owner && owner !== email) clearLocalCv();
    localStorage.setItem("cvDraftOwner", email);
  } catch { /* ignore */ }
}

// "Is there a real CV here?" (same rule ResultPage uses)
export function hasCvContent(d) {
  if (!d) return false;
  return (d.personalInfo?.fullName || "").trim() !== "" &&
    ((d.workExperience || []).some((e) => (e.company || "").trim() || (e.position || "").trim()) ||
     (d.education || []).some((e) => (e.degree || "").trim() || (e.institution || "").trim()));
}

// The saved CV = only the base form data (no job-specific extras).
export function baseOf(d) {
  return {
    personalInfo: d.personalInfo || {},
    workExperience: d.workExperience || [],
    education: d.education || [],
    languages: d.languages || [],
    skills: d.skills || { technical: [], soft: [] },
    extraSections: d.extraSections || [],
  };
}

export function readHistory() {
  try { return JSON.parse(localStorage.getItem("cvTailoredHistory")) || []; } catch { return []; }
}
export function writeHistory(h) {
  try { localStorage.setItem("cvTailoredHistory", JSON.stringify(h)); } catch { /* ignore */ }
}

export async function fetchCv() {
  const res = await fetch("/api/cv");
  if (!res.ok) { const e = new Error("load failed"); e.status = res.status; throw e; }
  return res.json(); // { draft, history }
}

export async function saveCv(draft, history) {
  const res = await fetch("/api/cv", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft, history: history || [] }),
  });
  if (!res.ok) { const e = new Error("save failed"); e.status = res.status; throw e; }
}
