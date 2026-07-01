const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const angularDistDir = path.join(__dirname, 'angular-app', 'dist', 'icu-stats-form');

// 路由
const scoreReminderRouter = require('./routes/scoreReminder');

app.use(express.json());
app.use(express.static(publicDir));

// 挂载 API 路由
app.use('/api/score-reminder', scoreReminderRouter);

app.get('/api/health', (req, res) => {
  res.json({
    code: 200,
    msg: 'ok',
    data: {
      uptime: process.uptime(),
    },
  });
});

// 原有页面路由
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'parent.html'));
});

app.get('/parent', (req, res) => {
  res.sendFile(path.join(publicDir, 'parent.html'));
});

app.get('/print', (req, res) => {
  res.sendFile(path.join(publicDir, 'print.html'));
});

app.get('/example', (req, res) => {
  res.sendFile(path.join(publicDir, 'integration-example.html'));
});

// Angular SPA fallback：非 /api、非静态文件的所有 GET 请求返回 Angular 的 index.html
app.get('*', (req, res) => {
  // 跳过 API 请求
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ code: 404, msg: 'API not found' });
  }

  // 返回 Angular 的 index.html（让前端路由处理）
  res.sendFile(path.join(angularDistDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
});
