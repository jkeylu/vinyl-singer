module.exports = Singer;
Singer.SingerState = SingerState;

var stream = require('stream')
  , Transform = stream.Transform
  , util = require('util')
  , Decoder = require('lame').Decoder
  , Speaker = require('speaker')
  , mpg123Util = require('node-mpg123-util');

util.inherits(Singer, Transform);

function SingerState(options) {
  this.file = null;
  this.decoder = null;
  this.speaker = null;

  this.transformcb = null;
  this.singing = false;

  var vol = options.defaultVolume;
  this.volume = (vol || vol === 0) ? vol : 1;

  var hwm = options.decoderHighWaterMark;
  this.decoderHighWaterMark = (hwm || hwm === 0) ? hwm : 4 * 1024;
  this.decoderHighWaterMark = ~~this.decoderHighWaterMark;
}

function onEofSong(singer) {
  var ss = singer._singerState;

  if (ss.file != null && ss.decoder != null && ss.speaker != null) {
    var file = ss.file
      , cb = ss.transformcb;

    if (!cb)
      return singer.emit('error', 'no transformcb in Singer class');

    ss.decoder.unpipe();

    if (ss.file.isStream())
      ss.file.contents.unpipe();

    ss.file = null;
    ss.stream = null;
    ss.decoder = null;
    ss.speaker = null;
    ss.transformcb = null;
    ss.singing = false;

    if(cb)
      cb(null, file);
  }
}

function Singer(options) {
  if (!(this instanceof Singer)) {
    return new Singer(options);
  }

  options = options || {};
  options.objectMode = true;

  this._singerState = new SingerState(options);

  Transform.call(this, options);
}

Singer.prototype._transform = function(file, encoding, cb) {
  var self = this
    , ss = this._singerState;

  ss.file = file;
  ss.transformcb = cb;

  ss.decoder = new Decoder({ highWaterMark: ss.decoderHighWaterMark });
  ss.decoder.on('format', function() {
    process.nextTick(function() {
      self.turnTo(ss.volume);
    });
  });

  ss.speaker = new Speaker();
  ss.speaker.on('finish', function() {
    if (this == ss.speaker) {
      onEofSong(self);
    }
  })

  ss.singing = true;
  ss.file.pipe(ss.decoder).pipe(ss.speaker);
  this.emit('singSong', ss.file);
};

Singer.prototype.nextSong = function() {
  onEofSong(this);
};

Singer.prototype.pauseSong = function() {
  var ss = this._singerState;
  if (ss.singing) {
    ss.decoder.unpipe();
    ss.singing = false;
    this.emit('pauseSong');
  }
};

Singer.prototype.resumeSong = function() {
  var ss = this._singerState;
  if (!ss.singing && ss.decoder != null && ss.speaker != null) {
    ss.singing = true;
    ss.decoder.pipe(ss.speaker);
    this.emit('resumeSong');
  }
};

Singer.prototype.turnTo = function(vol) {
  var ss = this._singerState;
  if (ss.singing && ss.decoder) {
    return mpg123Util.setVolume(ss.decoder.mh, vol);
  }
};

Singer.prototype.getVolume = function() {
  var ss = this._singerState;
  if (ss.singing && ss.decoder) {
    return mpg123Util.getVolume(ss.decoder.mh);
  } else {
    return ss.volume;
  }
};

Singer.prototype.getCurrentSong = function() {
  var ss = this._singerState;
  return ss.file;
};
