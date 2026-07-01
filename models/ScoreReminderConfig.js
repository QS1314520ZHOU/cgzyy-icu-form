const mongoose = require('mongoose');
const { smartCareConn } = require('../config/db');

/**
 * 评分提醒配置模型
 * 按 deptCode 唯一存储
 */

// C 规则：分值区间间隔
const RangeRuleItemSchema = new mongoose.Schema({
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  value: { type: Number, required: true },
  unit: { type: String, enum: ['hour', 'day'], default: 'day' }
}, { _id: false });

// A 规则：入科未评分
const AdmissionRuleSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  value: { type: Number, default: 24 },
  unit: { type: String, enum: ['hour', 'day'], default: 'hour' }
}, { _id: false });

// B 规则：固定间隔
const IntervalRuleSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  value: { type: Number, default: 7 },
  unit: { type: String, enum: ['hour', 'day'], default: 'day' }
}, { _id: false });

// C 规则：分值区间间隔
const RangeRuleSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  rules: [RangeRuleItemSchema]
}, { _id: false });

// 评分项
const ItemSchema = new mongoose.Schema({
  scoreType: { type: String, required: true },
  scoreName: { type: String, required: true },
  group: { type: String, enum: ['doctor', 'nurse'], required: true },
  enabled: { type: Boolean, default: false },  // 总开关，默认关
  level: { type: String, enum: ['low', 'mid', 'high'], default: 'mid' },
  admissionRule: { type: AdmissionRuleSchema, default: () => ({}) },
  intervalRule: { type: IntervalRuleSchema, default: () => ({}) },
  rangeRule: { type: RangeRuleSchema, default: () => ({}) }
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
