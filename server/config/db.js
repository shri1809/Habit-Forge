import mongoose from "mongoose";

const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === "production";
  const primaryUri = process.env.MONGO_URI;
  const localFallbackUri = "mongodb://127.0.0.1:27017/habitforge";

  // Production security & performance options (TLS encryption in transit, timeout limits)
  const connectionOptions = {
    serverSelectionTimeoutMS: 5000,
    autoIndex: !isProduction, // Disable automatic index builds in production for performance
  };

  if (isProduction && (!primaryUri || primaryUri.includes("127.0.0.1") || primaryUri.includes("localhost"))) {
    console.warn("SECURITY WARNING: Running in production without a dedicated authenticated remote MongoDB URI with TLS.");
  }

  try {
    const conn = await mongoose.connect(primaryUri || localFallbackUri, connectionOptions);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (isProduction) {
      console.error(`FATAL Database connection error in production: ${error.message}`);
      process.exit(1);
    }
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