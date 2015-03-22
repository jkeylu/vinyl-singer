var path = require('path')
  , assert = require('assert')
  , gulp = require('gulp')
  , Singer = require('../')
  , fixtures = path.resolve(__dirname, 'fixtures');

describe('Singer', function() {
  var filename = path.resolve(fixtures, 'pipershut_lo.mp3');

  it('should return a Singer instance', function() {
    var singer = Singer();
    assert(singer instanceof Singer);
  });

  it('should emit a "singSong" event', function(done) {
    var singer = new Singer();
    singer.on('singSong', function() {
      done();
    });

    gulp.src(filename).pipe(singer);
  });

  it('should singing song', function(done) {
    var singer = new Singer();
    singer.on('singSong', function() {
      singer._singerState.speaker.on('open', function() {
        done();
      });
    });

    gulp.src(filename).pipe(singer);
  });

  it('should be "stoped" of the state before singing song', function() {
    var singer = new Singer();
    assert.equal('stoped', singer.state);
  });

  it('should be "singing" of the state when singing song', function(done) {
    var singer = new Singer();
    singer.on('singSong', function() {
      assert.equal('singing', singer.state);
      done();
    });
    gulp.src(filename).pipe(singer);
  });


  describe('nextSong()', function() {
    it('should singing next song', function(done) {
      var singer = new Singer();
      singer.once('singSong', function(file) {
        var file1 = path.basename(file.path);

        singer.on('singSong', function(file) {
          var file2 = path.basename(file.path);
          assert.notEqual(file1, file2);
          done();
        });
        singer.nextSong();
      });

      gulp.src(fixtures + '/*.mp3').pipe(singer);
    });

    it('should emit a "finish" event by speaker', function(done) {
      var singer = new Singer();
      var ss = singer._singerState;
      singer.once('singSong', function(file) {
        ss.speaker.on('finish', function() {
          done();
        });
        singer.nextSong();
      });

      gulp.src(filename).pipe(singer);
    });
  });

  it('should emit a "finish" event when no more song', function(done) {
    var singer = new Singer();
    singer.on('singSong', function() {
      singer.on('finish', function() {
        done();
      });
      singer.nextSong();
    });

    gulp.src(filename).pipe(singer);
  });

  describe('pauseSong()', function() {
    it('should emit a "pasueSong" event', function(done) {
      var singer = new Singer();
      var called = false;

      singer.on('singSong', function() {
        assert.equal(false, called);
        singer.pauseSong();
      });
      singer.on('pauseSong', function() {
        called = true;
        done();
      });

      assert.equal(false, called);
      gulp.src(filename).pipe(singer);
    });

    it('should be "paused" of the state', function(done) {
      var singer = new Singer();

      singer.on('singSong', function() {
        singer.pauseSong();
        assert.equal('paused', singer.state);
        done();
      });

      gulp.src(filename).pipe(singer);
    });
  });

  describe('resumeSong()', function() {
    it('should emit a "resumeSong" event', function(done) {
      var singer = new Singer();
      var called = false;

      singer.on('singSong', function() {
        assert.equal(false, called);
        singer.pauseSong();
      });
      singer.on('pauseSong', function() {
        process.nextTick(function() {
          assert.equal(false, called);
          singer.resumeSong();
        });
      });
      singer.on('resumeSong', function() {
        called = true;
        done();
      });

      assert.equal(false, called);
      gulp.src(filename).pipe(singer);
    });

    it('should be "singing" of the state', function(done) {
      var singer = new Singer();

      singer.on('singSong', function() {
        assert.equal('singing', singer.state);

        singer.pauseSong();
        assert.equal('paused', singer.state);

        singer.resumeSong();
        assert.equal('singing', singer.state);
        done();
      });

      assert.equal('stoped', singer.state);
      gulp.src(filename).pipe(singer);
    });
  });

  describe('turnTo()', function() {
    it('should emit a "volumeChanged" event', function(done) {
      var singer = new Singer();
      var vol = 0.5;
      singer.on('singSong', function() {
        var ss = singer._singerState;
        ss.decoder.on('format', function() {
          singer.turnTo(vol);
        });
      });

      singer.on('volumeChanged', function() {
        assert.equal(vol, singer.getVolume());
        done();
      });

      gulp.src(filename).pipe(singer);
    });

    it('should equal to getVolume()', function(done) {
      var singer = new Singer();
      singer.on('singSong', function() {
        var ss = singer._singerState;
        ss.decoder.on('format', function() {
          var vol = 0.5;
          singer.turnTo(vol);
          assert.equal(vol, singer.getVolume());
          done();
        });
      });
      gulp.src(filename).pipe(singer);
    });
  });

  describe('getVolume()', function() {
    it('should be a number', function(done) {
      var singer = new Singer();
      singer.on('singSong', function() {
        var ss = singer._singerState;
        ss.decoder.on('format', function() {
          assert('number', typeof singer.getVolume());
          done();
        });
      });
      gulp.src(filename).pipe(singer);
    });
  });
});
