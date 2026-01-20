const Order = require('../models/Order');

/**
 * @desc    Create a new order
 * @route   POST /api/orders
 * @access  Public (Protected by Supabase Auth Gateway in prod)
 */
const createOrder = async (req, res, next) => {
    // MOCK MODE FOR TESTING
    if (process.env.MOCK_MODE === 'true') {
        return res.status(201).json({
            _id: 'mock_order_id_123',
            status: 'pending',
            ...req.body,
            createdAt: new Date()
        });
    }

    try {
        const { customer_id, restaurant_id, items, address } = req.body;

        // TODO: Add refined validation (e.g. check if items exist in Menu DB)

        const order = await Order.create({
            customer_id,
            restaurant_id,
            items,
            delivery_address: address, // Expecting { latitude, longitude, address_text }
            status: 'pending'
        });

        res.status(201).json(order);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get active orders for a restaurant
 * @route   GET /api/orders/:restaurantId/active
 * @access  Private (Restaurant)
 */
const getActiveOrders = async (req, res, next) => {
    try {
        const { restaurantId } = req.params;

        const orders = await Order.find({
            restaurant_id: restaurantId,
            status: { $ne: 'delivered' } // $ne means Not Equal
        }).sort({ created_at: -1 }); // Newest first

        res.json(orders);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update order status
 * @route   PATCH /api/orders/:orderId/status
 * @access  Private
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            res.status(400); // Bad Request
            throw new Error(`Invalid status. Allowed: ${validStatuses.join(', ')}`);
        }

        const order = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true } // Return the updated document
        );

        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        // TODO: Emit Socket Event here (e.g., to notify Customer)

        res.json(order);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Rider accepts an order
 * @route   POST /api/rider/accept
 * @access  Private (Rider)
 */
const acceptOrder = async (req, res, next) => {
    try {
        const { rider_id, order_id } = req.body;

        // 1. Check if order is available (e.g., status is 'ready')
        const order = await Order.findById(order_id);

        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        if (order.rider_id) {
            res.status(409); // Conflict
            throw new Error('Order already assigned to another rider');
        }

        // 2. Assign Rider
        order.rider_id = rider_id;
        // Optionally change status here, or wait for rider to pick up
        // order.status = 'on_the_way_to_restaurant'; 
        await order.save();

        res.json(order);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrder,
    getActiveOrders,
    updateOrderStatus,
    acceptOrder
};
