import { readFileSync } from "node:fs";

function extractJSON(file, varName) {
  const content = readFileSync(file, "utf8");
  const re = new RegExp(`(?:const|var|let)\\s+${varName}\\s*=\\s*`);
  const match = content.match(re);
  if (!match) throw new Error(`${varName} not found in ${file}`);
  const start = match.index + match[0].length;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = start; i < content.length; i += 1) {
    const char = content[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "[" || char === "{") depth += 1;
    if (char === "]" || char === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(content.substring(start, i + 1));
    }
  }
  throw new Error(`unterminated ${varName} in ${file}`);
}

const lessons = extractJSON("js/data/lessons-data.js", "LESSONS_MVP");
const supplements = extractJSON(
  "js/data/lessons-supplement-mvp.js",
  "LESSONS_SUPPLEMENT_MVP"
);

const ids = lessons.map((lesson) => lesson.lessonId);
const expectedIds = Array.from({ length: 24 }, (_, index) => index + 1);
if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
  throw new Error(`LESSONS_MVP ids invalid: ${ids.join(",")}`);
}

const supplementIds = new Set(supplements.map((lesson) => lesson.lessonId));
const missingSupplements = expectedIds.filter((id) => !supplementIds.has(id));
if (missingSupplements.length) {
  throw new Error(`supplement lessons missing: ${missingSupplements.join(",")}`);
}

const broken = lessons.filter(
  (lesson) =>
    !lesson.lessonTitle ||
    !lesson.vocab?.length ||
    !lesson.grammarNodes?.length ||
    !lesson.dialogues?.length ||
    !lesson.quizQuestions?.length
);
if (broken.length) {
  throw new Error(`incomplete lessons: ${broken.map((lesson) => lesson.lessonId).join(",")}`);
}

console.log(`LESSONS_MVP: ${lessons.length} lessons (${ids.join(",")})`);
console.log(`LESSONS_SUPPLEMENT_MVP: ${supplements.length} lessons`);
console.log(
  `Totals: vocab=${lessons.reduce((sum, lesson) => sum + lesson.vocab.length, 0)} ` +
    `grammar=${lessons.reduce((sum, lesson) => sum + lesson.grammarNodes.length, 0)} ` +
    `dialogues=${lessons.reduce((sum, lesson) => sum + lesson.dialogues.length, 0)} ` +
    `quiz=${lessons.reduce((sum, lesson) => sum + lesson.quizQuestions.length, 0)}`
);
console.log("[OK] lesson data integrity checks passed");
