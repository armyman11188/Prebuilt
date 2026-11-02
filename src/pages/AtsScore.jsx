// ============================================================================
// src/pages/AtsScore.jsx
//
// ROMAN URDU EXPLANATION:
// Yeh page CVForm ke "Check ATS Score" button se khulta hai. Yeh KOI AI
// call NAHI karta (isliye INSTANT hai, koi wait nahi) — sab kuch plain
// JavaScript text-matching se hota hai, browser ke andar, turant.
//
// Kaam karne ka tareeqa (jaisa Jobscan/real ATS checkers karte hain):
// 1. Job description ke text mein se "skills/keywords" dhoondo — ek badi
//    built-in dictionary (SKILL_LIBRARY) ke against match karke.
// 2. Har mile hue keyword ko Resume text mein bhi dhoondo, aur count karo
//    kitni baar Resume mein hai vs kitni baar Job Description mein hai.
// 3. Contact info, Section Headings, aur Job Title match — simple
//    text-presence checks se pata chalte hain.
// 4. Sab cheezon ko weight de kar ek overall "Match Rate %" banao.
// 5. Resume aur Job Description dono text panels mein matched/missing
//    keywords ko highlight karke dikhao.
//
// Styling website ke existing theme (CVForm.css) se match karti hai —
// dekho AtsScore.css.
// ============================================================================
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./AtsScore.css";

const SKILL_LIBRARY = [
  "JavaScript", "TypeScript", "Python", "Java", "PHP", "C++", "C#", "Ruby", "Go", "Rust", "Swift", "Kotlin",
  "React", "React.js", "Vue.js", "Vue", "Angular", "Node.js", "Express", "Next.js", "Nuxt.js", "Svelte",
  "Symfony", "Laravel", "Django", "Flask", "Spring Boot", "ASP.NET", "Ruby on Rails",
  "HTML", "CSS", "SCSS", "Sass", "Tailwind CSS", "Bootstrap", "jQuery",
  "SQL", "NoSQL", "MongoDB", "PostgreSQL", "MySQL", "Redis", "Firebase", "GraphQL", "REST API", "Microservices",
  "Docker", "Kubernetes", "Ansible", "Jenkins", "CI/CD", "Git", "GitHub", "GitLab", "AWS", "Azure", "Google Cloud",
  "Linux", "Nginx", "Terraform", "Webpack", "Vite",
  "Figma", "Adobe XD", "Photoshop", "UI/UX", "WordPress", "Shopify", "SEO", "Google Analytics",
  "Machine Learning", "Data Analysis", "Excel", "Power BI", "Tableau", "TensorFlow", "PyTorch", "LLMs",
  "Project Management", "Agile", "Scrum", "Time Management", "Communication", "Teamwork", "Team Leadership",
  "Problem Solving", "Leadership", "Customer Service", "Sales", "Marketing", "Negotiation", "Advertising",
  "Quality Assurance", "Documentation", "Reporting", "Organizational Skills", "Attention to Detail",
  "Forklift Operation", "Welding", "Monitoring", "Troubleshooting", "Networking", "Cybersecurity",
  "Root Cause Analysis", "Cross-functional Collaboration", "Stakeholder Management",
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countOccurrences(text, skill) {
  if (!text) return 0;
  const pattern = new RegExp(`(?<![a-zA-Z0-9])${escapeRegex(skill)}(?![a-zA-Z0-9])`, "gi");
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

export function analyzeAts(resumeText, jobDescription) {
  const resumeLower = resumeText.toLowerCase();

  const matchedSkills = SKILL_LIBRARY
    .map((skill) => ({
      skill,
      jdCount: countOccurrences(jobDescription, skill),
      resumeCount: countOccurrences(resumeText, skill),
    }))
    .filter((s) => s.jdCount > 0)
    .sort((a, b) => b.jdCount - a.jdCount);

  const skillsFoundInResume = matchedSkills.filter((s) => s.resumeCount > 0).length;
  const skillsMatchRatio = matchedSkills.length > 0 ? skillsFoundInResume / matchedSkills.length : 1;

  const hasAddress = /\b(street|road|city|address|home|lahore|karachi|islamabad|[a-z]+,\s*[a-z]+)\b/i.test(resumeText) || resumeText.split("\n").some((l) => l.length > 8 && /,/.test(l));
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText);
  const hasPhone = /(\+?\d[\d\s-]{7,}\d)/.test(resumeText);

  const hasEducationSection = /education/i.test(resumeText);
  const hasExperienceSection = /experience/i.test(resumeText);

  let jobTitleGuess = "";
  const titlePatternMatch = jobDescription.match(/(?:position|job title|role|title)\s*[:\-]\s*([^\n]{3,60})/i);
  if (titlePatternMatch) {
    jobTitleGuess = titlePatternMatch[1].trim();
  } else {
    jobTitleGuess = jobDescription.split("\n").find((l) => l.trim().length > 3 && l.trim().length < 60) || "";
  }
  const jobTitleFoundInResume = jobTitleGuess
    ? resumeLower.includes(jobTitleGuess.toLowerCase().trim())
    : false;

  const contactScore = ([hasAddress, hasEmail, hasPhone].filter(Boolean).length / 3) * 100;
  const sectionScore = ([hasEducationSection, hasExperienceSection].filter(Boolean).length / 2) * 100;
  const skillsScore = skillsMatchRatio * 100;
  const titleScore = jobTitleFoundInResume ? 100 : 40;

  const matchRate = Math.round(
    contactScore * 0.15 + sectionScore * 0.15 + skillsScore * 0.55 + titleScore * 0.15
  );

  return {
    matchRate: Math.max(0, Math.min(100, matchRate)),
    hasAddress, hasEmail, hasPhone,
    hasEducationSection, hasExperienceSection,
    jobTitleGuess: jobTitleGuess.slice(0, 60),
    jobTitleFoundInResume,
    matchedSkills,
    skillsFoundInResume,
  };
}

export function MatchRateGauge({ percent }) {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 75 ? "#22c55e" : percent >= 50 ? "#f5a623" : "#ef4444";

  return (
    <div style={{ position: "relative", width: 180, height: 180 }}>
      <svg width="180" height="180" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#eef2ff" strokeWidth="16" />
        <circle
          cx="100" cy="100" r={radius} fill="none"
          stroke={color} strokeWidth="16" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36, fontWeight: 700, color: "#1e293b",
      }}>
        {percent}<span style={{ fontSize: 20, marginLeft: 2 }}>%</span>
      </div>
    </div>
  );
}

