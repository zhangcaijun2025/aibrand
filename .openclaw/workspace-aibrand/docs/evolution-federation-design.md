# HERMES × AiBrand 联邦自进化方案设计 v1.2

> 目标:让系统的自进化引擎本身越来越智能,实现真正的**系统级自进化**(Meta-Evolution)
> 日期:2026-08-06
> 状态:设计稿(待评审)| **Phase 1 ✅ | Phase 2 ✅ (2026-08-06)**

## Phase 1 实施记录 (2026-08-06)

| 任务 | 状态 | 说明 |
|---|---|---|
| 修复 learn_to_dify 假写入 | ✅ | 改为真实落库 MongoDB `evolution_learned` + JSONL 降级;配置 DIFY_DATASET_KEY/ID 时额外上传 Dify(create_by_text);原实现误调 retrieve 从未写入 |
| evolution_log 落库 | ✅ | 新增 `persist_insert/persist_query`(MongoDB 优先,JSONL 降级);集合 `evolution_logs`/`evolution_runbook_counts`/`evolution_learned`;heal 全分支(escalated/no_runbook/cooldown/正常)均入日志 |
| MongoDB 连接修复 | ✅ | replicaSet 内部主机名解析问题 → `directConnection=true` |
| /evolution/stats 端点 | ✅ | 成功率/耗时/复发组件/Runbook 分布/学习沉淀数/存储来源 |
| 记忆桥双向化 | ✅ | hermes-host-bridge.mjs 新增 `appendHermesMemory`;POST /memory 支持 target: openclaw\|hermes\|both(默认 both) |
| 自启接入 | ✅ | aibrand-autostart.ps1 新增 2.7 节启动 Evolution Engine (:4030) |
| 端到端验证 | ✅ | health/stats/log 全部 200;MongoDB 真实落库验证通过;双桥健康 |

## Phase 2 实施记录 (2026-08-06)

