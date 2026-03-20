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

async function fetchFromGoogleSheets() {
  const url = window.APP_CONFIG.googleSheetsWebAppUrl;
  if (!url) throw new Error("Google Sheets Web App URL is missing in config.js");
  const response = await fetch(`${url}?action=getData`);
  if (!response.ok) throw new Error("Failed to fetch data from Google Sheets endpoint");
  return response.json();
}

async function postStatusToGoogleSheets(studentId, status) {
  const url = window.APP_CONFIG.googleSheetsWebAppUrl;
  if (!url) throw new Error("Google Sheets Web App URL is missing in config.js");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateStatus", studentId, status })
  });

  if (!response.ok) throw new Error("Failed to update status in Google Sheets endpoint");
  return response.json();
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
