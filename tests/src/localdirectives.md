# Local Directives

We will test various local directives here. 

    This is some angry text. _"not escape"

Need to make it angry

```eval
code = code.toUpperCase();
```

```ejs
function atest() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(5);
    }, 10);
  });
}

code += await atest();
```

[.email](.ejs "!eval:")

## Only eval

This is just some eval

    a = 3;
    b = 2;

Now we add them

    c = a*b + a -b;
    return c;

[number](# "!eval:")

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




