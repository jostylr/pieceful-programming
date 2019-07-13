let fs = require('fs');
let util = require('util');
let swparse = require('../../swparse');

let txt = fs.readFileSync(__dirname + '/simple.txt', {encoding:'utf8'});
let result = swparse(txt, {prefix:'sample'});

console.log(util.inspect(result, {depth:10}));
