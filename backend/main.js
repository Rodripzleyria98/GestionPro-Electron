// backend/main.js 

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database'); 

// 1. INICIALIZACIÓN DE LA BASE DE DATOS
db.initDb(__dirname); 

function createWindow() {
    const win = new BrowserWindow({
        width: 1200, 
        height: 800, 
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'), 
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.loadFile(path.join(__dirname, '..', 'frontend', 'inicio.html')); 
    // win.webContents.openDevTools(); 
}

app.whenReady().then(createWindow);

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
ipcMain.handle('user:create', (event, userData) => {
    
    return db.createUser(userData.username, userData.password, userData.role);
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

// --- CRUD PRODUCTOS / INVENTARIO ---

ipcMain.handle('create-product', (event, productData) => {
    return db.createProduct(productData.nombre, productData.codigo, productData.stock, productData.precio, productData.categoria);
});
ipcMain.handle('get-products', (event) => {
    return db.getProducts();
});
ipcMain.handle('get-product-by-id', (event, id) => {
    return db.getProductById(id);
});
ipcMain.handle('update-product', (event, productData) => {
    return db.updateProduct(productData.id, productData.nombre, productData.codigo, productData.stock, productData.precio, productData.categoria);
});
ipcMain.handle('delete-product', (event, id) => {
    return db.deleteProduct(id);
});
ipcMain.handle('search-product', (event, query) => {
    return db.searchProduct(query);
});

// --- MÓDULO DE VENTAS Y KPI ---

// PROCESAR VENTA
ipcMain.handle('process-sale', (event, saleData) => {
    return db.processSale(saleData);
});

// NUEVOS MANEJADORES KPI PARA DASHBOARD
ipcMain.handle('get-daily-sales', () => {
    return db.getDailySales();
});

ipcMain.handle('get-critical-stock-count', () => {
    return db.getCriticalStockCount();
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