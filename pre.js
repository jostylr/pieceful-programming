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
    console.log("LOGS", log);
    console.log("ERRORS", err);
};

const crypto = require('crypto');
const stream = require('stream');
const pipeline = util.promisify(stream.pipeline);

const root = 'build/';

const pj = `{
  "homepage": "https://github.com/jostylr/pieceful-programming",
  "author": {
    "name": "James Taylor",
    "email": "jostylr@gmail.com"
  },
  "repository": {
    "type": "git",
    "url": "git://github.com/jostylr/pieceful-programming.git"
  },
  "bugs": {
    "url": "https://github.com/jostylr/pieceful-programming/issues"
  },
  "license": "MIT", 
  "engines": {
    "node": ">=12.0"
  },
  "keywords": ["literate", "pieceful"]
}`;
const getPackageJSON = async function (pck, version) {
    const {dir, name} = pck;
    let json;
    let diff = false;
    try {
        json = JSON.parse(await readFile(dir+ '/package.json', {encoding:'utf8'}));
        if (json.version === version) {
            diff = true;
        }
    } catch (e) {
        json = JSON.parse(pj);
        json.name = '@pieceful/' + name;
        json.version = version;
        diff = true;
    }
    pck.json = json;
    return diff;
};
const hash = async function (fname) {
    const hash = crypto.createHash('sha256');
    hash.setEncoding('hex');
    await pipeline(
        fs.createReadStream(fname),
        hash
    );
    return [fname, hash.digest('hex')];
};
const rsync = async function (src, dest) {
    let report;
    const cmd = `rsync -av --exclude "tests" ${src} ${dest}/node_modules/`;
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
};
const test = async function (dir) {
    let report;
    const cmd = `cd ${dir} && node tests/*.js`;
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
    return report.success;
};
const diffHashes = async function (oldh, newh) {
    const nkeys = Object.keys(newh);
    const okeys = Object.keys(oldh);
    if (nkeys.length !== okeys.length) { return true;}
    return nkeys.some( key => newh[key] === oldh[key] );
};
const diffDep = function (curpck, packages) {
    const {pfdep} = curpck;
    return pfdep.some( name => packages[name].diff);
};
const install = async function (pck, packages) {
    let {json, dir, diff} = pck;
    json.description = pck.description;
    if (json.main !== pck.main) {
        json.main = pck.main;
        diff = true;
    }
    { 
        let oldfiles = json.files;
        let newfiles = json.files = pck.files;
        if (oldfiles) {
            if (oldfiles.length !== newfiles.length) {
                diff = true;
            } else {
                diff = newfiles.some( file => !oldfiles.includes(file) ) || diff;
            }
        } else {
            diff = true;
        }
    }
    let deps = json.dependencies || {};
    const slimpfdep = [...pck.pfdep];
    Object.keys(deps).forEach( key => {
        if (key.slice(0,10) === '@pieceful/') {
            delete deps[key];
            if (!diff) { return; }
            let ind = slimpfdep.indexOf[key.slice(10)];
            if (ind === -1) { 
                diff = true;
                return ;
            }
            slimpfdep.splice(ind,1);
        }
    });
    if (slimpfdep.length !== 0) {
        diff = true;
    }
    let newdep = pck.dep;
    let olddeps = Object.keys(deps);
    if (newdep.length !== olddeps.length) {
        diff = true;
    } 
    let newobjdep = {};
    newdep.forEach( ([key, val]) => {
        let oldval = deps[key];
        if (!oldval) {
            diff = true;
        } else {
            let vals = val.slice(1).split('.').map( str => str*1 );
            let oldvals = oldval.slice(1).split('.').map( str => str*1 );
            vals.some( (num, ind) => {
                let oldnum = oldvals[ind];
                if (num > oldnum) {
                    diff = true;
                    return true;
                } else if (num < oldnum) {
                    val = oldval;
                    return true;
                } else {
                    return false;
                }
            });
        }
        newobjdep[key] = val;
    });
    json.dependencies = newobjdep;
    await writeFile(dir + '/package.json', JSON.stringify(pck.json, null, '\t') );
    let report;
    const cmd = `cd ${dir} && npm update && npm outdated`;
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
    let updated = JSON.parse(await readFile(dir+ '/package.json', {encoding:'utf8'})).dependencies;
    Object.keys(updated).forEach( (key) => {
        if (updated[key] !== json.dependencies[key]) {
            diff = true;
            json.dependencies[key] = updated[key];
        }
    });
    pck.pfdep.forEach( dep => {
        json.dependencies[ "@pieceful/" + dep] = packages[dep].version;
    });
    return diff;
};



