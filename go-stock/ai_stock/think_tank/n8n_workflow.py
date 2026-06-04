# -*- coding: utf-8 -*-
"""
N8N工作流配置 - 全球智库日报推送
每天早上07:00自动运行
"""

N8N_WORKFLOW_SPEC = {
    "name": "📡 全球智库日报 (07:00)",
    "active": True,
    "nodes": [
        {
            "id": "schedule-trigger",
            "name": "定时触发(07:00)",
            "type": "n8n-nodes-base.scheduleTrigger",
            "typeVersion": 1,
            "position": [250, 300],
            "parameters": {
                "rule": {
                    "interval": [{"field": "cron", "expression": "0 7 * * *"}]
                }
            }
        },
        {
            "id": "run-pipeline",
            "name": "调用智库中枢全流程",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 1,
            "position": [450, 300],
            "parameters": {
                "url": "http://ai-data-service:4000/api/think-tank/pipeline",
                "method": "GET",
                "authentication": "none",
                "options": {}
            }
        },
        {
            "id": "check-result",
            "name": "检查结果",
            "type": "n8n-nodes-base.code",
            "typeVersion": 1,
            "position": [650, 300],
            "parameters": {
                "jsCode": """// 检查推送结果
const data = $input.first().json;
if (data.status === 'ok' && data.pushed) {
  return [{json: {success: true, collected: data.collected, analyzed: data.analyzed}}];
} else {
  throw new Error('Pipeline failed: ' + JSON.stringify(data));
}
"""
            }
        }
    ],
    "connections": {
        "定时触发(07:00)": {
            "main": [[{"node": "调用智库中枢全流程", "type": "main", "index": 0}]]
        },
        "调用智库中枢全流程": {
            "main": [[{"node": "检查结果", "type": "main", "index": 0}]]
        }
    }
}
