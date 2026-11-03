// ============================================================================
// src/pages/VoiceInterview.jsx
//
// ROMAN URDU EXPLANATION:
// Ab interview 4 "phases" mein chalta hai: Personal Info -> Work
// Experience -> Education -> Skills -> Done. Har phase ka apna AI prompt
// hai (alag JSON shape mangta hai), taake AI confuse na ho.
//
// Work Experience aur Education "repeatable" hain — user ek se zyada
// jobs/degrees bata sakta hai. Isi liye in phases mein AI khud poochta
// hai "koi aur bhi hai?" — agar haan, wahi phase dobara chalta hai
// (naya entry array mein jud jata hai), agar nahi, agla phase shuru.
// ============================================================================
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import "./VoiceInterview.css";

const SpeechRecognitionAPI =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const PHASES = ["personal", "experience", "education", "skills", "extraSections", "targetJob", "done"];
const PHASE_LABELS = {
  personal: "Personal Info",
  experience: "Work Experience",
  education: "Education",
  skills: "Skills",
  extraSections: "Additional Sections",
  targetJob: "Target Job",
  done: "Complete",
};

// ROMAN URDU: Bilkul wahi list jo AddSectionModal.jsx (form wale) mein
// thi — yahan bhi wahi options AI ko poochne ke liye milte hain
const SECTION_TYPES = [
  "Certifications", "Conferences and seminars", "Creative works", "Driving Licence",
  "Hobbies and interests", "Honours and awards", "Networks and memberships",
  "Projects", "Publications", "Recommendations", "Social and political activities",
  "Volunteering", "Other",
];

// ROMAN URDU: Yeh list dropdown mein dikhegi. "code" browser ke Speech
// APIs (STT/TTS) ko batata hai kaunsi zaban/accent use karni hai, aur
// "label" AI ke prompt mein use hota hai ("Conduct this in Urdu").
const LANGUAGE_OPTIONS = [
  { code: "en-US", label: "English" },
  { code: "ur-PK", label: "Urdu (اردو)" },
  { code: "hi-IN", label: "Hindi (हिन्दी)" },
  { code: "ar-SA", label: "Arabic (العربية)" },
  { code: "fr-FR", label: "French (Français)" },
  { code: "es-ES", label: "Spanish (Español)" },
];

// ROMAN URDU: Har language ka ek "speech code" hota hai (jaise "en-US",
// "ur-PK") — yeh browser ke Speech Recognition/Synthesis ko batata hai
// "isi zaban mein suno/bolo." Yeh koi hamara invention nahi, yeh
// international standard codes hain (BCP 47 kehte hain inhe).
const LANGUAGES = [
  { code: "en-US", name: "English" },
  { code: "ur-PK", name: "Urdu (اردو)" },
  { code: "hi-IN", name: "Hindi (हिन्दी)" },
  { code: "ar-SA", name: "Arabic (العربية)" },
  { code: "es-ES", name: "Spanish (Español)" },
  { code: "fr-FR", name: "French (Français)" },
  { code: "pa-IN", name: "Punjabi (ਪੰਜਾਬੀ)" },
];

