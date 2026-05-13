/**
 * CatJoyas-Core: Motor de comunicación con el Microservicio de Datos.
 * Diseñado para alta trazabilidad y consistencia transaccional.
 */
export class CatJoyasAPI {
    static #BASE_URL = window.location.origin + '/api';

    /**
     * Motor base de peticiones con interceptor de errores global.
     */
    static async #fetchJSON(endpoint, options = {}) {
        const url = `${this.#BASE_URL}${endpoint}`;
        const defaultOptions = {
            headers: { 'Content-Type': 'application/json' },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            const data = await response.json();

            if (!response.ok) {
                // Registro estructurado para auditoría técnica
                console.error(`[SYSTEM_ERROR] en ${endpoint}:`, {
                    status: response.status,
                    message: data.message || 'Error no documentado'
                });
                throw new Error(data.message || 'Error en la respuesta del servidor');
            }

            // Si el backend envía { status: 'success', data: [...] }, devolvemos solo la data.
            // Si envía un array directo, devolvemos el array.
            return data.data || data;
            
        } catch (error) {
            console.error(`[NETWORK_FAILURE] Fallo de conexión en ${endpoint}:`, error.message);
            throw error;
        }
    }

    // ==========================================
    // SECCIÓN DE CATÁLOGO (CLIENTE)
    // ==========================================

    static async getProducts() {
        return this.#fetchJSON('/products');
    }

    static async getProductById(id) {
        // Importante: Asegura que el ID no sea null antes de disparar
        if (!id) throw new Error("ID de producto no proporcionado.");
        return this.#fetchJSON(`/products/${id}`);
    }

    static async submitOrder(orderData) {
        return this.#fetchJSON('/checkout/simulate', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }

    // ==========================================
    // SECCIÓN DE PAGOS (WEBPAY PLUS)
    // ==========================================

    static async initPayment(payload) {
        return this.#fetchJSON('/pay/initiate', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    // ==========================================
    // SECCIÓN DE FEEDBACK (RESEÑAS)
    // ==========================================

    static async getReviews(productId) {
        return this.#fetchJSON(`/reviews/${productId}`);
    }

    static async postReview(reviewData) {
        return this.#fetchJSON('/reviews', {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
    }

    // ==========================================
    // SECCIÓN DE ADMINISTRACIÓN (TALLER)
    // ==========================================

    static async getInventory() {
        return this.#fetchJSON('/admin/inventory');
    }

    static async updateStock(productId, newStock) {
        return this.#fetchJSON(`/admin/inventory/${productId}`, {
            method: 'PATCH',
            body: JSON.stringify({ newStock })
        });
    }

    static async getQRCode(sku) {
        return this.#fetchJSON(`/qr/${sku}`);
    }

    static async quoteShipping(commune) {
        return this.#fetchJSON('/shipping/quote', {
            method: 'POST',
            body: JSON.stringify({ commune })
        });
    }
}