const tap = require('tap'); 
const myutils = require('../index.js'); 

const main =  async function () {
    tap.test('f=lastIndexOf', async (t) => {
    const s = myutils.makeScanners();
    console.log('hello');
    let subs = [];

    { a = s.lastIndexOf('c(ob)oo(o)l', 'o');
    t.equals(a, 6, 'last index'); }

    { a = s.lastIndexOf('c(ob)oo(o)l', 'o', {lastIndex: 5} );
    t.equals(a, 5, 'last index with cutoff'); }

});
};

main();
