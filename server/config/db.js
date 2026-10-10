import mongoose from "mongoose";

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const localFallbackUri = "mongodb://127.0.0.1:27017/habitforge";

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Primary MongoDB connection failed (${error.message}). Attempting local fallback...`);
    try {
      const conn = await mongoose.connect(localFallbackUri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`MongoDB Connected (Local Fallback): ${conn.connection.host}`);
    } catch (fallbackError) {
      console.error(`Database connection error: ${fallbackError.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;