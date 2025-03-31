import db from '../config/database';
import bcrypt from 'bcrypt';


const getUserById = (userId: number, callback: (err: Error | null, row: any) => void) => {
  const query = `
    SELECT id, username, email, first_name, last_name, created_at, player_games, player_wins, avatar
    FROM users
    WHERE id = ?;
  `;

  db.get(query, [userId], (err, row) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, row);
    }
  });
};


const SALT_ROUNDS = 10;

const createUser = async (username: string, password: string, firstName: string, lastName: string, email: string): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const query = `
      INSERT INTO users (username, password, first_name, last_name, email)
      VALUES (?, ?, ?, ?, ?);
    `;

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    db.run(query, [username, hashedPassword, lastName, firstName, email], function (err) {
      if (err) {
        console.error('Erreur lors de la création de l\'utilisateur:', err.message);
        reject(err);
      } else {
        console.log('Utilisateur créé avec succès, ID:', this.lastID);

        getUserById(this.lastID, (err, row) => {
          if (err) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', err.message);
            reject(err);
          } else {
            resolve({ message: 'Utilisateur créé avec succès', user: row });
          }
        });

      }
    });
  });
};

export const checkUserLogin = async (username: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT id, username, email, password FROM users WHERE username = ?`;

    db.get(query, [username], (err, row) => {
      if (err) {
        console.error("Erreur lors de la récupération de l'utilisateur:", err.message);
        return reject(err);
      }
      resolve(row || null);
    });
  });
};

export const createUserOAuth = (googleId: string, username: string, firstName: string, lastName: string , email: string, avatar: string) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO users (google_id, username, password, email, avatar, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.run(query, [googleId, username, 'google_oauth', email, avatar, firstName, lastName], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, username, email, avatar});
    });
  });
};

export const checkUserByGoogleId = async (email: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const query = `SELECT id, username, email, password, avatar FROM users WHERE google_id = ?`;

    db.get(query, [email], (err, row) => {
      if (err) {
        console.error("Erreur lors de la récupération de l'utilisateur par email:", err.message);
        return reject(err);
      }
      resolve(row || null);
    });
  });
};

export const updateUserAvatar = async (userId: number, avatar: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const query = `UPDATE users SET avatar = ? WHERE id = ?`;
    
    db.run(query, [avatar, userId], function(err) {
      if (err) {
        console.error("Error updating user avatar:", err.message);
        return reject(err);
      }
      
      // Get the updated user
      getUserById(userId, (err, user) => {
        if (err) return reject(err);
        resolve(user);
      });
    });
  });
};

// Update user information
export const updateUser = async (userId: number, userData: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Build dynamic query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    
    if (userData.username !== undefined) {
      updates.push('username = ?');
      values.push(userData.username);
    }
    
    if (userData.first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(userData.first_name);
    }
    
    if (userData.last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(userData.last_name);
    }
    
    if (updates.length === 0) {
      return resolve({});
    }
    
    // Add userId to values array
    values.push(userId);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(query, values, function(err) {
      if (err) {
        console.error("Error updating user:", err.message);
        return reject(err);
      }
      
      if (this.changes === 0) {
        return resolve(null);
      }
      
      // Get the updated user
      getUserById(userId, (err, user) => {
        if (err) return reject(err);
        resolve(user);
      });
    });
  });
};

// Remove user's avatar
export const removeAvatar = async (userId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const query = `UPDATE users SET avatar = NULL WHERE id = ?`;
    
    db.run(query, [userId], function(err) {
      if (err) {
        console.error("Error removing avatar:", err.message);
        return reject(err);
      }
      
      resolve(this.changes > 0);
    });
  });
};

// Get complete user data for GDPR purposes
export const getUserData = async (userId: number): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Get user basic information
    getUserById(userId, async (err, user) => {
      if (err) {
        console.error("Error fetching user data:", err.message);
        return reject(err);
      }
      
      if (!user) {
        return resolve(null);
      }
      
      try {
        // Get user game history
        const gameHistory = await getUserGameHistory(userId);
        
        // Get user friends
        const friends = await getUserFriends(userId);
        
        // Get chat messages
        const messages = await getUserMessages(userId);
        
        // Compile all user data
        const userData = {
          user,
          gameHistory,
          friends,
          messages
        };
        
        resolve(userData);
      } catch (error) {
        console.error("Error assembling user data:", error);
        reject(error);
      }
    });
  });
};

// Helper function to get user game history
const getUserGameHistory = async (userId: number): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM games 
      WHERE player1_id = ? OR player2_id = ? 
      ORDER BY created_at DESC
    `;
    
    db.all(query, [userId, userId], (err, rows) => {
      if (err) {
        console.error("Error fetching game history:", err.message);
        return reject(err);
      }
      
      resolve(rows || []);
    });
  });
};

// Helper function to get user friends
const getUserFriends = async (userId: number): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT u.id, u.username, u.avatar 
      FROM friendships f
      JOIN users u ON (
        (f.user1_id = ? AND f.user2_id = u.id) OR
        (f.user2_id = ? AND f.user1_id = u.id)
      )
      WHERE f.status = 'accepted'
    `;
    
    db.all(query, [userId, userId], (err, rows) => {
      if (err) {
        console.error("Error fetching friends:", err.message);
        return reject(err);
      }
      
      resolve(rows || []);
    });
  });
};

// Helper function to get user messages
const getUserMessages = async (userId: number): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY created_at DESC
    `;
    
    db.all(query, [userId, userId], (err, rows) => {
      if (err) {
        console.error("Error fetching messages:", err.message);
        return reject(err);
      }
      
      resolve(rows || []);
    });
  });
};

// Anonymize user account
export const anonymizeUser = async (userId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // Generate anonymous username
    const anonymousUsername = 'anonymous_' + Math.random().toString(36).substring(2, 10);
    const anonymousEmail = `${anonymousUsername}@anonymous.com`;
    
    const query = `
      UPDATE users 
      SET username = ?, 
          first_name = 'Anonymous', 
          last_name = 'User', 
          email = ?,
          avatar = NULL 
      WHERE id = ?
    `;
    
    db.run(query, [anonymousUsername, anonymousEmail, userId], function(err) {
      if (err) {
        console.error("Error anonymizing user:", err.message);
        return reject(err);
      }
      
      resolve(this.changes > 0);
    });
  });
};

// Delete user account
export const deleteUser = async (userId: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    // Begin transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      try {
        // Delete related data first - adjust based on your actual schema
        // Delete from games
        db.run('DELETE FROM games WHERE player1_id = ? OR player2_id = ?', [userId, userId]);
        
        // Delete from friendships
        db.run('DELETE FROM friendships WHERE user1_id = ? OR user2_id = ?', [userId, userId]);
        
        // Delete from messages
        db.run('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
        
        // Finally delete the user
        db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            console.error("Error deleting user:", err.message);
            return reject(err);
          }
          
          const wasDeleted = this.changes > 0;
          
          // Commit if successful
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              console.error("Error committing transaction:", commitErr.message);
              return reject(commitErr);
            }
            
            resolve(wasDeleted);
          });
        });
      } catch (error) {
        db.run('ROLLBACK');
        console.error("Transaction error:", error);
        reject(error);
      }
    });
  });
};

// Update the export default statement to include the new functions
export default { 
  createUser, 
  getUserById, 
  checkUserLogin, 
  updateUser, 
  removeAvatar, 
  getUserData, 
  anonymizeUser, 
  deleteUser,
  updateUserAvatar
};