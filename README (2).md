# HR Interview Panel Dashboard

A lightweight website for HR interview sessions where:

- All panelists can view their allocated students.
- A single overview page shows all panelists and all allocated students.
- Each panelist has a dedicated page to complete interviews and move to the next student.
- Optional Google Sheets integration can be enabled.
- Live auto-sync updates data every few seconds (no manual refresh needed).

## Files

- `index.html` - overview of all panelists and allocations.
- `panelist.html` - panel-specific queue management.
- `data-service.js` - local data + Google Sheets API integration.
- `config.js` - integration settings.

## Run locally

Because this app uses browser `fetch`, run it with a local server:

### Option 1: VS Code Live Server
1. Install the Live Server extension.
2. Right-click `index.html` -> Open with Live Server.

### Option 2: Python
```bash
python -m http.server 5500
```
Open: `http://localhost:5500/index.html`

## Google Sheets integration

The app expects a Google Apps Script Web App endpoint.

### 1) Create sheet tabs and structure

Create 2 tabs exactly with these names and headers in row 1:

#### Tab: `Panelists`
| id | name |
|---|---|
| P1 | Panel A |
| P2 | Panel B |
| P3 | Panel C |
| P4 | Panel D |
| P5 | Panel E |

#### Tab: `Students`
| id | name | panelistId | status |
|---|---|---|---|
| S001 | Student 1 | P1 | pending |
| S002 | Student 2 | P1 | pending |
| S003 | Student 3 | P2 | pending |

Rules:
- `panelistId` in `Students` must match an `id` from `Panelists` (P1-P5).
- `status` should be `pending`, `completed`, or `absent`.
- Keep header names exactly as shown.

### 2) Create Apps Script

1. In the Google Sheet, go to Extensions -> Apps Script.
2. Paste the script from this README.
3. Save the project.

### 3) Deploy Apps Script as Web App

1. Click Deploy -> New deployment.
2. Type: Web app.
3. Execute as: Me.
4. Who has access: Anyone with the link (or your domain users if all panelists are in same domain).
5. Deploy and copy the Web App URL.

### 4) Connect website to sheet

Update `config.js`:

```javascript
window.APP_CONFIG = {
  googleSheetsWebAppUrl: "PASTE_YOUR_WEB_APP_URL_HERE",
  useGoogleSheets: true,
  autoRefreshMs: 5000
};
```

`autoRefreshMs` controls live sync frequency in milliseconds.

## Hostinger subdomain deployment

If you already have a Hostinger plan and an existing site, you can host this app on a subdomain (example: interviews.yourdomain.com).

### 1) Create subdomain in Hostinger

1. Open hPanel -> Websites -> Manage (your main site).
2. Go to Domains -> Subdomains.
3. Create a new subdomain (example: interviews).
4. Wait until DNS is active (can take a few minutes).

### 2) Upload this project to subdomain public folder

1. Open File Manager in hPanel.
2. Go to the subdomain document root (usually public_html/interviews or similar).
3. Upload these files to that folder:
   - index.html
   - panelist.html
   - styles.css
   - config.js
   - data-service.js
   - overview.js
   - panelist.js

Tip: Do not place files in the main domain folder if you want them under the subdomain.

### 3) Set production config

Edit config.js on the server and set:

window.APP_CONFIG = {
  googleSheetsWebAppUrl: "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL",
  useGoogleSheets: true,
  autoRefreshMs: 5000
};

### 4) Enable HTTPS

1. In Hostinger, ensure SSL is enabled for the subdomain.
2. Open your app using https://your-subdomain.yourdomain.com
3. Keep your Google Apps Script deployed and accessible to the users who will open the site.

### 5) Verify end-to-end

1. Open overview page on the subdomain.
2. Open one panel page and mark a student completed.
3. Confirm status updates in Google Sheet.
4. Confirm other open browser tabs update automatically within the polling interval.

### Optional: Prevent direct file listing

If directory listing is enabled, create .htaccess in the same folder with:

Options -Indexes

This keeps the folder from showing raw file lists.

## Apps Script sample

```javascript
function doGet(e) {
  const action = e.parameter.action;
  if (action !== 'getData') {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const panelRows = sheet.getSheetByName('Panelists').getDataRange().getValues();
  const studentRows = sheet.getSheetByName('Students').getDataRange().getValues();

  const panelists = rowsToObjects(panelRows);
  const students = rowsToObjects(studentRows);

  return ContentService.createTextOutput(JSON.stringify({ panelists, students }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || '{}');
  if (payload.action !== 'updateStatus') {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const studentId = payload.studentId;
  const status = payload.status;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Students');
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf('id');
  const statusIndex = headers.indexOf('status');

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(studentId)) {
      sheet.getRange(i + 1, statusIndex + 1).setValue(status);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'Student not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function rowsToObjects(rows) {
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((key, idx) => {
      obj[key] = row[idx];
    });
    return obj;
  });
}
```

## Notes

- Default mode uses browser local storage with sample data.
- Local sample data includes 5 panels (P1 to P5).
- In production, protect your Apps Script endpoint and decide panel access/authentication as needed.
