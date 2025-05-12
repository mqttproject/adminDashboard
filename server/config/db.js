const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use environment variable or fallback to localhost
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/iot-dashboard';
    
    const options = {
      // These options are deprecated but keeping for compatibility
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    
    // Only create connection if none exists
    if (mongoose.connection.readyState === 0) {
      const conn = await mongoose.connect(mongoURI, options);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } else {
      console.log('MongoDB already connected');
      return mongoose.connection;
    }
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;