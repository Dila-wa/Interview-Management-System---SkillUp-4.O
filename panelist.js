function getPanelId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("panelId");
}

let pollTimer = null;
let isLoading = false;
const PANEL_AUTH_KEY = "panelAccessGranted";
const PANEL_LOGIN_USERNAME = "admin";
const PANEL_LOGIN_PASSWORD = "admin123";

function ensurePanelAccess() {
  const isAlreadyAuthorized = sessionStorage.getItem(PANEL_AUTH_KEY) === "true";
  if (isAlreadyAuthorized) {
    return true;
  }

  const username = window.prompt("Enter username:");
  const password = window.prompt("Enter password:");

  if (username === PANEL_LOGIN_USERNAME && password === PANEL_LOGIN_PASSWORD) {
    sessionStorage.setItem(PANEL_AUTH_KEY, "true");
    return true;
  }

  alert("Invalid login details.");
  window.location.href = "index.html";
  return false;
}

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

function renderCurrentStudent(students) {
  const currentContainer = document.getElementById("currentStudent");
  const current = students.find((student) => student.status === "pending");

  if (!current) {
    currentContainer.innerHTML = `<h3>No pending students</h3><p class="note">All allocated students are completed.</p>`;
    return;
  }

  currentContainer.innerHTML = `
    <h3>Current Student</h3>
    <p><strong>${current.name}</strong> (${current.id})</p>
    <button id="completeBtn" class="btn">Mark Completed & Move Next</button>
  `;

  document.getElementById("completeBtn").addEventListener("click", async () => {
    try {
      await window.DataService.updateStudentStatus(current.id, "completed");
      await loadPanel();
    } catch (error) {
      alert(`Update failed: ${error.message}`);
    }
  });
}

function renderQueue(students) {
  const queueList = document.getElementById("queueList");
  if (!students.length) {
    queueList.innerHTML = `<p class="note">No students allocated to this panel.</p>`;
    return;
  }

  queueList.innerHTML = students
    .map(
      (student) => `
        <div class="student-row">
          <div>
            <strong>${student.name}</strong> (${student.id})
            <div class="student-meta">Status: ${student.status}</div>
          </div>
          ${
            student.status === "pending"
              ? `<button class="btn" data-student-id="${student.id}" data-next-status="completed">Set Completed</button>`
              : `<button class="btn secondary" data-student-id="${student.id}" data-next-status="pending">Set Pending</button>`
          }
        </div>
      `
    )
    .join("");

  queueList.querySelectorAll("button[data-student-id]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      const studentId = event.currentTarget.getAttribute("data-student-id");
      const nextStatus = event.currentTarget.getAttribute("data-next-status") || "completed";
      try {
        await window.DataService.updateStudentStatus(studentId, nextStatus);
        await loadPanel();
      } catch (error) {
        alert(`Update failed: ${error.message}`);
      }
    });
  });
}

async function loadPanel() {
  if (isLoading) {
    return;
  }

  const panelId = getPanelId();
  const panelInfo = document.getElementById("panelInfo");

  if (!panelId) {
    panelInfo.innerHTML = `<p>Missing panelId in URL. Example: panelist.html?panelId=P1</p>`;
    document.getElementById("currentStudent").innerHTML = "";
    document.getElementById("queueList").innerHTML = "";
    return;
  }

  isLoading = true;

  try {
    setSyncStatus("Syncing...");
    const data = await window.DataService.getData();
    const panel = data.panelists.find((item) => item.id === panelId);
    const students = data.students.filter((item) => item.panelistId === panelId);

    if (!panel) {
      panelInfo.innerHTML = `<p>Panel not found for id: ${panelId}</p>`;
      return;
    }

    document.getElementById("panelTitle").textContent = `${panel.name} Queue`;
    panelInfo.innerHTML = `
      <p><strong>Panel:</strong> ${panel.name} (${panel.id})</p>
      <p><strong>Total Allocated:</strong> ${students.length}</p>
    `;

    renderCurrentStudent(students);
    renderQueue(students);
    setSyncStatus(`Live sync active • Last updated: ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    panelInfo.innerHTML = `<p>Failed to load panel data: ${error.message}</p>`;
    setSyncStatus(`Sync failed: ${error.message}`);
  } finally {
    isLoading = false;
  }
}

if (ensurePanelAccess()) {
  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  document.getElementById("refreshBtn").addEventListener("click", loadPanel);
  loadPanel();

  pollTimer = window.setInterval(loadPanel, getAutoRefreshMs());
}
