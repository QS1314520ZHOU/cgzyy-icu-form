const express = require('express');
const router = express.Router();
const scoreReminderService = require('../services/scoreReminderService');

/**
 * 获取待提醒列表
 * GET /api/score-reminder/pending
 */
router.get('/pending', async (req, res) => {
  try {
    const { deptCode, doctorId } = req.query;

    if (!deptCode) {
      return res.status(400).json({
        code: 400,
        msg: '缺少必要参数 deptCode'
      });
    }

    if (!doctorId) {
      return res.status(400).json({
        code: 400,
        msg: '缺少必要参数 doctorId'
      });
    }

    const pendingList = await scoreReminderService.getPending({
      deptCode,
      doctorId
    });

    res.json({
      code: 200,
      data: pendingList
    });
  } catch (error) {
    console.error('[scoreReminder] 获取待提醒列表失败:', error.message);
    res.status(500).json({
      code: 500,
      msg: '获取待提醒列表失败',
      error: error.message
    });
  }
});

/**
 * 确认已知晓
 * POST /api/score-reminder/ack
 */
router.post('/ack', async (req, res) => {
  try {
    const { patientId, scoreType } = req.body;
    const { deptCode, doctorId } = req.query;

    if (!deptCode || !doctorId || !patientId || !scoreType) {
      return res.status(400).json({
        code: 400,
        msg: '缺少必要参数'
      });
    }

    const result = await scoreReminderService.ack({
      deptCode,
      doctorId,
      patientId,
      scoreType
    });

    if (result.success) {
      res.json({
        code: 200,
        msg: `已知晓，静默期内不再提醒`
      });
    } else {
      res.status(500).json({
        code: 500,
        msg: '确认已知晓失败',
        error: result.error
      });
    }
  } catch (error) {
    console.error('[scoreReminder] 确认已知晓失败:', error.message);
    res.status(500).json({
      code: 500,
      msg: '确认已知晓失败',
      error: error.message
    });
  }
});

/**
 * 获取配置
 * GET /api/score-reminder/config
 */
router.get('/config', async (req, res) => {
  try {
    const { deptCode } = req.query;

    if (!deptCode) {
      return res.status(400).json({
        code: 400,
        msg: '缺少必要参数 deptCode'
      });
    }

    const config = await scoreReminderService.getConfig(deptCode);

    res.json({
      code: 200,
      data: config
    });
  } catch (error) {
    console.error('[scoreReminder] 获取配置失败:', error.message);
    res.status(500).json({
      code: 500,
      msg: '获取配置失败',
      error: error.message
    });
  }
});

/**
 * 更新配置
 * PUT /api/score-reminder/config
 */
router.put('/config', async (req, res) => {
  try {
    const { deptCode, score, updatedBy } = req.body;

    if (!deptCode || !score) {
      return res.status(400).json({
        code: 400,
        msg: '缺少必要参数'
      });
    }

    const result = await scoreReminderService.updateConfig({
      deptCode,
      score,
      updatedBy
    });

    if (result.success) {
      res.json({
        code: 200,
        msg: '配置已更新',
        data: result.data
      });
    } else {
      res.status(500).json({
        code: 500,
        msg: '更新配置失败',
        error: result.error
      });
    }
  } catch (error) {
    console.error('[scoreReminder] 更新配置失败:', error.message);
    res.status(500).json({
      code: 500,
      msg: '更新配置失败',
      error: error.message
    });
  }
});

module.exports = router;
