const fs = require('fs-extra');
const { exec } = require('child_process');
const path = require('path');
const axios = require('axios');
const { MAINDIR, CACHEDIR, NODEDIR } = require('./paths.js');

const { getVersionData, compareVersion, findBestVersion } = require('./version.js');
const { getPackageFile, setPackageFile } = require('./package.js');

let chain = [];

const handleTarArchiveDownload = (response, key, resolve, reject) => {
    const downloadPath = `${MAINDIR}/${key}.tgz`;
    const file = fs.createWriteStream(downloadPath);
    response.data.pipe(file);
    file.on('finish', () => {
        const cacheDir = CACHEDIR + "/" + key;
        fs.ensureDir(cacheDir);
        fs.emptyDir(MAINDIR + "/" + key, () => {
            const command = `tar -xvzf ${MAINDIR}/${key}.tgz -C ${MAINDIR}/${key}`;
            exec(command, (err, stdout, stderr) => {
                fs.readdir(`${MAINDIR}/${key}`, (error, files) => {
                    if (error) {
                        console.log(MAINDIR + "/" + key);
                        process.exit(1);
                        console.error(error);
                        reject();
                        return;
                    }
                    const extractedFolder = files[0];
                    if (!extractedFolder) {
                        console.log("Tararchive was empty");
                        reject();
                    }
                    getPackageFile(`${MAINDIR}/${key}/${extractedFolder}`).then(json => {
                        if (!json) {
                            console.log("No json in tararchive");
                            process.exit(1);
                        }
                        fs.remove(`${MAINDIR}/${key}.tgz`);
                        const version = json.version;
                        const versionCacheDir = `${cacheDir}/${version}`;
                        fs.move(`${MAINDIR}/${key}/${extractedFolder}`, versionCacheDir, (error) => {
                            fs.remove(`${MAINDIR}/${key}`);
                            install(versionCacheDir).then(() => {
                                resolve(version);
                            });
                        });
                    }).catch(error => {
                        console.error("Error in handleTarArchiveDownload", key);
                    });

                });


            });
        });

    })

};

const handleTarArchiveError = (e, reject) => {
    console.log("Unable to fetch tararchive", e);
    reject();
}

const getTarArchive = (archive, key) => {
    return new Promise((resolve, reject) => {
        axios.get(archive, { responseType: 'stream' }).then(response => handleTarArchiveDownload(response, key, resolve, reject))
            .catch(error => handleTarArchiveError(error, reject));
    })

};

const install = (cwd, environment) => {
    return Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            getPackageFile(cwd).then(package => {
                const name = package.name || cwd;
                const parentVersion = package.version;
                const key = `${name}@${parentVersion}`;
                if (chain.includes(key)) {
                    resolve();
                    return;
                }
                chain.push(key);

                let tab = '';
                let tab2 = '';
                for (let i = 1; i < chain.length; i++) {
                    tab += '    ';
                }
                for (let i = 0; i < chain.length; i++) {
                    tab2 += '      ';
                }

                const top = chain.length <= 2;

                if (top) {
                    console.log(`${tab}Installing package`, name, parentVersion);
                }

                let fullDeps = {
                    ...package.dependencies
                };
                if (environment === 'development') {
                    fullDeps = {
                        ...fullDeps,
                        ...package.devDependencies
                    }
                }

                const dependencyKeys = Object.keys(fullDeps);
                if (dependencyKeys.length > 0) {
                    console.log(`${key} has ${dependencyKeys.length} dependencies: ${dependencyKeys}`);
                    const installDependency = () => {
                        if (top) {
                            console.log(`${tab2}${name} dependencies left: ${dependencyKeys.length}`);
                        }
                        let promises = [];
                        for (let i = 0; i < dependencyKeys.length; i++) {
                            let version = fullDeps[dependencyKeys[i]];
                            promises.push(installModule(dependencyKeys[i], version));
                        }
                        Promise.all(promises).then(response => {
                            if (top) {
                                console.log(`${tab}Installation of package ${name} completed`);
                            }
                            fs.exists(`${CACHEDIR}/${name}/${parentVersion}`, exists => {
                                if (exists) {
                                    fs.ensureDir(`${CACHEDIR}/${name}/${parentVersion}/node_modules`, () => {
                                        response.forEach(element => {
                                            const command = `mklink /d /j \"${CACHEDIR}/${name}/${parentVersion}/node_modules/${element[1]}\" \"${element[0]}\"`;
                                            exec(command);
                                        });
                                    });
                                }
                                resolve();
                                return;
                            });
                        }).catch(err => {
                            reject(`Unable to install package: ${err.message}`);
                        });
                    }
                    installDependency();
                }
                else {
                    console.log(`${tab}Installation of package ${name} completed`);
                    resolve();
                }
            }).catch(error => {
                console.error("Error in install", cwd);
            });

        });
    }).then(() => {
        if (cwd.indexOf(MAINDIR) !== 0) {
            return;
        }
        getPackageFile(cwd).then(package => {
            const name = package.name || cwd;

            const parentDir = path.resolve(`${cwd}/..`);
            fs.readdir(parentDir, (error, folders) => {
                if (error) {
                    console.error(error);
                }
                else {
                    let highest = null;
                    for (let i = 0; i < folders.length; i++) {
                        const folder = folders[i];
                        if (highest === null) {
                            highest = folder;
                            continue;
                        }

                        const realVersion = getVersionData(folder);
                        const version2 = realVersion.versionData.useVersion;
                        const comparitor = compareVersion(highest, version2);

                        if (comparitor === 1) {
                            highest = version2;
                        }
                    }
                    fs.remove(`${NODEDIR}/${name}`, () => {
                        const command = `mklink /d /j \"${NODEDIR}/${name}\" \"${parentDir}/${highest}\"`;
                        exec(command);
                    });
                }
            })
        }).catch(error => {
            console.error("Error in install2", cwd);
        });

    }).then(() => {
        chain.pop();
    });
};

