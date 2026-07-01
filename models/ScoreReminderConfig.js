const mongoose = require('mongoose');
const { smartCareConn } = require('../config/db');

const RangeRuleSchema = new mongoose.Schema({
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  intervalDays: { type: Number, required: true }
}, { _id: false });

const RuleSchema = new mongoose.Schema({
  scoreType: { type: String, required: true },
  scoreName: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  level: { type: String, enum: ['low', 'mid', 'high'], default: 'mid' },
  firstReminderHours: { type: Number, default: 24 },
  intervalDays: { type: Number, default: 7 },
  rangeRules: [RangeRuleSchema]
}, { _id: false });

const ScoreSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: true },
  ackSnoozeMinutes: { type: Number, default: 60 },
  onlyBedPatients: { type: Boolean, default: true },
  patientScope: { type: String, default: 'department' },
  rules: [RuleSchema]
}, { _id: false });

const ScoreReminderConfigSchema = new mongoose.Schema({
  deptCode: { type: String, required: true, unique: true },
  score: ScoreSchema,
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

// 索引
ScoreReminderConfigSchema.index({ deptCode: 1 }, { unique: true });

const ScoreReminderConfig = smartCareConn.model('ScoreReminderConfig', ScoreReminderConfigSchema, 'score_reminder_config');

module.exports = ScoreReminderConfig;
