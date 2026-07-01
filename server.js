const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

// 路由
const scoreReminderRouter = require('./routes/scoreReminder');

app.use(express.json());
app.use(express.static(publicDir));

// 挂载路由
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

app.listen(PORT, () => {
  console.log(`服务已启动: http://localhost:${PORT}`);
});
