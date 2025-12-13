// main.js

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./database'); 

// 🚨 INICIALIZACIÓN DE LA BASE DE DATOS
// Usamos __dirname, que es la forma correcta de obtener la ruta en main.js
db.initDb(__dirname); 


function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Cargamos el puente seguro
      preload: path.join(__dirname, 'preload.js'), 
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // 🚨 CAMBIO CLAVE AQUÍ: Cargar la nueva página de bienvenida
  win.loadFile('inicio.html'); // <--- AHORA CARGA INICIO.HTML PRIMERO

  // win.webContents.openDevTools(); // Descomentar para depurar
}

app.whenReady().then(createWindow);

// ----------------------------------------------------
// LÓGICA IPC: Maneja todas las peticiones del frontend
// ----------------------------------------------------

// 1. Maneja la solicitud de Login
ipcMain.handle('user:login', (event, username, password) => {
    const user = db.verifyUser(username, password);

    if (user) {
        console.log(`Usuario autenticado: ${user.username}`);
        return { success: true, user: user };
    } else {
        console.log('Intento de login fallido.');
        return { success: false, message: 'Credenciales inválidas.' };
    }
});

// 2. Maneja la solicitud de Obtener Usuarios para el Dashboard
ipcMain.handle('db:getUsers', async () => {
    try {
        const users = db.getAllUsers();
        // Devolvemos el array de usuarios
        return { success: true, users: users };
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        return { success: false, message: 'Error interno de la base de datos' };
    }
});

// ----------------------------------------------------

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