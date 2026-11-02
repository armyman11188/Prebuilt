// ============================================================================
// src/utils/cvPdf.js  (nayi file)
// ROMAN URDU: Resume/Cover-letter PDF banane ka saara code ab yahan hai, taake
// CVForm aur naya ResultPage dono ek hi code use karein.
// ============================================================================
import jsPDF from "jspdf";

// ==========================================================================
export function formatMonthYear(value) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const [, year, month] = match;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ROMAN URDU: Address ke alag-alag fields (line1, line2, city, postal
// code, country) ko ek hi readable line mein jod deta hai — jaise
// "House 12 Street 5, Block A, Lahore 54000, Pakistan". Jo field khaali
// ho, usay chhor deta hai.
export function formatAddress(personalInfo) {
  const cityPostal = [personalInfo.city, personalInfo.postalCode].filter(Boolean).join(" ");
  return [personalInfo.addressLine1, personalInfo.addressLine2, cityPostal, personalInfo.country]
    .filter(Boolean)
    .join(", ");
}

// ============================================================================
// ROMAN URDU: jsPDF khud CSS "gradient" nahi samajhta — is liye hum ek
// TRICK use karte hain: ek bara box ko bohat saare CHHOTE, patle vertical
// stripes mein baant dete hain, aur har stripe ka color thora thora shift
// karte hain (start color se end color tak). Door se dekho to yeh smooth
// gradient jaisa hi lagta hai. "steps" jitne zyada honge, utna hi smooth
// dikhega.
// ============================================================================
function drawGradientRect(doc, x, y, w, h, colorStart, colorEnd, steps = 60) {
  const stripeWidth = w / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1); // 0 se 1 tak ka fraction
    const r = Math.round(colorStart[0] + (colorEnd[0] - colorStart[0]) * t);
    const g = Math.round(colorStart[1] + (colorEnd[1] - colorStart[1]) * t);
    const b = Math.round(colorStart[2] + (colorEnd[2] - colorStart[2]) * t);
    doc.setFillColor(r, g, b);
    // "+0.5" taake stripes ke beech koi safed line/gap na dikhe
    doc.rect(x + i * stripeWidth, y, stripeWidth + 0.5, h, "F");
  }
}

// ==========================================================================
// ROMAN URDU: ATS Score checker ko resume ka poora TEXT chahiye hota hai
// (keyword matching ke liye) — yeh function CV ke saare fields (personal
// info, experience, education, skills, extra sections) ko ek single plain
// text block mein jod deta hai, bilkul waisa jaisa resume mein dikhta hai.
// ==========================================================================
export function buildResumeText(personalInfo, workExperience, education, skills, extraSections, tailoredExperience) {
  const lines = [];
  lines.push(personalInfo.fullName || "");
  lines.push(personalInfo.professionalTitle || "");
  if (personalInfo.professionalSummary) lines.push(personalInfo.professionalSummary);

  // ROMAN URDU: BUG FIX — pehle yeh function phone/email/address ko
  // BILKUL include nahi karta tha, is liye ATS Score checker hamesha
  // "Email not found" / "Phone not found" dikhata tha CHAHE woh CV mein
  // maujood ho. Ab yeh sab yahan add kar rahe hain.
  if (personalInfo.phone) lines.push(`Phone: ${personalInfo.phone}`);
  if (personalInfo.email) lines.push(`Email: ${personalInfo.email}`);
  const addressParts = [personalInfo.addressLine1, personalInfo.addressLine2, personalInfo.city, personalInfo.postalCode, personalInfo.country].filter(Boolean);
  if (addressParts.length > 0) lines.push(`Address: ${addressParts.join(", ")}`);

  // ROMAN URDU: BUG FIX — pehle "WORK EXPERIENCE" / "EDUCATION" jaisa
  // koi literal heading text hi nahi tha, is liye ATS checker (jo section
  // headings ke liye literal "education"/"experience" lafz dhoondta hai)
  // hamesha "Education section not found" dikhata tha, chahe degree/
  // institution CV mein maujood ho.
  if (workExperience.some((exp) => exp.company || exp.position)) {
    lines.push("WORK EXPERIENCE");
  }
  workExperience.forEach((exp) => {
    if (!exp.company && !exp.position) return;
    lines.push(`${exp.position} at ${exp.company}`);
    if (tailoredExperience && tailoredExperience.length > 0) {
      lines.push(tailoredExperience.join(" "));
    } else if (exp.description) {
      lines.push(exp.description);
    }
  });

  if (education.some((edu) => edu.degree || edu.institution)) {
    lines.push("EDUCATION AND TRAINING");
  }
  education.forEach((edu) => {
    if (!edu.degree && !edu.institution) return;
    lines.push(`${edu.degree} ${edu.institution}`);
  });

  if (skills.technical?.length) lines.push(skills.technical.join(", "));
  if (skills.soft?.length) lines.push(skills.soft.join(", "));

  extraSections.forEach((section) => {
    section.entries.forEach((entry) => {
      if (entry.title) lines.push(`${entry.title} ${entry.subtitle || ""} ${entry.description || ""}`);
    });
  });

  return lines.filter(Boolean).join("\n");
}