const packageFile = fs.readFileSync(root + 'packages.txt', {encoding:'utf8'});
let hashes;
try {
    hashes = JSON.parse(fs.readFileSync('hashes.json', {encoding:'utf8'}));
} catch (e) {
    hashes = {};
}
let publish;
try {
    publish = fs.readFileSync('publish.txt', {encoding: 'utf8'}).split('\n');
} catch (e) {
    publish = [];
}
const packages = packageFile.split('\n-');
const version = packages.shift();
packages.forEach( (txt, ind) => {
    const pck = { pfdep :[], dep :[]};
    const lines = txt.trim().split('\n');
    const name = pck.name = lines.shift().trim();
    pck.dir = root + name;
    pck.diff = publish.includes(pck.dir);
    lines.forEach( (line) => {
        const [typ, argtxt] = line.split(':');
        if (typ === 'desc') {
            pck.description = argtxt.trim();
            return;
        }
        if (typ === 'main') {
            pck.main = argtxt.trim();
            return;
        }
        const args = argtxt.split(',').map( el => el.trim() );
        if (typ === 'files') {
            pck.files = args;
            return;
        }
        if (typ === 'pf') {
            pck.pfdep = args;
        } else if (typ === 'dp') {
            pck.dep = args.map( el => {
                let pair = el.split(' ');
                pair[1] = '^'+pair[1];
                return pair;
            });
        } else {
            throw "unrecognized package line: " + line;
        }
    });
    pck.description = pck.description || "A very useful part of pieceful programming";
    pck.files = pck.files || []; // main is automatically included
    pck.main = 'index.js';
    packages[ind] = pck;
    packages[name] = pck; 
    pck.hashes = hashes[name] || {};
});
packages.sort( (pckA, pckB) => {
    const aname = pckA.name;
    const bname = pckB.name;
    const adep = pckA.pfdep;
    const bdep = pckB.pfdep;
    const aneedsb = adep.includes(bname);
    const bneedsa = bdep.include(aname);
    if (aneedsb && bneedsa) {
        throw "Mutual Package Dependency " + aname + " " + bname;
    }
    if (aneedsb) {
        return 1;
    } else if (bneedsa) {
        return -1;
    } else {
        return 0;
    }
});


const run = async function (packages) {
    let pass = true;
    const n = packages.length;
    const allHashes = {};
    for (let i = 0; i < n; i += 1) {
        const pck = packages[i];
        const {dir, pfdep, name} = pck;
        let files = pck.files.slice();
        files.push(pck.main);
        files = files.map( file => dir + '/' + file ); 
        const hashes = await Promise.all(files.map(hash));  
        console.log(hashes);
        let diff = diffHashes(pck.hashes, hashes) || pck.diff; 
        pck.hashes = hashes;
        allHashes[name] = hashes;
        diff = await getPackageJSON(pck, version);
        diff = ( await install(pck, packages) ) || diff;
        await Promise.all(pfdep.map( (dep) => rsync(packages[dep].dir, dir) ));
        diff = diff || diffDep(pck, packages);
        pck.diff = diff;
        pck.pass = await test(dir);
        if (pck.pass && diff) { 
            pck.json.version = version;
            fs.writeFileSync(dir + '/package.json',
                JSON.stringify(pck.json, null, '\t') );
        }
        pass = pck.pass && pass;
    }
    if (!pass) {
        process.exitCode = 1;
    }
    const toPublish = packages.
        filter( pck => pck.diff ).
        map (pck => pck.dir ).
        join('\n');
    await Promise.all( [
        writeFile('publish.txt', toPublish),
        writeFile('hashes.json', JSON.stringify(allHashes) )
    ]);
    savelog('Pre'); 
};

run(packages);
