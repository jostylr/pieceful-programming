# Mono repo

This produces a script that can be run to create and manage all of this as a
monorepo. This expects to be run in the top-level of the repository. 

It has a variety of tasks to accomplish:

* generate package.json files or update them if they exist
* check outdated status; do not publish if outdated unless flag given; could
  run update with another flag; have ability to pin outdated version
* save hashes of all files that are not npmignored
* run tests
* publish if tests pass for all
* save hashes of all files (probably just those matching extensions such as js in top
  directory)


It needs: 

* list of directory names to manage as repos and their actual names. A root
  directory and a scope should be specified and other details
* current version number for anything that needs to be changed or initialized
* a JSON object file whose keys are file names and values are hashes. The
  files in the directory of the repo should be all included; if not, then it
  is to be updated. If so, compare the hashes
* list of dependencies from this monorepo; if it depends on something that
  changes, then it changes too


## Pre

This is where most of the work is. When done, it should either report errors
aborting all writing or 


    _"require"

    const crypto = require('crypto');
    const stream = require('stream');
    const pipeline = util.promisify(stream.pipeline);

    const root = 'build/';

    const pj = `_"boiler package.json"`;
    const getPackageJSON = _"get package json";
    const hash = _"hash";

const fileMatch = _"file match";

    const rsync = _"rsync dependencies";
    const test = _"run tests";
    const diffHashes = _"diff hashes";
    const diffDep = _"are pieceful dependencies diff";
    const install = _"install";



    const packageFile = fs.readFileSync(root + 'packages.txt', {encoding:'utf8'});
    let hashes;
    try {
        hashes = JSON.parse(fs.readFileSync('hashes.json', {encoding:'utf8'}));
    } catch (e) {
        hashes = {};
    }
    _":get public"
    _"process package file"
    _"sort package file"


    const run = _"run";

    run(packages);


[../pre.js](# "save:")

[get public]()

This reads in publish.txt and converts it into a list of packages to publish.
This later gets converted into a pck.diff being true if the package is
present. This is how we can keep the diff up to date on multiple runs of pre
before publishing; important that post gets run to remove this file. 

    let publish;
    try {
        publish = fs.readFileSync('publish.txt', {encoding: 'utf8'}).split('\n');
    } catch (e) {
        publish = [];
    }

### File Match


Not used anymore. scheduled for deletion

This takes in a directory and returns the list of files to hash. Currently the
idea is top level matching to extensions with .js, .mjs, .cjs. maybe also a
files: option in the repo manager. Ignoring package.json as it may have noisy
changes from JSONing. 

This is separate because may very much want to change how the file matching
works. 

    async function (dir) {
        const files = ( await readdir(dir) ).
            filter( (file) => {return ( 
                 file.slice(-3) === '.js' ) ||
                (file.slice(-4) === '.mjs' ) ||
                (file.slice(-4) === '.cjs' ); 
            }).map ( (file) => dir + '/' + file );
        return files;
    }

    
### Run Tests

Runs the test using a command, such as node tests/run.js

    async function (dir) {
        //get test files, then run through the commands
        let files = await readdir(dir + '/tests');
        files = files.filter( (file) => path.extname(file) === '.js');
        const n = files.length;
        let pass = true;
        for (let i = 0; i < n; i += 1) {
            _"exec | sub CMD, echo('`cd ${dir} && node tests/${files[i]}`') "     
            pass = pass && report.success; 
        }
        return pass;
    }

[running tap]()

``_"exec | sub CMD, echo('`cd ${dir} && ../../node_modules/.bin/tap -R terse`') "   ``

### Process Package File


The package file starts with the new version number. The rest of it is broken
up as different packages, each one having a name preceding with a `-` and
subsequent lines being extra information (currently dp for dependencies=>dep and pf
for pieceful dependencies => pfdep ).

Note that the packages array is also going to double as an object store using
the name as a key. This is trippy but should be fine because the name should
never be a number. 

We also attach the hash object from hashes.json for that package or create an
empty object if no hash existed. 

    const packages = packageFile.split('\n-');
    const version = packages.shift();
    packages.forEach( (txt, ind) => {
        const pck = { pfdep :[], dep :[]};
        const lines = txt.trim().split('\n');
        const name = pck.name = lines.shift().trim();
        pck.dir = root + name;
        pck.diff = publish.includes(pck.dir);
        _":dependencies"
        packages[ind] = pck;
        packages[name] = pck; 
        pck.hashes = hashes[name] || {};
    });
    
    

[dependencies]()

Here we are working on the line between package names. 



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

### Sort Package File

This is to sort the packages based on dependencies. A sort function that
compares the dependencies with  includes.

We basically want to know if pckA or pckB contains the other as a dependent.
If pckA is a dependent of pckB, return -1. If pckB is a dependent of pckA,
return +1. Otherwise, return 0. Both should not be a dependent of the other.  
    
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


### Get Package JSON

This reads in the package.json file. If there is a problem with that, we
create a package.json using the boilerplate and the stuff from the package
file. 

The return value is a boolean, true if something is different. Having to
create a new package.json qualifies. 

We attach the package.json object directly to the package. 

    async function (pck, version) {
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
    }



### Diff hashes

We need to decide if there is something different between these two hash
objects. We return true if they are different. 

We first test if they have different number of keys; if so, they are
different. Otherwise, we go through all the keys, checking for equality of the
hash. If they have the same length and different keys, then both will have
different keys. 

    async function (oldh, newh) {
        const nkeys = Object.keys(newh);
        const okeys = Object.keys(oldh);
        if (nkeys.length !== okeys.length) { return true;}
        return nkeys.some( key => newh[key] === oldh[key] );
    }


### Are pieceful dependencies diff

This takes in the package, to look at dependencies and whether they have been
updated (diff on them is set, they should already be done processing). Return
true if diff. Note this is only checked if everything else had not changed in
the package.

    function (curpck, packages) {
        const {pfdep} = curpck;
        return pfdep.some( name => packages[name].diff);
    }

### Install

This is perhaps the trickiest. Idea is to have caret levels and npm update
will update them if not a major change. Maybe afterwards, run npm outdate and
record in a log/display. 

If update changed anything, return true to show a diff happened. 

Start with reading in package.json, removing @pieceful dependencies, updating
any dependencies, saving package.json, running npm update, then adding back in
@pieceful dependencies (if any). 

If no package.json, generate one, putting in dependencies, save package.json, and then npm
installing. 

    async function (pck, packages) {
        let {json, dir, diff} = pck;
        _":update json"
        let deps = json.dependencies || {};
        _":remove pieceful dependencies"
        _":update other dependencies"
        _":save package.json"
        _":run npm"
        _":reload package.json"
        _":attach pieceful dependencies"
        return diff;
    }

[update json]()

This updates the json for description and files. If the files are different,
then we turn diff to true. 

    
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

[remove pieceful dependencies]()

We remove pieceful dependencies. As we go along, we check to see if the
dependencies have changed or not, subtracting found ones and then seeing if
there are any new ones. Note this is not checking if the versions are
different; that comes later.  

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

[update other dependencies]()

This takes a look at each dependency in package.json and in pck.dep and
updates the version if needed. Everything should be in caret notion. 

The pack.dep is of the form `[name, semver]` 

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
            _":compare semver"
        }
        newobjdep[key] = val;
    });
    json.dependencies = newobjdep;

