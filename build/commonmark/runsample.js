let cmparse = require('./index.js');
let util = require('util');

let ret = cmparse(
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
    
    code`, {tracker : () => {}, prefix: 'first::' }
);

console.log(util.inspect(ret, {depth : 8, colors:true} ) ) ;
