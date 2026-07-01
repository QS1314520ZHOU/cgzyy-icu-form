const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── 自动检测 Angular 构建产物目录 ─────────────────────────
const distDir1 = path.join(__dirname, 'angular-app', 'dist', 'icu-stats-form');
const distDir2 = path.join(distDir1, 'browser');

let staticDir = null;

if (fs.existsSync(path.join(distDir2, 'index.html'))) {
  staticDir = distDir2;
  console.log(`✅ 使用 Angular 构建目录: ${distDir2}`);
} else if (fs.existsSync(path.join(distDir1, 'index.html'))) {
  staticDir = distDir1;
  console.log(`✅ 使用 Angular 构建目录: ${distDir1}`);
} else {
  console.warn('⚠️ 未找到 Angular 构建产物，请先执行: cd angular-app && npm run build');
  console.warn('   预期路径: angular-app/dist/icu-stats-form/index.html');
}

// ── 路由 ──────────────────────────────────────────────────
const reminderRouter = require('./routes/reminder');

app.use(express.json());

// 1. 先注册所有后端接口路由
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

// 2. 用 express.static 服务 Angular 构建产物（必须在 SPA 兜底之前）
if (staticDir) {
  app.use(express.static(staticDir, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      // 确保 JS 文件返回正确的 MIME 类型
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
    }
  }));
  console.log(`✅ 静态资源服务已启用: ${staticDir}`);
}

// 3. SPA 兜底：仅对"非 /api 且未命中静态文件"的 GET 请求返回 index.html
if (staticDir) {
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
  console.log('✅ SPA fallback 已启用');
}

// ── 启动服务 ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 服务已启动: http://localhost:${PORT}`);
  console.log(`   配置页: http://localhost:${PORT}/iframe/reminder/config`);
});
