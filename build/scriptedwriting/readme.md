# Scripted Writing

This is the scripted writing component for pieceful programming. The usual
require of this module returns a function that expects the text to parse,
a prefix string, and includes an optional argument that can put anything
one likes in the scope for all the blocks and directives. 

It will output a JSON object with directives and a web of nodes, each
node being labeled with a name and having a scope and code object. The
code objects have code, start, end, and lang properties. 

## The format

Between the lines of `--- `, we have a block of code. It gets added asa
code block and so the typical pieceful flow is to process the
underscore-quote parts, subbing in. There is no raw text given. 

Each block is created by a separator `--- ` where the space after the
three dashes is critical for indicating a separation. That is, `---` will
be considered just a part of the current code context. 

After the dashes
can go a name. It can be of the form `prefix::name1/lv2/lv3:minor.ext`
where pretty much all of that is optional, with prefix and name1 being
filled in if missing and .ext being a separate thing; to include an
extension in the name, put an extra period at the end. 

After the name, we can have option pipe transformations. These get stored
as 'rawTransformations' in the JSON object and pieceful flow should
transform the code according to all that before reporting the code as done. 

Then we can include a directive with the syntax `:=> dirname args` 
