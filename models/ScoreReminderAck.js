const mongoose = require('mongoose');
const { smartCareConn } = require('../config/db');

const ScoreReminderAckSchema = new mongoose.Schema({
  deptCode: { type: String, required: true },
  doctorId: { type: String, required: true },
  patientId: { type: String, required: true },
  scoreType: { type: String, required: true },
  ackTime: { type: Date, default: Date.now }
});

// 唯一索引：(doctorId, patientId, scoreType)
ScoreReminderAckSchema.index({ doctorId: 1, patientId: 1, scoreType: 1 }, { unique: true });

// 科室索引
ScoreReminderAckSchema.index({ deptCode: 1 });

const ScoreReminderAck = smartCareConn.model('ScoreReminderAck', ScoreReminderAckSchema, 'score_reminder_ack');

module.exports = ScoreReminderAck;
