# Local Directives

We will test various local directives here. 

    This is some angry text. _"not escape"

Need to make it angry

```eval
code = code.toUpperCase();
```

[make angry](# "!eval:")

```eval
function atest() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(5);
    }, 10);
  });
}

code += await atest();
```

[test async eval](# "!eval:")


## Scope change

Let's add in a scope change: [cwd=dude/](# "!scope:")

[what.js](# "save:")

[scope change](# "!report:")

## another

[that.js](# "save:")

And now remove scope cwd

    Some text _"should get escaped"

[esc](# "!escape:")

[cwd](# "!scope:")

[nocwd.js](# "save:")




