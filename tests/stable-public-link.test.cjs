const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function loadShareWechat() {
  const context = {
    window: { HYOUGA_PUBLIC_ORIGIN: "https://saivenwang-byte.github.io/XiaoWangXueRiyu-v2" },
    location: {
      protocol: "https:",
      hostname: "saivenwang-byte.github.io",
      origin: "https://saivenwang-byte.github.io",
      pathname: "/XiaoWangXueRiyu-v2/index.html",
    },
    navigator: { userAgent: "test" },
    console,
  };
  vm.createContext(context);
  vm.runInContext(read("js/share-wechat.js"), context);
  return vm.runInContext("ShareWechat", context);
}

test("公开学习链接固定为 v410，内部缓存可独立升级", () => {
  const share = loadShareWechat();
  assert.equal(share.PUBLIC_LINK_VER, "410");
  assert.equal(share.CACHE_VER, "412");
  assert.equal(
    share.publicLearnUrl(),
    "https://saivenwang-byte.github.io/XiaoWangXueRiyu-v2/index.html?v=410"
  );
});

test("入口静态资源全部使用内部 v412", () => {
  const index = read("index.html");
  const versions = [...index.matchAll(/(?:src|href)="[^"]+\?v=(\d+)/g)].map((m) => m[1]);
  assert.ok(versions.length > 60);
  assert.deepEqual([...new Set(versions)], ["412"]);
  assert.match(index, /var PUBLIC_LINK_VER = "410";/);
  assert.match(index, /params\.set\("v", PUBLIC_LINK_VER\)/);
});

test("旧的公网 v411/v412 地址自动归一到 v410，并保留其它参数", () => {
  const index = read("index.html");
  const boot = index.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const redirects = [];
  const context = {
    window: {},
    location: {
      hostname: "saivenwang-byte.github.io",
      pathname: "/XiaoWangXueRiyu-v2/index.html",
      search: "?v=412&testcard=1",
      hash: "#lesson-14",
      replace: (url) => redirects.push(url),
    },
    URLSearchParams,
    setTimeout: () => 1,
    document: {},
  };
  vm.createContext(context);
  vm.runInContext(boot, context);
  assert.deepEqual(redirects, [
    "https://saivenwang-byte.github.io/XiaoWangXueRiyu-v2/index.html?v=410&testcard=1#lesson-14",
  ]);
});

test("固定公网 v410 地址不发生重定向", () => {
  const index = read("index.html");
  const boot = index.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const redirects = [];
  const context = {
    window: {},
    location: {
      hostname: "saivenwang-byte.github.io",
      pathname: "/XiaoWangXueRiyu-v2/index.html",
      search: "?v=410",
      hash: "",
      replace: (url) => redirects.push(url),
    },
    URLSearchParams,
    setTimeout: () => 1,
    document: {},
  };
  vm.createContext(context);
  vm.runInContext(boot, context);
  assert.deepEqual(redirects, []);
});

test("机器基线区分内部缓存和固定公开链接", () => {
  const baseline = JSON.parse(read("docs/iteration-baseline.json"));
  assert.equal(String(baseline.current.cache), "412");
  assert.equal(String(baseline.current.public_link_version), "410");
  assert.equal(
    baseline.current.public,
    "https://saivenwang-byte.github.io/XiaoWangXueRiyu-v2/index.html?v=410"
  );
});

test("作者发布脚本读取固定公开版本而不是内部缓存版本", () => {
  const bat = read("帮你发布好了.bat");
  assert.match(bat, /findstr \/C:"const PUBLIC_LINK_VER"/);
  assert.match(bat, /index\.html\?v=%VER%/);
  assert.doesNotMatch(bat, /findstr \/C:"const CACHE_VER"/);
});
