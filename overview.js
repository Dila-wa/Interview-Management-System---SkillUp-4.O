function statusTag(status) {
  const cls = status === "completed" ? "completed" : status === "absent" ? "absent" : "pending";
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
  const absentStudents = data.students.filter((student) => student.status === "absent").length;
  const pendingStudents = data.students.filter((student) => student.status === "pending").length;

  return {
    totalPanels: data.panelists.length,
    totalStudents,
    completedStudents,
    absentStudents,
    pendingStudents
  };
}

function renderSummary(summary) {
  const summaryElement = document.getElementById("summary");
  summaryElement.innerHTML = `
    <div class="stat"><h3>Total Panels</h3><strong>${summary.totalPanels}</strong></div>
    <div class="stat"><h3>Total Students</h3><strong>${summary.totalStudents}</strong></div>
    <div class="stat"><h3>Completed</h3><strong>${summary.completedStudents}</strong></div>
    <div class="stat"><h3>Absent</h3><strong>${summary.absentStudents}</strong></div>
    <div class="stat"><h3>Pending</h3><strong>${summary.pendingStudents}</strong></div>
  `;
}

function renderSideSections(data) {
  const ongoingReadyList = document.getElementById("ongoingReadyList");
  if (!ongoingReadyList) {
    return;
  }

  ongoingReadyList.innerHTML = data.panelists
    .map((panel) => {
      const students = data.students.filter((student) => student.panelistId === panel.id);
      const pendingStudents = students.filter((student) => student.status === "pending");
      const ongoingStudent = pendingStudents[0];
      const nextTwoReady = pendingStudents.slice(1, 3);
      const ongoingText = ongoingStudent
        ? `${ongoingStudent.name} (${ongoingStudent.id})`
        : "No ongoing interview";
      const nextTwoList = nextTwoReady.length
        ? nextTwoReady.map((student) => `<li>${student.name} (${student.id})</li>`).join("")
        : `<li class="note">No next-ready students</li>`;

      return `
        <article class="ready-item">
          <strong>${panel.name}</strong>
          <p>
            <a href="panelist.html?panelId=${encodeURIComponent(panel.id)}" class="btn panel-open-link">Open Panel Page</a>
          </p>
          <p><span class="label">Ongoing interview:</span> ${ongoingText}</p>
          <div class="next-ready-highlight">
            <p><span class="label">Next be ready (2):</span></p>
            <ul>${nextTwoList}</ul>
          </div>
        </article>
      `;
    })
    .join("");
}

function handlePanelOpenClick(event) {
  const link = event.currentTarget;
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
}

function wirePanelOpenLinks() {
  document.querySelectorAll(".panel-open-link").forEach((link) => {
    if (link.dataset.authWired === "true") {
      return;
    }

    link.addEventListener("click", handlePanelOpenClick);
    link.dataset.authWired = "true";
  });
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

  wirePanelOpenLinks();
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
    renderSideSections(data);
    wirePanelOpenLinks();
    setSyncStatus(`Live sync active • Last updated: ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    const panelGrid = document.getElementById("panelGrid");
    panelGrid.innerHTML = `<p>Failed to load data: ${error.message}</p>`;
    const ongoingReadyList = document.getElementById("ongoingReadyList");
    if (ongoingReadyList) {
      ongoingReadyList.innerHTML = `<p class="note">Failed to load ongoing and next-ready list.</p>`;
    }
    setSyncStatus(`Sync failed: ${error.message}`);
  } finally {
    isLoading = false;
  }
}

document.getElementById("refreshBtn").addEventListener("click", loadOverview);
loadOverview();

pollTimer = window.setInterval(loadOverview, getAutoRefreshMs());
