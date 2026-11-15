import mongoose from 'mongoose';

let connected = false;

export function isDatabaseConnected(): boolean {
  return connected && mongoose.connection.readyState === 1;
}

export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<username>') || uri.includes('<cluster>')) {
    console.warn('[DB] MONGODB_URI is not configured. Running API in offline-tolerant mode.');
    connected = false;
    return false;
  }

  try {
    mongoose.connection.on('connected', () => {
      connected = true;
      console.log('[DB] Connected to MongoDB.');
    });
    mongoose.connection.on('disconnected', () => {
      connected = false;
      console.warn('[DB] Disconnected from MongoDB.');
    });
    mongoose.connection.on('error', (err) => {
      connected = false;
      console.error('[DB] MongoDB error:', err.message);
    });

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    connected = true;
    return true;
  } catch (err) {
    connected = false;
    console.warn('[DB] Could not connect to MongoDB:', (err as Error).message);
    return false;
  }
}
