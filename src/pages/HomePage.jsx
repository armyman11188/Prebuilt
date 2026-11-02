// ============================================================================
// src/pages/HomePage.jsx  — redesigned to match the "CV Pro" mockup
//
// ROMAN URDU: Sections upar se neeche: Navbar -> Hero -> Video banner ->
// 2 feature cards (New CV / Voice Interview) -> Trust bar.
// Icons "react-icons/fi" se aate hain (already installed hain).
//
// OPTIONAL IMAGES (public/ folder mein rakho, na hon to page phir bhi theek):
//   public/hero-person.png  -> hero ki right side wali person ki photo
//   public/demo.mp4         -> "Watch Demo" video
// ============================================================================
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight, FiCheck, FiPlay, FiClock, FiBriefcase, FiBook, FiBarChart2,
  FiMic, FiShield, FiZap, FiStar, FiHeadphones, FiFileText, FiVideo, FiTarget, FiUser,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { clearLocalCv } from "../utils/cvStore";
import "./HomePage.css";

export default function HomePage() {
  const { user, loading, logout } = useAuth();
  const [playing, setPlaying] = useState(false);
  const [videoMissing, setVideoMissing] = useState(false);

  return (
    <div className="home">
      {/* ---------- NAVBAR ---------- */}
      <nav className="hp-nav">
        <div className="hp-nav-inner">
          <Link to="/" className="hp-brand">
            <FiFileText className="hp-brand-icon" />
            <span>
              <b>CV Pro</b>
              <small>Build. Apply. Get Hired.</small>
            </span>
          </Link>
          <div className="hp-links">
            <a href="#top" className="hp-link active">Home</a>
            <a href="#new-cv" className="hp-link">Templates</a>
            <a href="#features" className="hp-link">Features</a>
            <a href="#how-it-works" className="hp-link">How It Works</a>
            <a href="#support" className="hp-link">FAQ</a>
          </div>
          <div className="hp-nav-actions">
            {!loading && (user ? (
              <>
                <span className="hp-user" title={user.email}>{user.email}</span>
                <Link to="/profile" className="hp-btn hp-btn-light"><FiUser /> My Profile</Link>
                <button type="button" className="hp-btn hp-btn-light" onClick={() => { clearLocalCv(); logout(); }}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="hp-btn hp-btn-light">Sign In</Link>
                <Link to="/cv-form" className="hp-btn hp-btn-primary hp-btn-sm">
                  Get Started <FiArrowRight />
                </Link>
              </>
            ))}
          </div>
        </div>
      </nav>

      {/* ---------- HERO ---------- */}
      <header className="hp-hero" id="top">
        <div className="hp-wrap hp-hero-grid">
          <div className="hp-hero-copy">
            <h1>
              Create Your <span>Professional CV</span> in Minutes
            </h1>
            <p>
              Stand out from the crowd with a modern CV, and take the next step in your career journey.
            </p>
            <ul className="hp-checks">
              <li><FiCheck /> ATS Friendly Templates</li>
              <li><FiCheck /> Easy &amp; Fast Design</li>
              <li><FiCheck /> Voice Interview Option</li>
            </ul>
            <div className="hp-hero-actions">
              <Link to="/cv-form" className="hp-btn hp-btn-primary hp-btn-lg">
                Start Creating Now <FiArrowRight />
              </Link>
              <a href="#how-it-works" className="hp-demo">
                <span className="hp-demo-dot"><FiPlay /></span> Watch Demo
              </a>
            </div>
          </div>

          <div className="hp-hero-visual" aria-hidden="true">
            <div className="hp-blob" />
            <div className="hp-cv-card">
              <div className="hp-cv-top">
                <div className="hp-avatar">JD</div>
                <div>
                  <div className="hp-cv-name">John Doe</div>
                  <div className="hp-cv-role">Project Manager</div>
                </div>
              </div>
              <div className="hp-cv-label">About Me</div>
              <div className="hp-line" /><div className="hp-line w80" />
              <div className="hp-cv-row"><FiBriefcase /><div><div className="hp-cv-label">Experience</div><div className="hp-line" /><div className="hp-line w60" /></div></div>
              <div className="hp-cv-row"><FiBook /><div><div className="hp-cv-label">Education</div><div className="hp-line" /><div className="hp-line w60" /></div></div>
              <div className="hp-cv-row"><FiBarChart2 /><div><div className="hp-cv-label">Skills</div><div className="hp-bar"><i style={{ width: "75%" }} /></div><div className="hp-bar"><i style={{ width: "50%" }} /></div></div></div>
            </div>
            <img
              className="hp-person"
              src="/hero-person.png"
              alt=""
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        </div>
      </header>

      {/* ---------- VIDEO BANNER ---------- */}
      <section className="hp-wrap" id="how-it-works">
        <div className="hp-video">
          {playing && !videoMissing ? (
            <video className="hp-video-el" src="/demo.mp4" controls autoPlay onError={() => setVideoMissing(true)} />
          ) : (
            <>
              <div className="hp-video-copy">
                <span className="hp-tag hp-tag-solid"><FiVideo /> Watch Tutorial</span>
                <h2>See How It Works</h2>
                <p>Watch this short video to learn how to create your CV and use all amazing features.</p>
                <span className="hp-duration"><FiClock /> 2:30 min</span>
                {videoMissing && <p className="hp-note">Add a file named demo.mp4 to the public folder to play it here.</p>}
              </div>
              <div className="hp-laptop" aria-hidden="true">
                <div className="hp-screen">
                  <div className="hp-screen-card"><div className="hp-avatar sm">JD</div><div className="hp-line" /><div className="hp-line w60" /></div>
                </div>
              </div>
              <button type="button" className="hp-play" aria-label="Play tutorial video" onClick={() => { setVideoMissing(false); setPlaying(true); }}>
                <FiPlay />
              </button>
            </>
          )}
        </div>
      </section>

      {/* ---------- FEATURE CARDS ---------- */}
      <section className="hp-wrap hp-cards" id="features">
        <article className="hp-card" id="new-cv">
          <div className="hp-card-body">
            <span className="hp-tag">Quick &amp; Easy</span>
            <h3>New CV</h3>
            <p>Design your CV with beautiful templates in just a few clicks.</p>
            <ul className="hp-checks small">
              <li><FiCheck /> Choose from premium templates</li>
              <li><FiCheck /> Customize easily</li>
              <li><FiCheck /> Download instantly</li>
            </ul>
            <Link to="/cv-form" className="hp-btn hp-btn-primary">Create New CV <FiArrowRight /></Link>
          </div>
          <div className="hp-mini-cvs" aria-hidden="true">
            <div className="hp-mini back" />
            <div className="hp-mini front"><div className="hp-mini-head" /><div className="hp-avatar sm">JD</div><div className="hp-line" /><div className="hp-line w60" /><div className="hp-line" /></div>
          </div>
        </article>

        <article className="hp-card hp-card-violet">
          <div className="hp-card-body">
            <span className="hp-tag hp-tag-violet">AI Powered</span>
            <h3>CV with Voice Interview</h3>
            <p>Create your CV and take a voice interview to showcase your skills.</p>
            <ul className="hp-checks small violet">
              <li><FiCheck /> Speak &amp; Get Your CV</li>
              <li><FiCheck /> AI Analyzes Your Interview</li>
              <li><FiCheck /> Boost Your Chances</li>
            </ul>
            <Link to="/voice-interview" className="hp-btn hp-btn-violet">Start Voice Interview <FiArrowRight /></Link>
          </div>
          <div className="hp-mic" aria-hidden="true">
            <FiMic />
            <div className="hp-wave">{Array.from({ length: 15 }).map((_, i) => <i key={i} style={{ height: 10 + ((i * 7) % 5) * 7 }} />)}</div>
          </div>
        </article>

        <article className="hp-card hp-card-teal hp-card-wide" id="cv-for-job">
          <div className="hp-card-body">
            <span className="hp-tag hp-tag-teal">Apply Smarter</span>
            <h3>CV for a Job</h3>
            <p>Open your saved CV, paste a job description and get an ATS-friendly CV plus cover letter.</p>
            <ul className="hp-checks small teal">
              <li><FiCheck /> Your latest saved CV, ready to use</li>
              <li><FiCheck /> Tailored to each job posting</li>
              <li><FiCheck /> No CV yet? We'll help you create one</li>
            </ul>
            <Link to="/profile" className="hp-btn hp-btn-teal">Open My CV <FiArrowRight /></Link>
          </div>
          <div className="hp-job-art" aria-hidden="true">
            <FiTarget />
            <div className="hp-line" /><div className="hp-line w80" /><div className="hp-line w60" />
          </div>
        </article>
      </section>

      {/* ---------- TRUST BAR ---------- */}
      <section className="hp-wrap" id="support">
        <div className="hp-trust">
          <div><FiShield /><span><b>100% Secure</b><small>Your Data is Safe</small></span></div>
          <div><FiZap /><span><b>Fast &amp; Easy</b><small>in Just Minutes</small></span></div>
          <div><FiStar className="gold" /><span><b>Trusted by</b><small>Millions</small></span></div>
          <div><FiHeadphones /><span><b>24/7 Support</b><small>We're Here to Help</small></span></div>
        </div>
      </section>

      <footer className="hp-footer">© {new Date().getFullYear()} CV Pro. All rights reserved.</footer>
    </div>
  );
}
