// ============================================================================
// src/pages/ResultPage.jsx  (nayi file)  — route: /result
// ROMAN URDU: "Preview & Download CV" dabane par yeh naya page khulta hai.
//   Left  : ATS score card (upar se beech tak, sticky)
//   Center: CV preview
//   Neeche: Save / Download buttons, phir Cover Letter (professional letter look)
// Data "cvFormDraft" (localStorage) se aata hai — wahi jo CVForm save karta hai.
// ============================================================================
import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  FiFileText, FiArrowLeft, FiDownload, FiSave, FiEdit3, FiCheck, FiX, FiCopy,
  FiMail, FiPhone, FiMapPin, FiCheckCircle, FiAlertCircle, FiTarget, FiArrowRight,
} from "react-icons/fi";
import ResumePreview from "../components/ResumePreview";
import { analyzeAts, MatchRateGauge } from "./AtsScore";
import { buildResumeText, downloadResumePDF, downloadCoverLetterPDF, formatAddress } from "../utils/cvPdf";
import "./ResultPage.css";

function loadDraft() {
  try { return JSON.parse(localStorage.getItem("cvFormDraft")); } catch { return null; }
}

// Cover letter text ko professional letter ke hisson mein todta hai
function splitLetter(text, fullName) {
  const paras = String(text || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  let greeting = "Dear Hiring Team,";
  if (paras.length && /^dear\b/i.test(paras[0])) {
    const lines = paras.shift().split("\n");
    greeting = lines[0].trim();
    const rest = lines.slice(1).join(" ").trim();
    if (rest) paras.unshift(rest);
  }
  let closing = ["Sincerely,", fullName];
  const last = paras[paras.length - 1];
  if (last && /^(sincerely|best regards|kind regards|warm regards|regards|yours)/i.test(last)) {
    closing = paras.pop().split("\n").map((l) => l.trim()).filter(Boolean);
    if (closing.length === 1) closing.push(fullName);
  }
  return { greeting, paras, closing };
}

function AtsCard({ ats, hasJd, onFullReport }) {
  if (!hasJd) {
    return (
      <aside className="rp-ats rp-ats-empty">
        <div className="rp-ats-head"><FiTarget /> ATS Score</div>
        <p>Add a job description to see how well your CV matches it.</p>
        <Link to="/profile" className="rp-btn rp-btn-soft">Add job description <FiArrowRight /></Link>
      </aside>
    );
  }
  const total = ats.matchedSkills.length;
  const found = ats.matchedSkills.filter((s) => s.resumeCount > 0).length;
  const missing = ats.matchedSkills.filter((s) => s.resumeCount === 0).slice(0, 6);
  const verdict = ats.matchRate >= 75 ? "Strong match" : ats.matchRate >= 50 ? "Needs some work" : "Low match";
  const checks = [
    ["Contact details", ats.hasEmail && ats.hasPhone],
    ["Work experience section", ats.hasExperienceSection],
    ["Education section", ats.hasEducationSection],
  ];
  return (
    <aside className="rp-ats">
      <div className="rp-ats-head"><FiTarget /> ATS Score</div>
      <div className="rp-gauge"><MatchRateGauge percent={ats.matchRate} /></div>
      <div className="rp-verdict">{verdict}</div>
      <div className="rp-ats-sub">{total > 0 ? `${found} of ${total} job keywords found in your CV` : "No standard keywords detected in the job description"}</div>
      <ul className="rp-checks">
        {checks.map(([label, ok]) => (
          <li key={label} className={ok ? "ok" : "bad"}>{ok ? <FiCheckCircle /> : <FiAlertCircle />} {label}</li>
        ))}
      </ul>
      {missing.length > 0 && (
        <div className="rp-missing">
          <div className="rp-missing-title">Missing keywords</div>
          <div className="rp-chips">{missing.map((m) => <span key={m.skill}>{m.skill}</span>)}</div>
        </div>
      )}
      <button type="button" className="rp-btn rp-btn-soft" onClick={onFullReport}>Full ATS report <FiArrowRight /></button>
    </aside>
  );
}

function LetterPaper({ personalInfo, companyName, jobTitle, coverLetter }) {
  const name = personalInfo.fullName || "Your Name";
  const { greeting, paras, closing } = splitLetter(coverLetter, name);
  const address = formatAddress(personalInfo);
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <article className="rp-letter-paper">
      <header className="rp-letter-head">
        <h3>{name}</h3>
        {personalInfo.professionalTitle && <div className="rp-letter-role">{personalInfo.professionalTitle}</div>}
        <div className="rp-letter-contact">
          {personalInfo.email && <span><FiMail /> {personalInfo.email}</span>}
          {personalInfo.phone && <span><FiPhone /> {personalInfo.phone}</span>}
          {address && <span><FiMapPin /> {address}</span>}
        </div>
      </header>
      <div className="rp-letter-date">{today}</div>
      <div className="rp-letter-to">
        <b>Hiring Team</b>
        {companyName && <div>{companyName}</div>}
      </div>
      {jobTitle && <div className="rp-letter-subject"><span>Subject:</span> Application for the position of {jobTitle}</div>}
      <p className="rp-letter-greet">{greeting}</p>
      {paras.map((p, i) => <p key={i} className="rp-letter-p">{p}</p>)}
      <div className="rp-letter-close">
        {closing.map((l, i) => <div key={i} className={i === 0 ? "" : "rp-letter-sign"}>{l}</div>)}
      </div>
    </article>
  );
}

