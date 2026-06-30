# ICU 数据展示 - Angular 版本

这是 cgzyy-icu-form 项目的 Angular 16 重构版本。

## 项目结构

```
angular-app/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── patient-info/          # 患者关键信息组件
│   │   │   ├── account-info/          # 账号信息组件
│   │   │   ├── log-panel/             # 通信日志组件
│   │   │   └── data-output/           # 数据输出组件
│   │   ├── models/
│   │   │   └── smartcare.model.ts     # 数据模型
│   │   ├── services/
│   │   │   ├── message.service.ts     # postMessage 通信服务
│   │   │   ├── storage.service.ts     # 本地存储服务
│   │   │   └── log.service.ts         # 日志服务
│   │   ├── app.component.ts           # 主组件
│   │   ├── app.component.html         # 主组件模板
│   │   ├── app.component.css          # 主组件样式
│   │   └── app.module.ts              # 根模块
│   ├── assets/
│   │   └── css/
│   │       └── print.css              # 全局样式
│   ├── index.html                     # 入口 HTML
│   └── main.ts                        # 入口文件
├── angular.json                       # Angular 配置
├── package.json                       # 依赖配置
├── tsconfig.json                      # TypeScript 配置
└── tsconfig.app.json                  # 应用 TypeScript 配置
```

## 开发环境

### 前置条件

- Node.js 16+
- npm 8+

### 安装依赖

```bash
cd angular-app
npm install
```

### 启动开发服务器

```bash
npm start
# 或
ng serve
```

访问 http://localhost:4200

### 构建生产版本

```bash
npm run build
# 或
ng build --configuration production
```

构建产物在 `dist/icu-stats-form/` 目录。

## 核心特性

### 1. 无条件消费模式

- 监听 `window.addEventListener('message', ...)` 常驻
- 凡 `data.type==='SmartCare'` 且 `data.patient` 存在 → 立即重渲
- 患者唯一键变化强制刷新，绕过去重

### 2. 缓存只作占位

- `sessionStorage` 仅首屏占位
- 收到任何新 SmartCare 消息立即覆盖

### 3. 两层 iframe 转发

- parent 收到消息 → 无条件 `PRINT_DATA` 转发给内层 print
- print 端同样无条件按唯一键重渲

### 4. 多触发点补偿请求

- `init` / `visibilitychange` / `focus` / `pageshow` 时都向宿主请求数据

### 5. "无病人"消息处理

- `data.type==='SmartCare'` 但无 `patient` → 显示"请选中病人"

## 与 SmartCare 对接

### origin 白名单

在 `message.service.ts` 中配置：

```typescript
private readonly ORIGIN_WHITELIST = [
  location.origin,
  'http://10.35.4.10:60000'  // SmartCare 生产环境
];
```

### 消息格式

SmartCare 发送的消息格式：

```javascript
{
  type: 'SmartCare',
  account: { id, username, trueName, ... },
  patient: { id, mrn, hisPid, name, ... },
  token: '...'
}
```

## 部署

### 方案 1：独立部署

```bash
ng build --configuration production
# 将 dist/icu-stats-form/ 部署到 Web 服务器
```

### 方案 2：反向代理（推荐）

配置 Nginx 反向代理，使 Angular 应用与 SmartCare 同源：

```nginx
server {
    listen 80;
    server_name 10.35.4.10;

    # SmartCare 后端
    location /api/ {
        proxy_pass http://10.35.4.10:60000;
    }

    # Angular 应用
    location /cgzyy/ {
        alias /path/to/angular-app/dist/icu-stats-form/;
        try_files $uri $uri/ /cgzyy/index.html;
    }
}
```

## 从原生 JS 迁移

### 主要改动

1. **组件化**：将 HTML 拆分为独立组件
2. **服务化**：通信、存储、日志逻辑抽为服务
3. **响应式**：使用 RxJS BehaviorSubject 管理状态
4. **类型安全**：TypeScript 类型定义
5. **依赖注入**：Angular DI 系统

### 保持兼容

- postMessage 协议完全兼容
- 消息格式不变
- 缓存机制不变
- 日志格式不变

## 开发指南

### 添加新字段

1. 在 `smartcare.model.ts` 中添加字段定义
2. 在 `patient-info.component.ts` 的 `KEY_FIELDS` 中添加配置
3. 在 `data-output.component.ts` 的 `formatValue` 中处理格式化

### 修改 origin 白名单

在 `message.service.ts` 的 `ORIGIN_WHITELIST` 数组中添加。

### 修改日志格式

在 `log.service.ts` 的 `add` 方法中修改。

## 故障排查

### 1. 收不到消息

1. 检查 origin 白名单是否包含 SmartCare 的 origin
2. 检查浏览器控制台是否有 SecurityError
3. 检查是否同源（反向代理配置）

### 2. 切换患者不更新

1. 检查 SmartCare 是否在切换时发送 postMessage
2. 检查控制台 `[probe]` 输出
3. 检查 `patient.id` 是否变化

### 3. 缓存问题

1. 清除 sessionStorage
2. 检查 `isPlaceholder` 状态
3. 检查日志中的 `[缓存]` 记录

## 测试

### 单元测试

```bash
npm test
# 或
ng test
```

### E2E 测试

```bash
npm run e2e
# 或
ng e2e
```

## 相关文档

- [IFRAME_USAGE.md](../IFRAME_USAGE.md) - 通信协议说明
- [Angular 文档](https://angular.io/) - Angular 官方文档
