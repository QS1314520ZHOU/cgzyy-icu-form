const mongoose = require('mongoose');
const { smartCareConn } = require('../config/db');

/**
 * 评分提醒配置模型
 * 按 deptCode 唯一存储
 */
const RangeRuleSchema = new mongoose.Schema({
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  intervalDays: { type: Number, required: true }
}, { _id: false });

const ItemSchema = new mongoose.Schema({
  scoreType: { type: String, required: true },
  scoreName: { type: String, required: true },
  group: { type: String, enum: ['doctor', 'nurse'], required: true },
  enabled: { type: Boolean, default: true },
  level: { type: String, enum: ['low', 'mid', 'high'], default: 'mid' },
  admissionNoScoreHours: { type: Number, default: 24 },
  intervalDays: { type: Number, default: 7 },
  rangeRules: [RangeRuleSchema]
}, { _id: false });

const ScoreReminderConfigSchema = new mongoose.Schema({
  deptCode: { type: String, required: true, unique: true },
  ackSnoozeMinutes: { type: Number, default: 60 },
  items: [ItemSchema],
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

ScoreReminderConfigSchema.index({ deptCode: 1 }, { unique: true });

const ScoreReminderConfig = smartCareConn.model('ScoreReminderConfig', ScoreReminderConfigSchema, 'score_reminder_config');

module.exports = ScoreReminderConfig;
