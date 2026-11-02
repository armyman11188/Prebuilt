// ============================================================================
// src/components/ResumePreview.jsx
//
// ROMAN URDU EXPLANATION — NAYA TAREEQA:
// Pehle hum jsPDF se PDF "hath se banate" the (har line ki x/y position
// khud batani parti thi) — is se kabhi bhi kisi design se EXACT match
// nahi hota. Ab hum ULTA kaam kar rahe hain: normal HTML + CSS se resume
// dikhate hain (bilkul jaise koi aur webpage), aur phir browser ke apne
// PRINT feature se PDF banwate hain. Browser khud CSS ko perfectly PDF
// mein convert kar deta hai — 100% design match milta hai.
// ============================================================================
import "./ResumePreview.css";

// ==========================================================================
// ROMAN URDU: DATE FORMAT FIX — VoiceInterview/CVForm "startDate"/"endDate"
// ko hamesha "YYYY-MM" shape mein store karte hain (jaise "2020-04"), jo
// resume par seedha dikhana bohat "raw"/unprofessional lagta hai. Yeh
// function usay Europass-style readable form mein badalta hai, jaise
// "2020-04" -> "April 2020". Agar value already kisi aur format mein ho
// (ya khaali ho), to usay jaisa hai waisa hi wapas kar deta hai — taake
// kuch bhi crash na ho.
// ==========================================================================
function formatMonthYear(value) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return value; // already kisi aur shape mein hai — chhor do
  const [, year, month] = match;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function ResumePreview({
  personalInfo,
  workExperience,
  education,
  languages,
  skills,
  extraSections,
  tailoredExperience,
}) {
  const validExperience = workExperience.filter((e) => e.company || e.position);
  const validEducation = education.filter((e) => e.degree || e.institution);
  const validLanguages = languages.filter((l) => l.language);
  const allSkills = [...skills.technical, ...skills.soft];

  return (
    <div className="europass-mini-preview resume-preview-print">
      {/* ---------- HEADER ---------- */}
      <div className="emp-header">
        <div>
          <div className="emp-name">{personalInfo.fullName || "Your Name"}</div>
          <div className="emp-title">{personalInfo.professionalTitle || ""}</div>
          <div className="emp-wordmark">europass</div>
        </div>
        <div className="emp-logo">
          <div className="emp-stars">★★★★★</div>
          <div className="emp-brand">Europass Format</div>
        </div>
      </div>

      {/* ---------- PERSONAL INFO ROW ---------- */}
      <div className="emp-info-row">
        {personalInfo.nationality && <span><b>Nationality:</b> {personalInfo.nationality}</span>}
        {personalInfo.dateOfBirth && <span><b>Date of birth:</b> {personalInfo.dateOfBirth}</span>}
        {personalInfo.placeOfBirth && <span><b>Place of birth:</b> {personalInfo.placeOfBirth}</span>}
        {personalInfo.gender && <span><b>Gender:</b> {personalInfo.gender}</span>}
      </div>

      {/* ---------- CONTACT — har cheez apni ALAG line pe, PDF jaisa ---------- */}
      <div className="emp-contact emp-contact-stacked">
        {personalInfo.phone && <span>📞 Phone number: {personalInfo.phone}</span>}
        {personalInfo.address && <span>📍 Home: {personalInfo.address}</span>}
        {personalInfo.email && <span>✉️ Email: {personalInfo.email}</span>}
        {personalInfo.linkedIn && <span>🔗 LinkedIn: {personalInfo.linkedIn}</span>}
      </div>

      {/* ---------- ABOUT ME ---------- */}
      {personalInfo.professionalSummary && (
        <div className="emp-section">
          <div className="emp-section-title">About Me</div>
          <p className="emp-summary">{personalInfo.professionalSummary}</p>
        </div>
      )}

      {/* ---------- WORK EXPERIENCE ---------- */}
      {validExperience.length > 0 && (
        <div className="emp-section">
          <div className="emp-section-title">Work Experience</div>
          {validExperience.map((exp) => (
            <div key={exp.id} style={{ marginBottom: 14 }}>
              <div className="emp-job-title">
                {formatMonthYear(exp.startDate)} – {exp.current ? "Present" : formatMonthYear(exp.endDate)} &nbsp;·&nbsp; {exp.position}
              </div>
              <div className="emp-job-company">{exp.company}</div>
              {/* Agar AI ne tailored bullets banaye hain, wahi dikhao —
                  warna user ki apni raw description */}
              <p className="emp-summary" style={{ marginTop: 6, whiteSpace: "pre-line" }}>
                {tailoredExperience && tailoredExperience.length > 0
                  ? tailoredExperience.map((b) => "• " + b).join("\n")
                  : exp.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ---------- EDUCATION ---------- */}
      {validEducation.length > 0 && (
        <div className="emp-section">
          <div className="emp-section-title">Education and Training</div>
          {validEducation.map((edu) => (
            <div key={edu.id} style={{ marginBottom: 10 }}>
              <div className="emp-job-title">
                {formatMonthYear(edu.startDate)} – {edu.current ? "Present" : formatMonthYear(edu.endDate)} &nbsp;·&nbsp; {edu.degree}
              </div>
              <div className="emp-job-company">{edu.institution}</div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- LANGUAGE SKILLS — 5-column Europass table ---------- */}
      {validLanguages.length > 0 && (
        <div className="emp-section">
          <div className="emp-section-title">Language Skills</div>
          <table className="emp-lang-table">
            <thead>
              <tr>
                <th>Language</th>
                <th>Listening</th>
                <th>Reading</th>
                <th>Interaction</th>
                <th>Production</th>
                <th>Writing</th>
              </tr>
            </thead>
            <tbody>
              {validLanguages.map((lang) => (
                <tr key={lang.id}>
                  <td>{lang.language}{lang.isMotherTongue && <span className="mt-badge"> (mother tongue)</span>}</td>
                  <td>{lang.proficiency}</td>
                  <td>{lang.proficiency}</td>
                  <td>{lang.proficiency}</td>
                  <td>{lang.proficiency}</td>
                  <td>{lang.proficiency}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="emp-levels-note">
            Levels: A1 &amp; A2 (Basic) &nbsp; B1 &amp; B2 (Independent) &nbsp; C1 &amp; C2 (Proficient) — Common European Framework of Reference (CEFR)
          </p>
        </div>
      )}

      {/* ---------- SKILLS ---------- */}
      {allSkills.length > 0 && (
        <div className="emp-section">
          <div className="emp-section-title">Key Skills</div>
          <p className="emp-summary">{allSkills.join("  •  ")}</p>
        </div>
      )}

      {/* ---------- EXTRA SECTIONS ---------- */}
      {extraSections.map((section) => {
        const validEntries = section.entries.filter((e) => e.title);
        if (validEntries.length === 0) return null;
        return (
          <div className="emp-section" key={section.id}>
            <div className="emp-section-title">{section.type}</div>
            {validEntries.map((entry) => (
              <div key={entry.id} style={{ marginBottom: 8 }}>
                <div className="emp-job-title">
                  {entry.title}
                  {entry.subtitle ? " · " + entry.subtitle : ""}
                </div>
                {entry.description && <p className="emp-summary">{entry.description}</p>}
              </div>
            ))}
          </div>
        );
      })}
      {/* ---------- FOOTER (PDF jaisa) ---------- */}
      <div className="emp-footer">
        {personalInfo.fullName || "Your Name"} · Europass CV &nbsp;·&nbsp; 1 / 1
      </div>
    </div>
  );
}
