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
be considered just a part of the current code context. To have a heading
like object but without it being a heading use `---\ ` This is the only
escape that is done. More slashses in that configuration get reduced by
one. 

After the dashes
can go a name. It can be of the form `prefix::name1/lv2/lv3:minor.ext`
where pretty much all of that is optional, with prefix and name1 being
filled in if missing and .ext being a separate thing; to include an
extension in the name, put an extra period at the end. 

After the name, we can have option pipe transformations. These get stored
as 'rawTransformations' in the JSON object and pieceful flow should
transform the code according to all that before reporting the code as done. 

Then we can include a directive with the syntax `:=> dirname args` 

## Options object

While most keys in the options object will go into scope, a few are
special: 

* `firstName` is the name of the first block. It is `abstract` by default
* `current` is `[1,1,0]` which tells how to start counting the lines and
  positions. Not sure why it would need to be different, but maybe some
  useful offset. 
* `getText` this takes in the text, start, and end, and slices it,
  returning the code piece. It trims the ends. It also does the escaping
  of heading like dashes with slashes. A different function can be passed
  into to do something different to the code blocks. 
