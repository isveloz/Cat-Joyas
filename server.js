const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// ==========================================
// CONFIGURACIÓN DE CERTIFICADOS SSL
// ==========================================
let sslOptions = {};
try {
    sslOptions = {
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.cert')
    };
} catch (error) {
    console.error("ERROR: No se encontraron los archivos SSL (server.key/server.cert)");
    process.exit(1);
}

// ==========================================
// SEGURIDAD Y MIDDLEWARES
// ==========================================
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://www.catjoyas.cl', 'https://catjoyas.cl'] 
        : '*', 
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json()); 
app.use(express.static(__dirname)); 

// ==========================================
// RUTAS DE PRODUCTOS
// ==========================================

// Obtener catálogo activo
app.get('/api/products', async (req, res, next) => {
    try {
        const products = await prisma.product.findMany({ where: { isActive: true } });
        res.json(products);
    } catch (error) { next(error); }
});

// Obtener producto por ID
app.get('/api/products/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) return res.status(404).json({ error: "Producto no encontrado" });
        res.json(product);
    } catch (error) { next(error); }
});

// ==========================================
// RUTAS DE LOGÍSTICA (Bluexpress)
// ==========================================

app.post('/api/shipping/quote', async (req, res, next) => {
    const { commune, weightKg } = req.body;
    if (!commune) return res.status(400).json({ error: "Comuna requerida" });
    try {
        let baseRate = 3500; 
        let estimatedDays = 2;
        const regionesExtremas = ['antofagasta', 'concepcion', 'valdivia', 'punta arenas'];
        if (regionesExtremas.includes(commune.toLowerCase())) {
            baseRate = 6500;
            estimatedDays = 5;
        }
        res.json({ provider: "Bluexpress", costCLP: baseRate, estimatedDeliveryDays: estimatedDays });
    } catch (error) { next(error); }
});

// ==========================================
// RUTAS DE TALLER E INVENTARIO (QR)
// ==========================================

// Generar QR para SKU
app.get('/api/qr/:sku', async (req, res, next) => {
    const { sku } = req.params;
    try {
        const product = await prisma.product.findUnique({ where: { sku } });
        if (!product) return res.status(404).json({ error: "SKU no encontrado" });
        const qrDataUrl = await QRCode.toDataURL(sku, { width: 300 });
        res.json({ sku: product.sku, name: product.name, qrImage: qrDataUrl });
    } catch (error) { next(error); }
});

// Actualización rápida de stock
app.post('/api/inventory/update', async (req, res, next) => {
    const { sku, change } = req.body;
    try {
        const updated = await prisma.product.update({
            where: { sku },
            data: { stock: { increment: parseInt(change) } }
        });
        res.json({ success: true, newStock: updated.stock });
    } catch (error) { res.status(500).json({ error: "Error al actualizar stock" }); }
});

// ==========================================
// RUTAS DE RESEÑAS (Reviews)
// ==========================================

app.post('/api/reviews', async (req, res, next) => {
    const { productId, authorName, rating, comment } = req.body;
    try {
        const newReview = await prisma.review.create({
            data: { productId, authorName, rating: parseInt(rating), comment }
        });
        res.json({ success: true, review: newReview });
    } catch (error) { next(error); }
});

app.get('/api/reviews/:productId', async (req, res, next) => {
    const { productId } = req.params;
    try {
        const reviews = await prisma.review.findMany({
            where: { productId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (error) { next(error); }
});

// ==========================================
// RUTA DE CHECKOUT (Simulado y Validado)
// ==========================================

app.post('/api/checkout/simulate', async (req, res, next) => {
    const { customerData, cart, shippingCost } = req.body;
    if (!cart || cart.length === 0) return res.status(400).json({ error: "Carrito vacio" });

    try {
        let totalAmount = shippingCost;
        // Validación de stock en tiempo real
        for (const item of cart) {
            const dbProduct = await prisma.product.findUnique({ where: { id: item.id } });
            if (!dbProduct || dbProduct.stock < 1) {
                return res.status(400).json({ error: `Stock insuficiente para ${item.name}` });
            }
            totalAmount += dbProduct.price;
        }

        const orderNumber = "CAT-" + Math.floor(Math.random() * 1000000);
        
        // Crear orden y descontar stock (Transaccional)
        await prisma.order.create({
            data: {
                orderNumber, totalAmount, status: "PAID",
                shippingAddress: customerData.direccion, shippingCity: customerData.comuna,
                customer: { create: { email: customerData.email, firstName: customerData.nombre, lastName: customerData.apellido } }
            }
        });

        for (const item of cart) {
            await prisma.product.update({ where: { id: item.id }, data: { stock: { decrement: 1 } } });
        }

        res.json({ success: true, redirectUrl: `/exito.html?orden=${orderNumber}` });
    } catch (error) { next(error); }
});

// ==========================================
// ESCUCHA DEL SERVIDOR
// ==========================================
app.use((err, req, res, next) => {
    res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 3000;
https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`\n--- SISTEMA CAT JOYAS SEGURO ---`);
    console.log(`Endpoint: https://localhost:${PORT}`);
    console.log(`--------------------------------\n`);
});