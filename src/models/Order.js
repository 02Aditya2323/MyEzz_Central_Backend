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

    // Status Flow
    status: {
        type: String,
        enum: ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
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
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // Auto-manage timestamps
});

// Indexing for faster lookups
orderSchema.index({ restaurant_id: 1, status: 1 });
orderSchema.index({ rider_id: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
