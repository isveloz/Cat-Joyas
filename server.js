// server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// Middlewares
app.use(cors());
app.use(express.json()); // Permite recibir JSON desde el frontend

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
// RUTA 2: COTIZADOR DE ENVÍO (Simulación Chilexpress/Bluexpress)
// ==========================================
app.post('/api/shipping/quote', async (req, res) => {
    const { commune, weightKg } = req.body;

    if (!commune) {
        return res.status(400).json({ error: "La comuna de destino es requerida" });
    }

    try {
        /*
        Aquí en producción harías el fetch a la API de Chilexpress/Bluexpress:
        Ejemplo conceptual:
        const response = await fetch('https://testservices.wschilexpress.com/rating/api/v1.0/rates/courier', { ... });
        */

        // LÓGICA DE COTIZACIÓN SIMULADA PARA PRUEBAS
        // Las joyas son ligeras, pero el empaque de lujo añade peso volumétrico (Ej: 0.5kg)
        let baseRate = 3500; // Tarifa base RM
        let estimatedDays = 2;

        // Simulamos un sobrecargo para regiones
        const regionesComunas = ['antofagasta', 'concepcion', 'valdivia', 'punta arenas'];
        if (regionesComunas.includes(commune.toLowerCase())) {
            baseRate = 6500;
            estimatedDays = 5;
        }

        // Devolvemos la tarifa al frontend
        res.json({
            provider: "Bluexpress", // o Chilexpress
            costCLP: baseRate,
            estimatedDeliveryDays: estimatedDays,
            communeDestination: commune
        });

    } catch (error) {
        console.error("Error al cotizar envío:", error);
        res.status(500).json({ error: "Fallo al conectar con el proveedor de envíos" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de Cat Joyas corriendo en http://localhost:${PORT}`);
});