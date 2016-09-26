var gulp        = require('gulp');
var $           = require('gulp-load-plugins')();
var browserSync = require('browser-sync').create();
var sourcemaps  = require('gulp-sourcemaps');
var changed     = require('gulp-changed');
var rename      = require('gulp-rename');
var ftp         = require('vinyl-ftp');
var sftp        = require('gulp-sftp');
var gutil       = require('gulp-util');
var clean       = require('gulp-clean-css');
var uglify      = require('gulp-uglify');
var header      = require('gulp-header');
var pkg         = require('./package.json');

var config = {
    browsersync: {
        // array of files and folders to watch for changes
        watch: [
            'js/**/*.js',
            '**/*.html',
            '*.css',
        ]
    },
    sass: {
        // directories to include while compiling main sass file
        sassPaths: [
            'bower_components/bootstrap-sass/assets/stylesheets/',
            'bower_components/font-awesome/scss'
        ]
    },
    ftp: {
        host: 'YOUR_DOMAIN_NAME',
        user: 'YOUR_USER_NAME',
        pass: 'YOUR_PASSWORD',
        port: 21, // note: change this when switching from ftp to sftp
        files: [
            'bower_components/**/*',
            'img/**/*',
            'js/**/*',
            '*.html',
            '*.css',
            '*.php'
        ],
        remotePath: '',
        protocol: 'ftp' // 'ftp' or 'sftp'
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
    return gulp.src('src/scss/**/*.scss')
        .pipe(sourcemaps.init()) // enable for debugging
        .pipe($.sass({
                includePaths: config.sass.sassPaths
            })
            .on('error', $.sass.logError))
        .pipe($.autoprefixer({
            browsers: ['last 2 versions', 'ie >= 9']
        }))
        .pipe(clean())
        .pipe(header(config.wp.banner, { pkg : pkg }))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('.'));
});

gulp.task('js', function () {
    return gulp.src('src/js/**/*.js')
        .pipe(uglify())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('js'));
});

gulp.task('browser-sync', ['sass', 'js'], function() {
    browserSync.init({
        server: {
            baseDir: ""
        },
        notify: false,
        online: true
    });

    gulp.watch(['src/scss/**/*.scss'], ['sass']);
    gulp.watch(['src/js/**/*.js'], ['js']);
    gulp.watch(config.browsersync.watch).on('change', browserSync.reload);
});


gulp.task('deploy', function() {
    if (config.ftp.protocol == 'sftp') {
        return gulp.src(config.ftp.files, { base: '.', buffer: false })
            .pipe(changed('.')) // only upload newer files
            .pipe(sftp({
                host: config.ftp.host,
                user: config.ftp.user,
                auth: 'keyMain',
                remotePath: config.ftp.remotePath
            }));
    } else if (config.ftp.protocol == 'ftp') {
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
    }
});

gulp.task('deploy-watch', ['sass', 'deploy'], function() {
    if (config.ftp.protocol == 'sftp') {
        gulp.watch(['src/scss/**/*.scss'], ['sass']);
        gulp.watch(['src/js/**/*.js'], ['js']);
        gulp.watch(config.ftp.files, function(event) {
            console.log('Change detected. Uploading file...');
            return gulp.src( [event.path], { base: '.', buffer: false } )
            .pipe(sftp({
                host: config.ftp.host,
                user: config.ftp.user,
                auth: 'keyMain',
                remotePath: config.ftp.remotePath 
            }));
        });
    } else if (config.ftp.protocol == 'ftp') {
        var conn = ftp.create({
            host: config.ftp.host,
            port: config.ftp.port,
            user: config.ftp.user,
            password: config.ftp.pass,
            parallel: 5,
            log: gutil.log
        });

        gulp.watch(['src/scss/**/*.scss'], ['sass']);
        gulp.watch(['src/js/**/*.js'], ['js']);
        gulp.watch(config.ftp.files, function(event) {
            console.log('Change detected. Uploading file...');
            return gulp.src( [event.path], { base: '.', buffer: false } )
            .pipe( conn.newer( config.ftp.remoteFolder ) ) // only upload newer files
            .pipe( conn.dest( config.ftp.remoteFolder ) );
        });
    }
});

gulp.task('default', ['browser-sync']);
