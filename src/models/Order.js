const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    // Foreign Keys from Supabase (referenced as Strings)
    customer_id: { type: String, required: true },
    restaurant_id: { type: String, required: true },
    rider_id: { type: String, default: null },

    // Order Details
    items: [
        {
            item_id: { type: String, required: true },
            name: { type: String, required: true },
            qty: { type: Number, required: true, default: 1 },
            price: { type: Number, required: true }, // Store price at time of order
        }
    ],

    // Status Flow - supports Restaurant and Rider status updates
    status: {
        type: String,
        enum: [
            'pending',           // Order placed, waiting for restaurant
            'preparing',         // Restaurant preparing
            'ready',             // Ready for pickup
            'accepted',          // Rider accepted the order (assigned)
            'pickup_completed',  // Rider picked up the order
            'delivery_started',  // Rider on the way to customer
            'out_for_delivery',  // Alias for delivery_started (legacy)
            'delivered',         // Order delivered
            'cancelled',         // Order cancelled
            'failed'             // Delivery failed
        ],
        default: 'pending'
    },

    // Address (Snapshot)
    delivery_address: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        address_text: { type: String, required: true },
    },

    // Metadata
    total_amount: { type: Number }, // Validation logic handles this
    
    // Payment method (cash_on_delivery or online)
    payment_method: { 
        type: String, 
        enum: ['cash_on_delivery', 'online'], 
        default: 'cash_on_delivery' 
    },
    
    // Google Maps Live Location Sharing Link (provided by Rider)
    live_tracking_link: { type: String, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // Auto-manage timestamps
});

// Indexing for faster lookups
orderSchema.index({ restaurant_id: 1, status: 1 });
orderSchema.index({ rider_id: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
