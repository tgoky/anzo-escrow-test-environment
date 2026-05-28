import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { apiRouter } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import plaidRoutes from "./routes/plaid";
import { createServer } from "http";
import { signAttestation } from './routes/sign';
import { binanceP2PCallback } from './routes/binance';

const app = express();

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post('/api/sign', signAttestation);
app.get('/api/binance/callback', binanceP2PCallback);


// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Add detailed request logging
  console.log(`🔄 ${req.method} request to ${path}`);
  if (req.method !== 'GET') {
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });

  next();
});

(async () => {
  // API routes setup
  console.log('🚀 Setting up API routes...');

  // Configure API middleware
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    console.log(`⚡ API Request: ${req.method} ${req.path}`);
    next();
  });

  // Mount API routes
  app.use('/api', apiRouter);
  app.use('/api/plaid', plaidRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // API 404 handler
  app.use('/api/*', (req, res) => {
    console.log(`❌ API 404: ${req.method} ${req.path}`);
    res.status(404).json({ 
      message: "API endpoint not found" 
    });
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('❌ Error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error: ${message}`);
    res.status(status).json({ message });
  });

  // Create HTTP server instance
  const PORT = process.env.PORT || 3000;
  const server = createServer(app);

  // Setup static file serving or Vite development server
  if (app.get("env") === "development") {
    console.log('🛠️ Setting up Vite development server...');
    await setupVite(app, server);
  } else {
    console.log('📦 Setting up static file serving...');
    serveStatic(app);
  }

  server.listen(PORT, () => {
    log(`Server running at http://0.0.0.0:${PORT}`);

    // Log available API endpoints
    console.log('📝 API endpoints:');
    console.log('- GET  /api/health');
    console.log('- GET  /api/transactions/:walletAddress');
    console.log('- POST /api/transactions');
    console.log('- PATCH /api/transactions/:id');
    console.log('- DELETE /api/transactions/:id');
    console.log('- GET  /api/maker/offers/:walletAddress');
    console.log('- POST /api/maker/offers');
    console.log('- GET  /api/offers/:id');
    console.log('- POST /api/maker/offers/:id/cancel');
    
    // Log manual account endpoints
    console.log('📊 Manual Financial Account Endpoints:');
    console.log('- POST /api/manual-accounts');
    console.log('- GET  /api/manual-accounts/:walletAddress');
    console.log('- GET  /api/manual-accounts/account/:accountId');
    console.log('- PATCH /api/manual-accounts/:accountId/payment-methods');
    console.log('- DELETE /api/manual-accounts/:accountId');
    console.log('- GET  /api/payment-method-options');
  });
})();