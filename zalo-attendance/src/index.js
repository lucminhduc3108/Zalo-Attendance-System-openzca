import express from 'express';
import mongoose from 'mongoose';
import config from './config/index.js';
import { webhookRouter } from './routes/webhook.js';
import { startListener, stopListener } from './utils/openzcaRunner.js';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'Zalo Attendance System running' });
});

app.use('/hook', webhookRouter);

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n[SERVER] Received ${signal} — shutting down gracefully...`);
  stopListener();
  mongoose.connection.close().then(() => {
    console.log('[SERVER] MongoDB disconnected. Bye!');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Connect to MongoDB then start server + listener
async function start() {
  try {
    console.log('[SERVER] Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('[SERVER] MongoDB connected ✅');

    // Start Express server
    const server = app.listen(config.port, () => {
      console.log(`[SERVER] Listening on port ${config.port} 🚀`);

      // Start openzca listener after server is ready
      startListener();
    });

    // Handle server-level errors
    server.on('error', (err) => {
      console.error('[SERVER] Express error:', err.message);
      process.exit(1);
    });
  } catch (err) {
    console.error('[SERVER] MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

start();
