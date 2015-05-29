'use strict';

module.exports = Singer;
Singer.SingerState = SingerState;

var stream = require('stream')
  , Transform = stream.Transform
  , util = require('util')
  , Decoder = require('lame').Decoder
  , Speaker = require('speaker')
  , mpg123Util = require('node-mpg123-util')
  , debug = require('debug')('vinyl-singer');

util.inherits(Singer, Transform);

function SingerState(singer, options) {
  this.onEofSong = function() {
    onEofSong(singer);
  };

  this.file = null;
  this.decoder = null;
  this.speaker = null;

  this.transformcb = null;

  this.isTransformer = !!options.isTransformer;

  var vol = options.defaultVolume;
  this.volume = (vol || vol === 0) ? vol : 1;

  var hwm = options.decoderHighWaterMark;
  this.decoderHighWaterMark = (hwm || hwm === 0) ? hwm : 4 * 1024;
  this.decoderHighWaterMark = ~~this.decoderHighWaterMark;

  this.autoFinish = true;
  this.state = 'stoped';
}

function onEofSong(singer) {
  debug('on end of song');
  var ss = singer._singerState;

  if (ss.file != null && ss.decoder != null && ss.speaker != null) {
    var file = ss.file
      , cb = ss.transformcb;

    if (!cb)
      return singer.emit('error', 'no transformcb in Singer class');

    ss.decoder.unpipe();

    if (ss.file.isStream() && ss.file.contents.unpipe)
      ss.file.contents.unpipe();

    var finish = function() {
      debug('finish, autoFinish: %s', ss.autoFinish);
      ss.file = null;
      ss.stream = null;
      ss.decoder = null;
      ss.speaker = null;
      ss.transformcb = null;
      ss.state = 'stoped';

      if (cb)
        cb(null, ss.isTransformer ? file : null);
    };

    if (ss.autoFinish) {
      finish();
    } else {
      ss.speaker.removeListener('finish', ss.onEofSong);
      ss.speaker.on('finish', finish);
      ss.speaker.end();
    }
  }
}

function Singer(options) {
  if (!(this instanceof Singer)) {
    return new Singer(options);
  }

  options = options || {};
  options.objectMode = true;
  options.highWaterMark = options.highWaterMark || 1;

  this._singerState = new SingerState(this, options);

  Transform.call(this, options);
}

Singer.prototype.pipe = function(dest, pipeOpts) {
  var ss = this._singerState;
  debug('origin isTransformer: %s, now isTransformer: true', ss.isTransformer);
  ss.isTransformer = true;
  Transform.prototype.pipe.call(this, dest, pipeOpts);
};

Singer.prototype._transform = function(file, encoding, cb) {
  debug('_transform %s', file.path);
  var ss = this._singerState;

  ss.autoFinish = true;
  ss.file = file;
  ss.transformcb = cb;

  ss.decoder = new Decoder({ highWaterMark: ss.decoderHighWaterMark });
  ss.decoder.on('format', function() {
    process.nextTick(function() {
      if (ss.decoder != null)
        mpg123Util.setVolume(ss.decoder.mh, ss.volume);
    });
  });

  ss.speaker = new Speaker();
  ss.speaker.on('finish', ss.onEofSong);

  ss.state = 'singing';
  ss.file.pipe(ss.decoder).pipe(ss.speaker);
  this.emit('singSong', ss.file);
};

Singer.prototype.nextSong = function() {
  debug('next song');
  var ss = this._singerState;
  ss.autoFinish = false;
  ss.onEofSong();
};

Singer.prototype.pauseSong = function() {
  var ss = this._singerState;
  if (ss.state == 'singing') {
    debug('pause song');
    ss.decoder.unpipe();
    ss.state = 'paused';
    this.emit('pauseSong');
  }
};

Singer.prototype.resumeSong = function() {
  var ss = this._singerState;
  if (ss.state == 'paused' && ss.decoder != null && ss.speaker != null) {
    debug('resume song');
    ss.decoder.pipe(ss.speaker);
    ss.state = 'singing';
    this.emit('resumeSong');
  }
};

Singer.prototype.turnTo = function(vol) {
  var ss = this._singerState;
  if (ss.state == 'singing' && ss.decoder) {
    debug('turn to %d', vol);
    ss.volume = vol;
    mpg123Util.setVolume(ss.decoder.mh, vol);
    this.emit('volumeChanged');
  }
};

Singer.prototype.getVolume = function() {
  var ss = this._singerState;
  if (ss.state == 'singing' && ss.decoder) {
    return mpg123Util.getVolume(ss.decoder.mh);
  } else {
    return ss.volume;
  }
};

Singer.prototype.getCurrentSong = function() {
  var ss = this._singerState;
  return ss.file;
};

Object.defineProperty(Singer.prototype, 'state', {
  get: function() {
    return this._singerState.state;
  }
});
