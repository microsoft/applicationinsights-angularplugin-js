const minimumVersions = {
    22: [23, 4],
    24: [22, 1]
};

function isSupportedNodeVersion(version) {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) {
        return false;
    }

    const [major, minor, patch] = match.slice(1).map(Number);
    const minimum = minimumVersions[major];
    return !!minimum && (minor > minimum[0] || (minor === minimum[0] && patch >= minimum[1]));
}

function checkNodeVersion() {
    if (!isSupportedNodeVersion(process.versions.node)) {
        console.error(
            `Unsupported Node.js ${process.versions.node}. Repository tooling requires Node.js ` +
            "22.23.4+ (22.x) or 24.22.1+ (24.x) for the October 21, 2026 security fixes. " +
            "Use the version in .nvmrc before installing dependencies or running tools."
        );
        process.exit(1);
    }
}

module.exports = { isSupportedNodeVersion, checkNodeVersion };

if (require.main === module) {
    checkNodeVersion();
}
