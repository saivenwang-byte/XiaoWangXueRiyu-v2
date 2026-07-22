const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");

class FakeAudio {
  constructor() {
    FakeAudio.instances.push(this);
    this.listeners = new Map();
    this.src = "";
    this.readyState = 0;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  removeEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    this.listeners.set(type, handlers.filter((item) => item !== handler));
  }

  emit(type) {
    for (const handler of [...(this.listeners.get(type) || [])]) handler({ type });
  }

  setAttribute() {}
  load() {}
  pause() {}
  play() { return Promise.resolve(); }
}
FakeAudio.instances = [];

function loadSpeechEngine() {
  FakeAudio.instances = [];
  const sandbox = {
    AbortController,
    Audio: FakeAudio,
    Blob,
    URL,
    clearTimeout,
    console,
    fetch: async () => ({ ok: false }),
    location: {
      protocol: "http:",
      origin: "http://localhost:8765",
      pathname: "/index.html",
      hostname: "localhost",
    },
    navigator: { userAgent: "node-test", language: "zh-CN" },
    setTimeout,
    window: {
      HYOUGA_PUBLIC_ORIGIN: "https://saivenwang-byte.github.io/XiaoWangXueRiyu-v2",
      HYOUGA_TTS_MIRROR_ORIGINS: [
        "https://cdn.jsdelivr.net/gh/saivenwang-byte/XiaoWangXueRiyu-v2@main",
      ],
    },
  };
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(ROOT, "js", "speech-engine.js"), "utf8");
  vm.runInContext(`${source}\n;globalThis.__speechEngine = SpeechEngine;`, sandbox);
  return sandbox.__speechEngine;
}

const audioBlob = {
  size: 500,
  arrayBuffer: async () => new ArrayBuffer(0),
};

test("dialogue recording without transcript never produces a pronunciation score", async () => {
  const engine = loadSpeechEngine();
  const result = await engine.evaluateDialogueDetailed({
    expected: "はじめまして。",
    heard: "",
    audioBlob,
    keywords: ["はじめまして"],
    asr: { status: "unsupported" },
  });

  assert.equal(result.score, null);
  assert.equal(result.dims, null);
  assert.equal(result.mode, "recording-only");
  const html = engine.renderDialogueScoreHtml(result);
  assert.match(html, /录音与回放正常/);
  assert.doesNotMatch(html, /本句发音\s*\d+\s*分/);
  assert.doesNotMatch(html, /关键词[\s\S]*0\/10/);
});

test("vocabulary recording without transcript stays unscored", async () => {
  const engine = loadSpeechEngine();
  const result = await engine.evaluatePronunciation({
    expected: "わたしは王です。",
    heard: "",
    audioBlob,
    asr: { status: "network" },
  });

  assert.equal(result.score, null);
  assert.equal(result.ok, false);
  assert.equal(result.mode, "recording-only");
  assert.match(result.tip, /不计分|连接失败/);
});

test("a returned Japanese transcript produces a real dimensional result", async () => {
  const engine = loadSpeechEngine();
  const result = await engine.evaluateDialogueDetailed({
    expected: "デパートへ行って、買い物しました。",
    heard: "デパートへ行って、買い物しました。",
    audioBlob,
    keywords: ["デパートへ行って", "買い物しました"],
    asr: { status: "result" },
  });

  assert.equal(result.mode, "speech");
  assert.equal(typeof result.score, "number");
  assert.ok(result.dims.keyword > 0);
  assert.ok(result.dims.match > 0);
});

test("one failed TTS source advances once and does not poison all fallbacks", () => {
  const engine = loadSpeechEngine();
  const entry = engine.warmPhrase("はじめまして。");
  assert.ok(entry.urls.length >= 3);

  entry.audio.emit("error");
  assert.equal(entry.urlIdx, 1);
  assert.equal(entry.failed, false);

  while (!entry.failed) entry.audio.emit("error");
  assert.equal(entry.urlIdx, entry.urls.length - 1);
  assert.equal(entry.sourceErrors, entry.urls.length);
});

test("automatic TTS warm-up is capped at eight phrases per page", () => {
  const engine = loadSpeechEngine();
  engine.warmPhrases(Array.from({ length: 30 }, (_, index) => `テスト${index}`));
  assert.equal(FakeAudio.instances.length, 8);
});

test("all shipped JavaScript files pass node syntax validation", () => {
  const files = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".js")) files.push(full);
    }
  };
  walk(path.join(ROOT, "js"));

  const failures = files.flatMap((file) => {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    return result.status === 0 ? [] : [`${path.relative(ROOT, file)}\n${result.stderr}`];
  });
  assert.deepEqual(failures, []);
});
