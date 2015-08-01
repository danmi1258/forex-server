var gulp = require( 'gulp' );
var server = require( 'gulp-develop-server' );
var yuidoc = require('gulp-yuidoc');


var serverFiles = ['./app.js', 'app/*/*.js'];
// run server
gulp.task( 'server:start', function() {
    server.listen( { path: './app.js' } );
});
 
// restart server if app.js changed
gulp.task( 'server:restart', server.restart);

gulp.task( 'default', [ 'server:start' ], function() {
    gulp.watch( serverFiles, [ 'server:restart' ] );
});


gulp.docFiles = [];
gulp.task('doc', function() {
    gulp.src(['./app/models/*', 'app/routers/*'])
        .pipe(yuidoc())
        .pipe(gulp.dest('./doc'));
});
