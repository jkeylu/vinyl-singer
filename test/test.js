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


  describe('nextSong()', function() {
    it('should singing next song', function(done) {
      var singer = new Singer();
      singer.once('singSong', function(file) {
        var file1 = path.basename(file.path);

        singer.on('singSong', function(file) {
          var file2 = path.basename(file.path);
          done(assert.notEqual(file1, file2));
        });
        singer.nextSong();
      });

      gulp.src(fixtures + '/*.mp3').pipe(singer);
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
        assert.equal(called, false);
        singer.pauseSong();
      });
      singer.on('pauseSong', function() {
        called = true;
        done();
      });

      assert.equal(called, false);
      gulp.src(filename).pipe(singer);
    });
  });

  describe('resumeSong()', function() {
    it('should emit a "resumeSong" event', function(done) {
      var singer = new Singer();
      var called = false;

      singer.on('singSong', function() {
        assert.equal(called, false);
        singer.pauseSong();
      });
      singer.on('pauseSong', function() {
        process.nextTick(function() {
          assert.equal(called, false);
          singer.resumeSong();
        });
      });
      singer.on('resumeSong', function() {
        called = true;
        done();
      });

      assert.equal(called, false);
      gulp.src(filename).pipe(singer);
    });

  });

  describe('turnTo()', function() {
    it('should equal to getVolume()', function(done) {
      var singer = new Singer();
      singer.on('singSong', function() {
        var ss = singer._singerState;
        ss.decoder.on('format', function() {
          var vol = 0.5;
          singer.turnTo(vol);
          done(assert.equal(vol, singer.getVolume()));
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
          done(assert('number', typeof singer.getVolume()));
        });
      });
      gulp.src(filename).pipe(singer);
    });
  });
});
