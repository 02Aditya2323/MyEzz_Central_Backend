const express = require('express');
const router = express.Router();
const {
    createOrder,
    getActiveOrders,
    updateOrderStatus,
    acceptOrder
} = require('../controllers/orderController');

// Define Routes matching the PRD

// POST /api/orders
router.post('/orders', createOrder);

// GET /api/orders/:restaurantId/active
router.get('/orders/:restaurantId/active', getActiveOrders);

// PATCH /api/orders/:orderId/status
router.patch('/orders/:orderId/status', updateOrderStatus);

// POST /api/rider/accept
router.post('/rider/accept', acceptOrder);

module.exports = router;
