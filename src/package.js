const fs = require('fs-extra');

const getPackageFile = cwd => {
    const pathToPackage = cwd + "/package.json";
    if (!fs.existsSync(pathToPackage)) {
        console.error("No package.json");
        return;
    }

    const packageJson = fs.readFileSync(pathToPackage, 'utf8');
    let json;
    try {
        json = JSON.parse(packageJson);
    }
    catch (e) {
        console.error("Invalid package.json");
        process.exit(1);
    }
    return json;
}

module.exports = {
    getPackageFile: getPackageFile
}