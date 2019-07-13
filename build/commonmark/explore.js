let commonmark = require('commonmark');

text = 
`## Try CommonMark

You can try CommonMark here.  This dingus is powered by
[commonmark.js](https://github.com/jgm/commonmark.js), the
JavaScript reference implementation.

    This is some code

A list below

1. item one
2. item two [item switch](cur "load:")
   - sublist
   - sublist

[switch](dir "save:")

More text

\`\`\`js
more code
\`\`\`

### Header

and some text

    more code

[minor here]()

Got some minor

    code minor block
    this is cool
    great. awesome


[minor pipes](# ": this | pipe")

    pipes pipes

[=vname](# ": make | new |var")

[dude](!prefix) Doing a prefix change here

#### Courageous

This is courages in all respects

[minor cour]()

Just a minor check

###### h6 check

Got that something special check

    raw

[h6 minor]()

##### h5 first | pipe | a |command

Add [|t test](# ": and then | more")

[h5 minor]()

###### h6 second after first

[h6 second minor under h5]()

## A [New heading](# "info: v6 | jt")

Whatever
    
    code`;

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
        sourcepos = [ lineNumbering(nodesourcepos[0]),
        lineNumbering(node.sourcepos[1]) ];
    }
    console.log(node.type, node.literal || '', node.destination|| '', node.title|| '', node.info|| '', node.level|| '',  sourcepos, text.slice(sourcepos[0][2], sourcepos[1][2]+1), event.entering);
    
}
