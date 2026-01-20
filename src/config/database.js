const mongoose = require('mongoose');

const connectDB = async () => {
  if (process.env.MOCK_MODE === 'true') {
    console.log('Mock Mode: Skipping MongoDB Connection');
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in Mongoose 6+ but keeping for clarity if using older versions
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
