
import db from '../../src/config/database';

const createUsersTable = () => {
    const query = `
        CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT,
        email TEXT,
        avatar TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `;

    db.run(query, (err) => {
        if (err) {
            console.error('Erreur lors de la création de la table users:', err.message);
        } else {
            console.log('Table users créée avec succès');
        }
    });
};

export default createUsersTable;