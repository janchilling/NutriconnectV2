const errorHandler = (err, req, res, next) => {
  console.error('Payment Service Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      error: 'Validation Error',
      message: errors.join(', ')
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: 'Duplicate Error',
      message: `${field} already exists`
    });
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError') {
    return res.status(503).json({
      error: 'Database Connection Error',
      message: 'Unable to connect to database'
    });
  }

  // Axios/HTTP errors from external services
  if (err.response) {
    return res.status(err.response.status || 500).json({
      error: 'External Service Error',
      message: err.response.data?.message || 'External service error'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
};

module.exports = errorHandler;