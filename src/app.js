const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware');

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// API v1 routes (grouped under /api/v1)
app.use('/api/v1', routes);

// Health check at root
app.get('/', (req, res) => res.json({ app: 'MCA Portal', status: 'running' }));

// 404 and error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
