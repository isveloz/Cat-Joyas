const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { WebpayPlus, Options, IntegrationCommerceCodes, IntegrationApiKeys, Environment } = require('transbank-sdk');
const QRCode = require('qrcode');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// --- UTILIDADES DE ARQUITECTURA (NO ELIMINAR) ---

const catchAsync = fn => (req, res, next) => {
    fn(req, res, next).catch(next);
};

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// --- CONFIGURACIÓN DE INFRAESTRUCTURA Y SEGURIDAD ---

const sslOptions = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
};

// Matriz de Logística: Bluexpress (Tarifas E-commerce Priority para Joyería)
const bluexpressRates = {
    'santiago': 2990,
    'las condes': 2990,
    'providencia': 2990,
    'nunoa': 2990,
    'concepcion': 3990,
    'valparaiso': 3600,
    'viña del mar': 3600,
    'antofagasta': 5500,
    'default': 5500
};

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://www.catjoyas.cl'] : '*',
    methods: ['GET', 'POST', 'PATCH']
}));
app.use(express.json());
app.use(express.static('public'));

// ==========================================
// 1. ENDPOINTS DE CATÁLOGO Y PRODUCTOS
// ==========================================

app.get('/api/products', catchAsync(async (req, res) => {
    const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(products);
}));

app.get('/api/products/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) throw new AppError('La pieza no existe en el inventario', 404);
    res.status(200).json(product);
}));

// ==========================================
// 2. ENDPOINTS DE LOGÍSTICA (BLUEXPRESS)
// ==========================================

app.post('/api/shipping/quote', catchAsync(async (req, res) => {
    const { commune } = req.body;
    if (!commune) throw new AppError('La comuna es obligatoria para cotizar despacho', 400);

    const destination = commune.toLowerCase().trim();
    const cost = bluexpressRates[destination] || bluexpressRates['default'];

    res.status(200).json({
        provider: "Bluexpress",
        costCLP: cost,
        communeDestination: destination,
        message: "Tarifa calculada según matriz logística Cat Joyas"
    });
}));

// ==========================================
// 3. ENDPOINTS DE RESEÑAS Y FEEDBACK
// ==========================================

app.get('/api/reviews/:productId', catchAsync(async (req, res) => {
    const { productId } = req.params;
    const reviews = await prisma.review.findMany({
        where: { productId: productId },
        orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(reviews);
}));

app.post('/api/reviews', catchAsync(async (req, res) => {
    const { productId, authorName, rating, comment } = req.body;

    if (!productId || !authorName || !rating || !comment) {
        throw new AppError('Todos los campos son obligatorios para publicar la reseña', 400);
    }

    const productExists = await prisma.product.findUnique({ where: { id: productId } });
    if (!productExists) throw new AppError('Producto inexistente', 404);

    const newReview = await prisma.review.create({
        data: {
            productId,
            authorName,
            rating: parseInt(rating),
            comment
        }
    });
    res.status(201).json(newReview);
}));

// ==========================================
// 4. ENDPOINTS DE PAGOS (WEBPAY PLUS)
// ==========================================

app.post('/api/pay/initiate', catchAsync(async (req, res) => {
    // AHORA RECIBIMOS EL CART
    const { amount, orderId, cart, customerData } = req.body;
    
    if (!cart || cart.length === 0) {
        throw new AppError('El carrito está vacío.', 400);
    }

    const buyOrder = orderId || `CAT-${Date.now()}`;
    const sessionId = `session-${buyOrder}`;
    const returnUrl = `https://${req.get('host')}/api/pay/confirm`;

    // 1. BLINDAJE: Verificar que las joyas sigan existiendo en DB
    const cartIds = cart.map(item => item.id);
    const validProducts = await prisma.product.findMany({
        where: { id: { in: cartIds } }
    });

    if (validProducts.length === 0) {
        throw new AppError('Sincronización fallida. Por favor, limpia tu bolsa de compras y vuelve a agregar las joyas.', 400);
    }

    // 2. Registro de la orden con items incluidos
    const orderRecord = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
            where: { email: customerData.email },
            update: { firstName: customerData.nombre, lastName: customerData.apellido },
            create: { 
                email: customerData.email, 
                firstName: customerData.nombre, 
                lastName: customerData.apellido 
            }
        });

        return await tx.order.create({
            data: {
                orderNumber: buyOrder,
                totalAmount: amount,
                shippingAddress: customerData.direccion,
                shippingCity: customerData.comuna,
                customerId: customer.id,
                items: {
                    create: validProducts.map(p => ({
                        productId: p.id,
                        quantity: 1, // Asumimos 1 por diseño actual
                        priceAt: p.price
                    }))
                }
            }
        });
    });

    const txWebpay = new WebpayPlus.Transaction(new Options(
        IntegrationCommerceCodes.WEBPAY_PLUS, 
        IntegrationApiKeys.WEBPAY, 
        Environment.Integration
    ));

    const response = await txWebpay.create(buyOrder, sessionId, amount, returnUrl);

    // Guardamos el token en la orden
    await prisma.order.update({
        where: { id: orderRecord.id },
        data: { tbkToken: response.token }
    });

    res.status(200).json({
        token: response.token,
        url: response.url
    });
}));

