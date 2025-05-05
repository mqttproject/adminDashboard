const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use URI defined as an environment variable (so found within .env) or just fallback to localhost
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/iot-dashboard';
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
    
    const conn = await mongoose.connect(mongoURI, options);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;