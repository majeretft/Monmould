let Metalsmith = require('metalsmith');
let assets = require('metalsmith-assets');
let layout = require('metalsmith-layouts');
let markdownit = require('metalsmith-markdownit');
let collections = require('metalsmith-collections');
let environment = require('metalsmith-env');
let debugUi = require('metalsmith-debug-ui');

let gulp = require('gulp');
let less = require('gulp-less');
let sourcemaps = require('gulp-sourcemaps');

let BrowserSync = require('browser-sync');
let runSequence = require('run-sequence');

let options = {
    dirBuild: '_build',
    dirPublish: '_publish'
}

let getDir = function () {
    return !!process.env.DEBUG ? options.dirBuild : options.dirPublish;
}

gulp.task('default', function () {
    console.log('default');
});

gulp.task('metalsmith', function (callback) {
    let metalsmith = Metalsmith(__dirname);

    if (process.env.DEBUG)
        debugUi.patch(metalsmith)

    metalsmith
        .source('./src')
        .destination(`./${getDir()}`)
        .clean(!process.env.DEBUG)
        .use(markdownit())
        .use(environment())
        .use(layout({
            engine: 'handlebars',
            default: 'layout.hbs',
            directory: 'layout',
            partials: 'partial',
            partialExtension: '.hbs'
        }))
        .build(function (err) {
            if (err)
                throw err;
        });

    callback();
});

gulp.task('less', function () {
    return gulp.src('./less/**/*.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(`./${getDir()}/css`));
});

gulp.task('serve', ['build'], function () {
    let browserSync = BrowserSync.create();
    browserSync.init({
        server: { baseDir: `./${getDir()}` }
    });

    gulp.watch(['./src/**/*.md', './layout/**/*.hbs', './partial/**/*.hbs'], ['metalsmith']);
    gulp.watch(['./less/**/*.less'], ['less']);
});

gulp.task('build', function (callback) {
    process.env.DEBUG = 'YES';
    runSequence('metalsmith', 'less', callback);
});

gulp.task('publish', function (callback) {
    delete process.env.DEBUG;
    runSequence('metalsmith', 'less', callback);
});