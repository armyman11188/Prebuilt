// ============================================================================
// src/components/CoverLetterPreview.jsx
//
// ROMAN URDU: Yeh ResumePreview.jsx jaisa hi design use karta hai (same
// CSS file, same "europass-mini-preview" wrapper aur "emp-*" classes) —
// isliye dono documents ek hi "brand family" ke lagte hain, jaisa maine
// pehle CV ke liye banaya tha, ab isi style ko reuse kar rahe hain.
// ============================================================================
import "./ResumePreview.css"; // wahi CSS reuse ho rahi hai, koi nayi file nahi

export default function CoverLetterPreview({ personalInfo, companyName, jobTitle, coverLetter }) {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="europass-mini-preview cover-preview-print">
      {/* Same header style jo ResumePreview mein tha — brand consistency */}
      <div className="emp-header">
        <div>
          <div className="emp-name">{personalInfo.fullName || "Your Name"}</div>
          <div className="emp-title">{personalInfo.professionalTitle || ""}</div>
        </div>
        <div className="emp-logo">
          <div className="emp-stars">★★★★★</div>
          <div className="emp-brand">Cover Letter</div>
        </div>
      </div>

      <div className="emp-contact">
        {personalInfo.email && <span>✉️ {personalInfo.email}</span>}
        {personalInfo.phone && <span>📞 {personalInfo.phone}</span>}
        {personalInfo.address && <span>📍 {personalInfo.address}</span>}
      </div>

      <div className="emp-section">
        <p className="emp-summary" style={{ marginBottom: 14 }}>
          {today}
          {companyName ? ` — To the Hiring Team at ${companyName}` : ""}
        </p>

        {/* ROMAN URDU: "Subject:" wala label bold aur blue hai — reference
            screenshot jaisa. Sirf tab dikhta hai jab jobTitle mila ho. */}
        {jobTitle && (
          <p className="emp-summary" style={{ marginBottom: 14 }}>
            <strong style={{ color: "#0072b2" }}>Subject:</strong> Application for the Position of {jobTitle}
          </p>
        )}

        <p className="emp-summary" style={{ whiteSpace: "pre-line", lineHeight: 1.8 }}>
          {coverLetter || "Your AI-generated cover letter will appear here after you click \"Generate Tailored CV + Cover Letter\" above."}
        </p>
      </div>

      {/* ---------- FOOTER — CV wale footer jaisa hi, consistency ke liye ---------- */}
      <div className="emp-footer">
        {personalInfo.fullName || "Your Name"} · Cover Letter &nbsp;·&nbsp; 1 / 1
      </div>
    </div>
  );
}
