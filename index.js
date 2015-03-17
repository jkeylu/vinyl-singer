module.exports = Singer;
Singer.SingerState = SingerState;

var stream = require('stream')
  , Transform = stream.Transform
  , util = require('util')
  , Decoder = require('lame').Decoder
  , Speaker = require('speaker')
  , BufferList = require('bl')
  , mpg123Util = require('node-mpg123-util');

util.inherits(Singer, Transform);

function SingerState(singer, options) {
  var self = this;

  this.decoder = new Decoder();
  this.speaker = new Speaker();

  this.decoder.on('format', function() {
    process.nextTick(function() {
      singer.turnTo(self.volume);
    });
  });

  this.decoder.pipe(this.speaker);

  this.file = null;
  this.stream = null;
  this.singing = false;
  this.transformcb = null;

  var vol = options.defaultVolume;
  this.volume = (vol || vol === 0) ? vol : 100;
}

function onEofSong(singer) {
  var ss = singer._singerState;

  if (ss.file != null && ss.stream != null) {
    var file = ss.file
      , cb = ss.transformcb;

    if (!cb)
      return singer.emit('error', 'no transformcb in Singer class');

    ss.stream.unpipe();
    ss.file = null;
    ss.stream = null;
    ss.transformcb = null;
    ss.singing = false;

    if(cb)
      cb(null, file);
  }
}

function Singer(options) {
  options = options || {};
  options.objectMode = true;

  this._singerState = new SingerState(this, options);

  Transform.call(this, options);
}

Singer.prototype._transform = function(file, encoding, cb) {
  var self = this
    , ss = this._singerState;

  ss.transformcb = cb;
  ss.file = file;
  ss.stream = file.isBuffer() ? new BufferList(file.contents) : file.contents;
  //ss.stream = file.pipe(new PassThrough({ highWaterMark: 4 * 1024 }));
  ss.stream.once('end', function() {
    if (this == ss.stream) {
      onEofSong(self);
    }
  });

  ss.singing = true;
  ss.stream.pipe(ss.decoder, { end: false });
};

Singer.prototype.nextSong = function() {
  onEofSong(this);
};

Singer.prototype.pauseSong = function() {
  var ss = this._singerState;
  if (ss.singing) {
    ss.stream.unpipe();
    ss.singing = false;
    this.emit('pauseSong');
  }
};

Singer.prototype.resumeSong = function() {
  var ss = this._singerState;
  if (!ss.singing && ss.stream != null) {
    ss.singing = true;
    ss.stream.pipe(ss.decoder, { end: false });
    this.emit('resumeSong');
  }
};

Singer.prototype.turnTo = function(vol) {
};

Singer.prototype.getVolume = function() {
};
