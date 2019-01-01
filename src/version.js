const semver = require('semver');

const getVersionData = version => {
    let type;
    let versionData = {};
    if (version.startsWith("http")) {
        // If it is a github url, handle this url as git
        if (version.includes('https://github.com/')) {
            type = 'git';
            versionData = {
                ...versionData,
                ...getGit(version),
                original: version
            };
        }
        else {
            type = 'url';
            versionData.url = version;
        }
    }
    else if (version.startsWith("git")) {
        type = 'git';
        versionData = {
            ...versionData,
            ...getGit(version),
            original: version
        };
    }
    else {
        type = 'numeric';
        versionData = {
            exactVersion: semver.coerce(version).version
        }
    }
    if (versionData.exactVersion) {
        versionData.useVersion = versionData.exactVersion;
    }
    else if (versionData.greaterVersion) {
        versionData.useVersion = versionData.greaterVersion;
    }
    else {
        versionData.useVersion = versionData.smallerThanVersion;
    }

    return { type, versionData };
};

const getGit = (version) => {
    // Check if there is an specific branch
    const split = version.split("#");
    if (split.length > 1) {
        return {
            branch: split[1],
            url: split[0]
        };
    }
    else {
        return {
            url: split[0]
        }
    }
};


const compareVersion = (v1, v2) => {
    if (semver.gt(v1, v2)) {
        return 1;
    }
    else if (semver.lt(v1, v2)) {
        return -1;
    }
    return 0;
};


const findBestVersion = (version, versionList) => {
    const validVersions = versionList.filter(availableVersion => {
        return semver.satisfies(availableVersion, version);
    }).map(filteredVersion => {
        return semver.coerce(filteredVersion);
    });
    validVersions.sort(compareVersion).reverse();

    if (validVersions.length > 0) {
        return validVersions[0];
    }

    return null;
};

module.exports = {
    getVersionData: getVersionData,
    compareVersion: compareVersion,
    findBestVersion: findBestVersion
}