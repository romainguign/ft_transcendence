
import db from '../../src/config/database';

const createUsersTable = () => {
    const query = `
        CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        google_id TEXT,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        avatar TEXT,
        player_games INTEGER DEFAULT 0,
        player_wins INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `;

    db.run(query, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('Table users successfully created');
        }
    });
};

export default createUsersTable;