const tap = require('tap'); 
const myutils = require('../index.js'); 

const main =  async function () {
    tap.test('simple indexOf', async (t) => {
    const s = myutils.makeScanners();
    console.log('hello');
    let subs = [];
    s.descend({
        str : 'This',
        top : (a) => {subs.push(a); return 2;}
    });
    t.equal(subs.join(''),'Thisis', 'skipping by 2');

    {
    let a = [];
    let ret = s.descend({
        str : 'This(5)',
        terminator : 's',
        top : (c) => {a.push(c[0]); return null;}
    });
    t.equals(ret.join(','), '3,true', 'return value');
    t.equal(a.join(''), 'Thi', 'checking terminating');
    }

    {
    let a = [];
    s.descend({
        str : 'This(5)ab',
        top : (c) => {a.push(c[0]); return null;}
    });
    t.equal(a.join(''), 'Thisab', 'skipping over delimiter');
    }

    {
    let a = [];
    let last = 0;
    let plevel = 0;
    let str = 'i(5+2*[new]+3)+9';
    s.descend({
        str, 
        push : (str, start, left) => {
            a.push(str.slice(last, start) );
            last = start+left.length;
            plevel += 1;
            return null;
        },
        pop : (str, positions) => {
            a.push(str.slice(last, positions[2]));
            last = positions[3];
            plevel -= 1;
            return null;
        },
        end : () => {
            a.push(str.slice(last));
            return null;
        }
    });
    t.equal(a.join(','), 'i,5+2*,new,+3,+9', 'segments');
    }

    
});
};

main();
