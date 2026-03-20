const SAMPLE_DATA = {
  panelists: [
    { id: "P1", name: "Panel A" },
    { id: "P2", name: "Panel B" },
    { id: "P3", name: "Panel C" },
    { id: "P4", name: "Panel D" },
    { id: "P5", name: "Panel E" }
  ],
  students: [
    { id: "S001", name: "Aarav Fernando", panelistId: "P1", status: "pending" },
    { id: "S002", name: "Nethmi Perera", panelistId: "P1", status: "pending" },
    { id: "S003", name: "Ishara Silva", panelistId: "P2", status: "pending" },
    { id: "S004", name: "Kavindu Raj", panelistId: "P2", status: "completed" },
    { id: "S005", name: "Tharushi Dahanayaka", panelistId: "P3", status: "pending" },
    { id: "S006", name: "Dineth Weerasekara", panelistId: "P3", status: "pending" },
    { id: "S007", name: "Sasini Abeywickrama", panelistId: "P4", status: "pending" },
    { id: "S008", name: "Ravindu Wickramasinghe", panelistId: "P4", status: "pending" },
    { id: "S009", name: "Nimali Karunaratne", panelistId: "P5", status: "pending" },
    { id: "S010", name: "Pasindu Jayasinghe", panelistId: "P5", status: "pending" }
  ]
};

const STORAGE_KEY = "hr-dashboard-data";

function loadLocalData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DATA));
    return structuredClone(SAMPLE_DATA);
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.panelists || !parsed.students) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DATA));
      return structuredClone(SAMPLE_DATA);
    }
    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DATA));
    return structuredClone(SAMPLE_DATA);
  }
}

function saveLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getGoogleSheetsUrl() {
  const rawUrl = window.APP_CONFIG.googleSheetsWebAppUrl;
  if (!rawUrl) throw new Error("Google Sheets Web App URL is missing in config.js");
  return rawUrl.replace(/\/$/, "");
}

async function parseJsonResponse(response, fallbackErrorMessage) {
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`${fallbackErrorMessage} (HTTP ${response.status})`);
  }

  try {
    return JSON.parse(rawText);
  } catch {
    const shortText = rawText.slice(0, 140).replace(/\s+/g, " ").trim();
    throw new Error(`Apps Script returned non-JSON response. ${shortText || "Check deployment access and endpoint URL."}`);
  }
}

async function fetchFromGoogleSheets() {
  const url = getGoogleSheetsUrl();
  const response = await fetch(`${url}?action=getData&t=${Date.now()}`);
  return parseJsonResponse(response, "Failed to fetch data from Google Sheets endpoint");
}

async function postStatusToGoogleSheets(studentId, status) {
  const url = getGoogleSheetsUrl();
  const payload = new URLSearchParams({
    action: "updateStatus",
    studentId,
    status
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: payload.toString()
  });

  return parseJsonResponse(response, "Failed to update status in Google Sheets endpoint");
}

window.DataService = {
  async getData() {
    if (window.APP_CONFIG.useGoogleSheets) {
      return fetchFromGoogleSheets();
    }
    return loadLocalData();
  },

  async updateStudentStatus(studentId, status) {
    if (window.APP_CONFIG.useGoogleSheets) {
      return postStatusToGoogleSheets(studentId, status);
    }

    const data = loadLocalData();
    const student = data.students.find((item) => item.id === studentId);
    if (!student) throw new Error("Student not found");
    student.status = status;
    saveLocalData(data);
    return { success: true };
  }
};
