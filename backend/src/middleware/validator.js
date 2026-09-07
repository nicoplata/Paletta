const { AppError } = require('../utils/errorHandler');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      throw new AppError(message, 400);
    }
    next();
  };
};

module.exports = validateRequest;
