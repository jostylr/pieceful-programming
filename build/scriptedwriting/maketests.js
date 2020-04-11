const f = require('./index.js');
const ext = '.pfp';

const util = require('util');
const {isDeepStrictEqual: deep} = util;
const path = require('path');
const {readdir, readFile, writeFile} = require('fs').promises;
const stringify = require('json-stringify-pretty-compact');
const cp = require('child_process');
const exec = util.promisify(cp.exec);
const deepdiff = require('deep-diff').diff;

const main = async function () {
    try {
        const {stdout, stderr} = await exec(
            'rsync -av ../../tests/src/*.pfp tests/src/'
        );
        console.log(stdout);
        if (stderr) {
            console.error("error:", stderr);
        }
    } catch (e) {
        console.log("error in syncing src:", e);
    }
    
    const src = "tests/src/";
    const out = "tests/json/";
    
    const srcfiles = (await readdir(src)).
        filter( file => (path.extname(file) === ext) ).
        map( file =>  path.basename(file, ext) );
    const results = await Promise.all(srcfiles.map( async (fname) => {
        let jsons = await Promise.all( [
            readFile(src + fname + ext, {encoding:'utf8'}).then(
                async txt => { return await f(txt, fname, {
                origin: src + fname + ext}); }
            ),
            readFile(out + fname + '.json', {encoding:'utf8'}).then( 
                txt => JSON.parse(txt)
            ).catch(e => {
                return null;
            })
        ]);
        if (  jsons[1] === null) {
            let testfile = `const f = require('../index.js');
            const ext = '.pfp';
            const tap = require('tap');
            const util = require('util');
            const {isDeepStrictEqual: deep} = util;
            
            const path = require('path');
            const {readdir, readFile, writeFile} = require('fs').promises;
            
            
            const main = async function () {
                const src = "tests/src/";
                const out = "tests/json/";
                const fname = 'FNAME'; 
                
                tap.test('Checking '+fname, async (t) => {
                    let jsons = await Promise.all( [
                        readFile(src + fname + ext, {encoding:'utf8'}).then(
                            async txt => await f(txt, fname, {
                                origin: src + fname + ext
                                }) 
                        ),
                        readFile(out + fname + '.json', {encoding:'utf8'}).then( 
                            txt => JSON.parse(txt)
                        ).catch(e => null )
                    ]);
                
                    t.ok(deep(jsons[0], jsons[1]));
                
                });
            };
            
            main();`;
            let tname = 'tests/' + fname + '.js';
            testfile = testfile.replace('FNAME', fname);
            await writeFile(tname, testfile);
            console.log('written test file ' + tname);
        }
        return [fname, jsons[1] && (deep(jsons[0], jsons[1]) ), jsons[0],
        jsons[1] ];  
    }) );
    
    const same = results.filter( arr => arr[1] );
    const diff = results.filter( arr => !arr[1] );
    
    console.log('The following are unchanged: ' + 
        same.map( arr => arr[0] ).join(',') );
    
    diff.forEach( async (arr) => {
        try {
            await writeFile(out + arr[0] + '-new.json', 
                stringify(arr[2]) );
            console.log(`New json file saved ${out+arr[0]}-new.json`);
            if (arr[3]) { // differences, not just a new one
                console.log('The differences are (new, old): ', 
                util.inspect(deepdiff(arr[2], arr[3]), {depth : 8, colors:true}) );
            }
        } catch (e) {
            console.log(`Error in saving ${out+arr[0]}-new.json ${e}`);
        }
    });
};

main();
