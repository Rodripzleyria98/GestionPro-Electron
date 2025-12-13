// preload.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // AUTH
    // Login (Canal 'user:login')
    login: (username, password) => ipcRenderer.invoke('user:login', username, password),
    // Obtener Usuarios (Canal 'db:getUsers' - Usado en Home/Dashboard)
    getUsers: () => ipcRenderer.invoke('db:getUsers'), 
    
    // MÓDULO DE INVENTARIO (CRUD)
    createProduct: (productData) => ipcRenderer.invoke('create-product', productData),
    getProducts: () => ipcRenderer.invoke('get-products'),
    getProductById: (id) => ipcRenderer.invoke('get-product-by-id', id),
    updateProduct: (productData) => ipcRenderer.invoke('update-product', productData),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    
    // searchProduct (Canal 'search-product' - Usado para la consulta rápida)
    searchProduct: (query) => ipcRenderer.invoke('search-product', query),
});