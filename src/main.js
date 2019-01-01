const { startInstall } = require('./install.js');

const params = [];

for (let i = 2; i < process.argv.length; i++) {
    params.push(process.argv[i]);
}

const command = params.shift();

if (command === "install") {
    let startTime = Date.now();
    startInstall(process.cwd(), 'development').then(() => {
        let endTime = Date.now();
        console.log("Finished after " + (endTime - startTime) + "ms");
    });
}