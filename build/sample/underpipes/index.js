const util = require('util');
const fs = require('fs');
const up = require('../../underpipes');
const jp = require('json-stringify-pretty-compact');
const diff = require("deep-object-diff").diff
let file = fs.readFileSync(__dirname + '/underpipes.txt', {encoding:'utf8'});
let tasks = file.split('\n---\n').
    map(el => el.trim()).
    map(el => {
        let ind = el.indexOf(':');
        return [el.slice(0,ind).trim(), el.slice(ind+1).trim()];
    });
const removeSE = function removeSE ( piece) {
    if (!piece) { return;}
    delete piece.start;
    delete piece.end;
    if (piece.args) {
        piece.args.forEach(removeSE);
    }
};; 
tasks.forEach( ([name,txt]) => {
    let ret = {name, txt};
    if (txt) {
        try {
            ret.result = up({text:txt, 
                tracker : () => {} });
            ret.result.forEach(removeSE);
        } catch (e) {
            ret.error = e.msg;
            ret.stack = e.stack;
        }
    } else {
        ret.error = 'no test';
    }
    if (ret.error) {
        console.log('ERROR', ret);
    } else {
        try {
            base = JSON.parse( fs.readFileSync(
                __dirname + '/' + name + '.json',
            ));
            let test = diff(base,  ret);
            if (Object.keys(test).length === 0) {
                console.log('test ' + name + ' passed');
            } else {
                console.log('test ' + name + ' failed');
                console.log('DIFF:' + jp(test) );
                fs.writeFileSync(__dirname + '/' + name + '-diff.json', 
                    jp(test) );
                fs.writeFileSync(__dirname + '/' + name + '-new.json', 
                    jp(ret) );
            }
        } catch (e) {
            console.log('No such test ' +  name + '. Please verify');
            console.log(jp(ret));
            fs.writeFileSync(__dirname + '/' + name + '-new.json', 
                jp(ret) );
        } 
    }
});


/*let result = up({
    text ,
    tracker : (note, data) => {
        console.log(note, util.inspect(data, {colors:true, depth:15}));
    }
});*/
