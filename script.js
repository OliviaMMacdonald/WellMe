// WellMe application script
// Handles theming, navigation, mood logging, history and suggestions.

// Storage keys
const THEME_KEY = "wellme_theme";
const ENTRIES_KEY = "wellme_entries";
const REMINDER_KEY = "wellme_reminder_date";

// Navigation and views
const views = document.querySelectorAll(".view");
const navBtns = document.querySelectorAll(".nav-btn");

// Theme toggle
const themeToggle = document.getElementById("themeToggle");

// Reminder elements
const reminder = document.getElementById("reminder");
const reminderLogBtn = document.getElementById("reminderLogBtn");
const reminderDismissBtn = document.getElementById("reminderDismissBtn");

// Log view elements
const moodButtons = document.querySelectorAll(".mood");
const entryForm = document.getElementById("entryForm");
const noteGood = document.getElementById("noteGood");
const noteTomorrow = document.getElementById("noteTomorrow");
const clearTodayBtn = document.getElementById("clearToday");

// Home summary elements
const lastEntrySummary = document.getElementById("lastEntrySummary");
const daysLoggedSummary = document.getElementById("daysLoggedSummary");

// History view elements
const entryList = document.getElementById("entryList");
const exportBtn = document.getElementById("exportBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

// Suggestion buttons
const btnAdvice = document.getElementById("btnAdvice");
const btnQuote = document.getElementById("btnQuote");
const btnActivity = document.getElementById("btnActivity");
const suggestionOut = document.getElementById("suggestionOut");

// Chart instance
let chartInstance = null;
// Current selected mood value (1–5)
let selectedMood = null;

/* Utility functions */

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getEntries() {
  try {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  setTheme(saved);
}

/* Navigation */

function switchView(id) {
  views.forEach((view) => {
    view.classList.toggle("active", view.id === id);
  });

  navBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === id);
  });

  if (id === "history") {
    renderEntries();
    renderChart();
  }

  if (id === "home") {
    updateSummary();
  }
}

// Also wire up any other buttons that use data-target (e.g. Home CTA buttons)
const targetButtons = document.querySelectorAll("button[data-target]");

targetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    if (target) switchView(target);
  });
});

navBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    if (target) switchView(target);
  });
});

/* Theme toggle */

themeToggle?.addEventListener("click", () => {
  const current = localStorage.getItem(THEME_KEY) || "light";
  const next = current === "light" ? "dark" : "light";
  setTheme(next);
});

/* Reminder logic */

function showReminderIfNeeded() {
  if (!reminder) return;

  const entries = getEntries();
  const today = isoDate(new Date());
  const hasEntryToday = entries.some((e) => e.date === today);
  const lastShown = localStorage.getItem(REMINDER_KEY);
  const alreadyShownToday = lastShown === today;

  if (!hasEntryToday && !alreadyShownToday) {
    reminder.hidden = false;
  } else {
    reminder.hidden = true;
  }
}

reminderLogBtn?.addEventListener("click", () => {
  const today = isoDate(new Date());
  localStorage.setItem(REMINDER_KEY, today);
  reminder.hidden = true;
  switchView("log");
});

reminderDismissBtn?.addEventListener("click", () => {
  const today = isoDate(new Date());
  localStorage.setItem(REMINDER_KEY, today);
  reminder.hidden = true;
});

/* Mood selection */

moodButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    moodButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedMood = Number(btn.dataset.value);
  });
});

/* Entry form handling */

entryForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!selectedMood) {
    alert("Please select a mood before saving.");
    return;
  }

  const today = isoDate(new Date());
  const entries = getEntries();

  const newEntry = {
    date: today,
    mood: selectedMood,
    noteGood: (noteGood?.value || "").trim(),
    noteTomorrow: (noteTomorrow?.value || "").trim(),
  };

  const existingIndex = entries.findIndex((e) => e.date === today);
  if (existingIndex >= 0) {
    entries[existingIndex] = newEntry;
  } else {
    entries.push(newEntry);
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  saveEntries(entries);

  // Reset form state
  moodButtons.forEach((b) => b.classList.remove("selected"));
  selectedMood = null;
  if (noteGood) noteGood.value = "";
  if (noteTomorrow) noteTomorrow.value = "";

  updateSummary();
  renderChart();
  alert("Entry saved.");
  switchView("history");
});

