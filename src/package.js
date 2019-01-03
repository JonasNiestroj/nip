const fs = require('fs-extra');

const getPackageFile = cwd => {
    return new Promise((resolve, reject) => {
        const pathToPackage = cwd + "/package.json";
        if (!fs.existsSync(pathToPackage)) {
            console.error("No package.json");
            reject("No package.json");
            return;
        }

        fs.readJson(pathToPackage, 'utf8').then(packageJson => {
            resolve(packageJson);
        });
    });
}

const setPackageFile = (cwd, json) => {
    const pathToPackage = cwd + "/package.json";
    if (!fs.existsSync(pathToPackage)) {
        console.error("No package.json");
        return;
    }

    fs.writeFile(pathToPackage, JSON.stringify(json, null, 2), 'utf-8');
}

module.exports = {
    getPackageFile: getPackageFile,
    setPackageFile: setPackageFile
}