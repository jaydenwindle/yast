var gulp        = require('gulp');
var $           = require('gulp-load-plugins')();
var browserSync = require('browser-sync').create();
var sourcemaps  = require('gulp-sourcemaps');
var rename      = require('gulp-rename');
var ftp         = require('vinyl-ftp');
var gutil       = require('gulp-util');
var clean       = require('gulp-clean-css');
var header      = require('gulp-header');
var pkg         = require('./package.json');

var config = {
    browsersync: {
        // array of files and folders to watch for changes
        watch: [
            './js/**/*.js',
            './**/*.html',
            './*.css',
        ]
    },
    sass: {
        sassPaths: [
            'bower_components/bootstrap-sass/assets/stylesheets/',
            'bower_components/font-awesome/scss'
        ]
    },
    ftp: {
        host: '',
        user: '',
        pass: '',
        port: 21,
        files: [
            './bower_components/**/*',
            './img/**/*',
            './js/**/*',
            './*.html',
            './*.css',
            './*.php'
        ],
        remoteFolder: ''
    },
    wp: {
        banner: [
            '/**',
            ' * Theme Name: <%= pkg.name %>',
            ' * Author: <%= pkg.author %>',
            ' * Author URI: <%= pkg.authorURI %>',
            ' * Description: <%= pkg.description %>',
            ' * Version: <%= pkg.version %>',
            ' */',
            ''
        ].join('\n')
    }
};

gulp.task('sass', function() {
    return gulp.src('scss/style.scss')
        // .pipe(sourcemaps.init()) enable for debugging
        .pipe($.sass({
                includePaths: config.sass.sassPaths
            })
            .on('error', $.sass.logError))
        .pipe($.autoprefixer({
            browsers: ['last 2 versions', 'ie >= 9']
        }))
        .pipe(clean())
        .pipe(header(config.wp.banner, { pkg : pkg }))
        // .pipe(sourcemaps.write())
        .pipe(gulp.dest('.'));
});

gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "./"
        },
        notify: false
    });
});

gulp.task('deploy', function() {
    var conn = ftp.create({
        host: config.ftp.host,
        port: config.ftp.port,
        user: config.ftp.user,
        password: config.ftp.pass,
        parallel: 5,
        log: gutil.log
    });

    return gulp.src(config.ftp.files, { base: '.', buffer: false })
        .pipe( conn.newer( config.ftp.remoteFolder ) ) // only upload newer files
        .pipe( conn.dest( config.ftp.remoteFolder ) );
});

gulp.task('deploy-watch', ['sass', 'deploy'], function() {
    var conn = ftp.create({
        host: config.ftp.host,
        port: config.ftp.port,
        user: config.ftp.user,
        password: config.ftp.pass,
        parallel: 5,
        log: gutil.log
    });

    gulp.watch(['scss/**/*.scss'], ['sass']);
    gulp.watch(config.ftp.files, function(event) {
        console.log('Change detected. Uploading file...');
        return gulp.src( [event.path], { base: '.', buffer: false } )
        .pipe( conn.newer( config.ftp.remoteFolder ) ) // only upload newer files
        .pipe( conn.dest( config.ftp.remoteFolder ) );
    });
});

gulp.task('default', ['sass', 'browser-sync'], function() {
    gulp.watch(['./**/*.scss'], ['sass']);
    gulp.watch(config.browsersync.watch).on('change', browserSync.reload);
});
