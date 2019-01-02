const { startInstall, installPackage } = require('./install.js');

const params = [];

for (let i = 2; i < process.argv.length; i++) {
    params.push(process.argv[i]);
}

const command = params.shift();

if (command === "install" && params.length === 0) {
    let startTime = Date.now();
    startInstall(process.cwd(), 'development').then(() => {
        let endTime = Date.now();
        console.log("Finished after " + (endTime - startTime) + "ms");
    });
}
else if (command === "install") {
    let package = params.shift();
    let key = "";
    let version = "";
    if (package.includes("@")) {
        let splitted = package.split("@");
        key = splitted[0];
        version = splitted[1];
    }
    else {
        key = package;
        version = "*";
    }
    let startTime = Date.now();
    installPackage(process.cwd(), key, version).then(() => {
        let endTime = Date.now();
        console.log("Finished after " + (endTime - startTime) + "ms");
    }).catch(error => {
        console.error(error);
    });
}