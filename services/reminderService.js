const moment = require('moment');
const ScoreReminderConfig = require('../models/ScoreReminderConfig');
const ScoreReminderAck = require('../models/ScoreReminderAck');
const { smartCareConn } = require('../config/db');

/**
 * 评分提醒服务
 */
class ReminderService {
  /**
   * 获取科室列表
   */
  async getDepartments() {
    try {
      const Department = smartCareConn.model('Department');
      const departments = await Department.find({}).select('code name shortName').lean();
      return departments || [];
    } catch (error) {
      console.error('[ReminderService] 获取科室列表失败:', error.message);
      return [];
    }
  }

  /**
   * 获取评分项（从 initSystemConfig.scoreConfig）
   */
  async getScoreItems(deptCode) {
    try {
      const InitSystemConfig = smartCareConn.model('InitSystemConfig');
      const config = await InitSystemConfig.findOne({ deptCode }).lean();

      if (!config || !config.scoreConfig) {
        return { doctorScoreList: [], nurseScoreList: [] };
      }

      return {
        doctorScoreList: config.scoreConfig.doctorScoreList || [],
        nurseScoreList: config.scoreConfig.nurseScoreList || []
      };
    } catch (error) {
      console.error('[ReminderService] 获取评分项失败:', error.message);
      return { doctorScoreList: [], nurseScoreList: [] };
    }
  }

  /**
   * 获取提醒配置
   */
  async getConfig(deptCode) {
    try {
      let config = await ScoreReminderConfig.findOne({ deptCode }).lean();

      if (!config) {
        // 返回默认配置
        config = {
          deptCode,
          ackSnoozeMinutes: 60,
          items: [],
          updatedBy: null,
          updatedAt: null
        };
      }

      return config;
    } catch (error) {
      console.error('[ReminderService] 获取配置失败:', error.message);
      return null;
    }
  }

  /**
   * 保存提醒配置
   */
  async saveConfig(deptCode, config, updatedBy) {
    try {
      const result = await ScoreReminderConfig.findOneAndUpdate(
        { deptCode },
        {
          deptCode,
          ackSnoozeMinutes: config.ackSnoozeMinutes || 60,
          items: config.items || [],
          updatedBy,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('[ReminderService] 保存配置失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 复制配置到其他科室
   */
  async copyConfig(sourceDeptCode, targetDeptCodes, updatedBy) {
    try {
      const sourceConfig = await ScoreReminderConfig.findOne({ deptCode: sourceDeptCode }).lean();
      if (!sourceConfig) {
        return { success: false, error: '源科室配置不存在' };
      }

      const results = [];
      for (const targetDeptCode of targetDeptCodes) {
        const result = await ScoreReminderConfig.findOneAndUpdate(
          { deptCode: targetDeptCode },
          {
            deptCode: targetDeptCode,
            ackSnoozeMinutes: sourceConfig.ackSnoozeMinutes,
            items: sourceConfig.items,
            updatedBy,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );
        results.push(result);
      }

      return { success: true, data: results };
    } catch (error) {
      console.error('[ReminderService] 复制配置失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 恢复初始值
   */
  async resetConfig(deptCode, updatedBy) {
    try {
      await ScoreReminderConfig.findOneAndDelete({ deptCode });
      return { success: true };
    } catch (error) {
      console.error('[ReminderService] 恢复初始值失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取待提醒列表
   */
  async getPending(deptCode, doctorId) {
    try {
      // 1. 获取配置
      const config = await this.getConfig(deptCode);
      if (!config || !config.items || config.items.length === 0) {
        return [];
      }

      // 2. 获取启用的规则
      const enabledItems = config.items.filter(item => item.enabled);
      if (enabledItems.length === 0) {
        return [];
      }

      // 3. 获取医生管辖的在床患者
      const patients = await this.getPatients(deptCode, doctorId);
      if (patients.length === 0) {
        return [];
      }

      const now = new Date();
      const pendingList = [];

      // 4. 遍历患者 × 规则
      for (const patient of patients) {
        for (const item of enabledItems) {
          // 获取最近一次评分
          const lastScore = await this.getLastScore(patient._id.toString(), item.scoreType);

          // 判定是否到期
          const expiredResult = this.checkExpired({
            lastScore,
            item,
            icuAdmissionTime: patient.icuAdmissionTime,
            now
          });

          if (!expiredResult.expired) {
            continue;
          }

          // 检查是否被 ack 静默
          const ack = await this.getAck(doctorId, patient._id.toString(), item.scoreType);
          const isSilent = this.checkAckSilent({
            ack,
            lastScore,
            ackSnoozeMinutes: config.ackSnoozeMinutes || 60,
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
            scoreType: item.scoreType,
            scoreName: item.scoreName,
            level: item.level,
            lastScoreTime: lastScore ? lastScore.time : null,
            reason: expiredResult.reason
          });
        }
      }

      return pendingList;
    } catch (error) {
      console.error('[ReminderService] 获取待提醒列表失败:', error.message);
      return [];
    }
  }

  /**
   * 获取医生管辖的在床患者
   */
  async getPatients(deptCode, doctorId) {
    try {
      const Patient = smartCareConn.model('Patient');
      const query = {
        deptCode,
        status: 'admitted',
        valid: true
      };

      if (doctorId) {
        query.bedDoctorId = doctorId;
      }

      return await Patient.find(query)
        .select('_id name hisBed deptCode status icuAdmissionTime bedDoctorId')
        .lean();
    } catch (error) {
      console.error('[ReminderService] 获取患者失败:', error.message);
      return [];
    }
  }

  /**
   * 获取最近一次评分
   */
  async getLastScore(patientId, scoreType) {
    try {
      const Score = smartCareConn.model('Score');
      return await Score.findOne({
        pid: patientId,
        scoreType,
        valid: true
      })
        .sort({ time: -1 })
        .select('time total')
        .lean();
    } catch (error) {
      console.error('[ReminderService] 获取评分失败:', error.message);
      return null;
    }
  }

  /**
   * 获取 ack 记录
   */
  async getAck(doctorId, patientId, scoreType) {
    try {
      return await ScoreReminderAck.findOne({ doctorId, patientId, scoreType }).lean();
    } catch (error) {
      console.error('[ReminderService] 获取 ack 失败:', error.message);
      return null;
    }
  }

  /**
   * 判定是否到期
   */
  checkExpired(params) {
    const { lastScore, item, icuAdmissionTime, now } = params;

    // 无评分记录
    if (!lastScore) {
      const admissionTime = moment(icuAdmissionTime);
      const hoursSinceAdmission = moment(now).diff(admissionTime, 'hours');

      if (hoursSinceAdmission >= item.admissionNoScoreHours) {
        return {
          expired: true,
          reason: `入科超过 ${item.admissionNoScoreHours} 小时未评分`
        };
      }

      return { expired: false };
    }

    // 有评分记录
    const lastScoreTime = moment(lastScore.time);
    const hoursSinceLastScore = moment(now).diff(lastScoreTime, 'hours');

    // 检查是否命中 rangeRules
    let intervalDays = item.intervalDays;
    if (item.rangeRules && item.rangeRules.length > 0) {
      for (const rangeRule of item.rangeRules) {
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
   * 确认已知晓
   */
  async ack(deptCode, doctorId, patientId, scoreType) {
    try {
      const result = await ScoreReminderAck.findOneAndUpdate(
        { doctorId, patientId, scoreType },
        { deptCode, doctorId, patientId, scoreType, ackTime: new Date() },
        { upsert: true, new: true }
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('[ReminderService] 确认已知晓失败:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ReminderService();
