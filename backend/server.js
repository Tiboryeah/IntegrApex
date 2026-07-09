const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');
const { uploadsDir } = require('./src/middleware/upload');
const { startScheduler } = require('./src/jobs/alertasScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: true,
  credentials: true
}));

// Serve static files from frontend/public
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));
app.use('/uploads', express.static(uploadsDir));

app.use('/api', routes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`IntegrApex Server running on port ${PORT}`);
  startScheduler();
});
