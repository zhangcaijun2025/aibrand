# API密钥配置步骤

## 🚀 快速开始

### 方法1：运行配置脚本（推荐）
1. 双击桌面上的 `setup_api_keys.ps1`
2. 按照提示输入你的API密钥
3. 脚本会自动配置并测试

### 方法2：手动配置
1. 获取API密钥（见下文）
2. 设置环境变量
3. 运行测试脚本

## 🔑 获取API密钥

### 1. OpenAI API密钥
- 访问：https://platform.openai.com/api-keys
- 注册/登录OpenAI账户
- 点击"Create new secret key"
- 复制密钥（格式：`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）
- 免费额度：$5

### 2. DeepSeek API密钥（推荐，免费）
- 访问：https://platform.deepseek.com/api_keys
- 注册/登录DeepSeek账户
- 点击"创建新的API密钥"
- 复制密钥（格式：`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）
- 免费额度：充足

### 3. Anthropic API密钥（可选）
- 访问：https://console.anthropic.com/settings/keys
- 注册/登录Anthropic账户
- 点击"Create Key"
- 复制密钥（格式：`sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

## ⚙️ 配置方法

### 方法A：使用PowerShell脚本（推荐）
```powershell
# 1. 打开PowerShell
# 2. 导航到桌面
cd ~\Desktop

# 3. 运行配置脚本
.\setup_api_keys.ps1

# 4. 按照提示输入API密钥
```

### 方法B：手动设置环境变量
```powershell
# 设置用户环境变量（永久）
[System.Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "sk-你的密钥", "User")
[System.Environment]::SetEnvironmentVariable("DEEPSEEK_API_KEY", "sk-你的密钥", "User")

# 设置进程环境变量（立即生效）
$env:OPENAI_API_KEY = "sk-你的密钥"
$env:DEEPSEEK_API_KEY = "sk-你的密钥"
```

### 方法C：创建.env文件
在 `C:\Users\XIAOMI\.openclaw\workspace` 目录创建 `.env` 文件：
```env
OPENAI_API_KEY=sk-你的OpenAI密钥
DEEPSEEK_API_KEY=sk-你的DeepSeek密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

## 🧪 测试配置

### 运行测试脚本
```powershell
cd ~\Desktop
python test_langchain_api.py
```

### 预期输出
```
==================================================
API密钥配置测试
==================================================
✅ OPENAI_API_KEY: 已设置
✅ DEEPSEEK_API_KEY: 已设置
⚠️  ANTHROPIC_API_KEY: 未设置

✅ 所有API密钥配置完成！

==================================================
测试LangChain功能
==================================================
✅ LangChain模块导入成功

测试OpenAI GPT-3.5...
🤖 OpenAI响应: 人工智能是模拟人类智能的计算机系统...

测试DeepSeek...
🤖 DeepSeek响应: 机器学习是让计算机从数据中学习...

==================================================
🎉 LangChain功能测试全部成功！
==================================================
```

## 🔧 故障排除

### 问题1：API密钥无效
**症状**：`AuthenticationError` 或 `Invalid API key`
**解决**：
1. 检查密钥格式是否正确
2. 确认密钥未过期
3. 重新生成密钥

### 问题2：配额不足
**症状**：`RateLimitError` 或 `Insufficient quota`
**解决**：
1. 检查账户余额
2. 升级账户或等待重置
3. 使用DeepSeek（免费额度充足）

### 问题3：网络问题
**症状**：`ConnectionError` 或 `Timeout`
**解决**：
1. 检查网络连接
2. 使用代理（如需）
3. 重试几次

### 问题4：模块导入错误
**症状**：`ModuleNotFoundError` 或 `ImportError`
**解决**：
1. 确认已安装LangChain
   ```bash
   pip install langchain langchain-openai
   ```
2. 检查Python环境
   ```bash
   python --version
   pip list | findstr langchain
   ```

## 📋 验证清单

### 配置前
- [ ] 已获取至少一个API密钥（OpenAI或DeepSeek）
- [ ] 确认密钥格式正确
- [ ] 确认有足够的配额

### 配置中
- [ ] 成功设置环境变量
- [ ] 确认当前会话生效
- [ ] 创建了测试脚本

### 配置后
- [ ] 测试脚本运行成功
- [ ] AI响应正常返回
- [ ] 无错误信息

## 🎯 成功标志

当以下条件满足时，表示API密钥配置成功：

1. ✅ 测试脚本无错误运行
2. ✅ 能够获取AI响应
3. ✅ 可以创建和使用LangChain链
4. ✅ 文档处理和文本分割功能正常

## 📞 支持

### 如果遇到问题：
1. **检查日志**：查看错误信息
2. **验证密钥**：在对应平台测试密钥
3. **测试网络**：确认可以访问API端点
4. **查看文档**：参考官方文档

### 有用的链接：
- OpenAI文档：https://platform.openai.com/docs
- DeepSeek文档：https://platform.deepseek.com/api-docs
- LangChain文档：https://python.langchain.com/docs

---

**配置时间**：2026年3月30日  
**系统状态**：LangChain已修复，等待API密钥  
**技术支持**：小龙女 🐉👧