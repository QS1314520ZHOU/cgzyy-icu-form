# 医生评分提醒功能

## 概述

医生账号登录后，识别其管辖的在床患者中"该评未评 / 到期需复评"的评分项，弹框提醒。

## 功能特性

- **自动识别**：根据配置规则自动识别到期评分
- **分级提醒**：支持 high/mid/low 三级提醒
- **静默机制**：点击"已知晓"后 60 分钟内不再提醒
- **配置驱动**：规则由配置驱动，支持按科室配置
- **实时轮询**：每 15 分钟自动拉取待提醒列表

## 文件结构

```
├── models/
│   ├── ScoreReminderConfig.js    # 评分提醒配置模型
│   └── ScoreReminderAck.js       # 评分提醒确认模型
├── services/
│   └── scoreReminderService.js   # 评分提醒服务
├── routes/
│   └── scoreReminder.js          # API 路由
├── angular-app/src/app/
│   ├── services/
│   │   └── score-reminder.service.ts  # 前端服务
│   └── components/
│       └── score-reminder/           # 评分提醒组件
│           ├── score-reminder.component.ts
│           ├── score-reminder.component.html
│           └── score-reminder.component.css
└── SCORE_REMINDER.md             # 本文档
```

## 数据模型

### score_reminder_config

评分提醒配置集合，按科室存储。

```javascript
{
  deptCode: String,           // 科室编码（唯一）
  score: {
    enabled: Boolean,         // 是否启用
    ackSnoozeMinutes: Number, // 已知晓静默时间（分钟）
    onlyBedPatients: Boolean, // 是否只取在床患者
    patientScope: String,     // 患者范围
    rules: [{
      scoreType: String,      // 评分类型
      scoreName: String,      // 评分名称
      enabled: Boolean,       // 是否启用
      level: String,          // 级别：low/mid/high
      firstReminderHours: Number, // 首次提醒时间（小时）
      intervalDays: Number,   // 评分间隔（天）
      rangeRules: [{          // 分值范围规则
        min: Number,
        max: Number,
        intervalDays: Number
      }]
    }]
  },
  updatedBy: String,          // 更新人
  updatedAt: Date             // 更新时间
}
```

### score_reminder_ack

评分提醒确认集合，记录医生已知晓的提醒。

```javascript
{
  deptCode: String,    // 科室编码
  doctorId: String,    // 医生ID
  patientId: String,   // 患者ID
  scoreType: String,   // 评分类型
  ackTime: Date        // 确认时间
}
```

**唯一索引**：`(doctorId, patientId, scoreType)`

## API 接口

### GET /api/score-reminder/pending

获取待提醒列表。

**参数**：
- `deptCode`：科室编码
- `doctorId`：医生ID

**响应**：
```json
{
  "code": 200,
  "data": [{
    "patientId": "xxx",
    "patientName": "张三",
    "bedNo": "10床",
    "scoreType": "GCS",
    "scoreName": "格拉斯哥昏迷评分",
    "level": "high",
    "lastScoreTime": "2024-01-01T00:00:00Z",
    "reason": "超过7天未评分"
  }]
}
```

### POST /api/score-reminder/ack

确认已知晓。

**参数**：
- Query: `deptCode`, `doctorId`
- Body: `{ patientId, scoreType }`

**响应**：
```json
{
  "code": 200,
  "msg": "已知晓，静默期内不再提醒"
}
```

### GET /api/score-reminder/config

获取配置。

**参数**：
- `deptCode`：科室编码

**响应**：
```json
{
  "code": 200,
  "data": {
    "deptCode": "ICU",
    "score": {
      "enabled": true,
      "ackSnoozeMinutes": 60,
      "onlyBedPatients": true,
      "patientScope": "department",
      "rules": [...]
    },
    "updatedBy": "doctor1",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /api/score-reminder/config

更新配置。

**Body**：
```json
{
  "deptCode": "ICU",
  "score": {
    "enabled": true,
    "ackSnoozeMinutes": 60,
    "rules": [...]
  },
  "updatedBy": "doctor1"
}
```

**响应**：
```json
{
  "code": 200,
  "msg": "配置已更新"
}
```

## 判定逻辑

对 `医生管辖在床患者 × 每条启用规则`：

1. **取最近一次评分**
   - 查询：`score{pid: patient._id, scoreType, valid: true}` 按 time 倒序取第一条
   - 字段：`time`, `total`

2. **无评分记录**
   - 检查：距 icuAdmissionTime 是否已达 firstReminderHours
   - 到期条件：`now - icuAdmissionTime >= firstReminderHours`

3. **有评分记录**
   - 检查：按 total 命中 rangeRules 用其 intervalDays，否则用默认 intervalDays
   - 到期条件：`now - lastScoreTime >= intervalDays * 24`

4. **检查 ack 静默**
   - 查询：`ack{doctorId, patientId, scoreType}`
   - 静默条件：ack.time 晚于 lastScore.time 且 `now - ack.time < ackSnoozeMinutes`

5. **计入 pending**
   - 如果到期且未静默，计入待提醒列表

## 前端组件

### ScoreReminderComponent

评分提醒弹窗组件，按患者分组显示待提醒列表。

**特性**：
- 按患者分组显示
- 按级别着色（high 红/mid 橙/low 蓝）
- 支持"去评分"和"已知晓"操作
- 支持关闭弹窗

### ScoreReminderService

评分提醒服务，提供 API 调用和状态管理。

**特性**：
- 获取待提醒列表
- 确认已知晓
- 获取/更新配置
- 轮询机制（每 15 分钟）

## 触发机制

- **登录成功**：进入主工作区时拉取一次
- **轮询**：每 15 分钟自动拉取
- **页面可见**：visibilitychange/focus 切回前台时补拉一次

## 配置示例

```json
{
  "deptCode": "ICU",
  "score": {
    "enabled": true,
    "ackSnoozeMinutes": 60,
    "onlyBedPatients": true,
    "patientScope": "department",
    "rules": [
      {
        "scoreType": "GCS",
        "scoreName": "格拉斯哥昏迷评分",
        "enabled": true,
        "level": "high",
        "firstReminderHours": 24,
        "intervalDays": 7,
        "rangeRules": [
          { "min": 0, "max": 8, "intervalDays": 1 },
          { "min": 9, "max": 12, "intervalDays": 3 }
        ]
      },
      {
        "scoreType": "APACHE",
        "scoreName": "APACHE II 评分",
        "enabled": true,
        "level": "mid",
        "firstReminderHours": 48,
        "intervalDays": 3,
        "rangeRules": []
      }
    ]
  },
  "updatedBy": "doctor1",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## 测试点

| 测试点 | 预期结果 |
|--------|----------|
| 配置为空 | 返回空列表，不报错 |
| 无评分记录 | 检查首次提醒时间 |
| 有评分记录 | 检查间隔时间 |
| ack 静默 | 60 分钟内不提醒 |
| 级别着色 | high 红/mid 橙/low 蓝 |
| 轮询机制 | 每 15 分钟自动拉取 |
| 页面可见 | 切回前台时补拉 |

## 注意事项

1. **数据库连接**：确保 SmartCare 库连接正常
2. **权限校验**：仅 Doctor/Director 角色可访问
3. **配置安全**：配置为空或字段缺失时有安全兜底
4. **向后兼容**：不破坏现有 scoreConfig 与 initSystemConfig 结构
