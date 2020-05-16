const tap = require('tap'); 
const myutils = require('../index.js'); 

const main =  async function () {
    tap.test('has', async(t) => {
    t.ok(myutils.has({a:5}, 'a'));
    t.notOk( myutils.has({a:5}, 'b'));
});
};

main();
