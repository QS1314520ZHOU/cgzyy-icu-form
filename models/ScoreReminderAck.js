const mongoose = require('mongoose');
const { smartCareConn } = require('../config/db');

/**
 * 评分提醒确认模型
 * 记录医生已知晓的提醒
 */
const ScoreReminderAckSchema = new mongoose.Schema({
  accountId: { type: String, required: true },
  patientId: { type: String, required: true },
  scoreType: { type: String, required: true },
  ackTime: { type: Date, default: Date.now }
});

// 唯一索引：(accountId, patientId, scoreType)
ScoreReminderAckSchema.index({ accountId: 1, patientId: 1, scoreType: 1 }, { unique: true });

const ScoreReminderAck = smartCareConn.model('ScoreReminderAck', ScoreReminderAckSchema, 'score_reminder_ack');

module.exports = ScoreReminderAck;
