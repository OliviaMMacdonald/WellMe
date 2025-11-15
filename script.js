/* WellMe — main JS with enhanced UI, safe prompts, and summary badges */

const THEME_KEY = "wellme_theme";
const ENTRIES_KEY = "wellme_entries";
const REMINDER_KEY = "wellme_last_reminder";

// Views & navigation
const views = document.querySelectorAll(".view");
const navBtns = document.querySelectorAll(".nav-btn");

// Theme & reminder
const themeToggle = document.getElementById("themeToggle");
const reminder = document.getElementById("reminder");
const reminderLogBtn = document.getElementById("reminderLogBtn");
const reminderDismissBtn = document.getElementById("reminderDismissBtn");

// Log view
let selectedMood = null;
const moodButtons = document.querySelectorAll(".mood");
const form = document.getElementById("entryForm");
const noteGood = document.getElementById("noteGood");
const noteTomorrow = document.getElementById("noteTomorrow");
const clearTodayBtn = document.getElementById("clearToday");

// History view
const entryList = document.getElementById("entryList");
const exportBtn = document.getElementById("exportBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
let chart;

// Suggestions
const btnAdvice = document.getElementById("btnAdvice");
const btnQuote = document.getElementById("btnQuote");
const btnActivity = document.getElementById("btnActivity");
const suggestionOut = document.getElementById("suggestionOut");

/* ---------------- Theme ---------------- */
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light"; // default to light
  setTheme(saved);
}

themeToggle?.addEventListener("click", () => {
  const current = localStorage.getItem(THEME_KEY) || "light";
  const next = current === "light" ? "dark" : "light";
  setTheme(next);
});

/* ---------------- Navigation ---------------- */
function switchView(id) {
  // sections
  views.forEach(v => v.classList.remove("active"));
  const targetView = document.getElementById(id);
  if (targetView) targetView.classList.add("active");

  // nav buttons
  navBtns.forEach(btn => {
    if (btn.dataset.target === id) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  // focus heading
  const heading = document.querySelector(`#${id} h2`);
  if (heading && typeof heading.focus === "function") heading.focus();

  if (id === "history") {
    renderEntries();
    renderChart();
  }
  if (id === "home") {
    updateSummaryBadges();
  }
}

navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    if (target) switchView(target);
  });
});

/* ---------------- Reminder banner ---------------- */
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function showReminderIfNeeded() {
  if (!reminder) return;
  const entries = getEntries();
  const today = isoDate(new Date());
  const hasToday = entries.some(e => e.date === today);
  const lastShown = localStorage.getItem(REMINDER_KEY);
  const shownToday = lastShown === today;

  if (!hasToday && !shownToday) {
    reminder.hidden = false;
  }
}

reminderLogBtn?.addEventListener("click", () => {
  localStorage.setItem(REMINDER_KEY, isoDate(new Date()));
  if (reminder) reminder.hidden = true;
  switchView("log");
});

reminderDismissBtn?.addEventListener("click", () => {
  localStorage.setItem(REMINDER_KEY, isoDate(new Date()));
  if (reminder) reminder.hidden = true;
});

/* ---------------- Entries CRUD ---------------- */
function getEntries() {
  try {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

// mood select
moodButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    moodButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedMood = Number(btn.dataset.value);
  });
});

form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const today = isoDate(new Date());
  if (!selectedMood) {
    alert("Please select a mood emoji to save your entry.");
    return;
  }

  const entry = {
    date: today,
    mood: selectedMood,
    noteGood: (noteGood?.value ?? "").trim(),
    noteTomorrow: (noteTomorrow?.value ?? "").trim()
  };

  const entries = getEntries();
  const idx = entries.findIndex(e => e.date === today);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);

  entries.sort((a, b) => a.date.localeCompare(b.date));
  saveEntries(entries);
  localStorage.setItem(REMINDER_KEY, today);

  if (noteGood) noteGood.value = "";
  if (noteTomorrow) noteTomorrow.value = "";
  moodButtons.forEach(b => b.classList.remove("selected"));
  selectedMood = null;

  alert("Entry saved ✔");
  updateSummaryBadges();
  switchView("history");
});

clearTodayBtn?.addEventListener("click", () => {
  if (noteGood) noteGood.value = "";
  if (noteTomorrow) noteTomorrow.value = "";
  moodButtons.forEach(b => b.classList.remove("selected"));
  selectedMood = null;
});

