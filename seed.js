// seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando base de datos con joyas...');

  const medalla = await prisma.product.upsert({
    where: { sku: 'SNB-001' },
    update: {},
    create: {
      sku: 'SNB-001',
      name: 'Medalla San Benito',
      description: 'Protección y elegancia forjada en oro.',
      material: 'Oro 18k',
      price: 125000,
      stock: 5,
      imageUrl: 'img/snb.png',
    },
  });

  const anillo = await prisma.product.upsert({
    where: { sku: 'LAP-001' },
    update: {},
    create: {
      sku: 'LAP-001',
      name: 'Anillo Lapis Imperial',
      description: 'Lapislázuli chileno engastado en diseño robusto.',
      material: 'Plata y Lapislázuli',
      price: 45000,
      stock: 3,
      imageUrl: 'img/2021-04-01-115854246-scaled.jpg',
    },
  });

  const cadena = await prisma.product.upsert({
    where: { sku: 'PLT-001' },
    update: {},
    create: {
      sku: 'PLT-001',
      name: 'Cadena Eslabón Clásico',
      description: 'Cadenas de plata noble forjadas a mano.',
      material: 'Plata 925',
      price: 42000,
      stock: 10,
      imageUrl: 'img/plta.jpg',
    },
  });

  const colgante = await prisma.product.upsert({
    where: { sku: 'LAP-002' },
    update: {},
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