function CheckRow({ ok, children }) {
  return (
    <div className="ats-check-row">
      <span className={`ats-check-icon ${ok ? "ok" : "bad"}`}>{ok ? "✓" : "✕"}</span>
      <span className="ats-check-text">{children}</span>
    </div>
  );
}

function HighlightedText({ text, skills }) {
  if (!text) return null;
  if (skills.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${skills.map((s) => escapeRegex(s.skill)).join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const match = skills.find((s) => s.skill.toLowerCase() === part.toLowerCase());
        if (!match) return <span key={i}>{part}</span>;
        const missingFromResume = match.resumeCount === 0;
        return (
          <span key={i} className={missingFromResume ? "ats-highlight-missing" : "ats-highlight-match"}>
            {part}
          </span>
        );
      })}
    </>
  );
}

function HighlightedResumeText({ text, skills }) {
  const relevant = skills.filter((s) => s.resumeCount > 0);
  return <HighlightedText text={text} skills={relevant} />;
}

// ==========================================================================
// ROMAN URDU: Yeh analyzeAts() ke result se ek SEEDHI, readable "kya theek
// karna hai" list banata hai — CVForm.jsx ke ATS Checklist card mein
// dikhane ke liye. Sirf woh cheezein shamil hoti hain jo actually MISSING
// hain — jo already theek hain unhe list mein nahi daalte.
// ==========================================================================
function buildMissingItems(result) {
  const items = [];

  if (!result.hasEmail) items.push("Add your email address to Personal Details.");
  if (!result.hasPhone) items.push("Add your phone number to Personal Details.");
  if (!result.hasAddress) items.push("Add your address (city/country) to Personal Details.");
  if (!result.hasExperienceSection) items.push("Add at least one Work Experience entry.");
  if (!result.hasEducationSection) items.push("Add at least one Education entry.");
  if (!result.jobTitleFoundInResume && result.jobTitleGuess) {
    items.push(`Include the exact job title "${result.jobTitleGuess}" somewhere in your CV (e.g. in your Professional Title or Summary).`);
  }

  const missingSkills = result.matchedSkills.filter((s) => s.resumeCount === 0).slice(0, 10);
  missingSkills.forEach((s) => {
    items.push(`Add the keyword "${s.skill}" to your Skills or Work Experience if it genuinely applies to you.`);
  });

  return items;
}

