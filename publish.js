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
        writeFile('logs/log-'+scriptname+'.txt', log),
        writeFile('logs/log-'+scriptname+'-'+time+'.txt', log),
        ( (err) ?  
            writeFile('logs/err-'+scriptname+'-'+time+'.txt', err) :
            ''
        )
    ]);
    //console.log("LOGS", log);
    if (err) { 
        console.log("ERRORS", err);
    }
};
const path = require('path');

const toPublish = fs.readFileSync('publish.txt', {encoding:'utf8'});

const list = toPublish.split('\n');

const publish = async function () {
    const n = list.length;
    for (let i = 0; i < n; i += 1) {
        const dir = list[i];
        let report;
        const cmd = `cd ${dir} && npm publish --dry-run`;
        try {
            const {stdout, stderr} = await exec(cmd);
            log(cmd + '\n---\n', stdout);
            errlog(cmd + '\n---\n', stderr);
            report = {stdout, stderr, success:true};
        } catch (e) {
            process.exitCode = e.code;
            console.error('ERROR:' + cmd + '::' + e);
            const {stdout, stderr}  = e;
            log(cmd + '\n---\n', stdout);
            errlog(cmd + '\n---\n', stderr);
            report = {stdout, stderr, success:false};
        }
    }   
    savelog('publish');
};

publish();
