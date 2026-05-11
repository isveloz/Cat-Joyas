// server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// ==========================================
// SEGURIDAD: Configuración de CORS para Producción
// ==========================================
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://www.catjoyas.cl', 'https://catjoyas.cl'] // Reemplazar con dominio final
        : '*', // Permite todo en desarrollo local
    optionsSuccessStatus: 200
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json()); 

// Servir archivos estáticos
app.use(express.static(__dirname)); 

// ==========================================
// RUTA 1: OBTENER CATÁLOGO DE PRODUCTOS
// ==========================================
app.get('/api/products', async (req, res, next) => {
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true }
        });
        res.json(products);
    } catch (error) {
        next(error);
    }
});

// ==========================================
// RUTA 2: COTIZADOR DE ENVÍO
// ==========================================
app.post('/api/shipping/quote', async (req, res, next) => {
    const { commune, weightKg } = req.body;
    if (!commune) return res.status(400).json({ error: "La comuna de destino es requerida" });

    try {
        let baseRate = 3500; 
        let estimatedDays = 2;
        const regionesComunas = ['antofagasta', 'concepcion', 'valdivia', 'punta arenas'];
        
        if (regionesComunas.includes(commune.toLowerCase())) {
            baseRate = 6500;
            estimatedDays = 5;
        }

        res.json({
            provider: "Bluexpress",
            costCLP: baseRate,
            estimatedDeliveryDays: estimatedDays,
            communeDestination: commune
        });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// RUTA 3: GENERADOR DE CÓDIGO QR ÚNICO (Taller)
// ==========================================
app.get('/api/qr/:sku', async (req, res, next) => {
    const { sku } = req.params;
    try {
        const product = await prisma.product.findUnique({ where: { sku } });
        if (!product) return res.status(404).json({ error: "Producto no encontrado en inventario" });

        const qrDataUrl = await QRCode.toDataURL(sku, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });

        res.json({ sku: product.sku, name: product.name, qrImage: qrDataUrl });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// RUTA 4: ACTUALIZAR INVENTARIO MEDIANTE ESCÁNER
// ==========================================
app.post('/api/inventory/update', async (req, res, next) => {
    const { sku, change } = req.body;
    if (!sku || change === undefined) return res.status(400).json({ error: "Faltan datos de SKU o cantidad" });

    try {
        const updatedProduct = await prisma.product.update({
            where: { sku: sku },
            data: { stock: { increment: parseInt(change) } }
        });
        res.json({ success: true, name: updatedProduct.name, newStock: updatedProduct.stock });
    } catch (error) {
        res.status(500).json({ error: "No se pudo actualizar el stock o el SKU no existe." });
    }
});

// ==========================================
// RUTA 5: GUARDAR UN NUEVO COMENTARIO
// ==========================================
app.post('/api/reviews', async (req, res, next) => {
    const { productId, authorName, rating, comment } = req.body;

    if (!productId || !authorName || !rating || !comment) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    try {
        const newReview = await prisma.review.create({
            data: {
                productId,
                authorName,
                rating: parseInt(rating),
                comment
            }
        });
        res.json({ success: true, review: newReview });
    } catch (error) {
        next(error);
    }
});

// ==========================================
// RUTA 6: OBTENER COMENTARIOS DE UNA JOYA
// ==========================================
app.get('/api/reviews/:productId', async (req, res, next) => {
    const { productId } = req.params;
    try {
        const reviews = await prisma.review.findMany({
            where: { productId: productId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        next(error);
    }
});

// ==========================================
// RUTA 7: OBTENER UN PRODUCTO ESPECÍFICO
// ==========================================
app.get('/api/products/:id', async (req, res, next) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.findUnique({
            where: { id: id }
        });
        if (!product) return res.status(404).json({ error: "Producto no encontrado" });
        res.json(product);
    } catch (error) {
        next(error);
    }
});

// ==========================================
// RUTA 8: PAGO SIMULADO (Local) - VALIDADO
// ==========================================
app.post('/api/checkout/simulate', async (req, res, next) => {
    const { customerData, cart, shippingCost } = req.body;

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "El carrito está vacío" });
    }

    try {
        let totalAmount = shippingCost;
        
        // 1. Verificación de stock y recálculo de precios desde la DB
        for (const item of cart) {
            const dbProduct = await prisma.product.findUnique({ where: { id: item.id } });
            
            if (!dbProduct) {
                return res.status(400).json({ error: `El producto ${item.name} ya no existe en el catálogo.` });
            }
            if (dbProduct.stock < 1) {
                return res.status(400).json({ error: `El producto ${item.name} se ha quedado sin stock.` });
            }
            
            totalAmount += dbProduct.price;
        }

        const orderNumber = "CAT-" + Math.floor(Math.random() * 1000000);

        // 2. Transacción de creación de orden
        const order = await prisma.order.create({
            data: {
                orderNumber: orderNumber,
                totalAmount: totalAmount,
                status: "PAID",
                shippingAddress: customerData.direccion,
                shippingCity: customerData.comuna,
                customer: {
                    create: {
                        email: customerData.email,
                        firstName: customerData.nombre,
                        lastName: customerData.apellido
                    }
                }
            }
        });

        // 3. Descuento de inventario
        for (const item of cart) {
            await prisma.product.update({
                where: { id: item.id },
                data: { stock: { decrement: 1 } }
            });
        }

        res.json({ success: true, redirectUrl: `/exito.html?orden=${orderNumber}` });

    } catch (error) {
        console.error("Error procesando checkout:", error);
        res.status(500).json({ error: "Fallo al procesar el pedido." });
    }
});

// ==========================================
// MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
// ==========================================
app.use((err, req, res, next) => {
    console.error("Error no controlado:", err.stack);
    res.status(500).json({ error: "Ha ocurrido un error inesperado en el servidor." });
});

// ==========================================
// CONFIGURACIÓN DE ESCUCHA
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n--- SERVIDOR CAT JOYAS ACTIVO ---`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`----------------------------------\n`);
});