const Weaver = require('../core/index.js');
const util = require('util');
let weaver = new Weaver({}, 
    () => {}
   // (note, data)=> {console.log(note + ':', util.inspect(data, {depth:6}) );}
);

/*(lab, args) =>
{console.log(lab + ':', util.inspect(args, {depth:6})) } );*/

web = {
    start : {pieces : [ 
        { value : 'hello '},
        {cmd: 'pipe', args: [
            { cmd : 'get', args: [{value:'nxt'}]},
            { cmd : 'flip', args : [{value:'better'}, {value:'e'}] }
        ]}
    ]},
    nxt : {pieces : [ {value : 'bye'} ]}
};

weaver.addPieces(web).then( (values) => console.log(values) );
weaver.addCommands({
    flip : async function (text, ...args) {
        console.log('FLIP', text, args);
        args.forEach( (str) => {
            text = text.replace(str, str.toUpperCase());
        }); 
        console.log('FLIP DONE', text);
        return text;
        }
    }
);
weaver.runDirective('out', { args: [
    {value : 'awesome'}, 
    { cmd : 'get', args: [{value:'start'}]},
    { cmd : 'pipe', args : [
        {cmd : 'get', args : [{value:'nxt'}]},
        {cmd : 'flip', args: [{value:'y'}]}
    ]}
], scope: {fullname: 'here'}}, 'out test');
weaver.addDirectives({
    out : async function (data) {
        console.log(data);
        let [name, text, again] = data.args;
        let {context} = this;
        console.log(`${name}: ${text} -- ${again}`);
        return 'done';
    }
});
