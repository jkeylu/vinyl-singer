# vinyl-singer

[![NPM](https://nodei.co/npm/vinyl-singer.png)](https://nodei.co/npm/vinyl-singer/)

## Example

``` javascript
var gulp = require('gulp')
  , Singer = require('vinyl-singer');

gulp.src('/path/to/*.mp3').pipe(Singer());
```

## Options

#### options.highWaterMark

Type: `Number` Default: `1`

The maximum number of songs to store in the internal buffer waiting to play.

#### options.isTransformer

Type: `Boolean` Default: `false`

Default singer like a Writable Stream. Once you do `singer.pipe(another)`, the played songs will stored in the internal buffer waiting to be consumed.

#### options.defaultVolume

Type: `Number` Default: `1`

Range: 0 - 1

#### options.decoderHighWaterMark

Type: `Number` Default: `4 * 1024`
