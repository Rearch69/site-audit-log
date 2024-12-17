const db = require('../db'); // Import the promise-based pool
const express = require('express');
const router = express.Router();

// Route to insert audit log
router.post('/log', async (req, res) => {
    const { user_id, action, table_name, record_id, old_data, new_data } = req.body;

    try {
        await db.execute(
            `INSERT INTO audit_log (user_id, action, table_name, record_id, old_data, new_data)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, action, table_name, record_id, JSON.stringify(old_data), JSON.stringify(new_data)]
        );
        res.status(200).json({ message: 'Audit log created successfully.' });
    } catch (err) {
        console.error("Database Error: ", err.message);
        res.status(500).json({ error: 'Failed to create audit log.', details: err.message });
    }
});

router.get('/logs', async (req, res) => {
    try {
        const [logs] = await db.execute('SELECT * FROM audit_log ORDER BY timestamp DESC');
        res.status(200).json(logs);
    } catch (err) {
        console.error('Database Error: ', err.message);
        res.status(500).json({ error: 'Failed to fetch audit logs.' });
    }
});


module.exports = router;
