// ============================================================================
// src/utils/tailorCv.js  (NEW) — AI tailoring, moved out of CVForm so the
// Profile page can use it. Same prompt + same /api/claude endpoint as before.
// ============================================================================
const SYSTEM_PROMPT = `
You are an expert HR recruiter and professional resume writer.
You will receive a candidate's work experience and a job description.

Your job:
1. Extract the hiring COMPANY NAME from the job description (if not clearly stated, write "Hiring Team").
2. Extract the JOB TITLE / position being applied for from the job description
   (if not clearly stated, use the candidate's professional title instead).
3. Rewrite the candidate's work experience into 4-6 strong, ATS-optimized,
   achievement-based bullet points that use keywords from the job description.
4. Write a tailored, professional 3-paragraph cover letter addressed to the
   company, connecting the candidate's background to this specific role.

Respond with ONLY valid JSON, no markdown, no code fences, in exactly this shape:
{
  "companyName": "string",
  "jobTitle": "string",
  "tailoredExperience": ["bullet 1", "bullet 2", "..."],
  "coverLetter": "full cover letter text as one string"
}
`.trim();

export async function tailorCv({ personalInfo, workExperience, skills, jobDescription }) {
  const experienceSummary = (workExperience || [])
    .map((e) => `${e.position} at ${e.company} (${e.startDate} - ${e.endDate || "Present"}): ${e.description}`)
    .join("\n");

  const userMessage = `
CANDIDATE NAME: ${personalInfo.fullName || "The Candidate"}
CANDIDATE TITLE: ${personalInfo.professionalTitle || ""}

CANDIDATE'S WORK EXPERIENCE:
${experienceSummary || "No prior experience listed."}

CANDIDATE'S SKILLS: ${[...(skills?.technical || []), ...(skills?.soft || [])].join(", ")}

JOB DESCRIPTION:
${jobDescription}
`.trim();

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: SYSTEM_PROMPT, messages: [{ role: "user", content: userMessage }], max_tokens: 1500 }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  const raw = data.content?.[0]?.text || "";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}
