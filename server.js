// server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Middlewares
app.use(cors());
app.use(express.json()); 

// Servir archivos estáticos (HTML, CSS, JS, Imágenes)
app.use(express.static(__dirname)); 

// ==========================================
// RUTA 1: OBTENER CATÁLOGO DE PRODUCTOS
// ==========================================
app.get('/api/products', async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true }
        });
        res.json(products);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ==========================================
// RUTA 2: COTIZADOR DE ENVÍO
// ==========================================
app.post('/api/shipping/quote', async (req, res) => {
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
        console.error("Error al cotizar envío:", error);
        res.status(500).json({ error: "Fallo al conectar con el proveedor de envíos" });
    }
});

// ==========================================
// RUTA 3: GENERADOR DE CÓDIGO QR ÚNICO (Taller)
// ==========================================
app.get('/api/qr/:sku', async (req, res) => {
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
        console.error("Error generando QR:", error);
        res.status(500).json({ error: "Fallo al generar el código QR" });
    }
});

// ==========================================
// RUTA 4: ACTUALIZAR INVENTARIO MEDIANTE ESCÁNER
// ==========================================
app.post('/api/inventory/update', async (req, res) => {
    const { sku, change } = req.body;
    if (!sku || change === undefined) return res.status(400).json({ error: "Faltan datos de SKU o cantidad" });

    try {
        const updatedProduct = await prisma.product.update({
            where: { sku: sku },
            data: { stock: { increment: parseInt(change) } }
        });
        res.json({ success: true, name: updatedProduct.name, newStock: updatedProduct.stock });
    } catch (error) {
        console.error("Error al actualizar stock:", error);
        res.status(500).json({ error: "No se pudo actualizar el stock o el SKU no existe." });
    }
});

// ==========================================
// RUTA 5: GUARDAR UN NUEVO COMENTARIO
// ==========================================
app.post('/api/reviews', async (req, res) => {
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
        console.error("Error al guardar la reseña:", error);
        res.status(500).json({ error: "Fallo al guardar el comentario." });
    }
});

// ==========================================
// RUTA 6: OBTENER COMENTARIOS DE UNA JOYA
// ==========================================
app.get('/api/reviews/:productId', async (req, res) => {
    const { productId } = req.params;
    try {
        const reviews = await prisma.review.findMany({
            where: { productId: productId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        console.error("Error al obtener reseñas:", error);
        res.status(500).json({ error: "Fallo al cargar los comentarios." });
    }
});

// ==========================================
// RUTA 7: OBTENER UN PRODUCTO ESPECÍFICO
// ==========================================
app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.findUnique({
            where: { id: id }
        });
        if (!product) return res.status(404).json({ error: "Producto no encontrado" });
        res.json(product);
    } catch (error) {
        console.error("Error al obtener producto:", error);
        res.status(500).json({ error: "Error del servidor" });
    }
});

// ==========================================
// RUTA 8: PAGO SIMULADO (Local)
// ==========================================
app.post('/api/checkout/simulate', async (req, res) => {
    const { customerData, cart, shippingCost } = req.body;

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: "El carrito está vacío" });
    }

    try {
        let totalAmount = shippingCost;
        for (const item of cart) {
            const dbProduct = await prisma.product.findUnique({ where: { id: item.id } });
            if (dbProduct) totalAmount += dbProduct.price;
        }

        const orderNumber = "CAT-" + Math.floor(Math.random() * 1000000);

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

        for (const item of cart) {
            await prisma.product.update({
                where: { id: item.id },
                data: { stock: { decrement: 1 } }
            });
        }

        res.json({ success: true, redirectUrl: `/exito.html?orden=${orderNumber}` });

    } catch (error) {
        console.error("Error en la simulación:", error);
        res.status(500).json({ error: "Fallo al procesar el pedido localmente." });
    }
});

// ==========================================
// CONFIGURACIÓN DE ESCUCHA (MODIFICADO PARA RED LOCAL)
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n--- SERVIDOR CAT JOYAS ACTIVO ---`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Red:   http://192.168.1.16:${PORT}`);
    console.log(`----------------------------------\n`);
});