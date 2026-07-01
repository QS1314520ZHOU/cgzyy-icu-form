const moment = require('moment');
const { ObjectId } = require('mongodb');
const ScoreReminderConfig = require('../models/ScoreReminderConfig');
const ScoreReminderAck = require('../models/ScoreReminderAck');
const { smartCareConn } = require('../config/db');

// 医生/主任职业标识
const DOCTOR_PROFESSIONS = ['Doctor', 'Director', 'Admin', 'SystemAdmin'];

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
   * 获取待提醒列表（按 accountId）
   *
   * 判定逻辑：
   * 1. 鉴权：account 有效(valid) 且 profession ∈ Doctor/Director
   * 2. deptCode = account.departmentCode
   * 3. config = score_reminder_config.findOne({deptCode})
   * 4. patients = patient.find({deptCode, status:'admitted'})
   * 5. 每个 patient × 每个 enabled 配置项(scoreType) 判定
   */
  async getPending(accountId) {
    try {
      // 1. 鉴权
      const acc = await this.getAccount(accountId);
      if (!acc) {
        console.log(`[ReminderService] 账号不存在或无效: ${accountId}`);
        return [];
      }

      const deptCode = acc.departmentCode;

      // 2. 获取配置
      const config = await this.getConfig(deptCode);
      if (!config || !config.items || config.items.length === 0) {
        return [];
      }

      // 3. 获取启用的规则
      const enabledItems = config.items.filter(item => item.enabled);
      if (enabledItems.length === 0) {
        return [];
      }

      // 4. 获取科室在床患者
      const patients = await this.getPatients(deptCode);
      if (patients.length === 0) {
        return [];
      }

      const now = new Date();
      const pendingList = [];

      // 5. 遍历患者 × 规则
      for (const patient of patients) {
        for (const item of enabledItems) {
          // 获取最近一次评分
          const lastScore = await this.getLastScore(patient.id, item.scoreType);

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
          const ack = await this.getAck(accountId, patient.id, item.scoreType);
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
            patientId: patient.id,
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
   * 获取账号信息
   */
  async getAccount(accountId) {
    try {
      const Account = smartCareConn.model('Account');
      const acc = await Account.findOne({ _id: new ObjectId(accountId) }).lean();

      // 校验：存在、有效、是医生/主任
      if (!acc || acc.valid !== 'valid' || !DOCTOR_PROFESSIONS.includes(acc.profession)) {
        return null;
      }

      return acc;
    } catch (error) {
      console.error('[ReminderService] 获取账号失败:', error.message);
      return null;
    }
  }

  /**
   * 获取科室在床患者
   */
  async getPatients(deptCode) {
    try {
      const Patient = smartCareConn.model('Patient');
      return await Patient.find({ deptCode, status: 'admitted' })
        .select('id name hisBed deptCode status icuAdmissionTime bedDoctorId')
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
  async getAck(accountId, patientId, scoreType) {
    try {
      return await ScoreReminderAck.findOne({ accountId, patientId, scoreType }).lean();
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
      // icuAdmissionTime 是毫秒时间戳
      const admissionTime = new Date(icuAdmissionTime);
      const hoursSinceAdmission = (now.getTime() - admissionTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceAdmission >= item.admissionNoScoreHours) {
        return {
          expired: true,
          reason: `入科超过 ${item.admissionNoScoreHours} 小时未评分`
        };
      }

      return { expired: false };
    }

    // 有评分记录
    const lastScoreTime = new Date(lastScore.time);
    const hoursSinceLastScore = (now.getTime() - lastScoreTime.getTime()) / (1000 * 60 * 60);

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
    const ackTime = new Date(ack.ackTime);
    const minutesSinceAck = (now.getTime() - ackTime.getTime()) / (1000 * 60);

    return minutesSinceAck < ackSnoozeMinutes;
  }

  /**
   * 确认已知晓
   */
  async ack(accountId, patientId, scoreType) {
    try {
      const result = await ScoreReminderAck.findOneAndUpdate(
        { accountId, patientId, scoreType },
        { accountId, patientId, scoreType, ackTime: new Date() },
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