const startInstall = (cwd, environment) => {
    return new Promise((resolve, reject) => {
        const nodeDir = `${cwd}/node_modules`;
        fs.emptyDir(nodeDir, () => {
            install(cwd, environment).then(() => resolve());
        });
    });
};

const getModuleFromNpm = (key, version) => {
    return Promise.resolve().then(() => {
        return new Promise((resolve, reject) => {
            axios.get('https://registry.npmjs.org/' + key).then(res => {
                let response = res.data;
                if (!response.versions) {
                    console.error("No version data from npm");
                    resolve();
                    return;
                }

                const usableVersion = findBestVersion(version, Object.keys(response.versions));
                if (usableVersion) {
                    const versionData = response.versions[usableVersion.version ? usableVersion.version : usableVersion];
                    if (versionData.dist) {
                        const archive = versionData.dist.tarball;
                        getTarArchive(archive, key).then(actualVersion => {
                            resolve(actualVersion);
                        }).catch(error => reject(error));
                    }
                    return;
                }
                console.error("Unable to find version to match", version);
                console.error("Available versions: ");
                const keys = Object.keys(response.versions);
                for (let i = 0; i < keys.length; i++) {
                    const availableVersion = keys[i];
                    console.error(availableVersion);
                }
                reject(new Error("Could not find version"));
            }).catch(error => {
                console.error(error);
                reject(error);
            })
        });
    });
};

const installModule = (key, version) => {
    return new Promise((resolve, reject) => {
        let type;
        let versionData;
        try {
            const result = getVersionData(version);
            type = result.type;
            versionData = result.versionData;
        }
        catch (err) {
            console.log(`${key} Unable to install package:`, err);
            reject(err);
            throw err;
        }
        const packageCacheDir = `${CACHEDIR}/${key}`;

        const handleExistingInstallation = cwd => {
            install(cwd).then(() => {
                resolve([cwd, key]);
            });
        };

        if (type === 'numeric') {
            let versionCacheDir = `${packageCacheDir}/${versionData.useVersion}`;
            fs.exists(versionCacheDir, exists => {
                if (exists) {
                    handleExistingInstallation(versionCacheDir);
                }
                else {
                    getModuleFromNpm(key, version).then(actualVersion => {
                        versionCacheDir = `${packageCacheDir}/${actualVersion}`;
                        resolve([versionCacheDir, key, actualVersion]);
                    }).catch(e => {
                        console.log(key + " Unable to install package:", e);
                        throw e;
                    });
                }
            })
        }
        else if (type === 'url') {
            const url = versionData.url;
            const urlSplit = url.split(".");
            const ending = urlSplit[urlSplit.length - 1];

            if (ending === "tgz") {
                getTarArchive(version, key).then(version => {
                    const versionCacheDir = packageCacheDir + "/" + version;
                    resolve([versionCacheDir, key, version]);
                });
            }
        }
        else if (type === "git") {
            /*let command = "git clone --depth 1 " + versionData.url + " " + MAIN_DIR + "/" + key;
            if (versionData.branch) {
                command += " -b " + versionData.branch;
            };

            const fullUrl = versionData.original;

            if (checkManifest(fullUrl, key)) {
                return;
            }

            exec("rm -rf " + MAINDIR + "/" + key, () => {
                if (!fs.existsSync(packageCacheDir)) {
                    fs.mkdirSync(packageCacheDir);
                }
                exec(command, err => {
                    const extractedFolder = "package";
                    const json = getPackageFile(MAINDIR + "/" + extractedFolder);
                    if (!json) {
                        console.log("No json in git repo");
                        process.exit(1);
                    }

                    const version = json.version;
                    const versionCacheDir = packageCacheDir + "/" + version;

                    exec("mv " + MAINDIR + "/" + extractedFolder + " " + versionCacheDir, () => {
                        exec("rm -rf " + MAINDIR + "/" + extractedFolder, () => {
                            install(versionCacheDir).then(() => {
                                resolve(version);
                            });
                        });
                    });
                });
            });*/
        }
    });
}

const installPackage = (cwd, key, version) => {
    return new Promise((resolve, reject) => {
        installModule(key, version).then(response => {
            getPackageFile(cwd).then(json => {
                json.dependencies[key] = response[2];
                setPackageFile(cwd, json);
                resolve();
            }).catch(error => {
                console.log("Error in installPackage", cwd, key, version);
            });
        }).catch(error => {
            reject(error);
        });
    });
};

module.exports = {
    startInstall: startInstall,
    installPackage: installPackage
};