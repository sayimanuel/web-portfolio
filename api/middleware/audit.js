const AuditLog = require('../models/AuditLog');

module.exports = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    AuditLog.create({ method: req.method, path: req.path, ip }).catch(() => {});
  }
  next();
};
