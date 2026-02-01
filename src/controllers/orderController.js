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
        const body = req.body;

        // Support BOTH formats:
        // 1. Direct API calls: { customer_id, restaurant_id, items, address }
        // 2. Customer App calls: { customerName, customerPhone, dropAddress, dropLocation, items, ... }

        let customer_id, restaurant_id, items, delivery_address, total_amount;

        // Check if it's the Customer App format (has customerName/dropAddress)
        if (body.customerName || body.dropAddress) {
            // Customer App format - map to schema
            customer_id = body.customerPhone || body.customerName || 'guest-customer';
            restaurant_id = body.pickupAddress || body.items?.[0]?.vendor || 'default-restaurant';
            
            // Map items - generate item_id if not provided
            items = (body.items || []).map((item, index) => ({
                item_id: item.item_id || `item-${Date.now()}-${index}`,
                name: item.name,
                qty: item.qty || item.quantity || 1,
                price: item.price
            }));

            // Map delivery address from dropLocation
            if (body.dropLocation && body.dropLocation.coordinates) {
                delivery_address = {
                    longitude: body.dropLocation.coordinates[0],
                    latitude: body.dropLocation.coordinates[1],
                    address_text: body.dropAddress || 'Address not provided'
                };
            } else {
                delivery_address = {
                    latitude: body.latitude || 0,
                    longitude: body.longitude || 0,
                    address_text: body.dropAddress || body.address || 'Address not provided'
                };
            }

            total_amount = body.price || body.total_amount;

        } else {
            // Direct API format
            customer_id = body.customer_id;
            restaurant_id = body.restaurant_id;
            items = body.items;
            
            // Map address - support both 'address' and 'delivery_address'
            const addr = body.address || body.delivery_address || {};
            delivery_address = {
                latitude: addr.latitude,
                longitude: addr.longitude,
                address_text: addr.address_text || addr.address || 'Address not provided'
            };
            
            total_amount = body.total_amount;
        }

        // Get payment method from request (defaults to cash_on_delivery)
        const payment_method = body.paymentMethod === 'online' ? 'online' : 'cash_on_delivery';

        const order = await Order.create({
            customer_id,
            restaurant_id,
            items,
            delivery_address,
            total_amount,
            payment_method,
            status: 'pending'
        });

        res.status(201).json(order);
    } catch (error) {
        console.error('[Error]:', error.message);
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
        const { status, live_tracking_link } = req.body;

        const validStatuses = [
            'pending', 'preparing', 'ready', 'accepted',
            'pickup_completed', 'delivery_started', 'out_for_delivery', 
            'delivered', 'cancelled', 'failed'
        ];
        if (!validStatuses.includes(status)) {
            res.status(400); // Bad Request
            throw new Error(`Invalid status. Allowed: ${validStatuses.join(', ')}`);
        }

        // Build update object
        const updateData = { status };
        
        // If live_tracking_link is provided, add it to the update
        if (live_tracking_link) {
            updateData.live_tracking_link = live_tracking_link;
        }

        const order = await Order.findByIdAndUpdate(
            orderId,
            updateData,
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

        // 2. Assign Rider - only change status if order is pending
        // If order is already preparing/ready, just assign rider without resetting status
        order.rider_id = rider_id;
        if (order.status === 'pending') {
            order.status = 'accepted'; // Mark as accepted by rider (only for new orders)
        }
        await order.save();

        res.json(order);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get available orders for riders
 * @route   GET /api/orders/available
 * @access  Private (Rider)
 */
const getAvailableOrders = async (req, res, next) => {
    try {
        // Find orders that are ready for pickup but have no rider assigned
        // Exclude 'accepted' orders since they're already taken
        const orders = await Order.find({
            status: { $in: ['ready', 'preparing', 'pending'] },
            rider_id: null
        }).sort({ created_at: -1 });

        res.json(orders);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get orders for a specific customer
 * @route   GET /api/orders/user/:userId
 * @access  Private (Customer)
 */
const getOrderByUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const orders = await Order.find({ customer_id: userId }).sort({ created_at: -1 });
        res.json(orders);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a single order by ID
 * @route   GET /api/orders/:orderId
 * @access  Public
 */
const getOrderById = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order) {
            res.status(404);
            throw new Error('Order not found');
        }

        res.json(order);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all active orders (for restaurant dashboard)
 * @route   GET /api/orders/active
 * @access  Private (Restaurant)
 */
const getAllActiveOrders = async (req, res, next) => {
    try {
        // Only return orders that restaurants should see:
        // - pending: new orders waiting to be accepted
        // - preparing: orders being prepared in kitchen
        // - ready: orders ready for rider pickup
        // - accepted: riders have accepted, but restaurant needs to prepare them
        const orders = await Order.find({
            status: { $in: ['pending', 'preparing', 'ready', 'accepted'] }
        }).sort({ created_at: -1 });

        res.json(orders);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get orders assigned to a specific rider
 * @route   GET /api/orders/rider/:riderId
 * @access  Private (Rider)
 */
const getRiderOrders = async (req, res, next) => {
    try {
        const { riderId } = req.params;
        
        const orders = await Order.find({
            rider_id: riderId,
            status: { $nin: ['delivered', 'cancelled', 'failed'] }
        }).sort({ created_at: -1 });

        res.json(orders);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrder,
    getActiveOrders,
    getAllActiveOrders,
    updateOrderStatus,
    acceptOrder,
    getAvailableOrders,
    getOrderByUser,
    getOrderById,
    getRiderOrders
};