clearTodayBtn?.addEventListener("click", () => {
  moodButtons.forEach((b) => b.classList.remove("selected"));
  selectedMood = null;
  if (noteGood) noteGood.value = "";
  if (noteTomorrow) noteTomorrow.value = "";
});

/* Home summary */

function updateSummary() {
  const entries = getEntries();
  if (!lastEntrySummary || !daysLoggedSummary) return;

  if (entries.length === 0) {
    lastEntrySummary.textContent = "No entries yet";
    daysLoggedSummary.textContent = "0";
    return;
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  const emojiMap = ["😞", "🙁", "😐", "🙂", "😄"];
  const emoji = emojiMap[last.mood - 1] || "";

  lastEntrySummary.textContent = `${last.date} • Mood ${last.mood} ${emoji}`;
  daysLoggedSummary.textContent = String(sorted.length);
}

/* History list */

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char];
  });
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

  const emojiMap = ["😞", "🙁", "😐", "🙂", "😄"];

  [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((entry) => {
      const li = document.createElement("li");
      li.className = "entry";

      const emoji = emojiMap[entry.mood - 1] || "";
      li.innerHTML = `
        <div class="entry-head">
          <div class="entry-meta">
            <strong>${entry.date}</strong> • Mood ${entry.mood} ${emoji}
          </div>
          <div class="entry-actions">
            <button type="button" class="ghost" data-del="${entry.date}">Delete</button>
          </div>
        </div>
        ${entry.noteGood ? `<div><strong>Went well:</strong> ${escapeHtml(entry.noteGood)}</div>` : ""}
        ${entry.noteTomorrow ? `<div><strong>Intention:</strong> ${escapeHtml(entry.noteTomorrow)}</div>` : ""}
      `;

      entryList.appendChild(li);
    });

  entryList.querySelectorAll("[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const date = btn.getAttribute("data-del");
      const remaining = getEntries().filter((e) => e.date !== date);
      saveEntries(remaining);
      renderEntries();
      renderChart();
      updateSummary();
    });
  });
}

/* Mood chart */

function renderChart() {
  const canvas = document.getElementById("moodChart");
  if (!canvas || typeof Chart === "undefined") return;

  const entries = getEntries();
  const today = new Date();
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(isoDate(d));
  }

  const moodByDate = Object.fromEntries(entries.map((e) => [e.date, e.mood]));
  const dataValues = days.map((d) => moodByDate[d] ?? null);

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: days,
      datasets: [
        {
          label: "Mood (1–5)",
          data: dataValues,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          suggestedMin: 1,
          suggestedMax: 5,
          ticks: { stepSize: 1 },
        },
      },
      plugins: {
        legend: { display: false },
      },
    },
  });
}

/* Export and clear controls */

