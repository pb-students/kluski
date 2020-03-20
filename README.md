# kluski
Quine-McCluskey tools


## Installation
To use it you have to have node installed. Then you can do 
```
npm install -g kluski
```
or
```
yarn global add kluski
```

## Running
```
kluski
```

## Function value
Functions have strict naming convention:
- Every bit is labeled starting from the left side with next alphabet letters.
- If you want to negate one bit, then simply add `!` character before the bit. 
- To join expressions you can use `+` operator.

**Warn:** The number of bits in a function is estimated with the highest letter. Basically the `letter's index + 1` in alphabet is the number of bits

### Example
```
!a!b + !abc + a!bde + cde + !bcd + !bce + !a!ce + !abd!e
```

## Truth table value
Truth tables have to be integers separated with commas.

### Example
```
0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 19, 21, 22, 23, 31
```
