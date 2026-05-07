Cat Joyas - E-commerce & Inventory Management
Sistema integral para la gestión de orfebrería de autor, diseñado para Cat Joyas en Santiago de Chile. El proyecto abarca desde la experiencia de usuario en la tienda hasta herramientas administrativas de taller.

Arquitectura del Sistema
Motor de Base de Datos: PostgreSQL.

ORM: Prisma.

Backend: Node.js con Express.

Frontend: HTML5, CSS3 y JavaScript (Vanilla).

Funcionalidades de Taller: Generación dinámica de códigos QR para control de stock físico.

Configuración del Entorno
Dependencias:
Instalar los módulos necesarios con npm install.

Variables de Entorno:
Configurar el archivo .env con la credencial DATABASE_URL.

Base de Datos:
Ejecutar las migraciones y el seed para poblar el catálogo inicial:

Bash
npx prisma migrate dev --name init
npx prisma db seed
Servidor:
Iniciar el entorno local:

Bash
node server.js
Módulos Administrativos
El sistema cuenta con acceso para dispositivos móviles dentro de la red local para facilitar el escaneo en taller:

Gestión de Etiquetas: /admin-etiquetas.html

Actualización de Stock: /admin-taller.html