exportBtn?.addEventListener("click", () => {
  const entries = getEntries();
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "wellme-entries.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

clearAllBtn?.addEventListener("click", () => {
  if (!confirm("Clear all entries? This cannot be undone.")) return;
  localStorage.removeItem(ENTRIES_KEY);
  renderEntries();
  renderChart();
  updateSummary();
});

/* Suggestions: APIs with safe fallbacks */

const BLOCKLIST = [
  "bleach",
  "suicide",
  "kill",
  "die",
  "harm",
  "self-harm",
  "violence",
  "weapon",
  "drugs",
  "overdose",
  "starve",
  "anorexia",
  "bulimia",
  "purge",
  "cutting",
  "abuse",
  "racist",
  "sex",
  "nsfw",
  "terror",
  "bomb",
  "gun",
];

const FALLBACK_ADVICE = [
  "Name one thing that went okay today.",
  "Drink some water and take three slow breaths.",
  "Pick the smallest next step and only do that.",
  "Set a 5-minute timer and stop when it ends.",
  "Move one thing from your head onto a list.",
  "Break your next task into two smaller steps.",
  "Tidy one tiny area you can see from where you are.",
  "Give yourself permission to be ‘good enough’ today.",
  "Notice one thing you’re grateful for, however small.",
  "Future you will appreciate any small kindness you give yourself now.",
];

const FALLBACK_QUOTES = [
  "Small steps add up.",
  "You don’t need to feel ready to begin.",
  "Done is kinder than perfect.",
  "Your pace is valid.",
  "Even slow progress is still progress.",
  "You have got through 100% of your hard days so far.",
  "Rest is productive when you need it.",
  "It’s okay to be a work in progress.",
  "You are allowed to take up space.",
  "Starting messy still counts as starting.",
];

const FALLBACK_ACTIVITIES = [
  "Stretch your neck and shoulders gently.",
  "Look out of a window and name five things you can see.",
  "Put a glass of water within reach and take a sip.",
  "Write one sentence about how today feels.",
  "Walk to another room and back slowly.",
  "Play one favourite song and really listen.",
  "Organise one icon, one file or one tab.",
  "Text someone a simple ‘thinking of you’ message.",
  "Notice three things in the room that you like.",
  "Set a 2-minute timer and do nothing on purpose.",
];

let lastAdvice = "";
let lastQuote = "";
let lastActivity = "";

function isSafeText(text) {
  if (!text) return false;
  const lower = String(text).toLowerCase();
  return !BLOCKLIST.some((term) => lower.includes(term));
}

function pickDifferent(list, last) {
  if (list.length <= 1) return list[0];
  let candidate = last;
  let tries = 0;
  while (candidate === last && tries < 10) {
    candidate = list[Math.floor(Math.random() * list.length)];
    tries += 1;
  }
  return candidate;
}

async function safeFetch(url, picker) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const cacheBustUrl = url.includes("?") ? `${url}&ts=${Date.now()}` : `${url}?ts=${Date.now()}`;
    const response = await fetch(cacheBustUrl, { signal: controller.signal });
    if (!response.ok) throw new Error("Network error");
    const data = await response.json();
    clearTimeout(timeout);
    const text = picker(data);
    if (isSafeText(text)) return text;
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/* Suggestion button handlers */

btnAdvice?.addEventListener("click", async () => {
  suggestionOut.textContent = "Loading…";
  const text = await safeFetch("https://api.adviceslip.com/advice", (d) => d.slip?.advice);
  if (text) {
    lastAdvice = text;
    suggestionOut.textContent = text;
  } else {
    lastAdvice = pickDifferent(FALLBACK_ADVICE, lastAdvice);
    suggestionOut.textContent = lastAdvice;
  }
});

btnQuote?.addEventListener("click", async () => {
  suggestionOut.textContent = "Loading…";
  const text = await safeFetch("https://api.quotable.io/random", (d) => `${d.content} — ${d.author}`);
  if (text) {
    lastQuote = text;
    suggestionOut.textContent = text;
  } else {
    lastQuote = pickDifferent(FALLBACK_QUOTES, lastQuote);
    suggestionOut.textContent = lastQuote;
  }
});

btnActivity?.addEventListener("click", async () => {
  suggestionOut.textContent = "Loading…";
  const text = await safeFetch("https://www.boredapi.com/api/activity", (d) => d.activity);
  if (text) {
    lastActivity = text;
    suggestionOut.textContent = text;
  } else {
    lastActivity = pickDifferent(FALLBACK_ACTIVITIES, lastActivity);
    suggestionOut.textContent = lastActivity;
  }
});

/* Initial boot sequence */

initTheme();
showReminderIfNeeded();
updateSummary();
renderEntries();
renderChart();
