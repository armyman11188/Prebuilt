// ============================================================================
// src/index.js
//
// ROMAN URDU EXPLANATION:
// Yeh sabse PEHLI JavaScript file hai jo chalti hai. Iska sirf itna kaam
// hai: index.html mein jo <div id="root"> tha, usay dhoondo, aur usay
// bolo "is div ke andar hamara poora <App /> render kar do."
// Bas — is file mein aisa kuch aur nahi hoga, hamesha yehi rahegi.
// ============================================================================
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
