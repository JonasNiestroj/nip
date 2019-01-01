const os = require('os');
const fs = require('fs-extra');

const homeDir = os.homedir();
const nipDir = homeDir + "/.nip";

if (!fs.existsSync(nipDir)) {
    fs.mkdirSync(nipDir);
}

const MAINDIR = nipDir;

const nipCacheDir = nipDir + "/cache";
if (!fs.existsSync(nipCacheDir)) {
    fs.mkdirSync(nipCacheDir);
}

const CACHEDIR = nipCacheDir;

const nipNodeDir = process.cwd() + "/node_modules";

if (!fs.existsSync(nipCacheDir + '/installed')) {
    fs.createFile(nipCacheDir + "/installed");
}

const NODEDIR = nipNodeDir;
const PACKAGEFILE = nipCacheDir + "/installed";

module.exports = {
    MAINDIR: MAINDIR,
    CACHEDIR: CACHEDIR,
    NODEDIR: NODEDIR,
    PACKAGEFILE: PACKAGEFILE
}