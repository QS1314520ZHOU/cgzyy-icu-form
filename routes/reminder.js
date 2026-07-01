const express = require('express');
const router = express.Router();
const reminderService = require('../services/reminderService');

/**
 * 获取科室列表
 * GET /api/departments
 */
router.get('/departments', async (req, res) => {
  try {
    const departments = await reminderService.getDepartments();
    res.json({ code: 200, data: departments });
  } catch (error) {
    console.error('[reminder] 获取科室列表失败:', error.message);
    res.status(500).json({ code: 500, msg: '获取科室列表失败' });
  }
});

/**
 * 获取评分项
 * GET /api/reminder/scoreItems?deptCode=
 */
router.get('/scoreItems', async (req, res) => {
  try {
    const { deptCode } = req.query;
    if (!deptCode) {
      return res.status(400).json({ code: 400, msg: '缺少必要参数 deptCode' });
    }

    const scoreItems = await reminderService.getScoreItems(deptCode);
    res.json({ code: 200, data: scoreItems });
  } catch (error) {
    console.error('[reminder] 获取评分项失败:', error.message);
    res.status(500).json({ code: 500, msg: '获取评分项失败' });
  }
});

/**
 * 获取提醒配置
 * GET /api/reminder/config?deptCode=
 */
router.get('/config', async (req, res) => {
  try {
    const { deptCode } = req.query;

    // deptCode 缺省时返回空配置
    if (!deptCode) {
      return res.json({
        code: 200,
        data: {
          deptCode: null,
          ackSnoozeMinutes: 60,
          items: [],
          updatedBy: null,
          updatedAt: null
        }
      });
    }

    const config = await reminderService.getConfig(deptCode);
    res.json({ code: 200, data: config });
  } catch (error) {
    console.error('[reminder] 获取配置失败:', error.message);
    res.status(500).json({ code: 500, msg: '获取配置失败' });
  }
});

/**
 * 保存提醒配置
 * PUT /api/reminder/config
 */
router.put('/config', async (req, res) => {
  try {
    const { deptCode, config, updatedBy } = req.body;
    if (!deptCode || !config) {
      return res.status(400).json({ code: 400, msg: '缺少必要参数' });
    }

    const result = await reminderService.saveConfig(deptCode, config, updatedBy || 'unknown');
    if (result.success) {
      res.json({ code: 200, msg: '配置已保存', data: result.data });
    } else {
      res.status(500).json({ code: 500, msg: '保存配置失败', error: result.error });
    }
  } catch (error) {
    console.error('[reminder] 保存配置失败:', error.message);
    res.status(500).json({ code: 500, msg: '保存配置失败' });
  }
});

/**
 * 复制配置到其他科室
 * POST /api/reminder/config/copy
 */
router.post('/config/copy', async (req, res) => {
  try {
    const { sourceDeptCode, targetDeptCodes, updatedBy } = req.body;
    if (!sourceDeptCode || !targetDeptCodes || !Array.isArray(targetDeptCodes)) {
      return res.status(400).json({ code: 400, msg: '缺少必要参数' });
    }

    const result = await reminderService.copyConfig(sourceDeptCode, targetDeptCodes, updatedBy || 'unknown');
    if (result.success) {
      res.json({ code: 200, msg: '配置已复制' });
    } else {
      res.status(500).json({ code: 500, msg: '复制配置失败', error: result.error });
    }
  } catch (error) {
    console.error('[reminder] 复制配置失败:', error.message);
    res.status(500).json({ code: 500, msg: '复制配置失败' });
  }
});

/**
 * 恢复初始值
 * POST /api/reminder/config/reset
 */
router.post('/config/reset', async (req, res) => {
  try {
    const { deptCode, updatedBy } = req.body;
    if (!deptCode) {
      return res.status(400).json({ code: 400, msg: '缺少必要参数 deptCode' });
    }

    const result = await reminderService.resetConfig(deptCode, updatedBy || 'unknown');
    if (result.success) {
      res.json({ code: 200, msg: '已恢复初始值' });
    } else {
      res.status(500).json({ code: 500, msg: '恢复初始值失败', error: result.error });
    }
  } catch (error) {
    console.error('[reminder] 恢复初始值失败:', error.message);
    res.status(500).json({ code: 500, msg: '恢复初始值失败' });
  }
});

/**
 * 获取待提醒列表
 * GET /api/reminder/pending?deptCode=&doctorId=
 */
router.get('/pending', async (req, res) => {
  try {
    const { deptCode, doctorId } = req.query;
    if (!deptCode || !doctorId) {
      return res.status(400).json({ code: 400, msg: '缺少必要参数' });
    }

    const pendingList = await reminderService.getPending(deptCode, doctorId);
    res.json({ code: 200, data: pendingList });
  } catch (error) {
    console.error('[reminder] 获取待提醒列表失败:', error.message);
    res.status(500).json({ code: 500, msg: '获取待提醒列表失败' });
  }
});

/**
 * 确认已知晓
 * POST /api/reminder/ack
 */
router.post('/ack', async (req, res) => {
  try {
    const { deptCode, doctorId, patientId, scoreType } = req.body;
    if (!deptCode || !doctorId || !patientId || !scoreType) {
      return res.status(400).json({ code: 400, msg: '缺少必要参数' });
    }

    const result = await reminderService.ack(deptCode, doctorId, patientId, scoreType);
    if (result.success) {
      res.json({ code: 200, msg: '已知晓，静默期内不再提醒' });
    } else {
      res.status(500).json({ code: 500, msg: '确认已知晓失败', error: result.error });
    }
  } catch (error) {
    console.error('[reminder] 确认已知晓失败:', error.message);
    res.status(500).json({ code: 500, msg: '确认已知晓失败' });
  }
});

module.exports = router;
