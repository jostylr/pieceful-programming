const tap = require('tap'); 
const myutils = require('../index.js'); 

const main =  async function () {
    tap.test('f=match', async (t) => {
    const s = myutils.makeScanners();
    console.log('hello');
    let subs = [];

    { a = s.match('c(ob)oo(o)lio', /(i)o/);
    t.equals(a[0], 'io', 'match substring');
    t.equals(a[1], 'i', 'match group');
    t.equals(a.index, 11, 'index');
    t.equals(a.input, 'c(ob)oo(o)lio', 'input');
    }


});
};

main();
