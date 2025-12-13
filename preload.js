// preload.js - VERSIÓN FINAL CON GESTIÓN DE VENTAS

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // AUTH
    login: (username, password) => ipcRenderer.invoke('user:login', username, password),
    getUsers: () => ipcRenderer.invoke('db:getUsers'), 
    
    // MÓDULO DE INVENTARIO (CRUD y Búsqueda)
    createProduct: (productData) => ipcRenderer.invoke('create-product', productData),
    getProducts: () => ipcRenderer.invoke('get-products'),
    getProductById: (id) => ipcRenderer.invoke('get-product-by-id', id),
    updateProduct: (productData) => ipcRenderer.invoke('update-product', productData),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    searchProduct: (query) => ipcRenderer.invoke('search-product', query),
    
    // PROCESAR VENTA
    processSale: (saleData) => ipcRenderer.invoke('process-sale', saleData),
});