Make an array out of some text with custom separator, escaping, and trimming

## Main

    function arrayify (str, { sep = '\n', esc = '\\', trim=true} ) {

        if (!str) { return []; }

        let ret = [];
        let n = str.length;
        let S = sep[0];
        let sl = sep.length;
        let E = esc[0];
        let el = esc.length;

        for (let i = 0; i < n; i += 1) {

            if (input[i] === S) {
                ret.push(input.slice(j,i));
                j = i + 1;
                continue;
            }

If we have an escape and the next one is escape or sep, then we slice it to
exclude i, putting i+1 at i, and the next round will bump the i safely past it. 
The only need to escape the escape is if there is a separator after the escape
character and the escape character is not supposed to escape. 

            if (input[i] === esc) {
                if ( (input[i+1] === sep) || (input[i+1] === esc) ) {
                    input = input.slice(0,i) + input.slice(i+1);
                    continue;
                }
            }
        }
        ret.push(input.slice(j, i));

        if (trim) {
            ret = ret.map(function (el) {
                return el.trim();
            });
        }
         
        return ret;

    }


## Doc

* **arrayify** This takes the incoming text and creates an array out of
  it. The first argument is an object with keys `sep` to know what to
  split on, `esc` to escape the separator and itself, `trim` a boolean
  that will trim the text for each entry. The defaults are newline,
  backslash, and true, respectively. You can also pass them as the first,
  second, and third argument, respectively. 
  Note that this assumes that both sep
  and esc are single characters. You can have the usual block
  substitutions, of course, but it might be safer to escape the block and
  run it through compile, e.g., ` | arrayify | .mapc compile`. 
  This also allows nesting of objects. To get a string representation of
  the array, call `| .toString`.

## Examples


## Tests