[compare semver]()

We need to decide which value is more recent and go with that. If val is more
recent, then we set diff to true. We do this by converting the values into
three element arrays of numbers and comparing them. We use some to
short circuit the loop. 

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
    

[save package.json]()

    await writeFile(dir + '/package.json', JSON.stringify(pck.json, null, '\t') );

[run npm]()

    _"exec | sub CMD, echo('`cd ${dir} && npm update && npm outdated`')"

[reload package.json]()

    let updated = JSON.parse(await readFile(dir+ '/package.json', {encoding:'utf8'})).dependencies;
    _":check for updated version"

[check for updated version]()

Here we are trying to check for updated dependencies. The only thing might
change is the dependency number.

    Object.keys(updated).forEach( (key) => {
        if (updated[key] !== json.dependencies[key]) {
            diff = true;
            console.log(`Dependency ${key} was at ${json.dependencies[key]} but is now at ${updated[key]}`);
            json.dependencies[key] = updated[key];
        }
    });


[attach pieceful dependencies]()

    pck.pfdep.forEach( dep => {
        json.dependencies[ "@pieceful/" + dep] = packages[dep].version;
    });


### Run

Run is responsible for making sure everything is run in the right order. 

dirProcess takes in a directory name and returns a list of files to hash.
These get plugged into the hash function returning the [file name, hash] which
we then process to see if it is new or not. We then invoke the
process which deals with installing any new or outdated packages. 

pfdep are the pieceful dependencies and rsync them into node_modules if
needed. 

Diff is to decide whether the package needs to be updated or not. diff should
be true if it does. We first check with the hashes of the files and the
initial package reading from a previous run. We do the installation stuff and
we be sure to test it, followed be ensuring to pass along the previous diff if
nothing changed. If diff is ultimately true, then we should add this into the
publish.txt file. Note that the file is updated without regards to test
results. If something changed, it gets in there. Also note that the version
does not get updated until tests pass.  

    async function (packages) {
        let pass = true;
        const n = packages.length;
        const allHashes = {};
        for (let i = 0; i < n; i += 1) {
            _":per package"
        }

Finish up, recording exit code if something went wrong, create list to
publish, and record the hashes.

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
        savelog('pre'); 
    }


[per package]()

This is a per package processing, hashing the files, figuring out if
dependencies changes, testing, and updated version if needed. 

    const pck = packages[i];
    const {dir, pfdep, name} = pck;

Hash stuff

