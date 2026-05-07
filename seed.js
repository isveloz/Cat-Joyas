// seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando base de datos con joyas...');

  const medalla = await prisma.product.upsert({
    where: { sku: 'SNB-001' },
    update: { imageUrl: 'img/medalla.san.png' },
    create: {
      sku: 'SNB-001',
      name: 'Medalla San Benito',
      description: 'Protección y elegancia forjada en oro.',
      material: 'Oro 18k',
      price: 125000,
      stock: 5,
      imageUrl: 'img/medalla.san.png',
    },
  });

  const anillo = await prisma.product.upsert({
    where: { sku: 'LAP-001' },
    update: { imageUrl: 'img/anillolapizazul.jpg' },
    create: {
      sku: 'LAP-001',
      name: 'Anillo Lapis Imperial',
      description: 'Lapislázuli chileno engastado en diseño robusto.',
      material: 'Plata y Lapislázuli',
      price: 45000,
      stock: 3,
      imageUrl: 'img/anillolapizazul.jpg',
    },
  });

  const cadena = await prisma.product.upsert({
    where: { sku: 'PLT-001' },
    update: { imageUrl: 'img/cadena.png' },
    create: {
      sku: 'PLT-001',
      name: 'Cadena Eslabón Clásico',
      description: 'Cadenas de plata noble forjadas a mano.',
      material: 'Plata 925',
      price: 42000,
      stock: 10,
      imageUrl: 'img/cadena.png',
    },
  });

  const colgante = await prisma.product.upsert({
    where: { sku: 'LAP-002' },
    update: { imageUrl: 'img/lpz.png' },
    create: {
      sku: 'LAP-002',
      name: 'Colgante Lapis',
      description: 'Piedra natural en corte asimétrico.',
      material: 'Plata y Lapislázuli',
      price: 38000,
      stock: 4,
      imageUrl: 'img/lpz.png',
    },
  });

  const collarAgatas = await prisma.product.upsert({
    where: { sku: 'COL-001' },
    update: { imageUrl: 'img/medallon-sanbenito.jpg' }, 
    create: {
      sku: 'COL-001',
      name: 'Collar de Ágatas',
      description: 'Collar de ágatas rojas con detalles en oro.',
      material: 'Ágata y Oro',
      price: 65000,
      stock: 2,
      imageUrl: 'img/medallon-sanbenito.jpg',
    },
  });

  const pulseraTejido = await prisma.product.upsert({
    where: { sku: 'PUL-001' },
    update: { imageUrl: 'img/pulsera.jpg' },
    create: {
      sku: 'PUL-001',
      name: 'Pulsera Tejido Carmesí',
      description: 'Pulsera de tejido rojo y oro de alta resistencia.',
      material: 'Hilo y Oro 18k',
      price: 25000,
      stock: 8,
      imageUrl: 'img/pulsera.jpg',
    },
  });

  console.log('¡Catálogo creado exitosamente!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });