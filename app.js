const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

require('dotenv').config();
const app = express();
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

// Function to find the next available column for actions
async function getNextAvailableColumn(projectId) {
    const [rows] = await db.execute('SELECT * FROM project_log WHERE project_id = ?', [projectId]);

    if (rows.length > 0) {
        const existingRow = rows[0];
        for (let i = 1; i <= 10; i++) { // Check action_1 to action_10
            if (!existingRow[`action_${i}`]) {
                return `action_${i}, timestamp_${i}`;
            }
        }
        return null; // No available columns
    }
    return 'action_1, timestamp_1'; // New row
}

// Endpoint to log an action
app.post('/api/log-action', async (req, res) => {
    const { project_id, action } = req.body;

    if (!project_id || !action) {
        return res.status(400).json({ error: 'Project ID and action are required.' });
    }

    try {
        // Find the next available column
        const nextColumns = await getNextAvailableColumn(project_id);

        if (!nextColumns) {
            return res.status(400).json({ error: 'No available columns to log the action.' });
        }

        const [actionCol, timestampCol] = nextColumns.split(', ');

        // Check if project_id exists
        const [rows] = await db.execute('SELECT * FROM project_log WHERE project_id = ?', [project_id]);

        if (rows.length > 0) {
            // Update existing row
            const updateQuery = `UPDATE project_log SET ${actionCol} = ?, ${timestampCol} = CURRENT_TIMESTAMP WHERE project_id = ?`;
            await db.execute(updateQuery, [action, project_id]);
        } else {
            // Insert new row
            const insertQuery = `INSERT INTO project_log (project_id, ${actionCol}, ${timestampCol}) VALUES (?, ?, CURRENT_TIMESTAMP)`;
            await db.execute(insertQuery, [project_id, action]);
        }

        res.json({ message: 'Action logged successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to log action.' });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