export default function AtsScore() {
  const navigate = useNavigate();


  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("atsCheckData");
      if (saved) {
        const data = JSON.parse(saved);
        setResumeText(data.resumeText || "");
        setJobDescription(data.jobDescription || "");
      }
    } catch (e) {
      console.error("Couldn't load ATS check data:", e);
    }
    setLoaded(true);
  }, []);

  const result = useMemo(() => {
    if (!resumeText.trim() || !jobDescription.trim()) return null;
    return analyzeAts(resumeText, jobDescription);
  }, [resumeText, jobDescription]);

  if (!loaded) return null;

  return (
    <div className="ats-page">
      <div className="ats-header">
        <Link to="/profile" className="ats-back-link">← Back to My Profile</Link>
        <h1>ATS Score Checker</h1>
        <p>
          An ATS (Applicant Tracking System) is software used by most companies and recruiters to search
          resumes and manage hiring. Below is how well your resume matches this job description — calculated
          instantly, right in your browser, no waiting.
        </p>
      </div>

      <div className="ats-container">
        {/* ---------- EDITABLE INPUTS ---------- */}
        <div className="ats-input-grid">
          <div>
            <label className="ats-textarea-label">Resume Text (edit &amp; rescan anytime)</label>
            <textarea
              className="ats-textarea"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows={12}
              placeholder="Your resume content will appear here — or paste your own."
            />
          </div>
          <div>
            <label className="ats-textarea-label">Job Description</label>
            <textarea
              className="ats-textarea"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={12}
              placeholder="Paste the job posting here..."
            />
          </div>
        </div>

        {!result && (
          <div className="ats-empty-box">
            {resumeText.trim() && jobDescription.trim()
              ? "Analyzing..."
              : "Paste both your resume content and a job description above (or go back to the CV Form and use \"Check ATS Score\") to see your match rate."}
          </div>
        )}

        {result && (
          <>
            {/* ---------- TOP: GAUGE + CHECKLIST ---------- */}
            <div className="ats-top-grid">
              <div className="ats-gauge-col">
                <MatchRateGauge percent={result.matchRate} />
                <div className="ats-gauge-label">Match Rate</div>
              </div>

              <div className="ats-checklist-card">
                <div className="ats-checklist-heading">Contact Information</div>
                <CheckRow ok={result.hasAddress}>Physical address / location found — recruiters use this to validate your location for job matches.</CheckRow>
                <CheckRow ok={result.hasEmail}>Email address found — recruiters use this to contact you for job matches.</CheckRow>
                <CheckRow ok={result.hasPhone}>Phone number found.</CheckRow>

                <div className="ats-checklist-heading">Section Headings</div>
                <CheckRow ok={result.hasEducationSection}>We found an Education section in your resume.</CheckRow>
                <CheckRow ok={result.hasExperienceSection}>We found a Work Experience section in your resume.</CheckRow>

                <div className="ats-checklist-heading">Job Title Match</div>
                <CheckRow ok={result.jobTitleFoundInResume}>
                  {result.jobTitleFoundInResume
                    ? "The job title from the description appears in your resume."
                    : `The job title "${result.jobTitleGuess || "(from job description)"}" was not found in your resume. Include the exact title so recruiters find you when they search by job title.`}
                </CheckRow>
              </div>
            </div>

            {/* ---------- SKILLS COMPARISON TABLE ---------- */}
            <div className="ats-card">
              <h2 className="ats-card-title">Skills Comparison</h2>
              <p className="ats-card-subtitle">
                {result.skillsFoundInResume} of {result.matchedSkills.length} keywords from the job description found in your resume.
              </p>
              {result.matchedSkills.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: 14 }}>No recognized skill keywords found in the job description.</p>
              ) : (
                <table className="ats-table">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Resume</th>
                      <th>Job Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.matchedSkills.map((s) => (
                      <tr key={s.skill}>
                        <td>{s.skill}</td>
                        <td>
                          {s.resumeCount > 0
                            ? <span>{s.resumeCount}</span>
                            : <span className="ats-skill-missing">✕</span>}
                        </td>
                        <td>{s.jdCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ---------- SIDE-BY-SIDE HIGHLIGHTED TEXT ---------- */}
            <div className="ats-card">
              <h2 className="ats-card-title">Keyword Highlights</h2>
              <p className="ats-legend">
                <span className="ats-badge-green">Green</span> = keyword found in both.{" "}
                <span className="ats-badge-red">Red</span> = in the job description but missing from your resume.
              </p>
              <div className="ats-highlight-grid">
                <div>
                  <div className="ats-highlight-panel-label">Resume:</div>
                  <div className="ats-highlight-box">
                    <HighlightedResumeText text={resumeText} skills={result.matchedSkills} />
                  </div>
                </div>
                <div>
                  <div className="ats-highlight-panel-label">Job Description:</div>
                  <div className="ats-highlight-box">
                    <HighlightedText text={jobDescription} skills={result.matchedSkills} />
                  </div>
                </div>
              </div>
            </div>

            <div className="ats-cta-row">
              <button
                type="button"
                className="ats-cta-btn"
                style={{ border: "none", cursor: "pointer" }}
                onClick={() => {
                  // ROMAN URDU: CV Form pe jaane se pehle, missing items ki
                  // checklist localStorage mein save kar dete hain — taake
                  // CVForm khulte hi user ko seedha pata chale kya theek
                  // karna hai, dobara scan/scroll na karna pade
                  const items = buildMissingItems(result);
                  localStorage.setItem("atsMissingItems", JSON.stringify({ items, matchRate: result.matchRate }));
                  navigate("/cv-form");
                }}
              >
                ✏️ Edit CV to Improve Score
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
