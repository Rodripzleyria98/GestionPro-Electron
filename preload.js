// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Función que el Renderer llamará para iniciar sesión
    login: (username, password) => ipcRenderer.invoke('user:login', username, password),
    
    // 🚨 NUEVA FUNCIÓN IPC: Obtener usuarios para el Dashboard
    getUsers: () => ipcRenderer.invoke('db:getUsers') 
});