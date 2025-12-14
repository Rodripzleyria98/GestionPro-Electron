// preload.js 

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // AUTH
    login: (username, password) => ipcRenderer.invoke('user:login', username, password),
    getUsers: () => ipcRenderer.invoke('db:getUsers'), 
    createUser: (userData) => ipcRenderer.invoke('user:create', userData),
    
    // MÓDULO DE INVENTARIO (CRUD y Búsqueda)
    createProduct: (productData) => ipcRenderer.invoke('create-product', productData),
    getProducts: () => ipcRenderer.invoke('get-products'),
    getProductById: (id) => ipcRenderer.invoke('get-product-by-id', id),
    updateProduct: (productData) => ipcRenderer.invoke('update-product', productData),
    deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
    searchProduct: (query) => ipcRenderer.invoke('search-product', query),
    
    // MÓDULO DE VENTAS
    processSale: (saleData) => ipcRenderer.invoke('process-sale', saleData),

    // FUNCIONES KPI
    getDailySales: () => ipcRenderer.invoke('get-daily-sales'),
    getCriticalStockCount: () => ipcRenderer.invoke('get-critical-stock-count'),
});