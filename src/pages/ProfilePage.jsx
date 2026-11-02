// ============================================================================
// src/pages/ProfilePage.jsx  (NEW) — route: /profile
//   Left : your most recent SAVED CV
//   Right: paste a job description -> ATS-friendly tailored CV + cover letter
//   No saved CV anywhere -> sent straight to /cv-form to create one.
// ============================================================================
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  FiFileText, FiEdit3, FiDownload, FiEye, FiTarget, FiZap, FiBarChart2,
  FiMail, FiPhone, FiTrash2, FiAlertCircle,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { buildResumeText, downloadResumePDF } from "../utils/cvPdf";
import { tailorCv } from "../utils/tailorCv";
import {
  claimLocalFor, clearLocalCv, fetchCv, saveCv, hasCvContent, baseOf, readHistory, writeHistory,
} from "../utils/cvStore";
import "./ProfilePage.css";

function readLocalDraft() {
  try { return JSON.parse(localStorage.getItem("cvFormDraft")); } catch { return null; }
}
function commitLocal(d) {
  try { localStorage.setItem("cvFormDraft", JSON.stringify(d)); } catch { /* ignore */ }
}

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState("loading"); // loading | ready | empty | error
  const [errorMsg, setErrorMsg] = useState("");
  const [offline, setOffline] = useState(false);
  const [draft, setDraft] = useState(null);
  const [history, setHistory] = useState([]);
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiError, setAiError] = useState("");

  const email = user?.email;
  useEffect(() => {
    if (authLoading || !email) return;
    let cancelled = false;
    claimLocalFor(email);
    const local = readLocalDraft();
    (async () => {
      try {
        const d = await fetchCv();
        if (cancelled) return;
        const h = Array.isArray(d.history) ? d.history : readHistory();
        setHistory(h); writeHistory(h);
        if (hasCvContent(d.draft)) { setDraft(d.draft); setStatus("ready"); }
        else if (hasCvContent(local)) {
          // CV was built while signed out / before saving — keep it and store it in the account
          setDraft(local); setStatus("ready");
          saveCv(baseOf(local), h).catch(() => {});
        } else setStatus("empty");
      } catch (e) {
        if (cancelled) return;
        if (hasCvContent(local)) { setDraft(local); setHistory(readHistory()); setOffline(true); setStatus("ready"); }
        else {
          setErrorMsg(e.status === 401 ? "Your session has expired. Please sign in again." : "Couldn't load your saved CV. Check your connection and try again.");
          setStatus("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, email]);

  if (authLoading) return <div className="pf-page"><div className="pf-center">Loading…</div></div>;
  if (!user) return <Navigate to="/login" state={{ from: "/profile" }} replace />;
  if (status === "empty") return <Navigate to="/cv-form" replace />;

  function handleSignOut() {
    clearLocalCv();
    Promise.resolve(logout()).finally(() => navigate("/"));
  }

  const header = (
    <header className="pf-top">
      <Link to="/" className="pf-brand"><FiFileText /><span><b>CV Pro</b><small>Build. Apply. Get Hired.</small></span></Link>
      <div className="pf-account">
        <span className="pf-email" title={email}>{email}</span>
        <button type="button" onClick={handleSignOut}>Sign out</button>
      </div>
    </header>
  );

  if (status === "loading") return <div className="pf-page">{header}<div className="pf-center">Loading your CV…</div></div>;
  if (status === "error") {
    return (
      <div className="pf-page">{header}
        <div className="pf-center">
          <p>{errorMsg}</p>
          <button type="button" className="pf-btn pf-btn-primary" onClick={() => window.location.reload()}>Try again</button>{" "}
          <Link to="/cv-form" className="pf-btn pf-btn-outline">Create a CV</Link>
        </div>
      </div>
    );
  }

  const base = baseOf(draft);
  const { personalInfo, workExperience, education, skills } = base;
  const allSkills = [...(skills.technical || []), ...(skills.soft || [])];
  const initials = (personalInfo.fullName || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const jobsCount = workExperience.filter((e) => e.company?.trim() || e.position?.trim()).length;
  const eduCount = education.filter((e) => e.degree?.trim() || e.institution?.trim()).length;
  const pdfData = { ...base, tailoredExperience: [] };

  function editCv() { commitLocal({ ...base }); navigate("/cv-form"); }
  function previewCv() { commitLocal({ ...base }); navigate("/result"); }

  function checkAts() {
    if (!jd.trim()) { setAiError("Paste a job description first."); return; }
    const resumeText = buildResumeText(personalInfo, workExperience, education, skills, base.extraSections, []);
    localStorage.setItem("atsCheckData", JSON.stringify({ resumeText, jobDescription: jd }));
    navigate("/ats-score");
  }

  async function createTailored() {
    setAiError("");
    if (!jd.trim()) { setAiError("Paste a job description first."); return; }
    setBusy(true);
    try {
      const parsed = await tailorCv({ personalInfo, workExperience, skills, jobDescription: jd });
      const entry = {
        id: Date.now(), companyName: parsed.companyName || "", jobTitle: parsed.jobTitle || "",
        jobDescription: jd, tailoredExperience: parsed.tailoredExperience || [], coverLetter: parsed.coverLetter || "",
      };
      const next = [entry, ...history].slice(0, 20);
      setHistory(next); writeHistory(next);
      commitLocal({ ...base, jobDescription: jd, companyName: entry.companyName, jobTitle: entry.jobTitle, tailoredExperience: entry.tailoredExperience, coverLetter: entry.coverLetter });
      saveCv(base, next).catch(() => {});
      navigate("/result");
    } catch (e) {
      console.error(e);
      setAiError("Couldn't generate your tailored CV. Make sure the backend server is running and your API key is set in .env.");
    } finally { setBusy(false); }
  }

  function openHistory(h) {
    commitLocal({ ...base, jobDescription: h.jobDescription, companyName: h.companyName, jobTitle: h.jobTitle, tailoredExperience: h.tailoredExperience, coverLetter: h.coverLetter });
    navigate("/result");
  }
  function deleteHistory(id) {
    const next = history.filter((h) => h.id !== id);
    setHistory(next); writeHistory(next);
    saveCv(base, next).catch(() => {});
  }

  return (
    <div className="pf-page">
      {header}
      <div className="pf-title">
        <h1>My <span>Profile</span></h1>
        <p>Your saved CV, and a quick way to tailor it for any job.</p>
      </div>
      {offline && <div className="pf-warn"><FiAlertCircle /> Couldn't reach the server — showing the copy saved on this device.</div>}

      <div className="pf-grid">
        {/* ---------- LEFT: saved CV ---------- */}
        <section className="pf-card">
          <div className="pf-card-tag">Your saved CV</div>
          <div className="pf-cv-head">
            <div className="pf-avatar">{initials}</div>
            <div>
              <h2>{personalInfo.fullName}</h2>
              {personalInfo.professionalTitle && <div className="pf-role">{personalInfo.professionalTitle}</div>}
            </div>
          </div>
          <div className="pf-contact">
            {personalInfo.email && <span><FiMail /> {personalInfo.email}</span>}
            {personalInfo.phone && <span><FiPhone /> {personalInfo.phone}</span>}
          </div>
          <div className="pf-stats">
            <div><b>{jobsCount}</b><small>Jobs</small></div>
            <div><b>{eduCount}</b><small>Education</small></div>
            <div><b>{allSkills.length}</b><small>Skills</small></div>
          </div>
          {allSkills.length > 0 && (
            <div className="pf-chips">{allSkills.slice(0, 10).map((s, i) => <span key={i}>{s}</span>)}{allSkills.length > 10 && <span className="more">+{allSkills.length - 10}</span>}</div>
          )}
          <div className="pf-actions">
            <button type="button" className="pf-btn pf-btn-outline" onClick={editCv}><FiEdit3 /> Edit CV</button>
            <button type="button" className="pf-btn pf-btn-outline" onClick={previewCv}><FiEye /> Preview</button>
            <button type="button" className="pf-btn pf-btn-primary" onClick={() => downloadResumePDF(pdfData)}><FiDownload /> Download PDF</button>
          </div>
        </section>

        {/* ---------- RIGHT: job description ---------- */}
        <section className="pf-card pf-card-job">
          <div className="pf-card-tag pf-tag-teal"><FiTarget /> CV for a job</div>
          <h2>Paste the job description</h2>
          <p className="pf-hint">We'll rewrite your experience with the job's keywords, check your ATS score and write a cover letter naming the company.</p>
          <textarea className="pf-textarea" rows={10} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the full job posting here…" />
          {aiError && <div className="pf-error">{aiError}</div>}
          <div className="pf-actions">
            <button type="button" className="pf-btn pf-btn-teal" onClick={createTailored} disabled={busy}><FiZap /> {busy ? "Generating…" : "Create ATS-friendly CV"}</button>
            <button type="button" className="pf-btn pf-btn-outline" onClick={checkAts} disabled={busy}><FiBarChart2 /> Check ATS score</button>
          </div>

          {history.length > 0 && (
            <div className="pf-history">
              <div className="pf-history-title">Previous applications</div>
              {history.map((h) => (
                <div className="pf-history-row" key={h.id}>
                  <span><b>{h.jobTitle || "Job"}{h.companyName ? " at " + h.companyName : ""}</b><small>{new Date(h.id).toLocaleDateString()}</small></span>
                  <button type="button" onClick={() => openHistory(h)}>Open</button>
                  <button type="button" className="del" aria-label="Delete" onClick={() => deleteHistory(h.id)}><FiTrash2 /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
