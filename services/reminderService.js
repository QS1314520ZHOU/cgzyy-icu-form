const { ObjectId } = require('mongodb');
const ScoreReminderConfig = require('../models/ScoreReminderConfig');
const ScoreReminderAck = require('../models/ScoreReminderAck');
const { smartCareConn } = require('../config/db');

// 医生/主任职业标识
const DOCTOR_PROFESSIONS = ['Doctor', 'Director', 'Admin', 'SystemAdmin'];

/**
 * 评分提醒服务
 *
 * ★ 关键：外部只读集合（department/account/patient/score/initSystemConfig）
 * 用 smartCareConn.collection() 原生查询，避免 MissingSchemaError 和复数化问题。
 * 内部集合（score_reminder_config/score_reminder_ack）保持用 mongoose 模型。
 */
class ReminderService {
  /**
   * 获取科室列表
   * 集合名：department（单数，Spring 存的）
   */
  async getDepartments() {
    try {
      const docs = await smartCareConn.collection('department')
        .find({}, { projection: { code: 1, name: 1, shortName: 1 } })
        .toArray();

      return (docs || []).map(d => ({
        code: d.code || '',
        name: d.name || '',
        shortName: d.shortName || ''
      }));
    } catch (error) {
      console.error('[ReminderService] 获取科室列表失败:', error.message);
      return [];
    }
  }