export function downloadResumePDF({ personalInfo, workExperience, education, languages, skills, extraSections, tailoredExperience }) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 50;
    const pageWidth = 495;
    const pageBottom = 780;
    let y = 55;

    function checkPageBreak(neededSpace) {
      if (y + neededSpace > pageBottom) {
        doc.addPage();
        y = 55;
      }
    }

    function sectionHeading(text) {
      checkPageBreak(28);
      y += 10;
      doc.setDrawColor(180, 200, 225);
      doc.setLineWidth(0.7);
      doc.line(marginX, y, marginX + pageWidth, y);
      y += 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 70, 127);
      doc.text(text.toUpperCase(), marginX, y);
      y += 15;
    }

    // ---------- HEADER — colored gradient banner (jaisa screen preview) ----------
    const pageFullWidth = doc.internal.pageSize.getWidth();
    const headerHeight = 82;
    drawGradientRect(doc, 0, 0, pageFullWidth, headerHeight, [0, 70, 127], [0, 144, 208]);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);
    doc.text(personalInfo.fullName || "Your Name", marginX, 34);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(220, 235, 250);
    doc.text(personalInfo.professionalTitle || "", marginX, 51);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(190, 215, 240);
    doc.text("europass", marginX, 65);

    // "Europass Format" badge — right side, gold stars + italic label,
    // right-aligned isliye "{ align: 'right' }" option diya
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(252, 211, 77); // gold
    doc.text("* * * * *", pageFullWidth - marginX, 30, { align: "right" });
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Europass Format", pageFullWidth - marginX, 44, { align: "right" });

    y = headerHeight + 20;

    // ---------- INFO ROW — halka blue background box ----------
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const personalLine = [
      personalInfo.nationality && `Nationality: ${personalInfo.nationality}`,
      personalInfo.dateOfBirth && `Date of birth: ${personalInfo.dateOfBirth}`,
      personalInfo.placeOfBirth && `Place of birth: ${personalInfo.placeOfBirth}`,
      personalInfo.gender && `Gender: ${personalInfo.gender}`,
    ].filter(Boolean).join("     ");
    if (personalLine) {
      doc.setFillColor(220, 235, 248);
      doc.rect(0, y - 12, pageFullWidth, 22, "F");
      doc.setTextColor(0, 70, 127);
      doc.text(personalLine, marginX, y + 2);
      y += 26;
    }

    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    if (personalInfo.phone) { doc.text(`Phone number: ${personalInfo.phone}`, marginX, y); y += 13; }
    if (formatAddress(personalInfo)) { doc.text(`Home: ${formatAddress(personalInfo)}`, marginX, y); y += 13; }
    if (personalInfo.email) { doc.text(`Email: ${personalInfo.email}`, marginX, y); y += 13; }
    if (personalInfo.linkedIn) { doc.text(`LinkedIn: ${personalInfo.linkedIn}`, marginX, y); y += 13; }
    y += 6;

    if (personalInfo.professionalSummary) {
      sectionHeading("About Me");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(personalInfo.professionalSummary, pageWidth);
      checkPageBreak(lines.length * 13);
      doc.text(lines, marginX, y);
      y += lines.length * 13 + 4;
    }

    const validExperience = workExperience.filter((exp) => exp.company || exp.position);
    if (validExperience.length > 0) {
      sectionHeading("Work Experience");
      validExperience.forEach((exp) => {
        checkPageBreak(55);
        const dateRange = `${formatMonthYear(exp.startDate)} - ${exp.current ? "present" : formatMonthYear(exp.endDate)}`;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(0, 70, 127);
        doc.text(dateRange, marginX, y);
        y += 13;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text(`${exp.company || ""}${formatAddress(personalInfo) ? " · " + formatAddress(personalInfo) : ""}`, marginX, y);
        y += 13;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(exp.position || "", marginX, y);
        y += 14;

        const bulletsSource =
          tailoredExperience.length > 0
            ? tailoredExperience
            : (exp.description || "").split("\n").filter(Boolean);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        bulletsSource.forEach((line) => {
          const wrapped = doc.splitTextToSize(line, pageWidth - 6);
          checkPageBreak(wrapped.length * 12);
          doc.text(wrapped, marginX, y);
          y += wrapped.length * 12 + 4;
        });
        y += 8;
      });
    }

    const validEducation = education.filter((edu) => edu.degree || edu.institution);
    if (validEducation.length > 0) {
      sectionHeading("Education and Training");
      validEducation.forEach((edu) => {
        checkPageBreak(45);
        const dateRange = `${formatMonthYear(edu.startDate)} - ${edu.current ? "present" : formatMonthYear(edu.endDate)}`;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(0, 70, 127);
        doc.text(dateRange, marginX, y);
        y += 13;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text(personalInfo.nationality || "", marginX, y);
        y += 13;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(edu.degree || "", marginX, y);
        y += 13;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text(edu.institution || "", marginX, y);
        y += 18;
      });
    }

    const validLanguages = languages.filter((l) => l.language);
    if (validLanguages.length > 0) {
      sectionHeading("Language Skills");
      const colX = [marginX, marginX + 110, marginX + 190, marginX + 275, marginX + 360, marginX + 440];
      const headers = ["Language", "Listening", "Reading", "Interaction", "Production", "Writing"];

      // Header row ke peeche halka blue background band
      doc.setFillColor(232, 244, 251);
      doc.rect(marginX, y - 10, pageWidth, 16, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0, 70, 127);
      headers.forEach((h, i) => doc.text(h, colX[i] + 3, y));
      y += 10;
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, y, marginX + pageWidth, y);
      y += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      validLanguages.forEach((lang) => {
        checkPageBreak(16);
        doc.text(lang.language, colX[0] + 3, y);
        for (let i = 1; i < 6; i++) doc.text(lang.proficiency, colX[i] + 3, y);
        y += 14;
      });

      y += 4;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      const levelsNote = doc.splitTextToSize(
        "Levels: A1 & A2 (Basic)   B1 & B2 (Independent)   C1 & C2 (Proficient) - Common European Framework of Reference (CEFR)",
        pageWidth
      );
      doc.text(levelsNote, marginX, y);
      y += levelsNote.length * 10 + 6;
    }

    const allSkills = [...skills.technical, ...skills.soft];
    if (allSkills.length > 0) {
      sectionHeading("Key Skills");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const skillLines = doc.splitTextToSize(allSkills.join("   "), pageWidth);
      checkPageBreak(skillLines.length * 13);
      doc.text(skillLines, marginX, y);
      y += skillLines.length * 13;
    }

    extraSections.forEach((section) => {
      const validEntries = section.entries.filter((e) => e.title);
      if (validEntries.length === 0) return;
      sectionHeading(section.type);
      validEntries.forEach((entry) => {
        checkPageBreak(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(entry.title + (entry.subtitle ? ` · ${entry.subtitle}` : ""), marginX, y);
        y += 13;
        if (entry.description) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          const lines = doc.splitTextToSize(entry.description, pageWidth);
          checkPageBreak(lines.length * 12);
          doc.text(lines, marginX, y);
          y += lines.length * 12 + 4;
        }
      });
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(marginX, 808, marginX + pageWidth, 808);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`${personalInfo.fullName || "Your Name"} · Europass CV`, marginX, 820);
      doc.text(`${i} / ${pageCount}`, marginX + pageWidth - 30, 820);
    }

    doc.save(`${personalInfo.fullName || "resume"}-Europass-CV.pdf`);
  }

