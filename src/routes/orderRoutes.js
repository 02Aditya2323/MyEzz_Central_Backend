const express = require('express');
const router = express.Router();
const {
    createOrder,
    getActiveOrders,
    getAllActiveOrders,
    updateOrderStatus,
    acceptOrder,
    getAvailableOrders,
    getOrderByUser,
    getOrderById,
    getRiderOrders
} = require('../controllers/orderController');

// Define Routes matching the PRD

// POST /api/orders
router.post('/orders', createOrder);

// GET /api/orders/active - Get ALL active orders (must be before :orderId routes)
router.get('/orders/active', getAllActiveOrders);

// GET /api/orders/available - Get available orders for riders (must be before :orderId routes)
router.get('/orders/available', getAvailableOrders);

// GET /api/orders/rider/:riderId - Get orders assigned to a specific rider
router.get('/orders/rider/:riderId', getRiderOrders);

// GET /api/orders/user/:userId
router.get('/orders/user/:userId', getOrderByUser);

// GET /api/orders/:restaurantId/active
router.get('/orders/:restaurantId/active', getActiveOrders);

// GET /api/orders/:orderId - Get single order by ID
router.get('/orders/:orderId', getOrderById);

// PATCH /api/orders/:orderId/status
router.patch('/orders/:orderId/status', updateOrderStatus);

// POST /api/rider/accept
router.post('/rider/accept', acceptOrder);

module.exports = router;
