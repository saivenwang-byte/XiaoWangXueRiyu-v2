#!/usr/bin/env python3
"""24 课 × MVP 金标（L14）对照审计 · 输出 docs/curriculum-mvp-audit.json。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "js" / "data" / "lessons-data.js"

GOLD = {
    "grammar_nodes_min": 5,
    "quiz_min": 4,
    "dialogue_replies_min": 3,
    "vocab_depth_min": 8,
    "node_patches_min": 1,
    "coach_summary": True,
    "difficult_hints": True,
}

SILVER = {
    "grammar_nodes_min": 2,
    "quiz_min": 3,
    "dialogue_replies_min": 3,
    "vocab_depth_min": 5,
    "node_patches_min": 0,
    "coach_summary": True,
    "difficult_hints": False,
}


def load_lessons() -> list[dict]:
    raw = DATA_FILE.read_text(encoding="utf-8")
    start = raw.index("[")
    end = raw.rindex("]") + 1
    lessons = json.loads(raw[start:end])
    if [lesson.get("lessonId") for lesson in lessons] != list(range(1, 25)):
        raise ValueError("lessons-data.js 须完整且按顺序包含第1—24课")
    return lessons


def dialogue_reply_count(lesson: dict) -> int:
    total = 0
    for dialogue in lesson.get("dialogues", []):
        total += len((dialogue.get("userTurn") or {}).get("replies", []))
    return total


def has_chinese_dialogue(lesson: dict) -> bool:
    for dialogue in lesson.get("dialogues", []):
        if (dialogue.get("opener") or {}).get("chinese"):
            return True
        for reply in (dialogue.get("userTurn") or {}).get("replies", []):
            if reply.get("chinese"):
                return True
    return False


def has_required_question_tts(lesson: dict) -> bool:
    for question in lesson.get("quizQuestions", []):
        if question.get("type") == "fill" and not question.get("questionTts"):
            return False
    return True


def score_lesson(lesson: dict) -> dict:
    grammar = len(lesson.get("grammarNodes", []))
    quiz = len(lesson.get("quizQuestions", []))
    replies = dialogue_reply_count(lesson)
    vocab = len(lesson.get("vocab", []))
    enrichment = len(lesson.get("reviewExtension", []))
    coach = bool(lesson.get("summaryBlocks"))
    difficult = bool(lesson.get("dialogueKeyPoints"))

    def meets(bar: dict) -> bool:
        return (
            grammar >= bar["grammar_nodes_min"]
            and quiz >= bar["quiz_min"]
            and replies >= bar["dialogue_replies_min"]
            and vocab >= bar["vocab_depth_min"]
            and enrichment >= bar["node_patches_min"]
            and (coach if bar["coach_summary"] else True)
            and (difficult if bar["difficult_hints"] else True)
        )

    level = "gold" if meets(GOLD) else "silver" if meets(SILVER) else "bronze"
    gaps: list[str] = []
    if grammar < GOLD["grammar_nodes_min"]:
        gaps.append(f"文法节点{grammar}/{GOLD['grammar_nodes_min']}")
    if quiz < GOLD["quiz_min"]:
        gaps.append(f"测验{quiz}/{GOLD['quiz_min']}")
    if replies < GOLD["dialogue_replies_min"]:
        gaps.append(f"会話回复{replies}/{GOLD['dialogue_replies_min']}")
    if vocab < GOLD["vocab_depth_min"]:
        gaps.append(f"単語{vocab}/{GOLD['vocab_depth_min']}")
    if not coach:
        gaps.append("缺summaryBlocks")
    if not difficult:
        gaps.append("缺dialogueKeyPoints")
    if not has_required_question_tts(lesson):
        gaps.append("填空缺questionTts")

    return {
        "lessonId": lesson["lessonId"],
        "grammarNodes": grammar,
        "quizQuestions": quiz,
        "dialogueReplies": replies,
        "vocabDepth": vocab,
        "nodePatches": enrichment,
        "coachSummary": coach,
        "difficultHints": difficult,
        "hasChineseDialogue": has_chinese_dialogue(lesson),
        "hasQuestionTts": has_required_question_tts(lesson),
        "hasBiaoriVocab": vocab > 0,
        "level": level,
        "gaps": gaps,
        "source": "lessons-data",
    }


def main() -> int:
    rows = [score_lesson(lesson) for lesson in load_lessons()]
    out_json = ROOT / "docs" / "curriculum-mvp-audit.json"
    out_json.write_text(
        json.dumps(
            {"goldRef": 14, "thresholds": {"gold": GOLD, "silver": SILVER}, "rows": rows},
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    levels: dict[str, list[int]] = {"gold": [], "silver": [], "bronze": []}
    for row in rows:
        levels[row["level"]].append(row["lessonId"])

    print("=== MVP 课程审计（当前唯一数据源 lessons-data.js）===\n")
    print(f"{'课':>3} {'级':8} {'文法':>4} {'测验':>4} {'会話':>4} {'単語':>4} {'扩展':>4} 缺口")
    for row in rows:
        gap = "；".join(row["gaps"]) if row["gaps"] else "—"
        print(
            f"{row['lessonId']:3d} {row['level']:8} {row['grammarNodes']:4d} "
            f"{row['quizQuestions']:4d} {row['dialogueReplies']:4d} "
            f"{row['vocabDepth']:4d} {row['nodePatches']:4d}  {gap}"
        )
    print(f"\n金标 gold:   {levels['gold']}")
    print(f"银标 silver: {levels['silver']}")
    print(f"铜标 bronze: {levels['bronze']}")
    print(f"\nJSON → {out_json.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
