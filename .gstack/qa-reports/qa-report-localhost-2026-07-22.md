# 小王学日语 v411 · 完整语音与全站 QA

- 日期：2026-07-22
- 基线：`a7f8b75`
- 本地候选：`http://127.0.0.1:8765/index.html?v=411`
- 视口：390 × 844；真机壳：390 × 753
- 浏览器：Microsoft Edge 150（隔离无头环境）
- 范围：录音、回放、日文识别、自动评分、示范语音、Service Worker、全站启动、第14课四关、发布门禁

## 结论

状态：**本地修复完成，尚未推送公网**。

- 发现 12 项问题：High 6、Medium 5、Low 1；均已在本地修复。
- 无日文转写时不再伪造 3～28 分；录音与回放保留，并说明本次不自动评分。
- 有日文转写时仍进入关键词、清晰度、吻合度、语调四维评分。
- 首访语音从 4086 条全量下载改为按需缓存；第14课加载前自动预热从数千条降为 8 条。
- 86 个 JavaScript 文件语法通过；6 条语音回归通过；24 课数据完整性通过；发布前自检全绿。
- 第14课単語／会話／文法／作業四关均可打开，浏览器运行错误、控制台错误和 4xx 资源均为 0。

## 修复清单

| 编号 | 级别 | 问题 | 修复结果 |
|---|---|---|---|
| ISSUE-001 | High | 无日文转写仍显示发音低分 | 无转写时显示“录音与回放正常”，不显示分数与四维条 |
| ISSUE-002 | High | 三个知识提示脚本启动语法错误 | 修复生成器反斜杠处理及三个产物；加入全站 JS 语法门禁 |
| ISSUE-003 | High | 会話关键词属性被 HTML 引号截断 | 使用属性专用转义；record/evaluate 均可解析 2 个关键词 |
| ISSUE-004 | High | 新录音可能沿用上次识别文字 | 每次录音前清除旧转写，并保存本次 ASR 状态 |
| ISSUE-005 | High | Service Worker 首访预取 4086 条 MP3（约 78 MB） | 改为点击后按需缓存；不再请求整包 `index.json` |
| ISSUE-006 | Medium | Gitee 语音地址 404、缓存清单停在 v385 | 移除失效 Gitee 来源，改用实测可用 jsDelivr；清单同步到 v411 |
| ISSUE-007 | Medium | 单次 MP3 错误被两套监听重复计数 | 单一来源错误只推进一个备用源，不会提前毒化整条语音 |
| ISSUE-008 | Medium | 单词跟读目标句被对象 JSON 覆盖 | 录音目标统一写入真正日文句子 |
| ISSUE-009 | Medium | `app-legacy.js` 模板字符串未闭合 | 修复并纳入 86 文件语法检查 |
| ISSUE-010 | Medium | 发布检查输出旧仓库 URL，且不查 JS 语法/语音回归 | 更新为 v2 链接，加入语法、课程数据与语音回归门禁 |
| ISSUE-011 | High | 两条课程验收脚本引用已删除的数据层 | 改为唯一数据源 `lessons-data.js`，24 课检查恢复可运行 |
| ISSUE-012 | Low | 未声明 favicon，浏览器产生 404 控制台噪声 | 使用现有 `icons/icon.svg`，复测 4xx 为 0 |

## 证据

- 修复前：[无转写却显示分数](./screenshots/issue-001-before.png)
- 修复后：[录音回放正常且不伪造分数](./screenshots/issue-001-after.png)
- 四关：[単語](./screenshots/l14-gate-0-v411.png) · [会話](./screenshots/l14-gate-2-v411.png) · [文法](./screenshots/l14-gate-1-v411.png) · [作業](./screenshots/l14-gate-3-v411.png)
- 双视图：[390×753 真机壳](./screenshots/phone-shell-v411.png)

## 验证结果

- `node --test tests/speech-regression.test.cjs`：6/6 通过。
- 全站 `node --check`：86/86 通过。
- `node scripts/test-lesson-data.mjs`：24/24 课；982 词、105 语法、376 对话、288 测验。
- `python scripts/audit-curriculum-mvp.py`：24/24 有效；gold 8、silver 16、missing 0。
- 发布前自检：全部通过；语音注册表 4086 条、缺失 0；PRD 单词 24/24。
- 浏览器：第14课四关正文长度均大于 0；运行异常 0；控制台 error 0；4xx 0。
- Service Worker：缓存名 `hyouga-tts-v411`；不请求语音整包清单；自动预热 8 条。

## 仍需真机确认

- 微信内置浏览器通常不提供可依赖的日文 Web Speech 转写。本次已保证录音、回放和诚实降级；要在所有微信设备都提供自动日文评分，仍需接入后端 ASR 服务。这不是纯静态 H5 能稳定保证的能力。
- 公网仍是 v410；需用户批准后再推送 v411 并做真实 iPhone／Android／微信各一次验收。
