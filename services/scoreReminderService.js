const moment = require('moment');
const ScoreReminderConfig = require('../models/ScoreReminderConfig');
const ScoreReminderAck = require('../models/ScoreReminderAck');
const { smartCareConn } = require('../config/db');

/**
 * 评分提醒服务
 */
class ScoreReminderService {
  /**
   * 获取医生管辖的在床患者
   * @param {string} deptCode - 科室编码
   * @param {string} doctorId - 医生ID（可选，用于主管医生维度）
   * @param {boolean} onlyBedPatients - 是否只取在床患者
   * @returns {Promise<Array>} 患者列表
   */
  async getPatients(deptCode, doctorId = null, onlyBedPatients = true) {
    try {
      // 从 SmartCare 库获取患者数据
      // 注意：这里假设 patient 集合在 SmartCare 库中
      const Patient = smartCareConn.model('Patient');

      const query = {
        deptCode: deptCode,
        valid: true
      };

      if (onlyBedPatients) {
        query.status = 'admitted';
      }

      // 如果指定了主管医生，添加过滤条件
      if (doctorId) {
        query.bedDoctorId = doctorId;
      }

      const patients = await Patient.find(query)
        .select('_id name hisBed deptCode status icuAdmissionTime bedDoctorId')
        .lean();

      return patients;
    } catch (error) {
      console.error('[ScoreReminderService] 获取患者失败:', error.message);
      return [];
    }
  }

  /**
   * 获取评分配置
   * @param {string} deptCode - 科室编码
   * @returns {Promise<Object>} 配置对象
   */
  async getConfig(deptCode) {
    try {
      let config = await ScoreReminderConfig.findOne({ deptCode }).lean();

      // 如果没有配置，返回默认配置
      if (!config) {
        config = {
          deptCode,
          score: {
            enabled: true,
            ackSnoozeMinutes: 60,
            onlyBedPatients: true,
            patientScope: 'department',
            rules: []
          },
          updatedBy: 'system',
          updatedAt: new Date()
        };
      }

      return config;
    } catch (error) {
      console.error('[ScoreReminderService] 获取配置失败:', error.message);
      return null;
    }
  }

  /**
   * 获取最近一次评分
   * @param {string} patientId - 患者ID
   * @param {string} scoreType - 评分类型
   * @returns {Promise<Object|null>} 最近一次评分
   */
  async getLastScore(patientId, scoreType) {
    try {
      // 从 SmartCare 库获取评分数据
      const Score = smartCareConn.model('Score');

      const score = await Score.findOne({
        pid: patientId,
        scoreType: scoreType,
        valid: true
      })
        .sort({ time: -1 })
        .select('time total')
        .lean();

      return score;
    } catch (error) {
      console.error('[ScoreReminderService] 获取评分失败:', error.message);
      return null;
    }
  }

  /**
   * 获取 ack 记录
   * @param {string} doctorId - 医生ID
   * @param {string} patientId - 患者ID
   * @param {string} scoreType - 评分类型
   * @returns {Promise<Object|null>} ack 记录
   */
  async getAck(doctorId, patientId, scoreType) {
    try {
      const ack = await ScoreReminderAck.findOne({
        doctorId,
        patientId,
        scoreType
      }).lean();

      return ack;
    } catch (error) {
      console.error('[ScoreReminderService] 获取 ack 失败:', error.message);
      return null;
    }
  }

  /**
   * 判定是否到期
   * @param {Object} params - 参数对象
   * @returns {Object} 判定结果
   */
  checkExpired(params) {
    const {
      lastScore,
      rule,
      icuAdmissionTime,
      now
    } = params;

    // 无评分记录
    if (!lastScore) {
      // 检查是否达到首次提醒时间
      const admissionTime = moment(icuAdmissionTime);
      const hoursSinceAdmission = moment(now).diff(admissionTime, 'hours');

      if (hoursSinceAdmission >= rule.firstReminderHours) {
        return {
          expired: true,
          reason: `入科超过 ${rule.firstReminderHours} 小时未评分`
        };
      }

      return { expired: false };
    }

    // 有评分记录
    const lastScoreTime = moment(lastScore.time);
    const hoursSinceLastScore = moment(now).diff(lastScoreTime, 'hours');

    // 检查是否命中 rangeRules
    let intervalDays = rule.intervalDays;
    if (rule.rangeRules && rule.rangeRules.length > 0) {
      for (const rangeRule of rule.rangeRules) {
        if (lastScore.total >= rangeRule.min && lastScore.total <= rangeRule.max) {
          intervalDays = rangeRule.intervalDays;
          break;
        }
      }
    }

    const intervalHours = intervalDays * 24;

    if (hoursSinceLastScore >= intervalHours) {
      return {
        expired: true,
        reason: `超过 ${intervalDays} 天未评分`,
        lastScoreTime: lastScore.time
      };
    }

    return { expired: false };
  }