| 任务 | 状态 | 说明 |
|---|---|---|
| 诊断链重构 | ✅ | observe 顺序: 经验库优先 → 正式 Runbook → 候选池(trial) → 未知;经验库命中 conf=0.9, Runbook 0.85, 候选 0.6 |
| 经验库优先诊断 | ✅ | find_learned_experience(): 同组件 + 症状关键词重叠打分, 命中直接给历史最优方案 |
| Runbook 候选池 | ✅ | 集合 `runbook_candidates`;候选含 trigger/safe/verify/command(复用正式剧本同 action 命令模板, 防自动生成恶意命令) |
| 候选自动生成 | ✅ | add_candidate_from_heal(): 成功修复后调 LangChain 提炼候选;修复 markdown 包裹 JSON 解析 (```json 提取 + 首尾大括号回退) |
| 候选晋升/淘汰 | ✅ | record_candidate_trial(): 成功≥3 且成功率≥80% → promoted;失败≥3 → rejected;trial 模式 safe=true 且带命令才可自动执行 |
| 候选人工操作端点 | ✅ | POST /runbooks/candidates/{id}/trial (approve/reject) + GET /runbooks/candidates |
| heal 支持候选执行 | ✅ | runbook_id 以 cand- 开头时从候选池加载执行, 结果回流试用记录 |
| 端到端验证 | ✅ | 经验库命中 0.9;候选匹配 0.6;3 次成功自动晋升;LangChain 真实生成候选并解析出关键词 |

## 遗留/说明
- Dify 知识库上传需配置 DIFY_DATASET_KEY + DIFY_DATASET_ID(当前 app key 无数据集权限, 未配置 → 只落 MongoDB)
- claude bridge (:4020) 当前离线, heal 自动执行依赖它;不影响诊断链与候选池逻辑

---

## 1. 现状盘点(基于代码事实)

### 1.1 AiBrand 侧已有两个进化引擎,互不相通

| 引擎 | 位置 | 能力 | 关键缺陷 |
|---|---|---|---|
| **evolution-engine** (系统自愈) | `project/evolution-engine/app.py` (:4030) | 五步闭环 Observe→Diagnose→Decide→Act→Learn;10 个 Runbook 剧本;LangChain 智能诊断 | Runbook 人工手写、静态;`learn_to_dify()` 调的是 `datasets/retrieve` 而非 upload,学习环节**实际没写入知识库**;`evolution_log` 存内存,重启即丢;失败案例不回流 |
| **evolution.service.ts** (用户进化) | `apps/aibrand-server/src/core/agent/evolution.service.ts` | 行为分析→偏好/习惯/里程碑发现;模块权重排序(Kendall Tau);画像更新 | 只输出报告和建议,不驱动系统行为;与 evolution-engine 无任何数据交换 |

### 1.2 Hermes 侧的自进化能力(未接入 AiBrand)

- **Skills 策展机制**:`%LOCALAPPDATA%\hermes\skills\.curator_state` + `.usage.json` —— Hermes 已经在做"技能使用统计→自动启用/淘汰"
- **Cron 自主任务**:`hermes\cron\jobs.json` + `executions.db` —— 可自主周期性执行任务
- **联邦记忆桥**:`scripts/hermes-host-bridge.mjs` (:18791) —— 读 Hermes 记忆快照 / 向 OpenClaw 记忆追加;但**单向**:Hermes 记忆只读、AiBrand 结论不回流
- **Kanban/会话/沙箱**:自主任务执行的完整运行时

### 1.3 联邦层现状

- MCP 工具 `memory_sync`(读两侧快照 / 写 OpenClaw 记忆)、`ai_coordination`(Dify+n8n+LangChain 协调)、`evolution_propose`(Agent 提交提案)
- 三件套当前实际状态:`ai_coordination` 返回 **dify 🔴 / n8n 🔴 / langchain 🟢**,整体 degraded —— 方案需考虑依赖降级

### 1.4 核心诊断:为什么还不是"真正的系统级自进化"

1. **进化引擎自己不会进化**:Runbook 阈值、匹配规则、诊断策略全靠人改代码
2. **无反馈回路**:修复成功/失败不回流到诊断逻辑,同一故障反复踩坑
3. **学习环节是空的**:learn_to_dify 是假写入;进化日志无持久化
4. **三套进化资产隔离**:Hermes skills、AiBrand 用户进化、AiBrand 系统自愈,各自为政
5. **提案无生命周期**:evolution_propose 提了就完,没有评审→灰度→验证→沉淀/回滚

---

## 2. 方案总纲:双环进化 + 元进化层

核心思想:**单环进化**(修好故障/调好偏好)之上再加**双环进化**(改进"进化方式本身"),最上层是**元进化**(进化引擎评估自己的表现并自我改造)。

```
                    ┌─────────────────────────────────────────┐
                    │         L3 元进化层 (Meta-Loop)          │
                    │  进化引擎自评估 → 进化策略自调参 → 自提案   │
                    └───────────────┬─────────────────────────┘
                                    │ 改进进化算法/阈值/剧本生成策略
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼───────┐          ┌────────▼────────┐          ┌──────▼──────┐
│ L2 双环学习层  │          │  L2 双环学习层   │          │ L2 双环学习  │
│ 系统自愈进化   │◄─联邦───►│  联邦记忆总线     │◄─联邦───►│ Hermes 自进化│
│ (evolution-   │  记忆    │  (单向→双向)     │  记忆    │ (skills/    │
│  engine 2.0)  │          └────────┬────────┘          │  cron/记忆)  │
└───────┬───────┘                   │                   └──────┬──────┘
        │                           │                          │
┌───────▼───────────────────────────▼──────────────────────────▼──────┐
│ L1 单环进化层:Observe → Diagnose → Decide → Act → Learn             │
│  + 用户进化 evolution.service.ts(行为→画像→推荐)                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │ L0 执行层:容器/工作流/  │
                    │ MCP 工具/Agent 运行时   │
                    └───────────────────────┘
```

### 2.1 双环学习的定义

- **单环(第一环)**:告警→诊断→修复→验证→记录。解决"这次怎么修好"
- **双环(第二环)**:修复结果(成功/失败/耗时/复发)→反哺规则库。解决"下次怎么更快修好、甚至不用修"
- **元环(第三环)**:定期评估进化引擎自身指标(修复成功率、误诊率、剧本覆盖率、提案采纳率)→生成改进提案(调阈值、换模型、加剧本、改策略)→ 灰度应用 → 复评。

---

## 3. 五个核心机制

### 机制 1:闭环反馈总线(修假学习)

**修复 learn_to_dify 假写入 + 进化日志持久化**

- `learn_to_dify()` 改用真正的文档上传 API(`POST /v1/datasets/{id}/document/create_by_file` 或 `create_by_text`),写入"自愈经验库"
- `evolution_log`(内存)→ 落库 MongoDB 集合 `evolution_logs`,附带字段:`{taskId, component, symptom, rootCause, action, success, durationMs, recovered, recurrenceCount, source: runbook|langchain|hermes}`
- 诊断时**先查经验库**:命中历史案例(同 component+symptom)→ 直接给历史最优方案 + 置信度;未命中 → 走 Runbook → 再走 LangChain。

### 机制 2:Runbook 自动生成与淘汰(剧本进化)

**现状**:10 个剧本手写,`match_runbook` 是字符串匹配,永不变化。

**设计:Runbook 生命周期 = 提案池 → 试用 → 晋升/淘汰**

```
                       ┌────────────┐
 修复成功且复用≥N次 ───►│ 候选池(试用) │──► 晋升为正式 Runbook
                       └─────┬──────┘
                             │ 失败≥M次 / 复发≥K次
                             ▼
                       淘汰 + 失败记忆写入联邦记忆
```

- **生成**:Hermes 或 AiBrand Agent 在每次成功修复后,用 LLM 从 `{symptom, rootCause, action, verify, duration}` 提炼候选剧本(`match_runbook` 规则 + `safe` 标记 + `verify` 配置),写入 `runbook_candidates` 集合
- **试用**:候选剧本进入 `trial` 模式,只建议不自动执行(或仅对低危组件自动执行),记录成功/失败
- **晋升**:累计成功 ≥3 次且成功率 ≥80% → 转为正式 Runbook
- **淘汰**:正式剧本失败率 >50% 或复发率 >30% → 降级为候选并通知
- **自我约束**:新增剧本必须带 `confidence` 和 `source`,且 `safe=true` 才能自动执行;高危操作一律人工审批(沿用现有 `safe` 机制)

### 机制 3:联邦记忆双向化(跨 Agent 进化)

**现状**:`hermes-host-bridge.mjs` 的 `/memory` 只有"读 Hermes / 写 OpenClaw"。

**设计:三类记忆,双向同步,带来源与置信度**

| 记忆类型 | 写入方 | 读取方 | 用途 |
|---|---|---|---|
| 系统事件记忆 | AiBrand evolution-engine | Hermes / OpenClaw | 故障、修复、复发历史 |
| Agent 经验记忆 | Hermes / OpenClaw | AiBrand | 修复经验、技能使用统计、提案评审结论 |
| 用户画像记忆 | evolution.service.ts | 所有 Agent | 偏好、习惯、avoidTopics |

- `memory_sync` MCP 升级为 `read`(双侧快照)+ `write`(双向往返),新增 `MEMORY.md` 的 `## 联邦进化` 章节,记录跨系统进化结论
- 写入格式统一:`[来源] 结论 + 置信度 + 时间戳`,低置信度(<0.6)只进草稿区,不进正式记忆
- 修复成功/失败、剧本晋升/淘汰、提案采纳/拒绝 都必须写联邦记忆(带 tag:`evolution-feedback`)

### 机制 4:进化提案生命周期(提案不再是终点)

**现状**:`evolution_propose` 提交后无后续。

**设计:提案 = 可验证的实验**

```
Propose → Review(评审) → Stage(灰度) → Apply(应用) → Monitor(观察) → Canonicalize(沉淀) / Rollback(回滚)
```

- **Propose**:Agent(Hermes/OpenClaw/AiBrand)提交 `{findingType, description, severity, expectedImpact, experimentDesign}`
- **Review**:Hermes 作为评审员(它具备自主执行 + 记忆),对提案做可行性分析,给出 `accept | reject | refine`
- **Stage**:接受的提案进入灰度——限流 10% 流量或仅作用于测试组件,记录基线
- **Monitor**:对比 `before/after` 指标(修复成功率、误诊率、耗时、用户满意率),观察期 ≥24h
- **Canonicalize/Rollback**:指标显著改善 → 全量应用并写联邦记忆;无改善或恶化 → 自动回滚
- **元进化输入**:提案采纳率、实验成功率本身成为元进化层的评估指标

### 机制 5:元进化层(引擎自我改造)

**定期(每周)运行 `meta-evolve` 流程**:

1. **自评估**:拉取上一周期指标 —— 修复成功率、平均修复耗时、误诊率、Runbook 覆盖率、提案采纳率、用户满意率
2. **退化检测**:指标环比下降超过阈值(如成功率 <80% 或下降 >10pt)→ 触发改进
3. **策略空间**:可调参数清单:
   - 诊断策略:Runbook 优先 / 经验库优先 / LangChain 优先 的路由权重
   - 阈值:LEARNING_THRESHOLD、cooldown、晋升/淘汰阈值
   - 模型路由:诊断用模型、提案评审用模型
   - 剧本生成策略:哪些成功案例值得提炼
4. **自提案**:由 Hermes 生成"改进提案",走机制 4 的生命周期(灰度→观察→沉淀/回滚)
5. **结果写入** `evolution_meta_logs`:每次自改造都有记录,可追溯、可回滚

**防失控护栏**:
- 所有自动改造必须**可回滚**(保留上一版参数快照)
- 高危操作(数据库、删除、全量发布)永远需要人工审批
- 元进化层自身的变化也纳入版本管理,形成"进化的进化"的审计链
- 任何自进化动作都通知 BOSS(飞书),重大变更需确认

---

## 4. 数据流总图

```
 告警/行为事件
      │
      ▼
┌─ L1 单环 ────────────────────────────────────────┐
│ Observe → Diagnose(经验库→Runbook→LangChain→Hermes)│
│   → Decide(safe 检查)→ Act(执行/升级人工)          │
│   → Verify(健康检查)→ Learn(写经验库+联邦记忆)      │
└──────────────┬───────────────────────────────────┘
               │ 结果(成功/失败/耗时/复发)
               ▼
┌─ L2 双环 ────────────────────────────────────────┐
│ Runbook 生成/晋升/淘汰    技能使用统计→Skills 策展   │
│ 失败记忆回流(避免重复踩坑)  用户画像→推荐策略调整      │
└──────────────┬───────────────────────────────────┘
               │ 指标(成功率/覆盖率/采纳率)
               ▼
┌─ L3 元进化 ──────────────────────────────────────┐
│ 自评估 → 退化检测 → 自提案 → 灰度 → 沉淀/回滚        │
│ 进化引擎参数/策略/模型路由自我改进                    │
└──────────────┬───────────────────────────────────┘
               │
               ▼
     飞书通知 BOSS + 联邦记忆留痕
```

---

## 5. 实施路线图

### Phase 1(第 1 周):修闭环 + 打通数据
- [ ] 修复 `learn_to_dify` 为真实写入(create_by_text),增加失败重试
- [ ] `evolution_log` 落库 MongoDB(集合:`evolution_logs`),老数据迁移
- [ ] `hermes-host-bridge.mjs` /memory 增加"写 Hermes 记忆"能力(双向)
- [ ] evolution-engine 增加 `GET /evolution/stats`(成功率、耗时、复发率统计)
- **验收**:一次完整自愈后,经验库有记录;重启后日志不丢;Hermes 记忆出现 AiBrand 事件

### Phase 2(第 2-3 周):双环学习
- [ ] 经验库优先诊断(机制 1 的查询逻辑)
- [ ] Runbook 候选池 + 晋升/淘汰逻辑(机制 2)
- [ ] 失败记忆回流:诊断时检索"历史失败案例"做负向提示
- [ ] evolution_propose 增加 `experimentDesign` 字段,提案入库 `evolution_proposals`
- **验收**:同一故障第二次修复耗时下降;候选剧本自动生成并晋升 1 个;提案有状态流转

### Phase 3(第 4-5 周):提案生命周期 + 元进化
- [ ] Review(Hermes 评审)→ Stage(限流灰度)→ Monitor(24h 对比)→ Canonicalize/Rollback
- [ ] `meta-evolve` 周任务(cron,挂 Hermes 或 evolution-engine)
- [ ] 参数快照与回滚机制(Redis 存快照 + evolution_meta_logs 记录)
- **验收**:一次提案完成全生命周期;一次元进化自动调参并复评

### Phase 4(第 6 周+):联邦闭环
- [ ] Hermes skills 使用统计 ↔ AiBrand 工具调用统计打通(高频组合→固化 Skill)
- [ ] 跨系统结论写联邦记忆(MEMORY.md `## 联邦进化` 章节)
- [ ] 三件套降级策略:Dify/n8n 离线时进化引擎降级为 本地引擎 + Hermes 兜底(现状已退化,需容忍)
- [ ] 飞书进化周报(BOSS 可见:本周进化了啥、指标变化、待确认提案)

---

## 6. 风险与对策

| 风险 | 对策 |
|---|---|
| 自动生成的剧本带错误操作 | 候选剧本只建议不执行;晋升需累计成功;`safe` 强制校验 |
| 元进化调参导致退化 | 参数快照 + 自动回滚 + 变更审计链 |
| 记忆污染(低质结论扩散) | 置信度门槛;草稿区机制;联邦记忆写入需 tag 溯源 |
| Dify/n8n 离线(当前即 degraded) | 诊断链降级:经验库→Runbook 为本地能力,不依赖外部服务;LangChain 本地引擎兜底 |
| 自进化失控风险 | 高危动作人工审批;所有自动变更通知 BOSS;可一键暂停元进化(开关) |

---

## 7. 关键设计决策(待评审确认)

1. **评审员角色**:默认由 Hermes 承担提案评审(它有自主执行+记忆),也可以换成 OpenClaw。建议先 Hermes,Phase 3 后 A/B 对比
2. **灰度方式**:最初用"组件维度"灰度(先作用于测试/低危组件),稳定后扩到"流量维度"
3. **元进化周期**:建议每周一次(周日晚),配合飞书周报
4. **存储**:新增集合 `evolution_logs` / `evolution_proposals` / `runbook_candidates` / `evolution_meta_logs`,统一放 AiBrand MongoDB(经 evolution-engine 或直接经 server 落库)

---

## 8. 一句话总结

**把"修故障"升级为"学习怎么更好地修故障",再把"学习方式本身"纳入可进化对象** —— 通过 反馈闭环(Runbook 自动进化)+ 联邦记忆双向 + 提案生命周期(灰度验证)+ 元进化层(引擎自我调参),让 Hermes 的自进化能力与 AiBrand 自进化引擎合成一个会自我改进的进化系统。
