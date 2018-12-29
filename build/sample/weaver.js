const Weaver = require('../core/index.js');
let weaver = new Weaver();

web = {
    start : {pieces : ['hello', [['get', 'nxt']]]},
    nxt : {pieces : ['bye']}
};

weaver.addPieces(web).then( (values) => console.log(values) );
