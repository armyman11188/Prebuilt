// ============================================================================
// src/components/AddSectionModal.jsx
//
// ROMAN URDU EXPLANATION — NAYA CONCEPT: "MODAL"
// Modal ek popup box hota hai jo screen ke UPAR overlay ho kar khulta hai,
// baaki page ko halka dark/dim kar deta hai. Do hisse hote hain:
//  1. "backdrop" — poori screen ko cover karne wala dark translucent layer
//  2. "card" — beech mein woh asal white box jisme content hai
//
// TRICK: "onClick={onClose}" backdrop pe lagaya hai (bahar click = band ho
// jaye), lekin card ke apne onClick mein "e.stopPropagation()" likha hai —
// iska matlab "yeh click yahin ROK do, backdrop tak mat jaane do." Warna
// card ke ANDAR click karne se bhi modal band ho jata (jo galat hota).
// ============================================================================
import { useState } from "react";
import "./AddSectionModal.css";

// Yeh saari section types hain jo user add kar sakta hai. "Language skills"
// isliye list mein hai kyunke ho sakta hai kisi user ne Step 1 wali
// Language card delete kar di ho — lekin hum isay CVForm.jsx se "exclude"
// karwa denge agar already maujood ho.
const ALL_SECTION_TYPES = [
  "Language skills",
  "Certifications",
  "Conferences and seminars",
  "Creative works",
  "Driving Licence",
  "Hobbies and interests",
  "Honours and awards",
  "Networks and memberships",
  "Projects",
  "Publications",
  "Recommendations",
  "Social and political activities",
  "Volunteering",
  "Other",
];

export default function AddSectionModal({ excludeTypes = [], onAdd, onClose }) {
  const [selected, setSelected] = useState("");

  // .filter() se woh types hata do jo pehle se maujood hain (list mein
  // dobara nahi dikhne chahiye)
  const availableTypes = ALL_SECTION_TYPES.filter((type) => !excludeTypes.includes(type));

  function handleAddClick() {
    if (!selected) return; // agar kuch select hi nahi kiya, kuch mat karo
    onAdd(selected); // parent (CVForm) ko batao "yeh type add karo"
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add a New Section</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <label className="modal-label">Select the section type</label>
        <select
          className="modal-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Select...</option>
          {availableTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn-add" onClick={handleAddClick} disabled={!selected}>
            Add Section
          </button>
        </div>
      </div>
    </div>
  );
}
