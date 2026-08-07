"""
LiteLLM 自定义回调 — 过滤 OpenAI Responses API 的 namespace 工具
Codex 桌面版会发送 type="namespace" 的工具(subagent 等), DeepSeek 只认 function。

关键点:
1) proxy 的 pre_call hook 要求回调是 CustomLogger 的【实例】, 所以模块底部导出
   filter_instance, 配置里引用它 (tool_filter.filter_instance), 而不是类名。
2) DeepSeek 推理(enable_thinking=true)时后端强制要求 result_format="message",
   这里无条件注入该值(thinking 关闭时也无害), 覆盖所有请求形态。
"""
import logging
from typing import Any, Dict, Optional

from litellm.integrations.custom_logger import CustomLogger

logger = logging.getLogger(__name__)


def _process_request(data: dict) -> dict:
    if not isinstance(data, dict):
        return data
    # 过滤 namespace 工具 (DeepSeek 只认 function)
    tools = data.get('tools')
    if isinstance(tools, list) and tools:
        filtered = [t for t in tools
                    if not (isinstance(t, dict) and t.get('type') == 'namespace')]
        if len(filtered) != len(tools):
            logger.info(f"[tool-filter] filtered {len(tools) - len(filtered)} namespace tools")
            data['tools'] = filtered
    # 无条件注入 result_format=message (DeepSeek 推理要求)
    if data.get("result_format") != "message":
        data["result_format"] = "message"
    return data


class ToolNamespaceFilter(CustomLogger):

    @classmethod
    async def async_pre_call_hook(
        cls,
        user_api_key_dict: Any,
        cache: Any,
        data: Dict[str, Any],
        call_type: str,
    ) -> Optional[Dict[str, Any]]:
        try:
            return _process_request(data)
        except Exception as e:
            logger.warning(f"[tool-filter] pre_call hook error: {e}")
        return data

    @classmethod
    async def async_post_call_success_hook(
        cls, data: Dict[str, Any], user_api_key_dict: Any, response: Any,
    ) -> Any:
        return response

    @classmethod
    async def async_post_call_failure_hook(
        cls, request_data: Dict[str, Any], original_exception: Exception,
        user_api_key_dict: Any,
    ) -> None:
        pass

    @classmethod
    async def async_log_success_event(cls, kwargs, response_obj, start_time, end_time) -> None:
        pass

    @classmethod
    async def async_log_failure_event(cls, kwargs, response_obj, start_time, end_time) -> None:
        pass


# 模块级单例 —— 配置里通过 tool_filter.filter_instance 引用它
filter_instance = ToolNamespaceFilter()
