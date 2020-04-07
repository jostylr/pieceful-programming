const commonmark = require('commonmark');

const fs = require('fs');

const text = fs.readFileSync('tests/src/variety.md', {encoding:'utf8'});

let lineNumbering = ( function (text) {
    let lines = [0];
    let len = text.length;
    let ind = text.indexOf('\n', 0);
    while (ind !== -1) {
        ind = ind + 1;
        lines.push(ind);
        if (ind >= len) { 
            break;
        }
        ind = text.indexOf('\n',ind);
    }
    return function ([line, col]) {
        return [line, col, lines[line-1] + col-1]; 
    };
})(text);
console.log(text);

let reader = new commonmark.Parser();
let parsed = reader.parse(text);

let walker = parsed.walker();


let event, sourcepos;

while ( (event = walker.next()) ) {
    let node = event.node;
    if (node.sourcepos)  { 
        sourcepos = [ lineNumbering(node.sourcepos[0]),
        lineNumbering(node.sourcepos[1]) ];
    }
    console.log(node.type, node.literal || '', node.destination|| '', node.title|| '', node.info|| '', node.level|| '',  sourcepos, text.slice(sourcepos[0][2], sourcepos[1][2]+1), event.entering);
    
}
