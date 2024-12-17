const { google } = require('googleapis');
const mysql = require('mysql2');
const cron = require('node-cron');
require('dotenv').config();

const LAST_SYNC_FILE = 'lastSync.txt';
const fs = require('fs');

// Google Sheets Authentication
const auth = new google.auth.GoogleAuth({
    credentials: {
        type: "service_account",
        project_id: "avian-muse-444911-v3",
        private_key_id: "4ef5f200d26d0cda5706f985919cc8ff3d7181ca",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDNUVeR11p9mYfb\njCD84DvycIbpEMoH4qUsPbljK5rSQN1TJ80lPMwRVqP6G9WK6XQMZvuWFYUxjHvg\n...your_key_here...\n-----END PRIVATE KEY-----\n",

        client_email: "sqlsender12@avian-muse-444911-v3.iam.gserviceaccount.com",
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// MySQL Connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
}).promise();

async function getLastSyncTime() {
    if (fs.existsSync(LAST_SYNC_FILE)) {
        return fs.readFileSync(LAST_SYNC_FILE, 'utf8');
    }
    return '1970-01-01 00:00:00'; // Default timestamp for the first run
}

async function saveLastSyncTime(timestamp) {
    fs.writeFileSync(LAST_SYNC_FILE, timestamp);
}

// Export Data to Google Sheets
async function exportDataToSheet() {
    try {
        const lastSync = await getLastSyncTime();
        console.log(`Last Sync Time: ${lastSync}`);

        // Fetch only updated rows since last sync
        const [rows] = await db.execute(
            'SELECT * FROM audit_log WHERE updated_at > ? ORDER BY updated_at ASC',
            [lastSync]
        );

        if (rows.length === 0) {
            console.log('No new updates found.');
            return;
        }

        // Prepare data for Google Sheets
        const values = [Object.keys(rows[0])]; // Headers
        rows.forEach(row => values.push(Object.values(row)));

        const spreadsheetId = '1R8ViHNSaZeia4vN9_kj8lPfmhM4YYNPjGSAV6wu_txw';
        const range = 'Sheet1!A1';

        // Append updated rows to the Google Sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            requestBody: { values },
        });

        console.log('Data successfully exported to Google Sheets!');

        // Update last sync time
        const latestTimestamp = rows[rows.length - 1].updated_at;
        await saveLastSyncTime(latestTimestamp);
    } catch (err) {
        console.error('Error exporting data:', err.message);
    }
}

// Schedule Task to Run Every Minute
cron.schedule('* * * * *', () => {
    console.log('Checking for updates...');
    exportDataToSheet();
});
