# Cat Joyas - E-commerce

Plataforma web para la comercialización de joyería de alta gama, equipada con un motor transaccional completo, gestión de inventario y pasarela de pagos integrada.

## Stack Tecnológico

* Backend: Node.js y Express
* Base de Datos: PostgreSQL gestionada con Prisma ORM
* Pasarela de Pagos: Transbank Webpay Plus (Ambiente de Integración)
* Logística: Matriz de costos optimizada para Bluexpress
* Seguridad: Comunicaciones bajo protocolo HTTPS y certificados SSL
* Analítica: Google Analytics 4 (GA4)

## Instalación y Configuración Local

1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/isveloz/Cat-Joyas.git](https://github.com/isveloz/Cat-Joyas.git)

2. Instalar las dependencias del proyecto:
npm install

3. Configurar variables de entorno:
Crear un archivo .env en la raíz del proyecto con el siguiente formato 

DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/cat_joyas"
PORT=3000

4. Sincronizar la base de datos e iniciar el servidor:

npx prisma generate
npx prisma db push
node server.js


**Tareas Pendientes (To-Do)**
1. Infraestructura: Migrar la base de datos de entorno local a la nube utilizando Neon.tech o Supabase.

2. Despliegue: Configurar la implementación continua (CI/CD) y lanzar el servicio en Google Cloud Run.

3. Logística: Integrar la API oficial de Bluexpress para generación automatizada de etiquetas (requiere cuenta comercial).

4. Administración: Desarrollar el panel de control para actualización de stock y generación de códigos QR desde el frontend.

**Desarrollado por isveloz**