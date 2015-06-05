var gulp   = require( 'gulp' ),
    server = require( 'gulp-develop-server' );

var serverFiles = ['./app.js', 'app/*/*.js'];
// run server 
gulp.task( 'server:start', function() {
    server.listen( { path: './app.js' } );
});
 
// restart server if app.js changed 
gulp.task( 'server:restart', server.restart)

gulp.task( 'default', [ 'server:start' ], function() {
    gulp.watch( serverFiles, [ 'server:restart' ] )
});