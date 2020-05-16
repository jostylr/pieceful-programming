const tap = require('tap'); 
const myutils = require('../index.js'); 

const main =  async function () {
    tap.test('simple indexOf', async (t) => {
    const s = myutils.makeScanners();
    console.log('hello');
    t.ok(s.descend({}));
});
};

main();
