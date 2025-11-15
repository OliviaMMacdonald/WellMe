/* WellMe: Mood Tracking + Suggestions App */

// ------------------------------
// ELEMENT REFERENCES
// ------------------------------
const moodBtns = document.querySelectorAll("[data-mood]");
const noteInput = document.getElementById("noteInput");
const saveEntryBtn = document.getElementById("saveEntry");
const cancelEntryBtn = document.getElementById("cancelEntry");
const reminderYesBtn = document.getElementById("reminderYes");
const reminderNoBtn = document.getElementById("reminderNo");
const reminderBanner = document.getElementById("reminderBanner");

const adviceBtn = document.getElementById("adviceBtn");
const quoteBtn = document.getElementById("quoteBtn");
const activityBtn = document.getElementById("activityBtn");
const suggestionOut = document.getElementById("suggestionOut");

const entriesList = document.getElementById("entriesList");
const clearHistoryBtn = document.getElementById("clearHistory");
const exportHistoryBtn = document.getElementById("exportHistory");

const chartCanvas = document.getElementById("moodChart");

const viewBtns = document.querySelectorAll("[data-view]");
const views = document.querySelectorAll(".view");

const themeToggleBtn = document.getElementById("themeToggle");

// ------------------------------
// STATE
// ------------------------------
let selectedMood = null;
let entries = JSON.parse(localStorage.getItem("wellme-entries") || "[]");

let moodChart = null;

// ------------------------------
// VIEW SWITCHING
// ------------------------------
viewBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.view;

    // Update nav styling
    viewBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Toggle views
    views.forEach(v => {
      v.classList.remove("active");
      if (v.id === target) v.classList.add("active");
    });

    if (target === "history") {
      renderEntries();
      updateChart();
    }
  });
});

// ------------------------------
// THEME TOGGLE
// ------------------------------
themeToggleBtn.addEventListener("click", () => {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  document.documentElement.setAttribute("data-theme", isLight ? "dark" : "light");
  localStorage.setItem("wellme-theme", isLight ? "dark" : "light");
});

// Load saved theme
document.documentElement.setAttribute(
  "data-theme",
  localStorage.getItem("wellme-theme") || "dark"
);

// ------------------------------
// MOOD SELECTION
// ------------------------------
moodBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    moodBtns.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedMood = btn.dataset.mood;
  });
});

// ------------------------------
// SAVE ENTRY
// ------------------------------
saveEntryBtn.addEventListener("click", () => {
  if (!selectedMood) {
    alert("Please choose a mood first.");
    return;
  }

  const entry = {
    mood: selectedMood,
    note: noteInput.value.trim(),
    date: new Date().toISOString()
  };

  entries.push(entry);
  localStorage.setItem("wellme-entries", JSON.stringify(entries));

  // Reset form
  moodBtns.forEach(b => b.classList.remove("selected"));
  selectedMood = null;
  noteInput.value = "";

  alert("Entry saved!");

  // Switch to history to show the entry
  document.querySelector('[data-view="history"]').click();
});

// ------------------------------
// CANCEL ENTRY
// ------------------------------
cancelEntryBtn.addEventListener("click", () => {
  moodBtns.forEach(b => b.classList.remove("selected"));
  selectedMood = null;
  noteInput.value = "";
});

// ------------------------------
// SUGGESTION API BUTTONS
// ------------------------------
adviceBtn.addEventListener("click", async () => {
  suggestionOut.textContent = "Loading…";
  try {
    const response = await fetch("https://api.adviceslip.com/advice");
    const data = await response.json();
    suggestionOut.textContent = data.slip.advice;
  } catch {
    suggestionOut.textContent = "Could not load advice.";
  }
});

quoteBtn.addEventListener("click", async () => {
  suggestionOut.textContent = "Loading…";
  try {
    const response = await fetch("https://api.quotable.io/random");
    const data = await response.json();
    suggestionOut.textContent = data.content;
  } catch {
    suggestionOut.textContent = "Could not load quote.";
  }
});