export function downloadCoverLetterPDF({ personalInfo, companyName, jobTitle, coverLetter }) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 50;
    const pageWidth = 495;
    const pageFullWidth = doc.internal.pageSize.getWidth();
    let y;

    // ---------- HEADER — same gradient banner as the resume ----------
    const headerHeight = 70;
    drawGradientRect(doc, 0, 0, pageFullWidth, headerHeight, [0, 70, 127], [0, 144, 208]);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(personalInfo.fullName || "Your Name", marginX, 30);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(220, 235, 250);
    doc.text(personalInfo.professionalTitle || "", marginX, 45);

    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Cover Letter", pageFullWidth - marginX, 30, { align: "right" });

    y = headerHeight + 30;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text([personalInfo.email, personalInfo.phone].filter(Boolean).join("   "), marginX, y);
    y += 30;

    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    doc.text(today + (companyName ? ` — To the Hiring Team at ${companyName}` : ""), marginX, y);
    y += 22;

    if (jobTitle) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 70, 127);
      doc.text("Subject:", marginX, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`  Application for the Position of ${jobTitle}`, marginX + 42, y);
      y += 24;
    }

    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(coverLetter, pageWidth);
    doc.text(lines, marginX, y);

    // ---------- FOOTER (Resume PDF jaisa hi — consistency ke liye) ----------
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(marginX, 808, marginX + pageWidth, 808);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`${personalInfo.fullName || "Your Name"} · Cover Letter`, marginX, 820);

    doc.save(`Cover-Letter-${companyName || "application"}.pdf`);
  }