export default function ResultPage() {
  const navigate = useNavigate();
  const draft = useMemo(loadDraft, []);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [copied, setCopied] = useState(false);

  const enough = !!draft && (draft.personalInfo?.fullName || "").trim() !== "" &&
    ((draft.workExperience || []).some((e) => e.company?.trim() || e.position?.trim()) ||
     (draft.education || []).some((e) => e.degree?.trim() || e.institution?.trim()));

  const jd = (draft?.jobDescription || "").trim();
  const resumeText = useMemo(() => {
    if (!enough) return "";
    const d = draft;
    return buildResumeText(d.personalInfo, d.workExperience || [], d.education || [], d.skills || { technical: [], soft: [] }, d.extraSections || [], d.tailoredExperience || []);
  }, [draft, enough]);
  const ats = useMemo(() => (enough && jd ? analyzeAts(resumeText, jd) : null), [enough, jd, resumeText]);

  if (!enough) return <Navigate to="/cv-form" replace />;

  const { personalInfo, workExperience, education, skills, extraSections, tailoredExperience = [], coverLetter = "", companyName = "", jobTitle = "" } = draft;
  const languages = draft.languages || [];
  const pdfData = { personalInfo, workExperience, education, languages, skills: skills || { technical: [], soft: [] }, extraSections: extraSections || [], tailoredExperience };

  async function saveCV() {
    setSaveState("saving");
    try {
      let history = [];
      try { history = JSON.parse(localStorage.getItem("cvTailoredHistory")) || []; } catch { /* ignore */ }
      const res = await fetch("/api/cv", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, history }),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch { setSaveState("error"); }
    setTimeout(() => setSaveState("idle"), 3000);
  }
  async function copyLetter() {
    try { await navigator.clipboard.writeText(coverLetter); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }
  function openFullReport() {
    localStorage.setItem("atsCheckData", JSON.stringify({ resumeText, jobDescription: jd }));
    navigate("/ats-score");
  }

  return (
    <div className="rp-page">
      <header className="rp-top">
        <Link to="/" className="rp-brand"><FiFileText /><span><b>CV Pro</b><small>Build. Apply. Get Hired.</small></span></Link>
        <Link to="/cv-form" className="rp-back"><FiArrowLeft /> Back to edit</Link>
      </header>

      <div className="rp-title">
        <h1>Your CV is <span>ready</span></h1>
        <p>{jobTitle || companyName ? `Tailored${jobTitle ? " for " + jobTitle : ""}${companyName ? " at " + companyName : ""}. ` : ""}Review it, save it and download the PDF.</p>
      </div>

      <div className="rp-grid">
        <div className="rp-left"><AtsCard ats={ats} hasJd={!!jd} onFullReport={openFullReport} /></div>

        <main className="rp-main">
          <div className="rp-paper"><ResumePreview {...pdfData} /></div>

          <div className="rp-actions">
            <button type="button" className="rp-btn rp-btn-outline" onClick={saveCV} disabled={saveState === "saving"}>
              {saveState === "saved" ? <><FiCheck /> Saved</> : saveState === "error" ? <><FiX /> Could not save</> : <><FiSave /> {saveState === "saving" ? "Saving…" : "Save"}</>}
            </button>
            <button type="button" className="rp-btn rp-btn-primary" onClick={() => downloadResumePDF(pdfData)}><FiDownload /> Download CV (PDF)</button>
            <Link to="/cv-form" className="rp-btn rp-btn-ghost"><FiEdit3 /> Edit CV</Link>
          </div>

          <section className="rp-letter">
            <div className="rp-letter-top">
              <div>
                <h2>Cover Letter</h2>
                <p>{coverLetter ? `Written for ${jobTitle || "this role"}${companyName ? " at " + companyName : ""}.` : "Generate one from a job description."}</p>
              </div>
              {coverLetter && (
                <div className="rp-letter-actions">
                  <button type="button" className="rp-btn rp-btn-outline" onClick={copyLetter}>{copied ? <><FiCheck /> Copied</> : <><FiCopy /> Copy text</>}</button>
                  <button type="button" className="rp-btn rp-btn-primary" onClick={() => downloadCoverLetterPDF({ personalInfo, companyName, jobTitle, coverLetter })}><FiDownload /> Download (PDF)</button>
                </div>
              )}
            </div>
            {coverLetter ? (
              <LetterPaper personalInfo={personalInfo} companyName={companyName} jobTitle={jobTitle} coverLetter={coverLetter} />
            ) : (
              <div className="rp-letter-empty">
                <p>No cover letter yet. Open your profile, paste a job description and click <b>Create ATS-friendly CV</b>.</p>
                <Link to="/profile" className="rp-btn rp-btn-primary">Go to my profile <FiArrowRight /></Link>
              </div>
            )}
          </section>
        </main>
        <div className="rp-right" aria-hidden="true" />
      </div>
    </div>
  );
}