activityBtn.addEventListener("click", async () => {
  suggestionOut.textContent = "Loading…";
  try {
    const response = await fetch("https://www.boredapi.com/api/activity/");
    const data = await response.json();
    suggestionOut.textContent = data.activity;
  } catch {
    suggestionOut.textContent = "Could not load activity.";
  }
});

// ------------------------------
// RENDER HISTORY
// ------------------------------
function renderEntries() {
  entriesList.innerHTML = "";

  entries
    .slice()
    .reverse()
    .forEach((entry, index) => {
      const li = document.createElement("li");
      li.className = "entry";

      const readableDate = new Date(entry.date).toLocaleString();

      li.innerHTML = `
        <div class="entry-head">
          <div class="entry-meta">${readableDate}</div>
          <div class="entry-actions">
            <button class="ghost" data-del="${index}">Delete</button>
          </div>
        </div>
        <div><strong>Mood:</strong> ${entry.mood}</div>
        ${entry.note ? `<div><strong>Note:</strong> ${entry.note}</div>` : ""}
      `;

      entriesList.appendChild(li);
    });

  // Delete buttons
  document.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const originalIndex = entries.length - 1 - Number(btn.dataset.del);
      entries.splice(originalIndex, 1);
      localStorage.setItem("wellme-entries", JSON.stringify(entries));
      renderEntries();
      updateChart();
    });
  });
}

// ------------------------------
// CLEAR HISTORY
// ------------------------------
clearHistoryBtn.addEventListener("click", () => {
  if (!confirm("Are you sure you want to delete all entries?")) return;
  entries = [];
  localStorage.setItem("wellme-entries", "[]");
  renderEntries();
  updateChart();
});

// ------------------------------
// EXPORT HISTORY (TEXT FILE)
// ------------------------------
exportHistoryBtn.addEventListener("click", () => {
  if (entries.length === 0) {
    alert("No entries to export.");
    return;
  }

  let text = "WellMe Mood History\n\n";
  entries.forEach(e => {
    text += `${new Date(e.date).toLocaleString()} - Mood: ${e.mood}\n`;
    if (e.note) text += `Note: ${e.note}\n`;
    text += "\n";
  });

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "WellMe-history.txt";
  a.click();

  URL.revokeObjectURL(url);
});

// ------------------------------
// CHART.JS MOOD CHART
// ------------------------------
function updateChart() {
  if (!chartCanvas) return;

  const labels = entries.map(e => new Date(e.date).toLocaleDateString());
  const data = entries.map(e => {
    switch (e.mood) {
      case "Awful": return 1;
      case "Bad": return 2;
      case "Okay": return 3;
      case "Good": return 4;
      case "Great": return 5;
      default: return 3;
    }
  });

  if (moodChart) moodChart.destroy();

  moodChart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Mood Over Time",
        data,
        tension: 0.25,
        borderWidth: 3,
        borderColor: "#38bdf8",
        pointRadius: 4,
        pointBackgroundColor: "#38bdf8",
        fill: false
      }]
    },
    options: {
      scales: {
        y: {
          min: 1,
          max: 5,
          ticks: { stepSize: 1, color: "#e5e7eb" }
        },
        x: { ticks: { color: "#e5e7eb" } }
      },
      plugins: {
        legend: { labels: { color: "#e5e7eb" } }
      }
    }
  });
}

// ------------------------------
// REMINDER SYSTEM
// ------------------------------
const reminderSet = localStorage.getItem("wellme-reminder");

if (reminderSet === "yes") {
  reminderBanner.style.display = "none";
} else if (reminderSet === "no") {
  reminderBanner.style.display = "none";
} else {
  reminderBanner.style.display = "flex";
}

reminderYesBtn.addEventListener("click", () => {
  localStorage.setItem("wellme-reminder", "yes");
  reminderBanner.style.display = "none";
  alert("You’ll now get daily reminder prompts!");
});

reminderNoBtn.addEventListener("click", () => {
  localStorage.setItem("wellme-reminder", "no");
  reminderBanner.style.display = "none";
});

// ------------------------------
// INITIAL RENDER
// ------------------------------
renderEntries();
updateChart();
