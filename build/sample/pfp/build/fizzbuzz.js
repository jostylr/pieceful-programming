/*global console */
var overWrite = function (arr, m, str) {
    var n = arr.length;
    for (i = m-1; i < n; i += m) {
        arr[i] = str;       
        arr[i] = str;
    }
};

var numarr = new Array(100);
var i; 
for (i = 0; i < 100; i += 1) {
    numarr[i] = i+1;
}

overWrite(numarr, 3, "Fuzz");
overWrite(numarr, 5, "Buzz");
overWrite(numarr, 15, "FuzzBuzz");

console.log(numarr.join(", "));