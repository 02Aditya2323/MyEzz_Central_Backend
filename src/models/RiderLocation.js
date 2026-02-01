const mongoose = require('mongoose');

const riderLocationSchema = new mongoose.Schema({
    rider_id: {
        type: String,
        required: true,
        unique: true // One active location per rider
    },
    order_id: {
        type: String,
        default: null
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
    heading: {
        type: Number, // 0-360 degrees
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Create 2dsphere index for geospatial queries
riderLocationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('RiderLocation', riderLocationSchema);
