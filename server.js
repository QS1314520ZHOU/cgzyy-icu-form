const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const angularDistDir = path.join(__dirname, 'angular-app', 'dist', 'icu-stats-form');

// 路由
const reminderRouter = require('./routes/reminder');

app.use(express.json());

// 挂载 API 路由
app.use('/api', reminderRouter);

app.get('/api/health', (req, res) => {
  res.json({
    code: 200,
    msg: 'ok',
    data: {
      uptime: process.uptime(),
    },
  });
});

// Angular SPA fallback：非 /api 的 GET 请求返回 Angular 的 index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ code: 404, msg: 'API not found' });
  }
  res.sendFile(path.join(angularDistDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
});
