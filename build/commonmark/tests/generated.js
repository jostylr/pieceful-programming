const tap = require('tap');
const cmparse = require('../index.js');
const util = require('util');
const {isDeepStrictEqual: deep} = util;

const path = require('path');
const {readdir, readFile, writeFile} = require('fs').promises;


const main = async function () {
    const src = "tests/src/";
    const out = "tests/json/";
    
    const mdfiles = (await readdir(src)).
        filter( file => (path.extname(file) === '.md') ).
        map( file =>  path.basename(file, '.md') );
    const results = await Promise.all(mdfiles.map( async (fname) => {
        tap.test('Checking '+fname, async (t) => {
            let jsons = await Promise.all( [
                readFile(src + fname + '.md', {encoding:'utf8'}).then(
                    async txt => await cmparse(txt, {prefix: fname,
                        origin: src + fname + '.md'
                        }) 
                ),
                readFile(out + fname + '.json', {encoding:'utf8'}).then( 
                    txt => JSON.parse(txt)
                ).catch(e => null )
            ]);
    
            t.ok(deep(jsons[0], jsons[1]));
    
        })
    }) );
};

main();
