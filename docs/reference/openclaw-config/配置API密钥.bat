@echo off
echo ========================================
echo LangChain API密钥配置工具
echo ========================================
echo.
echo 请按照以下步骤配置API密钥：
echo.
echo 步骤1: 获取API密钥
echo   1. OpenAI: https://platform.openai.com/api-keys
echo   2. DeepSeek: https://platform.deepseek.com/api_keys
echo   3. Anthropic: https://console.anthropic.com/settings/keys
echo.
echo 步骤2: 选择配置方式
echo.
echo 请选择配置方式：
echo   1. 设置环境变量（推荐）
echo   2. 创建.env文件
echo   3. 在代码中直接设置
echo.
set /p choice="请输入选择 (1/2/3): "

if "%choice%"=="1" goto set_env
if "%choice%"=="2" goto create_env
if "%choice%"=="3" goto code_set
goto end

:set_env
echo.
echo 你选择了：设置环境变量
echo.
echo 请输入你的API密钥：
echo.
set /p openai_key="OpenAI API密钥 (格式: sk-...): "
set /p deepseek_key="DeepSeek API密钥 (格式: sk-...): "
set /p anthropic_key="Anthropic API密钥 (格式: sk-ant-...，可选): "
echo.
echo 正在设置环境变量...
echo.
setx OPENAI_API_KEY "%openai_key%"
setx DEEPSEEK_API_KEY "%deepseek_key%"
if not "%anthropic_key%"=="" setx ANTHROPIC_API_KEY "%anthropic_key%"
echo.
echo ✅ 环境变量设置完成！
echo.
echo 注意：新打开的命令行窗口才会生效。
echo 当前窗口需要重启或运行以下命令：
echo   set OPENAI_API_KEY=%openai_key%
echo   set DEEPSEEK_API_KEY=%deepseek_key%
if not "%anthropic_key%"=="" echo   set ANTHROPIC_API_KEY=%anthropic_key%
echo.
goto test_config

:create_env
echo.
echo 你选择了：创建.env文件
echo.
echo 将在当前目录创建 .env 文件
echo.
set /p openai_key="OpenAI API密钥 (格式: sk-...): "
set /p deepseek_key="DeepSeek API密钥 (格式: sk-...): "
set /p anthropic_key="Anthropic API密钥 (格式: sk-ant-...，可选): "
echo.
(
echo # LangChain API配置
echo OPENAI_API_KEY=%openai_key%
echo DEEPSEEK_API_KEY=%deepseek_key%
if not "%anthropic_key%"=="" echo ANTHROPIC_API_KEY=%anthropic_key%
echo DEEPSEEK_BASE_URL=https://api.deepseek.com
echo.
echo # 可选配置
echo LANGCHAIN_TRACING_V2=false
echo LANGCHAIN_PROJECT=default
) > .env
echo.
echo ✅ .env 文件创建完成！
echo 文件位置: %cd%\.env
echo.
echo 在Python代码中使用：
echo   from dotenv import load_dotenv
echo   load_dotenv()  # 加载.env文件
echo.
goto test_config

:code_set
echo.
echo 你选择了：在代码中直接设置
echo.
echo 在Python代码开头添加：
echo.
echo import os
echo os.environ["OPENAI_API_KEY"] = "你的OpenAI密钥"
echo os.environ["DEEPSEEK_API_KEY"] = "你的DeepSeek密钥"
echo os.environ["ANTHROPIC_API_KEY"] = "你的Anthropic密钥" # 可选
echo.
echo 参考示例代码：test_with_api.py
echo.
goto test_config

:test_config
echo.
echo 步骤3: 测试配置
echo.
echo 创建测试脚本...
echo.
(
echo import os
echo.
echo print("API密钥配置测试")
echo print("="^50)
echo.
echo keys = ['OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'ANTHROPIC_API_KEY']
echo all_ok = True
echo.
echo for key in keys:
echo     value = os.getenv(key)
echo     if value:
echo         masked = value[:8] + '...' + value[-4:] if len(value^) > 12 else '***'
echo         print(f"✅ {key}: 已设置 ({masked}^)")
echo     else:
echo         print(f"⚠️  {key}: 未设置")
echo         all_ok = False
echo.
echo if all_ok:
echo     print("\n🎉 所有API密钥配置成功！")
echo     print("可以开始使用LangChain的完整功能了。")
echo else:
echo     print("\n⚠️ 部分API密钥未配置")
echo     print("请检查配置。")
echo.
echo # 测试LangChain功能
echo try:
echo     from langchain_openai import ChatOpenAI
echo     from langchain_core.prompts import ChatPromptTemplate
echo     from langchain_core.output_parsers import StrOutputParser
echo.
echo     # 创建链
echo     prompt = ChatPromptTemplate.from_template("你好，{name}！我是AI助手。")
echo     llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7^)
echo     chain = prompt ^| llm ^| StrOutputParser()
echo.
echo     # 测试调用
echo     result = chain.invoke({"name": "测试用户"}^)
echo     print(f"\n🤖 AI响应: {result}")
echo.
echo     print("\n✅ LangChain功能测试成功！")
echo except Exception as e:
echo     print(f"\n❌ 测试失败: {e}")
) > test_api_config.py

echo ✅ 测试脚本创建完成: test_api_config.py
echo.
echo 运行测试：
echo   python test_api_config.py
echo.
pause

:end
echo.
echo ========================================
echo 配置完成！
echo ========================================
echo.
echo 下一步：
echo   1. 运行测试脚本验证配置
echo   2. 开始使用LangChain开发应用
echo   3. 参考桌面上的《LangChain_API配置指南.md》
echo.
pause