  /**
   * 检查是否被 ack 静默
   * @param {Object} params - 参数对象
   * @returns {boolean} 是否静默
   */
  checkAckSilent(params) {
    const { ack, lastScore, ackSnoozeMinutes, now } = params;

    if (!ack) {
      return false;
    }

    // 如果有评分记录，ack 时间必须晚于评分时间
    if (lastScore && ack.ackTime <= lastScore.time) {
      return false;
    }

    // 检查是否在静默期内
    const ackTime = moment(ack.ackTime);
    const minutesSinceAck = moment(now).diff(ackTime, 'minutes');

    return minutesSinceAck < ackSnoozeMinutes;
  }

  /**
   * 获取待提醒列表
   * @param {Object} params - 参数对象
   * @returns {Promise<Array>} 待提醒列表
   */
  async getPending(params) {
    const { deptCode, doctorId } = params;

    try {
      // 1. 获取配置
      const config = await this.getConfig(deptCode);
      if (!config || !config.score || !config.score.enabled) {
        return [];
      }

      // 2. 获取启用的规则
      const enabledRules = config.score.rules.filter(r => r.enabled);
      if (enabledRules.length === 0) {
        return [];
      }

      // 3. 获取医生管辖的在床患者
      const patients = await this.getPatients(
        deptCode,
        doctorId,
        config.score.onlyBedPatients
      );

      if (patients.length === 0) {
        return [];
      }

      const now = new Date();
      const pendingList = [];

      // 4. 遍历患者 × 规则
      for (const patient of patients) {
        for (const rule of enabledRules) {
          // 获取最近一次评分
          const lastScore = await this.getLastScore(
            patient._id.toString(),
            rule.scoreType
          );

          // 判定是否到期
          const expiredResult = this.checkExpired({
            lastScore,
            rule,
            icuAdmissionTime: patient.icuAdmissionTime,
            now
          });

          if (!expiredResult.expired) {
            continue;
          }

          // 检查是否被 ack 静默
          const ack = await this.getAck(
            doctorId,
            patient._id.toString(),
            rule.scoreType
          );

          const isSilent = this.checkAckSilent({
            ack,
            lastScore,
            ackSnoozeMinutes: config.score.ackSnoozeMinutes,
            now
          });

          if (isSilent) {
            continue;
          }

          // 计入 pending
          pendingList.push({
            patientId: patient._id.toString(),
            patientName: patient.name,
            bedNo: patient.hisBed,
            scoreType: rule.scoreType,
            scoreName: rule.scoreName,
            level: rule.level,
            lastScoreTime: lastScore ? lastScore.time : null,
            reason: expiredResult.reason
          });
        }
      }

      return pendingList;
    } catch (error) {
      console.error('[ScoreReminderService] 获取待提醒列表失败:', error.message);
      return [];
    }
  }

  /**
   * 确认已知晓
   * @param {Object} params - 参数对象
   * @returns {Promise<Object>} 操作结果
   */
  async ack(params) {
    const { deptCode, doctorId, patientId, scoreType } = params;

    try {
      const result = await ScoreReminderAck.findOneAndUpdate(
        { doctorId, patientId, scoreType },
        {
          deptCode,
          doctorId,
          patientId,
          scoreType,
          ackTime: new Date()
        },
        { upsert: true, new: true }
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('[ScoreReminderService] 确认已知晓失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新配置
   * @param {Object} params - 参数对象
   * @returns {Promise<Object>} 操作结果
   */
  async updateConfig(params) {
    const { deptCode, score, updatedBy } = params;

    try {
      const result = await ScoreReminderConfig.findOneAndUpdate(
        { deptCode },
        {
          deptCode,
          score,
          updatedBy,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('[ScoreReminderService] 更新配置失败:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ScoreReminderService();