const files = await fileMatch(dir);
This did look up all the files that did the match. But with the creation of
the files to include, that seems to be sufficient. Note that below we assume
that the files are explicitly listed. If it is a directory or globbing, one
should do something more. Not anticipating needing that right now. 


    let files = pck.files.slice();
    files.push(pck.main);
    files = files.map( file => dir + '/' + file ); 
    const hashes = await Promise.all(files.map(hash));  
    //console.log(hashes);
    let diff = diffHashes(pck.hashes, hashes) || pck.diff; 
    pck.hashes = hashes;
    allHashes[name] = hashes;

Dependency stuff. Note that in pieceful dependencies, the name is listed so we
translate that into the package directory for rsync. 
    
    diff = await getPackageJSON(pck, version);
    diff = ( await install(pck, packages) ) || diff;
    await Promise.all(pfdep.map( (dep) => rsync(packages[dep].dir, dir) ));
    diff = diff || diffDep(pck, packages);
    pck.diff = diff;
        
Testing

    pck.pass = await test(dir);
    if (pck.pass) {
        console.log('Tests passed for ' + name);
    } else {
        console.log('Tests failed for ' + name);
    }

    if (diff) {
        console.log(name + ' needs publishing');
    } else {
        console.log(name + ' does not need publishing');
    }

Update package version if changes dictate it

    if (pck.pass && diff) { 
        pck.json.version = version;
        fs.writeFileSync(dir + '/package.json',
            JSON.stringify(pck.json, null, '\t') );
    }
    pass = pck.pass && pass;


### Rsync Dependencies

Here we want to copy the top level without node_modules and then copy the
node_modules into the same level. We also want to create package.json without
the pieceful dependencies and then, after installing/updating, put them in. 

    async function (src, dest) {
        _"exec | sub CMD, echo('`rsync -av --exclude "tests" ${src} ${dest}/node_modules/`') "
    }


[alternative]()

This version is to embrace the flat node_modules. It seems that it is not
needed and so not going to worry about it. Nested works fine, if wasted. 

    rsync -av --exclude "node_modules" src dest/node_modules/
    rsync -av src/node_modules/ dest/node_modules/



### Hash

This takes in a filename and returns a hash. It is asynchronous. 

    async function (fname) {
        const hash = crypto.createHash('sha256');
        hash.setEncoding('hex');
        await pipeline(
            fs.createReadStream(fname),
            hash
        );
        return [fname, hash.digest('hex')];
    }


## Boiler package.json

This is an object string that will get processed into a new object for each
package and either forms the base of a new object or as a replacement for a
package.json (that we can update any of the below data if needed probably
unnecessary). 

    {
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
    }


## Publish

This does the actual publishing. What to publish is setup by the pre step.
This does not remove publish.txt automatically. Once done successfully, run
post.js to say all of it has been published. 

This should emit an error code if something errors...


    _"require"

    const toPublish = fs.readFileSync('publish.txt', {encoding:'utf8'});
    
    const list = toPublish.split('\n');

    const publish = async function () {
        _":async"   
        savelog('publish');
    };

    publish();

[../publish.js](# "save:")



[async]()

This is our async function. It is so that we can await each npm publish
attempt. 

    const n = list.length;
    for (let i = 0; i < n; i += 1) {
        const dir = list[i];
        _"exec | sub CMD, echo('`cd ${dir} && npm publish --dry-run`')"
    }




## Post

This is post-publish. It serves to cement all the hash and version changes and
removes the publish file. Do not call this until publish is done. 


    _"require"
    
    try {
        fs.unlinkSync('publish.txt');
        console.log('Publish list removed');
    } catch (e) {
        console.error('Something went wrong', e);
        process.exitCode = 1;
    }
    
[../post.js](# "save:")


## Require

Stuff to load and use for all of these. 

    const fs = require('fs');
    const cp = require('child_process');
    const util = require('util');
    const exec = util.promisify(cp.exec);
    const {readFile, readdir, writeFile} = fs.promises; 
    const report = {log:[], err:[]};
    const log = _":log";
    const errlog = _":err";
    const savelog = _":save log";
    const path = require('path');

[log]() 

    async function (title, body) {
        if (body) {
            report.log.push(title + body);
        }
    }

[err]()

    _":log | sub log, err"

[save log]()

    async function (scriptname) {
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
    }

## Exec

A common pattern in all of this is to execute a command. It has the form of
trying that and reporting out the info. 

    let report;
    const cmd = CMD;
    try {
        const {stdout, stderr} = await exec(cmd);
        _":report"
        report = {stdout, stderr, success:true};
    } catch (e) {
        process.exitCode = e.code;
        console.error('ERROR:' + cmd + '::' + e);
        const {stdout, stderr}  = e;
        _":report"
        report = {stdout, stderr, success:false};
    }

[report]()

    log(cmd + '\n---\n', stdout);
    errlog(cmd + '\n---\n', stderr);
