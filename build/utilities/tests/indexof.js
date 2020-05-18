const tap = require('tap'); 
const myutils = require('../index.js'); 

const main =  async function () {
    tap.test('f=indexOf', async (t) => {
    const s = myutils.makeScanners();
    console.log('hello');
    let subs = [];

    { a = s.indexOf('c(ob)ool', 'o');
    t.equals(a, 5, 'str'); }

    { a = s.indexOf('c(ob)ool', /^[aeiou][^aeiou]/);
    t.equals(a, 6, 'reg'); }

    { a = s.indexOf('c(ob)ool', /[aeiou][^aeiou]/);
    t.equals(a, 6, 'reg not start'); }

    {a = s.indexOf('c(ob)oolioo', (str, i) => {
        if ( (str.slice(0,2) === 'oo') && (i> 7) ) {
            return ['oo'];
        } else {
            return null;
        }
    });
    t.equals(a, 9, 'function index trial'); }

    { a = s.indexOf('c(ob)ool', 'a');
    t.equals(a, -1, 'no match'); }

    { a = s.indexOf('c(ob)oolioo', 'i', {terminator:'l'});
    t.equals(a, -1, 'no match terminated'); }

    { a = s.indexOf('c(ob)oolioo', 'i', {terminator:'i'});
    t.equals(a, 8, 'match checked before terminator'); }

    { a = s.indexOf('c(ob)oolioo', 'i', {terminator:'i', last:true});
    t.equals(a, -1, 'match checked after terminator so no match'); }

    { a = s.indexOf('c(o[b{0}](o)o)ool', 'o');
    t.equals(a, 14, 'many nested brackets'); }

    { a = s.indexOf('ooo', 'oo' );
    t.equals(a, 0, 'simple match'); }

    { a = s.indexOf('ooo', 'oo', {start:1} );
    t.equals(a, 1, 'starting later'); }

    { a = s.indexOf('ooo', 'oo', {start:2} );
    t.equals(a,-1, 'no match due to starting to far in'); }
});
};

main();