export default function VoiceInterview() {
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState("personal");
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");

  // ROMAN URDU: Jab error aaye aur user "Retry" dabaye, humein pata hona
  // chahiye AAKHRI baar user ne kya kaha tha — is ref mein save karte hain
  const lastUserMessageRef = useRef("");

  // ---------- COLLECTED DATA — same shape as CVForm.jsx uses ----------
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "", professionalTitle: "", phone: "", email: "",
    linkedIn: "", nationality: "", placeOfBirth: "", dateOfBirth: "",
    gender: "", addressLine1: "", addressLine2: "", postalCode: "", city: "", country: "",
  });
  const [workExperience, setWorkExperience] = useState([]);
  const [education, setEducation] = useState([]);
  const [skills, setSkills] = useState({ technical: [], soft: [] });
  const [extraSections, setExtraSections] = useState([]); // [{ type, entries: [{title,subtitle,date,description}] }]
  const [draftSectionEntry, setDraftSectionEntry] = useState({});
  const [currentSectionType, setCurrentSectionType] = useState("");

  // ---------- TARGET JOB + AI TAILORING (naya phase) ----------
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [tailoredExperience, setTailoredExperience] = useState([]);
  const [coverLetter, setCoverLetter] = useState("");
  const [generatingCV, setGeneratingCV] = useState(false);

  // "Draft" entries — jo experience/education entry ABHI collect ho rahi
  // hai (jab tak poori na ho, workExperience/education list mein nahi jaati)
  const [draftExperience, setDraftExperience] = useState({});
  const [draftEducation, setDraftEducation] = useState({});

  const voiceInputSupported = !!SpeechRecognitionAPI;
  const voiceOutputSupported = !!window.speechSynthesis;
  const selectedLanguageLabel = LANGUAGE_OPTIONS.find((l) => l.code === selectedLanguage)?.label || "English";

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // ROMAN URDU: STALE CLOSURE fix — refs hamesha LATEST value rakhte hain
  const messagesRef = useRef(messages);
  const personalInfoRef = useRef(personalInfo);
  const workExperienceRef = useRef(workExperience);
  const educationRef = useRef(education);
  const skillsRef = useRef(skills);
  const draftExperienceRef = useRef(draftExperience);
  const draftEducationRef = useRef(draftEducation);
  const phaseRef = useRef(phase);
  const extraSectionsRef = useRef(extraSections);
  const draftSectionEntryRef = useRef(draftSectionEntry);
  const currentSectionTypeRef = useRef(currentSectionType);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { personalInfoRef.current = personalInfo; }, [personalInfo]);
  useEffect(() => { workExperienceRef.current = workExperience; }, [workExperience]);
  useEffect(() => { educationRef.current = education; }, [education]);
  useEffect(() => { skillsRef.current = skills; }, [skills]);
  useEffect(() => { draftExperienceRef.current = draftExperience; }, [draftExperience]);
  useEffect(() => { draftEducationRef.current = draftEducation; }, [draftEducation]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { extraSectionsRef.current = extraSections; }, [extraSections]);
  useEffect(() => { draftSectionEntryRef.current = draftSectionEntry; }, [draftSectionEntry]);
  useEffect(() => { currentSectionTypeRef.current = currentSectionType; }, [currentSectionType]);

  // ==========================================================================
  // ROMAN URDU: BUG FIX — AI agar bol raha ho (speechSynthesis) aur user
  // is beech mein kisi DOOSRE page pe navigate kar jaye (jaise "CV Form"
  // dekhne), to React ka onend/onerror listener us purani utterance pe
  // laga rehta tha, aur browser ki speechSynthesis queue GLOBAL hai — is
  // liye AI baatein karta rehta tha chahe VoiceInterview page band ho
  // chuka ho. Yeh cleanup function component "unmount" hone par (yaani
  // jab user kisi aur page pe chala jaye) chalta hai aur FORCE se sab
  // band kar deta hai: bol rahi awaaz, sun raha mic, aur timer.
  // ==========================================================================
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { /* already stopped */ }
      }
      clearInterval(timerRef.current);
    };
  }, []);

  function startTimer() {
    timerRef.current = setInterval(() => setSeconds((prev) => prev + 1), 1000);
  }
  function stopTimer() {
    clearInterval(timerRef.current);
  }
  function formatTime(total) {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function speak(text) {
    if (isMuted || !voiceOutputSupported) {
      if (voiceInputSupported) startListening();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.lang = selectedLanguage; // ROMAN URDU: AI isi zaban mein bolega
    setIsSpeaking(true);

    // ROMAN URDU: "safetyFired" taake yeh kaam SIRF EK dafa chale — agar
    // onend/onerror pehle hi chal chuka ho to safety timeout dobara
    // startListening na chalaye (warna do baar mic khul jayega)
    let safetyFired = false;
    function proceedOnce() {
      if (safetyFired) return;
      safetyFired = true;
      setIsSpeaking(false);
      if (voiceInputSupported) startListening();
    }

    utterance.onerror = proceedOnce;
    utterance.onend = proceedOnce;
    // Agar 12 second mein na khatam ho na error aaye — TTS "atak" gayi
    // hai, khud hi aage barh jao
    setTimeout(proceedOnce, 12000);

    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    if (!voiceInputSupported || isPaused) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = selectedLanguage; // ROMAN URDU: isi zaban mein tumhari awaaz sunega
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      setIsListening(false);
      handleUserAnswer(event.results[0][0].transcript);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "no-speech") {
        // ROMAN URDU: BUG FIX — pehle yahan mic khud hi chup-chap dobara
        // sunna shuru kar deta tha, lekin user ko pata nahi chalta tha
        // kuch ho bhi raha hai ya nahi (screen "Ready" dikhati thi) — is
        // liye lagta tha interview atak gaya hai. Ab agar candidate chup
        // raha (kuch nahi bola), hum AI se WAHI sawaal DOBARA BOL kar
        // poochte hain — taake candidate ko pata chale AI abhi bhi wait
        // kar raha hai, aur usay kuch type karne ki zaroorat na pare.
        if (!isPaused && currentQuestion) {
          speak(currentQuestion);
        } else if (!isPaused) {
          startListening();
        }
        return;
      }
      setError("Couldn't hear you clearly. Please try again.");
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }
  function stopListening() {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  }

  async function handleUserAnswer(transcript) {
    lastUserMessageRef.current = transcript; // ROMAN URDU: yaad rakho, "Retry" ke liye chahiye hoga
    const updated = [...messagesRef.current, { role: "user", text: transcript }];
    messagesRef.current = updated;
    setMessages(updated);

    // ROMAN URDU: "targetJob" phase mein user ka jawab ek NORMAL sawal ka
    // jawab nahi hota — yeh POORI job description hoti hai. Isliye is
    // phase mein hum askAI() (recruiter wala Q&A loop) ki jagah ek ALAG
    // function call karte hain jo seedha CV tailor karta hai.
    if (phaseRef.current === "targetJob") {
      await generateTailoredCV(transcript);
    } else {
      // "extraSections" phase bhi normal askAI() se hi chalta hai (jaise
      // personal/experience/education/skills) — sirf apna alag prompt
      // aur alag data-handling function use karta hai
      await askAI(transcript);
    }
  }

  function handleTextSubmit(e) {
    e.preventDefault();
    const trimmed = textAnswer.trim();
    if (!trimmed) return;
    setTextAnswer("");
    handleUserAnswer(trimmed);
  }

  // ROMAN URDU: Agar AI request fail ho (jaise "models busy" wala error),
  // yeh function dobara wahi aakhri jawab bhej deta hai — user ko dobara
  // type/bolna nahi parta
  function handleRetry() {
    setError("");
    if (!lastUserMessageRef.current) return;
    if (phaseRef.current === "targetJob") {
      generateTailoredCV(lastUserMessageRef.current);
    } else {
      askAI(lastUserMessageRef.current);
    }
  }

  // ==========================================================================
  // PER-PHASE PROMPTS — har phase ka apna instruction set
  // ==========================================================================
  function getSystemPrompt(currentPhase) {
    // ROMAN URDU: Yeh instruction HAR prompt ke shuru mein jayegi — AI ko
    // batati hai "candidate se USI zaban mein baat karo," lekin "jo bhi
    // data collect ho (naam/company chhor kar), woh CV ke liye hamesha
    // ENGLISH mein likho," kyunke final CV professional English mein
    // honi chahiye chahe interview kisi bhi zaban mein hua ho.
    const languageInstruction = `
LANGUAGE: Conduct this conversation (your "aiResponse" text) in ${selectedLanguageLabel}.
The candidate may answer in ${selectedLanguageLabel} too. However, when filling
"collectedData" (or any structured output), ALWAYS write the values in ENGLISH —
translate descriptions/answers to English — EXCEPT proper nouns like names of
people, companies, or institutions, which should be kept as spoken/written.
`.trim();

    if (currentPhase === "personal") {
      return `
${languageInstruction}

You are a friendly HR recruiter voice-interviewing a candidate for their CV.
Collect these fields ONE AT A TIME:
REQUIRED: fullName, professionalTitle, phone
OPTIONAL (accept "skip" and move on immediately, don't insist): email, linkedIn, nationality, placeOfBirth, dateOfBirth, gender, addressLine1, addressLine2, postalCode, city, country

Rules:
- CRITICAL: your "aiResponse" must contain ONLY ONE question, EVERY time — never ask about two different fields in the same message. Ask about ONE field, then STOP and wait for the candidate's reply before asking about the next one.
- Ask fields in this order, one at a time: fullName, professionalTitle, phone, email, linkedIn, nationality, placeOfBirth, dateOfBirth, gender, then address.
- EXCEPTION — address only: ask it as ONE natural question (e.g. "What's your home address, including city, postal code, and country?") since street/city/postal/country are all part of the same single topic. Split whatever the candidate says into addressLine1, addressLine2, city, postalCode, and country.
- DATES: whenever the candidate says a date in ANY form ("4th March 2003", "March 2003", "2003", "03/04/2003"), you MUST capture it in "dateOfBirth" as YYYY-MM-DD (use "01" for an unknown day/month if the candidate is vague). NEVER leave dateOfBirth blank if the candidate mentioned any date-related answer to that question.
- "phaseComplete" is true ONLY when all 3 required fields are filled AND every optional field has been asked about at least once (answered or skipped).
- Keep responses to 1 SHORT sentence — ONE question only (this is voice).

Respond with ONLY JSON:
{
  "aiResponse": "...",
  "collectedData": { "fullName":"","professionalTitle":"","phone":"","email":"","linkedIn":"","nationality":"","placeOfBirth":"","dateOfBirth":"","gender":"","addressLine1":"","addressLine2":"","postalCode":"","city":"","country":"" },
  "phaseComplete": false
}
Always include ALL previously collected fields, plus any new one.`.trim();
    }

    if (currentPhase === "experience") {
      return `
${languageInstruction}

You are an HR recruiter voice-interviewing a candidate about ONE work experience entry.
Collect: company, position, startDate (YYYY-MM), endDate (YYYY-MM, or leave empty if current), current (true/false), description (what they did — even a brief one-sentence answer is fine, do NOT ask for more detail than the candidate naturally gives).

Rules:
- Ask ONE question at a time, naturally.
- DATES: whenever the candidate says a date in ANY form ("April 2020", "2020", "four months ago", "since last year"), you MUST convert it to YYYY-MM and put it in startDate/endDate (use "01" for an unknown month, and your best estimate of the year from context). NEVER leave startDate blank if the candidate answered that question in any way — convert whatever they said instead of leaving it empty.
- Accept SHORT or brief answers for "description" — do not insist on multiple sentences. One clear sentence is enough.
- After description, ask: "Do you have any other work experience to add?"
- Set "phaseComplete" true ONLY once the candidate says NO more experience to add.
- Set "entryComplete" true once company, position, startDate, and description are all filled for THIS entry (regardless of phaseComplete).
- Keep responses to ONE short sentence. No preamble, no explanations, just the single question or reply.

Respond with ONLY JSON:
{
  "aiResponse": "...",
  "collectedData": { "company":"","position":"","startDate":"","endDate":"","current":false,"description":"" },
  "entryComplete": false,
  "phaseComplete": false
}`.trim();
    }

    if (currentPhase === "education") {
      return `
${languageInstruction}

You are an HR recruiter voice-interviewing a candidate about ONE education entry.
Collect: degree, institution, startDate (YYYY-MM), endDate (YYYY-MM, or empty if current), current (true/false).

Rules:
- Ask ONE question at a time, naturally.
- DATES: whenever the candidate says a date in ANY form ("2016", "January 2016", "four years ago"), you MUST convert it to YYYY-MM and put it in startDate/endDate (use "01" for an unknown month, and your best estimate of the year from context). NEVER leave startDate blank if the candidate answered that question in any way — convert whatever they said instead of leaving it empty.
- After endDate/current, ask: "Any other education or training to add?"
- Set "phaseComplete" true ONLY once the candidate says NO more to add.
- Set "entryComplete" true once degree, institution, and startDate are filled for THIS entry.
- Keep responses to ONE short sentence. No preamble, no explanations, just the single question or reply.

Respond with ONLY JSON:
{
  "aiResponse": "...",
  "collectedData": { "degree":"","institution":"","startDate":"","endDate":"","current":false },
  "entryComplete": false,
  "phaseComplete": false
}`.trim();
    }

    // skills
    if (currentPhase === "skills") {
      return `
${languageInstruction}

You are an HR recruiter voice-interviewing a candidate about their skills.
Ask for their TECHNICAL skills first (as a list, e.g. "Excel, forklift operation"),
then their SOFT skills (e.g. "teamwork, communication").

Rules:
- Ask ONE question at a time.
- Once BOTH lists have at least one item, set "phaseComplete": true and thank them.
- Keep responses to ONE short sentence. No preamble, no explanations, just the single question or reply.

Respond with ONLY JSON:
{
  "aiResponse": "...",
  "technical": ["skill1", "skill2"],
  "soft": ["skill1", "skill2"],
  "phaseComplete": false
}
Always include ALL previously mentioned skills, plus any new ones — don't drop earlier ones.`.trim();
    }

    // extraSections — optional CV sections (Certifications, Projects, wagera)
    return `
${languageInstruction}

You are an HR recruiter voice-interviewing a candidate about OPTIONAL extra
CV sections beyond work experience/education/skills — things like:
${SECTION_TYPES.join(", ")}.

Rules:
- First ask: "Would you like to add any additional sections like certifications,
  projects, awards, or volunteering? If not, just say no and we'll move on."
- If they say no / none, set "phaseComplete": true immediately and don't ask anything else.
- If they name a section type, set "sectionType" to the closest matching option
  from this list: ${SECTION_TYPES.join(", ")}.
  Then collect ONE entry for it: title, subtitle (organization/issuer, optional),
  date (optional), description (optional, brief is fine).
- Set "entryComplete": true once at least "title" is filled for this entry.
- After an entry, ask: "Any more entries for this section, or a different section to add?"
- Set "phaseComplete": true only once the candidate has no more sections to add at all.
- Keep responses to ONE short sentence. No preamble, no explanations, just the single question or reply.

Respond with ONLY JSON:
{
  "aiResponse": "...",
  "sectionType": "",
  "collectedData": { "title":"", "subtitle":"", "date":"", "description":"" },
  "entryComplete": false,
  "phaseComplete": false
}`.trim();
  }

  // ==========================================================================
  // ASK AI — phase ke hisaab se sahi prompt bhejta hai, aur jawab ko sahi
  // state mein save karta hai
  // ==========================================================================
  // ==========================================================================
  // ROMAN URDU: Free AI model kabhi kabhi JSON ke IRD-GIRD extra text bhej
  // deta hai (ya beech mein cut ho jata hai) — seedha JSON.parse fail ho
  // jata tha. Yeh function pehle NORMAL parse try karta hai, agar fail ho
  // to text mein se pehla "{" aur aakhri "}" dhoond kar SIRF wahi hissa
  // nikaal kar dobara parse karta hai — is se kaafi zyada responses bach
  // jate hain jo pehle crash ho jate the.
  // ==========================================================================
  function extractJson(rawText) {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        return JSON.parse(cleaned.slice(start, end + 1)); // ROMAN URDU: yeh bhi fail ho sakta hai — caller isay pakarta hai
      }
      throw e;
    }
  }

  async function askAI(userAnswer) {
    setLoadingAI(true);
    setError("");

    const currentPhase = phaseRef.current;
    const systemPrompt = getSystemPrompt(currentPhase);

    const conversationText = messagesRef.current
      .map((m) => `${m.role === "ai" ? "Recruiter" : "Candidate"}: ${m.text}`)
      .join("\n");

    let contextData = "";
    if (currentPhase === "personal") contextData = JSON.stringify(personalInfoRef.current);
    if (currentPhase === "experience") contextData = JSON.stringify(draftExperienceRef.current);
    if (currentPhase === "education") contextData = JSON.stringify(draftEducationRef.current);
    if (currentPhase === "skills") contextData = JSON.stringify(skillsRef.current);
    if (currentPhase === "extraSections") {
      contextData = JSON.stringify({
        currentSectionType: currentSectionTypeRef.current,
        draftEntry: draftSectionEntryRef.current,
        sectionsAlreadyAdded: extraSectionsRef.current.map((s) => s.type),
      });
    }

    const userMessage = `
Conversation so far:
${conversationText}
Candidate: ${userAnswer}

Already collected for this step: ${contextData}
`.trim();

    // ROMAN URDU: BUG FIX — pehle ek dafa fail hone par (chahe garbage
    // JSON ho ya "models busy" 502), seedha error dikha deta tha aur
    // candidate ka jawab GUM ho jata tha — agla turn wahi purana sawaal
    // dobara pooch leta tha ("repeating question" wali complaint isi ki
    // wajah se thi). Ab hum FAIL hone par khud hi (bina user ko kuch
    // batae) EK dafa dobara try karte hain, chhoti si delay ke sath —
    // zyadatar transient glitches isi se theek ho jate hain.
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
      const response = await fetch("https://cvforjob.org/api/claude", {
  method: "POST",
  credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
            max_tokens: 1200,
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "AI request failed.");

        const rawText = data.content?.[0]?.text || "";
        const parsed = extractJson(rawText);

        setCurrentQuestion(parsed.aiResponse);
        const updatedMessages = [...messagesRef.current, { role: "ai", text: parsed.aiResponse }];
        messagesRef.current = updatedMessages;
        setMessages(updatedMessages);

        // -------------------- PHASE-SPECIFIC HANDLING --------------------
        if (currentPhase === "personal") {
          handlePersonalPhaseResult(parsed);
        } else if (currentPhase === "experience") {
          handleExperiencePhaseResult(parsed);
        } else if (currentPhase === "education") {
          handleEducationPhaseResult(parsed);
        } else if (currentPhase === "skills") {
          handleSkillsPhaseResult(parsed);
        }

        speak(parsed.aiResponse);
        setLoadingAI(false);
        return; // ROMAN URDU: kaamyab ho gaya — yahin ruk jao, dobara try mat karo
      } catch (err) {
        console.error(`askAI attempt ${attempt} failed:`, err);
        lastError = err;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 600)); // chhota sa wait, phir dobara try
        }
      }
    }

    // ROMAN URDU: dono attempts fail ho gaye — ab hi user ko error dikhao
    console.error(lastError);
    setError("Something went wrong talking to the AI. Please try again.");
    setLoadingAI(false);
  }

  function mergeNonEmpty(prevObj, newObj) {
    const updated = { ...prevObj };
    Object.keys(newObj || {}).forEach((key) => {
      const val = newObj[key];
      if (val !== undefined && val !== null && val !== "") updated[key] = val;
    });
    return updated;
  }

  function handlePersonalPhaseResult(parsed) {
    const updated = mergeNonEmpty(personalInfoRef.current, parsed.collectedData);
    personalInfoRef.current = updated;
    setPersonalInfo(updated);
    if (parsed.phaseComplete) advancePhase("experience");
  }

  function handleExperiencePhaseResult(parsed) {
    const updatedDraft = mergeNonEmpty(draftExperienceRef.current, parsed.collectedData);
    draftExperienceRef.current = updatedDraft;
    setDraftExperience(updatedDraft);

    if (parsed.entryComplete && updatedDraft.company) {
      // ROMAN URDU: DUPLICATE FIX — kabhi kabhi AI (khaas kar free
      // models) "entryComplete: true" wapas isi entry ke liye MULTIPLE
      // baar bhej deta hai (jab tak user "koi aur nahi" na kahe). Is se
      // pehle yeh code HAR dafa naya entry list mein daal deta tha —
      // isi wajah se resume mein ek hi job kai baar dikhti thi. Ab hum
      // pehle check karte hain ke bilkul yehi entry (company + position
      // + startDate match) pehle se list mein maujood to nahi — agar
      // hai, to dobara add nahi karte.
      const isDuplicate = workExperienceRef.current.some(
        (exp) =>
          exp.company === updatedDraft.company &&
          exp.position === updatedDraft.position &&
          exp.startDate === updatedDraft.startDate
      );
      if (!isDuplicate) {
        const newList = [...workExperienceRef.current, { id: Date.now(), ...updatedDraft }];
        workExperienceRef.current = newList;
        setWorkExperience(newList);
      }
      draftExperienceRef.current = {};
      setDraftExperience({});
    }
    if (parsed.phaseComplete) advancePhase("education");
  }

  function handleEducationPhaseResult(parsed) {
    const updatedDraft = mergeNonEmpty(draftEducationRef.current, parsed.collectedData);
    draftEducationRef.current = updatedDraft;
    setDraftEducation(updatedDraft);

    if (parsed.entryComplete && updatedDraft.degree) {
      // ROMAN URDU: DUPLICATE FIX — same wajah, same tareeqa jaisa
      // handleExperiencePhaseResult mein kiya. Degree + institution +
      // startDate match hone par dobara add nahi karte.
      const isDuplicate = educationRef.current.some(
        (edu) =>
          edu.degree === updatedDraft.degree &&
          edu.institution === updatedDraft.institution &&
          edu.startDate === updatedDraft.startDate
      );
      if (!isDuplicate) {
        const newList = [...educationRef.current, { id: Date.now(), ...updatedDraft }];
        educationRef.current = newList;
        setEducation(newList);
      }
      draftEducationRef.current = {};
      setDraftEducation({});
    }
    if (parsed.phaseComplete) advancePhase("skills");
  }

  function handleSkillsPhaseResult(parsed) {
    const updated = {
      technical: parsed.technical?.length ? parsed.technical : skillsRef.current.technical,
      soft: parsed.soft?.length ? parsed.soft : skillsRef.current.soft,
    };
    skillsRef.current = updated;
    setSkills(updated);
    if (parsed.phaseComplete) advancePhase("targetJob");
  }

  // ==========================================================================
  // ROMAN URDU: Yeh bilkul CVForm.jsx ke "handleGenerateTailoredCV" jaisa
  // hai — company/job title extract karta hai, experience ko job ke
  // hisaab se rewrite karta hai, cover letter likhta hai. Farq sirf itna
  // hai: yeh voice interview ke ANDAR chalta hai, aur sawaal AI se poochne
  // ki jagah HAMESHA khud call hota hai (kyunke yeh "generate" step hai,
  // "conversation" step nahi).
  // ==========================================================================
  async function generateTailoredCV(jobDescriptionText) {
    setJobDescription(jobDescriptionText);
    setGeneratingCV(true);
    setError("");
    try {
      const systemPrompt = `
You are an expert HR recruiter and professional resume writer.
You will receive a candidate's work experience and a job description.

Your job:
1. Extract the hiring COMPANY NAME from the job description (if unclear, write "Hiring Team").
2. Extract the JOB TITLE being applied for (if unclear, use the candidate's professional title).
3. Rewrite the candidate's work experience into 4-6 strong, ATS-optimized,
   achievement-based bullet points using keywords from the job description.
4. Write a tailored, professional 3-paragraph cover letter addressed to the company.

Respond with ONLY valid JSON, no markdown:
{
  "companyName": "string",
  "jobTitle": "string",
  "tailoredExperience": ["bullet 1", "bullet 2"],
  "coverLetter": "full cover letter text"
}`.trim();

      const experienceSummary = workExperienceRef.current
        .map((exp) => `${exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? "Present" : exp.endDate}): ${exp.description}`)
        .join("\n");

      const userMessage = `
CANDIDATE NAME: ${personalInfoRef.current.fullName}
CANDIDATE TITLE: ${personalInfoRef.current.professionalTitle}
CANDIDATE'S WORK EXPERIENCE:
${experienceSummary || "No prior experience listed."}
CANDIDATE'S SKILLS: ${[...skillsRef.current.technical, ...skillsRef.current.soft].join(", ")}

JOB DESCRIPTION:
${jobDescriptionText}
`.trim();

      const response = await fetch("https://cvforjob.org/api/claude", {
  method: "POST",
  credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          max_tokens: 1500,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI request failed.");

      const rawText = data.content?.[0]?.text || "";
      const parsed = extractJson(rawText);

      setCompanyName(parsed.companyName || "");
      setJobTitle(parsed.jobTitle || "");
      setTailoredExperience(parsed.tailoredExperience || []);
      setCoverLetter(parsed.coverLetter || "");

      const doneMessage = `All done, ${personalInfoRef.current.fullName || "there"}! I've tailored your CV and written a cover letter for ${parsed.companyName || "this role"}. Head to the CV Form to review and download everything.`;
      setCurrentQuestion(doneMessage);
      setMessages((prev) => [...prev, { role: "ai", text: doneMessage }]);
      speak(doneMessage);

      advancePhase("done", {
        companyName: parsed.companyName || "",
        jobTitle: parsed.jobTitle || "",
        tailoredExperience: parsed.tailoredExperience || [],
        coverLetter: parsed.coverLetter || "",
        jobDescription: jobDescriptionText,
      });
    } catch (err) {
      console.error(err);
      setError("Couldn't generate your tailored CV. Make sure the backend server is running.");
    } finally {
      setGeneratingCV(false);
    }
  }

  // --------------------------------------------------------------------
  // ROMAN URDU: Jab poora interview khatam ho ("done" phase), sab kuch
  // localStorage mein save kar dete hain — CVForm.jsx yeh yahan se
  // uthayega jab woh khulega.
  // --------------------------------------------------------------------
  function advancePhase(nextPhase, extraData = {}) {
    setPhase(nextPhase);
    phaseRef.current = nextPhase;

    if (nextPhase === "targetJob") {
      // ROMAN URDU: Yahan koi AI call NAHI karni — sawal fixed hai, khud
      // seedha bol dete hain, taake ek extra API request bach jaye
      const question =
        "Great, that's your CV info done! Now, please paste or read out the job description you're applying for, so I can tailor everything for you.";
      setCurrentQuestion(question);
      setMessages((prev) => [...prev, { role: "ai", text: question }]);
      speak(question);
      return;
    }

    if (nextPhase === "experience" || nextPhase === "education" || nextPhase === "skills") {
      // ROMAN URDU: BUG FIX — pehle yahan kuch nahi hota tha, isliye
      // "ruk" jata tha jab tak user khud kuch type na kare. Ab hum
      // FOREN AI se agle phase ka PEHLA sawal mangwate hain — bilkul
      // wahi tareeqa jo interview shuru karte waqt use hota hai.
      askAI("(moving to the next section — please greet briefly and ask your first question for this new section)");
      return;
    }

    if (nextPhase === "done") {
      stopTimer();
      const dataToSave = {
        personalInfo: personalInfoRef.current,
        workExperience: workExperienceRef.current,
        education: educationRef.current,
        skills: skillsRef.current,
        ...extraData, // companyName, jobTitle, tailoredExperience, coverLetter, jobDescription
      };
      localStorage.setItem("voiceInterviewData", JSON.stringify(dataToSave));
    }
  }

  function startInterview() {
    setStarted(true);
    startTimer();
    askAI("(interview starting — greet the candidate and ask your first question)");
  }

  function togglePause() {
    setIsPaused((prev) => {
      const next = !prev;
      if (next) { stopTimer(); stopListening(); window.speechSynthesis.cancel(); }
      else { startTimer(); }
      return next;
    });
  }
  function toggleMute() { setIsMuted((prev) => !prev); }
  function endInterview() {
    stopTimer();
    stopListening();
    window.speechSynthesis.cancel();
    setStarted(false);
  }

  const progressIndex = PHASES.indexOf(phase);

  return (
    <div className="voice-page">
      <Link to="/" className="voice-back-link">← Back to Home</Link>

      {!started ? (
        <div className="voice-intro">
          <div className="voice-avatar-large">🎙️</div>
          <h1>AI Voice Interview</h1>
          <p>
            Our AI recruiter will ask about your personal info, work
            experience, education, and skills. Answer by speaking or typing.
          </p>
          {!voiceInputSupported && (
            <div className="error-box">
              Voice input isn't supported in this browser — you can type
              your answers instead. For full voice support, try Chrome or Edge.
            </div>
          )}

          <div className="voice-language-picker">
            <label htmlFor="lang-select">Interview language</label>
            <select
              id="lang-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
            <p className="voice-language-note">
              The AI will speak and listen in this language — your final CV
              will still be written in English.
            </p>
          </div>

          <button className="btn-generate" onClick={startInterview}>🎤 Start Interview</button>
        </div>
      ) : (
        <div className="voice-interview-screen">
          <div className="voice-top-bar">
            <span className="voice-timer">⏱ {formatTime(seconds)}</span>
            <span className="voice-progress-label">
              {PHASE_LABELS[phase]} ({Math.min(progressIndex + 1, 5)}/5)
            </span>
          </div>

          <div className={"voice-avatar" + (isSpeaking ? " speaking" : "") + (isListening ? " listening" : "")}>🤖</div>

          <div className="voice-status">
            {generatingCV && "Crafting your tailored CV & cover letter..."}
            {!generatingCV && loadingAI && "Thinking..."}
            {!generatingCV && isSpeaking && "Speaking..."}
            {!generatingCV && isListening && "Listening..."}
            {!generatingCV && !loadingAI && !isSpeaking && !isListening && phase !== "done" && "Ready"}
            {phase === "done" && "✅ Interview Complete!"}
          </div>

          {(isSpeaking || isListening) && (
            <div className="voice-wave">
              {[...Array(5)].map((_, i) => <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
          )}

          <div className="voice-question-box">{currentQuestion}</div>

          {error && (
            <div className="error-box">
              {error}
              <button className="voice-retry-btn" onClick={handleRetry}>🔄 Retry</button>
            </div>
          )}

          {phase !== "done" && (
            <form className="voice-text-fallback" onSubmit={handleTextSubmit}>
              <input
                type="text"
                className="voice-text-input"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder={phase === "targetJob" ? "Paste the job description here..." : "Or type your answer here..."}
                disabled={loadingAI || generatingCV}
              />
              <button type="submit" className="voice-send-btn" disabled={loadingAI || generatingCV || !textAnswer.trim()}>
                {generatingCV ? "Working..." : "Send"}
              </button>
            </form>
          )}

          <div className="voice-transcript">
            {messages.map((m, i) => (
              <div key={i} className={"transcript-line " + m.role}>
                <strong>{m.role === "ai" ? "Recruiter" : "You"}:</strong> {m.text}
              </div>
            ))}
          </div>

          {phase === "done" && (
            <div className="voice-complete-box">
              <p>
                🎉 All done! Your details, tailored experience, and cover
                letter are ready. Head to the CV Form to preview and
                download everything.
              </p>
              <Link to="/cv-form" className="btn-generate" style={{ display: "inline-block", textDecoration: "none" }}>
                Continue to CV Form
              </Link>
            </div>
          )}

          <div className="voice-controls">
            <button className={"voice-ctrl-btn" + (isMuted ? " active" : "")} onClick={toggleMute}>
              {isMuted ? "🔇 Unmute" : "🔊 Mute"}
            </button>
            <button className={"voice-ctrl-btn" + (isPaused ? " active" : "")} onClick={togglePause}>
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button className="voice-ctrl-btn end" onClick={endInterview}>✕ End Interview</button>
          </div>
        </div>
      )}
    </div>
  );
}