  /**
   * 获取评分项（从 initSystemConfig.scoreConfig）
   * 集合名：initSystemConfig（驼峰，Spring 存的）
   */
  async getScoreItems(deptCode) {
    try {
      const config = await smartCareConn.collection('initSystemConfig')
        .findOne({ deptCode });

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
   * 获取提醒配置（内部集合，用 mongoose 模型）
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
   * 获取待提醒列表（按 accountId，支持多科室）
   *
   * 判定逻辑：
   * 1. 鉴权：account 有效(valid) 且 profession ∈ DOCTOR_PROFESSIONS
   * 2. deptCode = account.departmentCode（可能逗号分隔，如 "125011,123"）
   * 3. 对每个科室分别取 config + 在床患者计算，合并 pending 结果
   */
  async getPending(accountId) {
    try {
      // 1. 鉴权
      const acc = await this.getAccount(accountId);
      if (!acc) {
        console.log(`[ReminderService] 账号不存在或无效: ${accountId}`);
        return [];
      }

      // 2. 解析科室（支持逗号分隔多科室）
      const deptCodes = (acc.departmentCode || '').split(',').map(s => s.trim()).filter(Boolean);
      if (deptCodes.length === 0) {
        console.log(`[ReminderService] 账号无 departmentCode: ${accountId}`);
        return [];
      }

      // 3. 对每个科室分别计算
      const allPending = [];
      for (const deptCode of deptCodes) {
        const pending = await this.getPendingForDept(accountId, deptCode);
        allPending.push(...pending);
      }

      return allPending;
    } catch (error) {
      console.error('[ReminderService] 获取待提醒列表失败:', error.message);
      return [];
    }
  }

  /**
   * 获取单个科室的待提醒列表
   */
  async getPendingForDept(accountId, deptCode) {
    try {
      // 获取配置
      const config = await this.getConfig(deptCode);
      if (!config || !config.items || config.items.length === 0) {
        return [];
      }

      // 获取启用的规则
      const enabledItems = config.items.filter(item => item.enabled);
      if (enabledItems.length === 0) {
        return [];
      }

      // 获取科室在床患者
      const patients = await this.getPatients(deptCode);
      if (patients.length === 0) {
        return [];
      }

      const now = new Date();
      const pendingList = [];

      // 遍历患者 × 规则
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
      console.error(`[ReminderService] 获取科室 ${deptCode} 待提醒失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取账号信息
   * 集合名：account（单数，Spring 存的）
   */
  async getAccount(accountId) {
    try {
      const acc = await smartCareConn.collection('account')
        .findOne({ _id: new ObjectId(accountId) });

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
   * 集合名：patient（单数，Spring 存的）
   */
  async getPatients(deptCode) {
    try {
      const docs = await smartCareConn.collection('patient')
        .find({ deptCode, status: 'admitted' })
        .toArray();

      return (docs || []).map(d => ({
        id: d.id || (d._id ? d._id.toString() : ''),
        name: d.name || '',
        hisBed: d.hisBed || '',
        deptCode: d.deptCode || '',
        status: d.status || '',
        icuAdmissionTime: d.icuAdmissionTime || null,
        bedDoctorId: d.bedDoctorId || ''
      }));
    } catch (error) {
      console.error('[ReminderService] 获取患者失败:', error.message);
      return [];
    }
  }

  /**
   * 获取最近一次评分
   * 集合名：score（单数，Spring 存的）
   */
  async getLastScore(patientId, scoreType) {
    try {
      const docs = await smartCareConn.collection('score')
        .find({ pid: patientId, scoreType, valid: true })
        .sort({ time: -1 })
        .limit(1)
        .toArray();

      return docs.length > 0 ? docs[0] : null;
    } catch (error) {
      console.error('[ReminderService] 获取评分失败:', error.message);
      return null;
    }
  }

  /**
   * 获取 ack 记录（内部集合，用 mongoose 模型）
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
   * 时间单位转毫秒
   */
  toMs(value, unit) {
    if (unit === 'hour') return value * 3600 * 1000;
    if (unit === 'day') return value * 24 * 3600 * 1000;
    return value * 3600 * 1000; // 默认小时
  }

  /**
   * 判定是否到期（三种规则并行 OR 判定）
   *
   * A: admissionRule - 入科未评分
   * B: intervalRule - 距上次评分固定间隔
   * C: rangeRule - 分值区间间隔
   *
   * 三者相互独立，任一命中即 expired=true
   */
  checkExpired(params) {
    const { lastScore, item, icuAdmissionTime, now } = params;
    const reasons = [];

    // A: 入科未评分（仅在无评分记录时生效）
    if (item.admissionRule && item.admissionRule.enabled && !lastScore && icuAdmissionTime) {
      const admissionTime = new Date(icuAdmissionTime);
      const elapsed = now.getTime() - admissionTime.getTime();
      const threshold = this.toMs(item.admissionRule.value, item.admissionRule.unit);

      if (elapsed >= threshold) {
        const unitText = item.admissionRule.unit === 'day' ? '天' : '小时';
        reasons.push(`入科超过 ${item.admissionRule.value} ${unitText}未评分`);
      }
    }

    // B: 固定间隔（有评分记录时生效）
    if (item.intervalRule && item.intervalRule.enabled && lastScore) {
      const lastScoreTime = new Date(lastScore.time);
      const elapsed = now.getTime() - lastScoreTime.getTime();
      const threshold = this.toMs(item.intervalRule.value, item.intervalRule.unit);

      if (elapsed >= threshold) {
        const unitText = item.intervalRule.unit === 'day' ? '天' : '小时';
        reasons.push(`距上次评分超过 ${item.intervalRule.value} ${unitText}`);
      }
    }

    // C: 分值区间间隔（有评分记录且命中区间时生效）
    if (item.rangeRule && item.rangeRule.enabled && lastScore && item.rangeRule.rules) {
      for (const rule of item.rangeRule.rules) {
        if (lastScore.total >= rule.min && lastScore.total <= rule.max) {
          const lastScoreTime = new Date(lastScore.time);
          const elapsed = now.getTime() - lastScoreTime.getTime();
          const threshold = this.toMs(rule.value, rule.unit);

          if (elapsed >= threshold) {
            const unitText = rule.unit === 'day' ? '天' : '小时';
            reasons.push(`分值 ${lastScore.total} 命中区间 [${rule.min}-${rule.max}]，超过 ${rule.value} ${unitText}未复评`);
          }
          break; // 只命中第一个区间
        }
      }
    }

    // 任一命中即 expired
    if (reasons.length > 0) {
      return {
        expired: true,
        reason: reasons.join('；'),
        lastScoreTime: lastScore ? lastScore.time : null
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