/* ---------------- Home summary badges ---------------- */
function updateSummaryBadges() {
  const entries = getEntries();
  const lastEl = document.getElementById("lastEntrySummary");
  const daysEl = document.getElementById("daysLoggedSummary");
  if (!lastEl || !daysEl) return;

  if (entries.length === 0) {
    lastEl.textContent = "No entries yet";
    daysEl.textContent = "0";
    return;
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const emoji = ["😞", "🙁", "😐", "🙂", "😄"][last.mood - 1] || "";
  lastEl.textContent = `${last.date} • Mood ${last.mood} ${emoji}`;
  daysEl.textContent = String(sorted.length);
}

/* ---------------- History list ---------------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[s]));
}

function renderEntries() {
  if (!entryList) return;
  const entries = getEntries();
  entryList.innerHTML = "";

  if (entries.length === 0) {
    const li = document.createElement("li");
    li.className = "entry";
    li.innerHTML = "<em>No entries yet.</em>";
    entryList.appendChild(li);
    return;
  }

  [...entries].reverse().forEach(e => {
    const li = document.createElement("li");
    li.className = "entry";
    const moodEmoji = ["😞", "🙁", "😐", "🙂", "😄"][e.mood - 1];

    li.innerHTML = `
      <div class="entry-head">
        <div class="entry-meta">
          <strong>${e.date}</strong> • Mood ${e.mood} ${moodEmoji}
        </div>
        <div class="entry-actions">
          <button class="ghost" data-del="${e.date}">Delete</button>
        </div>
      </div>
      ${e.noteGood ? `<div><strong>Went well:</strong> ${escapeHtml(e.noteGood)}</div>` : ""}
      ${e.noteTomorrow ? `<div><strong>Intention:</strong> ${escapeHtml(e.noteTomorrow)}</div>` : ""}
    `;
    entryList.appendChild(li);
  });

  entryList.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const date = btn.getAttribute("data-del");
      const remaining = getEntries().filter(x => x.date !== date);
      saveEntries(remaining);
      renderEntries();
      renderChart();
      updateSummaryBadges();
    });
  });
}

/* ---------------- Chart: last 14 days ---------------- */
function renderChart() {
  const ctx = document.getElementById("moodChart");
  if (!ctx || typeof Chart === "undefined") return;

  const entries = getEntries();
  const days = [];
  const today = new Date();

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(isoDate(d));
  }

  const map = Object.fromEntries(entries.map(e => [e.date, e.mood]));
  const data = days.map(d => map[d] ?? null);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: days,
      datasets: [{
        label: "Mood (1–5)",
        data,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { suggestedMin: 1, suggestedMax: 5, ticks: { stepSize: 1 } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* ---------------- Export / clear ---------------- */
exportBtn?.addEventListener("click", () => {
  const entries = getEntries();
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wellme-entries.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

clearAllBtn?.addEventListener("click", () => {
  if (confirm("Clear all entries? This cannot be undone.")) {
    localStorage.removeItem(ENTRIES_KEY);
    renderEntries();
    renderChart();
    updateSummaryBadges();
  }
});

/* ---------- Safe suggestion prompts ---------- */
const BLOCKLIST = [
  "bleach","suicide","kill","die","harm","self-harm","violence","weapon","drugs","overdose","starve",
  "anorexia","bulimia","purge","cutting","abuse","racist","sex","nsfw","terror","bomb","gun"
];

const FALLBACK_ADVICE = [
  "Name one thing that went okay today.",
  "Drink some water and take three slow breaths.",
  "Pick the smallest next step and do just that.",
  "Set a 5-minute timer and start. Stop when it ends.",
  "Text someone a thank-you or a simple emoji."
];

const FALLBACK_QUOTES = [
  "Small steps add up.",
  "You don’t need to feel ready to begin.",
  "Done is kinder than perfect.",
  "Your pace is valid.",
  "Future you will thank you for any tiny progress."
];

const FALLBACK_ACTIVITIES = [
  "Stretch your neck and shoulders.",
  "Sit by a window for two minutes.",
  "Organise one file or one tab.",
  "Write one sentence about today.",
  "Put a glass of water within reach."
];

function isSafeText(t) {
  if (!t) return false;
  const lower = String(t).toLowerCase();
  return !BLOCKLIST.some(b => lower.includes(b));
}

async function safeFetch(url, pick) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error("Network error");
    const data = await res.json();
    clearTimeout(t);
    const txt = pick(data);
    if (isSafeText(txt)) return txt;
    return null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

function choose(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

btnAdvice?.addEventListener("click", async () => {
  suggestionOut.textContent = "Loading…";
  const txt = await safeFetch("https://api.adviceslip.com/advice", d => d.slip?.advice);
  suggestionOut.textContent = txt || choose(FALLBACK_ADVICE);
});

btnQuote?.addEventListener("click", async () => {
  suggestionOut.textContent = "Loading…";
  const txt = await safeFetch("https://api.quotable.io/random", d => `${d.content} — ${d.author}`);
  suggestionOut.textContent = txt || choose(FALLBACK_QUOTES);
});

btnActivity?.addEventListener("click", async () => {
  suggestionOut.textContent = "Loading…";
  const txt = await safeFetch("https://www.boredapi.com/api/activity", d => d.activity);
  suggestionOut.textContent = txt || choose(FALLBACK_ACTIVITIES);
});

/* ---------------- Boot ---------------- */
initTheme();
showReminderIfNeeded();
renderEntries();
renderChart();
updateSummaryBadges();
