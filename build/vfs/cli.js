const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);

const env = {
    base : process.cwd(),
    write : async function write (originalTarget, text, encoding ='utf8') {
        const target = env.path(originalTarget, 'B');
        try {
            await fsp.writeFile(target, text, encoding); 
        } catch (e) {
            try {
                await env.mkdir(originalTarget);
            } catch (e) {
                env.error(`write: failed to create directory for writing ${target}`, e);
            }
            await fsp.writeFile(target, text, encoding); 
        }
        env.log(`write: File ${target} written`, 'write', 1);
        return true; //writefile does not return a value other than resolution
    },
    read : async function read (originalTarget, encoding = 'utf8') {
        const target = env.path(originalTarget, 'S');
        try {
            env.log(`read: Reading ${target}`, 'read', 1);
            return await fsp.readFile(target, {encoding} );
        } catch (e) {
            env.error(`read: Failure to read ${target}`, e); 
        }
    },
    fetch : async function fetch (url, local) {
        let ret; 
        //to be done. probably use axios or node-fetch on url
        //check whether local exists; if no local, get fresh
        ret =  url + local; // delete 
        
        //fetch it
        
        // ret = ...   the text here
        //save as local if local present
        return ret;
    },
    mkdir : async function mkdir (originalTarget) {
        const target = env.path(originalTarget, 'B');
        env.log(`mkdir: Creating ${path.dirname(target)}`, 'write', 3);
        try {
            await fsp.mkdir(path.dirname(target), {recursive: true});
            env.log(`mkdir: Directory ${path.dirname(target)} now exists`, 'write', 3);
        } catch (e) {
            env.error(`mkdir: Failed to create directory ${target}`);
        }
    },
    ls : async function ls (target) {
        let orig = target;
        target = env.path(target, 'S');
        let list = await fsp.readdir(target, {withFileTypes:true});
        let files = [];
        let dirs = [];
        list.forEach( (dirent) => {
            if (dirent.isFile() ) {
                files.push(path.join(orig, dirent.name) );
            }
            if (dirent.isDirectory() ) {
                dirs.push(path.join(orig, dirent.name) );
            }
        });
        env.log(`ls: Directory ${target} read`, 'read', 1, {files, dirs});
        return {files, dirs};
    },
    info : async function info (target) {
        target = env.path(target, 'S');
        let b = await fsp.lstat(target);
        return {
            access: b.atimeMs,
            modified : b.mtimeMs,
            change : b.ctimeMs,
            birth : b.birthtimeMs
        };
    },
    path : function pathProxy (target, defaultLead) {
        target = path.normalize(target);
        let ind = target.indexOf('./');
        let lead;
        if (ind !== -1) {
            lead = target.slice(0,ind).toUpperCase();
            target = target.slice(ind+2).trim();
        } else {
            lead = defaultLead || 'B';
        }
        let paths = env.paths;
        if (paths.hasOwnProperty(lead) ) {
            target = path.join(env.base, paths[lead], target);
        } else {
            env.error(`Base ${lead} not a valid path toggle. Target: ${target} with default ${env.paths[defaultLead]}`);  
        }
        return target;
    },
    exec : async function execProxy (cmd, cmdLineOptions={}, execOptions = {}) {
        if ( ! env.cmds.hasOwnProperty(cmd) ) {
            env.error(`Unknown command ${cmd}`);
            return;
        }  
        let cmdString = env.cmds[cmd](cmdLineOptions);
        if (execOptions.cwd) {
            execOptions.cwd = env.path(execOptions.cwd, 'M');
            console.log(execOptions.cwd);
        }
        let obj = await exec(cmdString, execOptions);
        if (obj.stderror) {
            env.log(`Standard Error in command ${cmd}: ${obj.stderror}`, 'exec', 3);
        }
        return obj.stdout; // stderr, stdout as properties
    },
    cmds : {
        tex2pdf : function (options ) {
            let osrc = options.src;
            let src = env.path( options.src + '.tex', 'M');
            let out = env.path( ( options.out || options.src) + '.pdf', 'B');
            let str = `latex ${src} && dvips ${osrc}.dvi; && ps2pdf ${osrc} ${out}`;
            return str;
        } 
    },
    log : function log (msg, tag='general', priority = 1, ...rest) {
        env.logs.push(msg, tag, priority, ...rest);
        if (priority >= env.printPriority) {
            console.log(msg);
        }
    },
    logs : [],
    printPriority : 3,
    error : function error (msg, data) {
        env.errors.push([msg, data]);
        throw Error(msg);
    },
    errors : []
};
env.paths = {
    'R' : '',
    '~' : '',
    'S' : 'src',
    'M' : 'middle',
    'B' : 'build'
}; 

module.exports = env;
