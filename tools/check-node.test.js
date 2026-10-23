const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const { isSupportedNodeVersion } = require("./check-node");

for (const version of ["22.23.4", "22.23.5", "22.24.0", "24.22.1", "24.22.2", "24.23.0"]) {
    test(`accepts patched supported Node.js ${version}`, () => {
        assert.equal(isSupportedNodeVersion(version), true);
    });
}

for (const version of [
    "20.20.0", "22.23.3", "22.22.99", "24.22.0", "24.21.99",
    "23.23.4", "25.22.1", "26.12.1", "27.0.0",
    "22", "24.22", "v24.22.1", "24.22.1-rc.1", "24.22.1\n", ""
]) {
    test(`rejects unpatched, untested or invalid Node.js ${JSON.stringify(version)}`, () => {
        assert.equal(isSupportedNodeVersion(version), false);
    });
}

test("the CLI checks the executing runtime and ignores version environment overrides", () => {
    const result = spawnSync(process.execPath, ["-e", [
        'Object.defineProperty(process.versions, "node", { value: "24.22.0" });',
        'require("./check-node").checkNodeVersion();',
        'console.log("tool started");'
    ].join("\n")], {
        cwd: __dirname,
        encoding: "utf8",
        env: { ...process.env, NODE_VERSION: "24.22.1", npm_config_node_version: "24.22.1" }
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unsupported Node\.js 24\.22\.0/);
    assert.equal(result.stdout, "");
});

test("the CLI accepts the selected runtime", () => {
    const result = spawnSync(process.execPath, [join(__dirname, "check-node.js")], { encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
});

test(".nvmrc selects a patched supported runtime", () => {
    const version = readFileSync(join(__dirname, "..", ".nvmrc"), "utf8").trim();
    assert.equal(isSupportedNodeVersion(version), true);
});

test("root and sample lockfiles contain only fixed standalone Undici versions", () => {
    for (const relativePath of ["package-lock.json", "sample/applicationinsights-angularplugin-sample/package-lock.json"]) {
        const lock = JSON.parse(readFileSync(join(__dirname, "..", relativePath), "utf8"));
        let count = 0;
        for (const [path, entry] of Object.entries(lock.packages)) {
            if (path.endsWith("node_modules/undici")) {
                const [major, minor, patch] = entry.version.split(".").map(Number);
                const minimumMinor = { 6: 29, 7: 30 }[major];
                assert.ok(minimumMinor && (minor > minimumMinor || (minor === minimumMinor && patch >= 1)),
                    `${relativePath}: ${path} has unreviewed Undici ${entry.version}`);
                count++;
            }
        }
        assert.ok(count > 0, `${relativePath}: expected standalone Undici dependencies`);
    }
});
