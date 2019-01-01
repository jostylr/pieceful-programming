let cmparse = require('./index.js');

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

and some text`
);

console.log(ret);