app.get('/api/pay/confirm', catchAsync(async (req, res) => {
    const token = req.query.token_ws;

    if (!token) return res.redirect('/carrito.html?status=cancelled');

    const txWebpay = new WebpayPlus.Transaction(new Options(
        IntegrationCommerceCodes.WEBPAY_PLUS, 
        IntegrationApiKeys.WEBPAY, 
        Environment.Integration
    ));
    
    const response = await txWebpay.commit(token);

    if (response.status === 'AUTHORIZED') {
        // BLINDAJE: Descontar stock al autorizar el pago
        await prisma.$transaction(async (db) => {
            const order = await db.order.update({
                where: { tbkToken: token },
                data: { 
                    status: "PAID",
                    tbkAuthCode: response.authorization_code
                },
                include: { items: true }
            });

            for (const item of order.items) {
                await db.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } }
                });
            }
        });

        res.redirect(`/exito.html?orden=${response.buy_order}&auth=${response.authorization_code}`);
    } else {
        await prisma.order.update({
            where: { tbkToken: token },
            data: { status: "FAILED" }
        });
        res.redirect('/carrito.html?status=failed');
    }
}));

// ==========================================
// 5. ENDPOINTS DE ADMINISTRACIÓN Y QR
// ==========================================

app.get('/api/admin/inventory', catchAsync(async (req, res) => {
    const inventory = await prisma.product.findMany({
        select: { id: true, sku: true, name: true, stock: true, price: true, isActive: true },
        orderBy: { stock: 'asc' }
    });
    res.status(200).json({ status: 'success', data: inventory });
}));

app.patch('/api/admin/inventory/:id', catchAsync(async (req, res) => {
    const { newStock } = req.body;
    if (newStock === undefined || isNaN(parseInt(newStock))) {
        throw new AppError('Formato de stock inválido', 400);
    }

    const updatedProduct = await prisma.product.update({
        where: { id: req.params.id },
        data: { stock: parseInt(newStock) }
    });

    res.status(200).json({ 
        status: 'success', 
        message: `Stock actualizado para el SKU ${updatedProduct.sku}` 
    });
}));

app.get('/api/qr/:sku', catchAsync(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { sku: req.params.sku } });
    if (!product) throw new AppError('SKU inexistente', 404);

    const qrImage = await QRCode.toDataURL(product.sku, { width: 400 });
    res.status(200).json({ qrImage, name: product.name });
}));

// ==========================================
// 6. CONTROL DE ERRORES GLOBAL
// ==========================================

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    console.error(`[SYSTEM ERROR]: ${err.message}`, { stack: err.stack });

    res.status(statusCode).json({
        status: statusCode >= 500 ? 'error' : 'fail',
        message: err.isOperational ? err.message : 'Error interno de infraestructura'
    });
});

// ==========================================
// 7. INICIALIZACIÓN
// ==========================================

const PORT = process.env.PORT || 3000;
https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    process.stdout.write(`Servidor seguro Cat Joyas activo en puerto ${PORT}\n`);
    process.stdout.write(`Integración: Webpay Plus & Bluexpress\n`);
});