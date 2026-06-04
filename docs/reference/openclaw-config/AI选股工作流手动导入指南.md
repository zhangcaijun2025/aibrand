# AI选股系统工作流手动导入指南

## 📋 准备工作

### 1. 确认n8n服务运行
- 访问：http://localhost:5678/
- 确认n8n控制台可以正常打开

### 2. 工作流文件位置
已创建两个工作流文件：
1. **数据采集工作流**：`C:\Users\XIAOMI\.openclaw\workspace\AI选股系统_数据采集工作流.json`
2. **AI分析工作流**：`C:\Users\XIAOMI\.openclaw\workspace\AI选股系统_AI分析工作流.json`

## 🚀 手动导入步骤

### 步骤1：登录n8n控制台
1. 打开浏览器，访问：http://localhost:5678/
2. 使用n8n的默认凭据登录（如果没有设置密码，可能直接进入）

### 步骤2：导入数据采集工作流
1. 在n8n控制台，点击左上角菜单 → "Workflows"
2. 点击右上角"New workflow"按钮
3. 点击右上角菜单（三个点）→ "Import from file"
4. 选择文件：`C:\Users\XIAOMI\.openclaw\workspace\AI选股系统_数据采集工作流.json`
5. 点击"Import"按钮
6. 工作流导入后，点击右上角"Save"按钮保存
7. 点击右上角"Activate"按钮激活工作流

### 步骤3：导入AI分析工作流
1. 重复步骤2，选择文件：`C:\Users\XIAOMI\.openclaw\workspace\AI选股系统_AI分析工作流.json`
2. 保存并激活工作流

## 🔧 工作流配置说明

### 数据采集工作流配置
1. **定时触发器**：每小时运行一次
2. **数据源**：需要配置实际的股票API地址
3. **数据库**：需要配置PostgreSQL连接信息
4. **邮件通知**：需要配置发件邮箱

### AI分析工作流配置
1. **定时触发器**：每2小时运行一次
2. **AI模型**：需要配置OpenAI API密钥
3. **数据库**：需要配置PostgreSQL连接信息
4. **邮件报告**：需要配置收件邮箱

## ⚙️ 环境变量配置（可选）

如果需要自动化配置，可以在n8n中设置以下环境变量：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_system
DB_USER=postgres
DB_PASSWORD=your_password

# API配置
STOCK_API_KEY=your_stock_api_key
OPENAI_API_KEY=your_openai_api_key

# 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password
```

## 📊 验证导入成功

### 检查项：
1. ✅ 两个工作流都显示在n8n的Workflows列表中
2. ✅ 工作流状态显示为"Active"（绿色）
3. ✅ 可以点击"Execute workflow"测试运行
4. ✅ 查看执行历史记录是否有成功记录

### 测试运行：
1. 点击工作流名称进入详情页
2. 点击右上角"Execute workflow"按钮
3. 查看执行日志，确认无错误
4. 检查数据库是否有数据插入

## 🛠️ 故障排除

### 常见问题1：导入失败
- **原因**：JSON格式错误
- **解决**：使用JSON验证工具检查文件格式

### 常见问题2：节点配置错误
- **原因**：缺少必要的凭据
- **解决**：在n8n中配置相应的凭据

### 常见问题3：数据库连接失败
- **原因**：数据库未运行或配置错误
- **解决**：确认PostgreSQL服务运行，检查连接配置

### 常见问题4：API调用失败
- **原因**：API密钥无效或配额不足
- **解决**：检查API密钥，确认服务可用

## 📞 技术支持

### 自动化导入备用方案
如果手动导入遇到问题，可以运行自动化脚本：

```powershell
cd C:\Users\XIAOMI\.openclaw\workspace\scripts
.\simple_import.ps1
```

### 联系支持
- 系统日志位置：`C:\Users\XIAOMI\.openclaw\workspace\logs\`
- n8n日志位置：n8n控制台 → Settings → Logs
- 错误截图：便于快速诊断问题

## 🎯 完成标志

当以下条件满足时，表示工作流导入成功：

1. ✅ 两个工作流都出现在n8n控制台
2. ✅ 工作流可以手动执行测试
3. ✅ 数据库中有测试数据生成
4. ✅ 可以收到测试邮件通知

---

**导入时间**：2026年3月30日  
**系统版本**：AI选股系统 v1.0  
**技术支持**：小龙女 🐉👧