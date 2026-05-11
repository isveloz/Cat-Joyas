# Cat Joyas - E-commerce y Taller Digital

Plataforma de joyería artesanal desarrollada con un enfoque en persistencia de datos robusta, seguridad de inventario y trazabilidad de eventos.

## Tecnologías Utilizadas
* **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
* **Backend:** Node.js con Express.js.
* **Base de Datos:** PostgreSQL (Relacional).
* **ORM:** Prisma (Object-Relational Mapping).
* **Infraestructura:** Docker y Docker Compose para contenerización.
* **Analítica:** Google Analytics 4 (Implementación de eventos view_item, add_to_cart y purchase).

## Características Principales
* **Validación de Integridad:** El servidor valida precios y existencias directamente en la base de datos antes de procesar cualquier transacción, evitando manipulaciones desde el cliente.
* **Arquitectura Escalable:** Uso de PostgreSQL para permitir concurrencia y transacciones seguras.
* **Entorno Contenerizado:** Configuración de Docker lista para despliegue en servicios de nube como Google Cloud Run.
* **Gestión de Comentarios:** Sistema de reseñas con vinculación directa a productos y persistencia en base de datos.

## Logística y Envíos
La plataforma integra un módulo de cotización de envíos vinculado