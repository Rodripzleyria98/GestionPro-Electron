// database.js

const Database = require('better-sqlite3');
const path = require('path');

let db = null;

/**
 * Inicializa la base de datos con la ruta de la aplicación.
 * @param {string} appPath La ruta del directorio de la aplicación (pasada desde main.js).
 */
function initDb(appPath) {
    if (db) return; // Evita la doble inicialización

    // 🚨 CORRECCIÓN: Usamos la ruta pasada para crear el archivo .db
    const dbPath = path.join(appPath, 'gestionpro.db');
    
    // Crear la conexión a la base de datos
    // NOTA: Si `electron-rebuild` falló, la siguiente línea causará un error.
    try {
        db = new Database(dbPath, { verbose: console.log });
    } catch (error) {
        console.error("Error al abrir SQLite. Asegúrate de haber ejecutado 'electron-rebuild'.", error);
        return; 
    }

    console.log('Inicializando la base de datos...');
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    `);

    // Insertar un usuario de ejemplo (Admin/123456) si no existe
    const checkUser = db.prepare('SELECT COUNT(*) FROM users WHERE username = ?');
    if (checkUser.get('admin')['COUNT(*)'] === 0) {
        const insertStmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
        insertStmt.run('admin', '123456', 'administrator');
        console.log('Usuario de prueba "admin" insertado.');
    }
    console.log('Base de datos lista.');
}

/**
 * Verifica las credenciales de un usuario.
 * @param {string} username
 * @param {string} password
 * @returns {object | undefined} El objeto de usuario si es válido, o undefined.
 */
function verifyUser(username, password) {
    if (!db) {
        console.error("Error: DB no inicializada. No se puede verificar el usuario.");
        return undefined;
    }
    // 🚨 Mejorar: Usar bcrypt o Argon2 para verificar el hash de la contraseña en producción.
    const stmt = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?');
    return stmt.get(username, password);
}

module.exports = {
    initDb, // Exportamos la función de inicialización
    verifyUser
    
};
/**
 * Obtiene todos los usuarios de la base de datos (excluyendo la contraseña).
 * @returns {Array} Lista de usuarios.
 */
function getAllUsers() {
    if (!db) {
        console.error("Error: DB no inicializada.");
        return [];
    }
    // NOTA: Siempre excluir columnas sensibles como 'password'
    const stmt = db.prepare('SELECT id, username, role FROM users');
    return stmt.all(); 
}

module.exports = {
    initDb, 
    verifyUser,
    getAllUsers // 🚨 Exportar la nueva función
};