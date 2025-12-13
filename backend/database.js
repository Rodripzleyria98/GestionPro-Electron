// backend/database.js

const Database = require('better-sqlite3');
const path = require('path');
// const fs = require('fs'); 

let db = null; 

function initDb(appPath) {

    const dbPath = path.join(appPath, '..', 'gestionpro.db'); 
    
    if (db) return; 

    //conexión a la base de datos
    try {
        db = new Database(dbPath, { verbose: console.log });
        db.pragma('journal_mode = WAL');
    } catch (error) {
        console.error("ERROR FATAL AL ABRIR SQLITE:", error);
        return; 
    }

    console.log('Inicializando la base de datos...');
    

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'manager'
        )
    `);
    
    // TABLA PRODUCTOS
    db.exec(`
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            codigo TEXT NOT NULL UNIQUE, 
            stock INTEGER NOT NULL,
            precio REAL NOT NULL,
            categoria TEXT NOT NULL
        )
    `);


    const checkUser = db.prepare('SELECT COUNT(*) FROM users WHERE username = ?');
    if (checkUser.get('admin')['COUNT(*)'] === 0) {
        const insertStmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
        insertStmt.run('admin', '123456', 'administrator');
        console.log('Usuario de prueba "admin" insertado.');
    }
    
    console.log('Base de datos lista.');
}

// MÓDULOS DE AUTENTICACIÓN 
function verifyUser(username, password) {
    if (!db) { console.error("Error: DB no inicializada."); return undefined; }
    const stmt = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?');
    return stmt.get(username, password);
}
function getAllUsers() {
    if (!db) return [];
    const stmt = db.prepare('SELECT id, username, role FROM users');
    return stmt.all(); 
}

// CREATE: Recibe y usa 'codigo'
function createProduct(nombre, codigo, stock, precio, categoria) {
    if (!db) return { success: false, message: "DB no inicializada." };
    try {
        const stmt = db.prepare("INSERT INTO productos (nombre, codigo, stock, precio, categoria) VALUES (?, ?, ?, ?, ?)");
        const info = stmt.run(nombre, codigo, stock, precio, categoria);
        return { success: true, id: info.lastInsertRowid };
    } catch (error) {
        let msg = error.message;
        if (msg.includes('UNIQUE constraint failed: productos.codigo')) {
             msg = 'El código (SKU) del producto ya existe.';
        }
        return { success: false, message: msg };
    }
}

// READ (Todos)
function getProducts() {
    if (!db) return [];
    try {
        return db.prepare("SELECT * FROM productos ORDER BY id DESC").all();
    } catch (error) {
        console.error("Error al obtener productos:", error);
        return [];
    }
}

// READ (Por ID)
function getProductById(id) {
    if (!db) return null;
    try {
        return db.prepare("SELECT * FROM productos WHERE id = ?").get(id);
    } catch (error) {
        console.error("Error al obtener producto por ID:", error);
        return null;
    }
}

// UPDATE: Recibe y usa 'codigo'
function updateProduct(id, nombre, codigo, stock, precio, categoria) {
    if (!db) return { success: false, message: "DB no inicializada." };
    try {
        const stmt = db.prepare("UPDATE productos SET nombre = ?, codigo = ?, stock = ?, precio = ?, categoria = ? WHERE id = ?");
        const info = stmt.run(nombre, codigo, stock, precio, categoria, id);
        return { success: true, changes: info.changes };
    } catch (error) {
        let msg = error.message;
        if (msg.includes('UNIQUE constraint failed: productos.codigo')) {
             msg = 'El código (SKU) del producto ya existe.';
        }
        return { success: false, message: msg };
    }
}

// DELETE (Mantenida)
function deleteProduct(id) {
    if (!db) return { success: false, message: "DB no inicializada." };
    try {
        const stmt = db.prepare("DELETE FROM productos WHERE id = ?");
        const info = stmt.run(id);
        return { success: true, changes: info.changes };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// SEARCH: Búsqueda rápida por código, nombre o categoría (LÓGICA FINAL Y EXTENDIDA)
function searchProduct(query) {
    if (!db) return null;
    try {
        const searchTerm = `%${query}%`;
        const stmt = db.prepare(`
            SELECT * FROM productos 
            WHERE codigo = ? 
            OR nombre LIKE ? COLLATE NOCASE 
            OR categoria = ? COLLATE NOCASE
            LIMIT 1
        `);
        // Pasamos el término a los tres placeholders (codigo, nombre, categoria)
        return stmt.get(query, searchTerm, query); 
    } catch (error) {
        console.error("Error FATAL en búsqueda de producto:", error);
        return null;
    }
}

module.exports = {
    initDb, 
    verifyUser,
    getAllUsers, 
    // CRUD Productos
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    searchProduct 
};