# 1. Usar una imagen oficial de Node.js (versión ligera)
FROM node:18-alpine

# 2. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# 3. Copiar los archivos de dependencias primero (para optimizar la caché de Docker)
COPY package*.json ./
COPY prisma ./prisma/

# 4. Instalar las dependencias de producción
RUN npm install --omit=dev

# 5. Generar el cliente de Prisma (Crucial para que la BD funcione en el contenedor)
RUN npx prisma generate

# 6. Copiar el resto del código del proyecto (HTML, CSS, JS, Imágenes)
COPY . .

# 7. Exponer el puerto que usa tu servidor (3000)
EXPOSE 3000

# 8. Comando para iniciar la aplicación
CMD ["node", "server.js"]