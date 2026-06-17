const AuditLog = require('../models/AuditLog');

const log = async ({ action, entity, entityId, performedBy, outlet, details }) => {
  try {
    await AuditLog.create({ action, entity, entityId, performedBy, outlet, details });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { log };
