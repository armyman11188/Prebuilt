// ============================================================================
// src/components/StepIndicator.jsx
//
// ROMAN URDU EXPLANATION:
// Yeh component upar wale gol numbered circles banata hai (1, 2, 3), jo
// aapas mein line se jude hote hain — jaise screenshot mein tha.
// "steps" ek LIST of names hai (jaise ["Personal Info", "Experience", "Download"]),
// aur "currentStep" batata hai user abhi kis number pe hai (0, 1, 2...).
//
// Yeh component "generic/reusable" isliye hai kyunke ismein KOI bhi steps
// ki list de sakte ho, yeh khud fixed nahi hai — isliye future mein agar
// hum ek naya step (jaise "AI Interview") add karein, sirf list badalni
// hogi, is component ka code nahi.
// ============================================================================
import "./StepIndicator.css";

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="step-indicator">
      {/* steps.map(...) list ki har cheez ko ek UI element mein badalta hai.
          "index" batata hai list mein us cheez ka number (0 se shuru hota hai) */}
      {steps.map((label, index) => (
        <div className="step-item" key={label}>
          <div className="step-row">
            <div
              className={
                "step-circle" +
                (index < currentStep ? " step-done" : "") +
                (index === currentStep ? " step-active" : "")
              }
            >
              {/* Agar yeh step pehle hi complete ho chuka hai, ✓ dikhao,
                  warna step ka number dikhao (1-based, isliye index + 1) */}
              {index < currentStep ? "✓" : index + 1}
            </div>

            {/* Do steps ke beech ki connecting line — aakhri step ke baad
                line nahi honi chahiye, isliye check lagaya */}
            {index < steps.length - 1 && (
              <div
                className={"step-line" + (index < currentStep ? " step-line-done" : "")}
              />
            )}
          </div>
          <span className="step-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
