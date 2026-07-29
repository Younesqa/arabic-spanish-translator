/* ============================================================
   Arabic ⇄ Spanish Translator
   Plain JavaScript — no frameworks.
   Uses the LibreTranslate API for translation.
   ============================================================ */

// ---- Configuration -------------------------------------------------------

// Public LibreTranslate instances. The app tries them in order in case one
// is offline or rate-limited. You can point this at your own self-hosted
// LibreTranslate server for a more reliable experience.


// ---- DOM references -------------------------------------------------------

const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const charCounter = document.getElementById("charCounter");
const translateBtn = document.getElementById("translateBtn");
const spinner = document.getElementById("spinner");
const swapBtn = document.getElementById("swapBtn");
const pasteBtn = document.getElementById("pasteBtn");
const clearInputBtn = document.getElementById("clearInputBtn");
const copyBtn = document.getElementById("copyBtn");
const clearOutputBtn = document.getElementById("clearOutputBtn");
const errorBanner = document.getElementById("errorBanner");
const detectedBadge = document.getElementById("detectedBadge");
const toast = document.getElementById("toast");

// Is this a touch device? Used to decide whether the Enter key should
// submit the translation (mobile) or insert a newline (desktop).
const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

// ---- Language detection ----------------------------------------------------

// Arabic script uses Unicode code points in the range U+0600–U+06FF
// (plus a few supplementary ranges). If any Arabic letters are present,
// we treat the text as Arabic.
const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

// Spanish (and Latin-script text in general) uses standard Latin letters,
// including accented characters and ñ.
const LATIN_PATTERN = /[a-zA-Z\u00C0-\u017F]/;

/**
 * Detects whether the given text is Arabic, Spanish, or unsupported.
 * Returns "ar", "es", or null.
 */
function detectLanguage(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const hasArabic = ARABIC_PATTERN.test(trimmed);
  const hasLatin = LATIN_PATTERN.test(trimmed);

  if (hasArabic && !hasLatin) return "ar";
  if (hasLatin && !hasArabic) return "es";

  // Mixed or ambiguous text: fall back to whichever script appears more.
  const arabicCount = (trimmed.match(ARABIC_PATTERN) || []).length;
  const latinCount = (trimmed.match(LATIN_PATTERN) || []).length;
  if (arabicCount > 0 && arabicCount >= latinCount) return "ar";
  if (latinCount > 0 && latinCount > arabicCount) return "es";

  return null;
}

// ---- UI helpers -------------------------------------------------------

function setLoading(isLoading) {
  translateBtn.disabled = isLoading;
  spinner.hidden = !isLoading;
  translateBtn.querySelector(".btn-label").textContent = isLoading
    ? "Traduciendo…"
    : "Traducir";
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
}

function hideError() {
  errorBanner.hidden = true;
  errorBanner.textContent = "";
}

function setTextDirection(el, lang) {
  el.classList.remove("rtl", "ltr");
  el.classList.add(lang === "ar" ? "rtl" : "ltr");
}

function updateCharCounter() {
  charCounter.textContent = inputText.value.length;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function showDetectedBadge(lang) {
  const labels = {
    ar: "Detectado: Árabe",
    es: "Detectado: Español",
  };
  detectedBadge.textContent = labels[lang] || "";
  detectedBadge.hidden = !lang;
}

// ---- Translation -------------------------------------------------------

/**
 * Calls the LibreTranslate API, trying each configured endpoint in turn
 * until one succeeds.
 */
async function callTranslateApi(text, source, target) {

    const response = await fetch("/translate", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            text,
            source,
            target
        })

    });

    if (!response.ok)
        throw new Error("Translation failed");

    const data = await response.json();

    return data.translation;

}

async function handleTranslate() {
  hideError();

  const text = inputText.value.trim();
  if (!text) {
    return;
  }

  const detected = detectLanguage(text);

  if (!detected) {
    outputText.value = "";
    detectedBadge.hidden = true;
    showError("This translator only supports Arabic and Spanish.");
    return;
  }

  const target = detected === "ar" ? "es" : "ar";

  setTextDirection(inputText, detected);
  showDetectedBadge(detected);
  setLoading(true);
  outputText.value = "";

  try {
    const translated = await callTranslateApi(text, detected, target);
    outputText.value = translated;
    setTextDirection(outputText, target);
  } catch (err) {
    console.error("Translation error:", err);
    showError(
      "We couldn't reach the translation service. Please check your connection and try again."
    );
  } finally {
    setLoading(false);
  }
}

// ---- Event listeners -------------------------------------------------------

inputText.addEventListener("input", () => {
  updateCharCounter();
  hideError();
});

translateBtn.addEventListener("click", handleTranslate);

// Ctrl/Cmd + Enter always translates, on any device.
inputText.addEventListener("keydown", (e) => {
  const isEnter = e.key === "Enter";
  const modifierHeld = e.ctrlKey || e.metaKey;

  if (isEnter && modifierHeld) {
    e.preventDefault();
    handleTranslate();
    return;
  }

  // On touch devices, a plain Enter (the on-screen "Go" key) submits too,
  // since multi-line composition is less common when typing on a phone.
  if (isEnter && !e.shiftKey && isTouchDevice) {
    e.preventDefault();
    handleTranslate();
  }
});

// Paste button: reads from the system clipboard and inserts into the input.
pasteBtn.addEventListener("click", async () => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    inputText.value = clipboardText;
    updateCharCounter();
    hideError();
    inputText.focus();
  } catch (err) {
    showError("Couldn't access the clipboard. You can paste manually instead.");
  }
});

// Clear input.
clearInputBtn.addEventListener("click", () => {
  inputText.value = "";
  updateCharCounter();
  hideError();
  inputText.focus();
});

// Clear output.
clearOutputBtn.addEventListener("click", () => {
  outputText.value = "";
  detectedBadge.hidden = true;
});

// Copy translation to clipboard.
copyBtn.addEventListener("click", async () => {
  if (!outputText.value) return;
  try {
    await navigator.clipboard.writeText(outputText.value);
    showToast("Copiado / تم النسخ");
  } catch (err) {
    showError("Couldn't copy to the clipboard.");
  }
});

// Swap: moves the translated text back into the input for a reply/round-trip.
swapBtn.addEventListener("click", () => {
  if (!outputText.value) return;

  const newInput = outputText.value;
  const newInputLang = detectLanguage(newInput);

  inputText.value = newInput;
  outputText.value = "";
  detectedBadge.hidden = true;
  updateCharCounter();
  hideError();

  if (newInputLang) {
    setTextDirection(inputText, newInputLang);
  }

  inputText.focus();
});

// ---- PWA: register the service worker -------------------------------------

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

const themeToggle = document.getElementById("themeToggle");

// تحميل آخر وضع محفوظ
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️ Light Mode";
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        localStorage.setItem("theme", "dark");
        themeToggle.textContent = "☀️ Light Mode";
    } else {
        localStorage.setItem("theme", "light");
        themeToggle.textContent = "🌙 Dark Mode";
    }
});
// ---- Initial state -------------------------------------------------------

updateCharCounter();
