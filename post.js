const fs = require('fs');
const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);
const {readFile, readdir, writeFile} = fs.promises; 
const report = {log:[], err:[]};
const log = async function (title, body) {
    if (body) {
        report.log.push(title + body);
    }
};
const errlog = async function (title, body) {
    if (body) {
        report.err.push(title + body);
    }
};
const savelog = async function (scriptname) {
    const time = Date.now(); 
    const log = report.log.join('\n===\n');
    const err = report.err.join('\n===\n');
    await Promise.all([
        writeFile('logs/log-'+scriptname+'-'+time+'.txt', log),
        writeFile('logs/err-'+scriptname+'-'+time+'.txt', err)
    ]);
    console.log("LOGS", log, "ERRORS", err);
};

try {
    fs.renameSync('new-hashes.txt', 'hashes.txt');
    console.log('Hash file updated');
    fs.unlinkSync('publish.txt');
    console.log('Publish list removed');
} catch (e) {
    console.error('Something went wrong', e);
    process.exitCode = 1;
}
