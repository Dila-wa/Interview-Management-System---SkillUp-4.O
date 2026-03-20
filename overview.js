function statusTag(status) {
  const cls = status === "completed" ? "completed" : "pending";
  return `<span class="tag ${cls}">${status}</span>`;
}

let pollTimer = null;
let isLoading = false;
const PANEL_AUTH_KEY = "panelAccessGranted";
const PANEL_LOGIN_USERNAME = "admin";
const PANEL_LOGIN_PASSWORD = "admin123";

function getAutoRefreshMs() {
  const value = Number(window.APP_CONFIG.autoRefreshMs);
  if (!Number.isFinite(value) || value < 2000) return 5000;
  return value;
}

function setSyncStatus(message) {
  const syncStatus = document.getElementById("syncStatus");
  if (syncStatus) {
    syncStatus.textContent = message;
  }
}

function getSummary(data) {
  const totalStudents = data.students.length;
  const completedStudents = data.students.filter((student) => student.status === "completed").length;
  const pendingStudents = totalStudents - completedStudents;

  return {
    totalPanels: data.panelists.length,
    totalStudents,
    completedStudents,
    pendingStudents
  };
}

function renderSummary(summary) {
  const summaryElement = document.getElementById("summary");
  summaryElement.innerHTML = `
    <div class="stat"><h3>Total Panels</h3><strong>${summary.totalPanels}</strong></div>
    <div class="stat"><h3>Total Students</h3><strong>${summary.totalStudents}</strong></div>
    <div class="stat"><h3>Completed</h3><strong>${summary.completedStudents}</strong></div>
    <div class="stat"><h3>Pending</h3><strong>${summary.pendingStudents}</strong></div>
  `;
}

function renderReadyPanels(data) {
  const readyPanelList = document.getElementById("readyPanelList");
  if (!readyPanelList) {
    return;
  }

  readyPanelList.innerHTML = data.panelists
    .map((panel) => {
      const students = data.students.filter((student) => student.panelistId === panel.id);
      const nextStudent = students.find((student) => student.status === "pending");
      const nextText = nextStudent
        ? `${nextStudent.name} (${nextStudent.id})`
        : "No pending students";

      return `
        <article class="ready-item">
          <strong>${panel.name}</strong>
          <p><span class="label">Next be ready:</span> ${nextText}</p>
          <p><span class="label">Ongoing:</span> No ongoing</p>
        </article>
      `;
    })
    .join("");
}

function renderPanels(data) {
  const panelGrid = document.getElementById("panelGrid");

  panelGrid.innerHTML = data.panelists
    .map((panel) => {
      const students = data.students.filter((student) => student.panelistId === panel.id);
      const listItems = students.length
        ? students
            .map((student) => `<li>${student.name} (${student.id}) ${statusTag(student.status)}</li>`)
            .join("")
        : `<li class="note">No students allocated</li>`;

      return `
        <article class="panel-card">
          <h3>${panel.name}</h3>
          <a href="panelist.html?panelId=${encodeURIComponent(panel.id)}" class="btn panel-open-link">Open Panel Page</a>
          <ul>${listItems}</ul>
        </article>
      `;
    })
    .join("");

  panelGrid.querySelectorAll(".panel-open-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      const isAlreadyAuthorized = sessionStorage.getItem(PANEL_AUTH_KEY) === "true";
      if (isAlreadyAuthorized) {
        return;
      }

      event.preventDefault();

      const username = window.prompt("Enter username:");
      const password = window.prompt("Enter password:");

      if (username === PANEL_LOGIN_USERNAME && password === PANEL_LOGIN_PASSWORD) {
        sessionStorage.setItem(PANEL_AUTH_KEY, "true");
        window.location.href = link.href;
        return;
      }

      alert("Invalid login details.");
    });
  });
}

async function loadOverview() {
  if (isLoading) {
    return;
  }

  isLoading = true;
  try {
    setSyncStatus("Syncing...");
    const data = await window.DataService.getData();
    renderSummary(getSummary(data));
    renderPanels(data);
    renderReadyPanels(data);
    setSyncStatus(`Live sync active • Last updated: ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    const panelGrid = document.getElementById("panelGrid");
    panelGrid.innerHTML = `<p>Failed to load data: ${error.message}</p>`;
    const readyPanelList = document.getElementById("readyPanelList");
    if (readyPanelList) {
      readyPanelList.innerHTML = `<p class="note">Failed to load next-ready list.</p>`;
    }
    setSyncStatus(`Sync failed: ${error.message}`);
  } finally {
    isLoading = false;
  }
}

document.getElementById("refreshBtn").addEventListener("click", loadOverview);
loadOverview();

pollTimer = window.setInterval(loadOverview, getAutoRefreshMs());
