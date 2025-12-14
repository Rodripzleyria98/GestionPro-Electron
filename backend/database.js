// backend/database.js 

const Database = require('better-sqlite3');
const path = require('path');
// const fs = require('fs'); 

let db = null; 

// Función auxiliar para obtener producto por ID (necesaria para la venta)
function getProductById(id) {
    if (!db) return null;
    try {
        // Nota: Solo se usa para verificar existencia y stock en processSale
        return db.prepare("SELECT * FROM productos WHERE id = ?").get(id);
    } catch (error) {
        console.error("Error al obtener producto por ID:", error);
        return null;
    }
}


function initDb(appPath) {
    const dbPath = path.join(appPath, '..', 'gestionpro.db'); 
    
    if (db) return; 

    // Conexión a la base de datos
    try {
        db = new Database(dbPath, { verbose: console.log });
        db.pragma('journal_mode = WAL');
    } catch (error) {
        console.error("ERROR FATAL AL ABRIR SQLITE:", error);
        return; 
    }

    console.log('Inicializando la base de datos...');
    

    // 2. CREACIÓN DE TABLAS

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'manager'
        )
    `);
    
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

    db.exec(`
        CREATE TABLE IF NOT EXISTS ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT NOT NULL,
            total REAL NOT NULL,
            productos_json TEXT NOT NULL 
            -- Almacenamos los detalles de los productos vendidos como JSON
        )
    `);
    // Inserción de Admin (si no existe)
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
function createUser(username, password, role = 'vendedor') {
    if (!db) return { success: false, message: "DB no inicializada." };
    try {
        const stmt = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
        const info = stmt.run(username, password, role);
        return { success: true, id: info.lastInsertRowid };
    } catch (error) {
        let msg = error.message;
        if (msg.includes('UNIQUE constraint failed: users.username')) {
             msg = 'El nombre de usuario ya existe.';
        }
        return { success: false, message: msg };
    }
}
// CRUD PRODUCTOS
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
function getProducts() {
    if (!db) return [];
    try {
        return db.prepare("SELECT * FROM productos ORDER BY id DESC").all();
    } catch (error) {
        console.error("Error al obtener productos:", error);
        return [];
    }
}
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
        return stmt.get(query, searchTerm, query); 
    } catch (error) {
        console.error("Error FATAL en búsqueda de producto:", error);
        return null;
    }
}


// MÓDULO DE VENTAS Y STOCK
function processSale(saleData) {
    if (!db) return { success: false, message: "DB no inicializada." };
    
    // Usamos una transacción para asegurar que la actualización de stock y el registro de venta sean atómicos.
    const transaction = db.transaction(() => {
        let total = 0;
        let soldItemsDetails = [];

        // 1. Verificar y Descontar Stock
        for (const item of saleData.items) {
            const product = getProductById(item.productId);
            
            if (!product) {
                throw new Error(`Producto ID ${item.productId} no encontrado.`);
            }
            if (product.stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${product.nombre}: ${item.quantity} requerido, ${product.stock} disponible.`);
            }

            // Descontar stock
            const newStock = product.stock - item.quantity;
            const updateStmt = db.prepare('UPDATE productos SET stock = ? WHERE id = ?');
            updateStmt.run(newStock, item.productId);

            // Calcular y registrar detalles para el registro de venta
            total += product.precio * item.quantity;
            soldItemsDetails.push({
                id: product.id,
                name: product.nombre,
                qty: item.quantity,
                price: product.precio
            });
        }

        // 2. Registrar la Venta
        const insertSaleStmt = db.prepare('INSERT INTO ventas (fecha, total, productos_json) VALUES (?, ?, ?)');
        
        insertSaleStmt.run(
            new Date().toISOString(),
            total,
            JSON.stringify(soldItemsDetails)
        );
        
        return { success: true, total: total };

    });

    try {
        return transaction(); // Ejecutar la transacción
    } catch (error) {
        console.error("Error al procesar la venta:", error.message);
        return { success: false, message: error.message };
    }
}
// Función para obtener las ventas totales de hoy
function getDailySales() {
    if (!db) return 0;
    try {
        // Obtener la fecha de hoy en formato ISO (YYYY-MM-DD)
        const today = new Date().toISOString().slice(0, 10);
        const startOfDay = `${today}T00:00:00.000Z`;
        const endOfDay = `${today}T23:59:59.999Z`;

        // Consulta para sumar el total de ventas registradas hoy
        const stmt = db.prepare(`
            SELECT SUM(total) AS total_sales 
            FROM ventas 
            WHERE fecha >= ? AND fecha <= ?
        `);
        const result = stmt.get(startOfDay, endOfDay);
        // Devuelve el total o 0 si es nulo
        return result.total_sales || 0; 
    } catch (error) {
        console.error("Error al obtener ventas del día:", error);
        return 0;
    }
}

// Función para contar productos con stock bajo (crítico)
function getCriticalStockCount(threshold = 10) {
    if (!db) return 0;
    try {
        // Contar productos donde el stock es menor o igual al umbral
        const stmt = db.prepare(`
            SELECT COUNT(*) AS critical_count 
            FROM productos 
            WHERE stock <= ?
        `);
        const result = stmt.get(threshold);
        return result.critical_count || 0;
    } catch (error) {
        console.error("Error al obtener stock crítico:", error);
        return 0;
    }
}


module.exports = {
    initDb, 
    verifyUser,
    getAllUsers, 
    createUser,
    // CRUD Productos
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    searchProduct,
    processSale,
    getDailySales,
    getCriticalStockCount
};