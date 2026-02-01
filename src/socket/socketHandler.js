const RiderLocation = require('../models/RiderLocation');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`User Connected: ${socket.id}`);

        /**
         * @desc    Join a room to listen for updates (Customer/Restaurant)
         * @param   orderId - The ID of the order to watch
         */
        socket.on('join_room', (orderId) => {
            socket.join(`order_${orderId}`);
            console.log(`User ${socket.id} joined room: order_${orderId}`);
        });

        /**
         * @desc    Rider sends live location updates
         * @param   data - { rider_id, order_id, lat, lng, heading }
         */
        socket.on('update_location', async (data) => {
            try {
                const { rider_id, order_id, lat, lng, heading } = data;

                // 1. Update in MongoDB (Upsert = Update if exists, Insert if new)
                await RiderLocation.findOneAndUpdate(
                    { rider_id },
                    {
                        rider_id,
                        order_id,
                        location: {
                            type: 'Point',
                            coordinates: [lng, lat] // MongoDB stores [lng, lat]
                        },
                        heading,
                        timestamp: new Date()
                    },
                    { upsert: true, new: true }
                );

                // 2. Broadcast to everyone in the room (Customer/Restaurant)
                // Sending "location_changed" event
                io.to(`order_${order_id}`).emit('location_changed', {
                    lat,
                    lng,
                    heading,
                    rider_id
                });

                // console.log(`Location updated for Rider ${rider_id} on Order ${order_id}`);

            } catch (error) {
                console.error('Error updating location:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('User Disconnected', socket.id);
        });
    });
};
