const Weaver = require('../core/index.js');
let weaver = new Weaver();

web = {
    start : {pieces : ['hello', [
    ['get', 'nxt'],
    ['flip', 'b', 'e']
    ]]},
    nxt : {pieces : ['bye']}
};

weaver.addPieces(web).then( (values) => console.log(values) );
weaver.addCommands({
    flip : async function (text, ...args) {
        console.log(args);
        args.forEach( (str) => {
            text = text.replace(str, str.toUpperCase());
        }); 
        return text;
        }
    }
);
weaver.runDirective('out', ['awesome', ['get', 'start'], 
    ['pipe', ['get', 'nxt'], ['flip', 'y'] ]
], 'out test');
weaver.addDirectives({
    out : async function (name, text, again) {
        console.log(`${name}: ${text} -- ${again}`);
        return 'done';
    }
});
