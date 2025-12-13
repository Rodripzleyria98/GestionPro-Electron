// backend/main.js

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database'); 

// 1. INICIALIZACIÓN DE LA BASE DE DATOS
// La DB se crea en la misma carpeta que main.js (o un nivel arriba si database.js lo indica)
db.initDb(__dirname); 

function createWindow() {
    const win = new BrowserWindow({
        width: 1200, 
        height: 800, 
        webPreferences: {
            // 🚨 CORRECCIÓN DE RUTA: preload.js ahora está en la raíz (un nivel arriba de /backend/)
            preload: path.join(__dirname, '..', 'preload.js'), 
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // 🚨 CORRECCIÓN DE RUTA: inicio.html está en /frontend/
    win.loadFile(path.join(__dirname, '..', 'frontend', 'inicio.html')); 
    // win.webContents.openDevTools(); 
}

app.whenReady().then(createWindow);


// 2. MANEJADORES IPC (Proceso Principal) - Lógica correcta

// AUTH: Maneja el Login
ipcMain.handle('user:login', (event, username, password) => {
    const user = db.verifyUser(username, password);
    if (user) {
        console.log(`Usuario autenticado: ${user.username}`);
        return { success: true, user: user };
    } else {
        return { success: false, message: 'Credenciales inválidas.' };
    }
});

// READ: Obtener Usuarios
ipcMain.handle('db:getUsers', async () => {
    try {
        const users = db.getAllUsers();
        return { success: true, users: users };
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        return { success: false, message: 'Error interno de la base de datos' };
    }
});

// --- CRUD PRODUCTOS ---

// CREATE: Crear Producto
ipcMain.handle('create-product', (event, productData) => {
    return db.createProduct(
        productData.nombre, 
        productData.codigo, 
        productData.stock, 
        productData.precio, 
        productData.categoria
    );
});

// READ: Obtener todos los productos
ipcMain.handle('get-products', (event) => {
    return db.getProducts();
});

// READ: Obtener Producto por ID
ipcMain.handle('get-product-by-id', (event, id) => {
    return db.getProductById(id);
});

// UPDATE: Actualizar Producto
ipcMain.handle('update-product', (event, productData) => {
    return db.updateProduct(
        productData.id, 
        productData.nombre, 
        productData.codigo,
        productData.stock, 
        productData.precio, 
        productData.categoria
    );
});

// DELETE: Eliminar Producto
ipcMain.handle('delete-product', (event, id) => {
    return db.deleteProduct(id);
});

// NUEVO: SEARCH Producto
ipcMain.handle('search-product', (event, query) => {
    return db.searchProduct(query);
});


// 3. GESTIÓN DE VENTANAS DE ELECTRON
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});