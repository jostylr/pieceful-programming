const cmparse = require('./index.js');
const util = require('util');
const {isDeepStrictEqual: deep} = util;
const path = require('path');
const {readdir, readFile, writeFile} = require('fs').promises;
const stringify = require('json-stringify-pretty-compact');
const cp = require('child_process');
const exec = util.promisify(cp.exec);

const main = async function () {
    try {
        const {stdout, stderr} = await exec(
            'rsync -av ../../tests/src/ tests/src/'
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
    
    const mdfiles = (await readdir(src)).
        filter( file => (path.extname(file) === '.md') ).
        map( file =>  path.basename(file, '.md') );
    const results = await Promise.all(mdfiles.map( async (fname) => {
        let jsons = await Promise.all( [
            readFile(src + fname + '.md', {encoding:'utf8'}).then(
                async txt => { return await cmparse(txt, { prefix: fname,
                origin: src + fname + '.md'}); }
            ),
            readFile(out + fname + '.json', {encoding:'utf8'}).then( 
                txt => JSON.parse(txt)
            ).catch(e => null )
        ]);
        return [fname, jsons[1] && (deep(jsons[0], jsons[1]) ), jsons[0] ];  
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
        } catch (e) {
            console.log(`Error in saving ${out+arr[0]}-new.json ${e}`);
        }
    });
};

main();
