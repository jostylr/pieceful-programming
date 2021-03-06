const f = require('../index.js');
            const ext = '.pfp';
            const tap = require('tap');
            const util = require('util');
            const {isDeepStrictEqual: deep} = util;
            
            const path = require('path');
            const {readdir, readFile, writeFile} = require('fs').promises;
            
            
            const main = async function () {
                const src = "tests/src/";
                const out = "tests/json/";
                const fname = 'codeblocks'; 
                
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
            
            main();