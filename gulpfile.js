var gulp = require('gulp');
gulp.task('copy-vender',function(){
  gulp.src([
    './node_modules/iview-weapp/dist/**'])
    .pipe(gulp.dest('./libs/iview-weapp'));
  gulp.src([
    './node_modules/flyio/dist/umd/wx.umd.min.js'])
    .pipe(gulp.dest('./libs/flyio'));
});

gulp.task('default', ['copy-vender']);