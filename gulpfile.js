let Metalsmith = require('metalsmith');
let assets = require('metalsmith-assets');
let layout = require('metalsmith-layouts');
let markdownit = require('metalsmith-markdownit');
let collections = require('metalsmith-collections');
let environment = require('metalsmith-env');
let debugUi = require('metalsmith-debug-ui');
let permalinks = require('metalsmith-permalinks');
let msIf = require('metalsmith-if');
let inPlace = require('metalsmith-in-place');
let i18n = require('metalsmith-i18n');
let multiLanguage = require('metalsmith-multi-language');

let gulp = require('gulp');
let less = require('gulp-less');
let sourcemaps = require('gulp-sourcemaps');

let BrowserSync = require('browser-sync');
let runSequence = require('run-sequence');

let options = {
    dirBuild: '_build',
    dirPublish: '_publish',
    dirSrc: 'src',
    localeDefault: 'ru',
    localeList: ['ru', 'en']
};

let getDir = function () {
    return !!process.env.DEBUG ? options.dirBuild : options.dirPublish;
};

gulp.task('default', function () {
    console.log('default');
});

gulp.task('metalsmith', function (callback) {
    let metalsmith = Metalsmith(__dirname);

    metalsmith
        .source(`./${options.dirSrc}`)
        .destination(`./${getDir()}`)
        .clean(!process.env.DEBUG)

        // Adding environment variables to metadata
        .use(environment())
        .use(msIf(!!process.env.DEBUG, debugUi.report('environment')))

        // Splitting src by localization
        .use(collections({
            'root_en': `*_en.md`,
            'root_ru': `*_ru.md`,
            'root_test_en': `test/*_en.md`,
            'root_test_ru': `test/*_ru.md`
        }))
        .use(msIf(!!process.env.DEBUG, debugUi.report('collections')))

        // Adding multiple trees for each locale
        .use(multiLanguage({
            default: options.localeDefault,
            locales: options.localeList
        }))
        .use(msIf(!!process.env.DEBUG, debugUi.report('multiLanguage')))

        // Adding localization for strings in layouts and partials
        .use(i18n({
            default: options.localeDefault,
            locales: options.localeList,
            directory: 'locales',
            objectNotation: true
        }))
        .use(msIf(!!process.env.DEBUG, debugUi.report('i18n')))

        // Compiling markdown to html
        .use(markdownit())
        .use(msIf(!!process.env.DEBUG, debugUi.report('markdownit')))

        // Compiling partials
        // .use(inPlace({
        //     pattern: ['./layout/**/*.hbs', './partial/**/*.hbs']
        // }))
        // .use(msIf(!!process.env.DEBUG, debugUi.report('inPlace')))

        // Compiling layouts
        .use(layout({
            engine: 'handlebars',
            default: 'layout.hbs',
            directory: 'layout',
            partials: 'partial',
            partialExtension: '.hbs'
        }))
        .use(msIf(!!process.env.DEBUG, debugUi.report('layout')))

        // Adding links
        .use(permalinks({
            pattern: ':locale/:uri',
            relative: false,
            linksets: [{
                match: { collection: 'root_en' },
                pattern: ':locale/:uri/'
            }, {
                match: { collection: 'root_ru' },
                pattern: ':uri/'
            }, {
                match: { collection: 'root_test_en' },
                pattern: ':locale/test/:uri/'
            }, {
                match: { collection: 'root_test_ru' },
                pattern: 'test/:uri/'
            }]
        }))
        .use(msIf(!!process.env.DEBUG, debugUi.report('permalinks')))

        // Copiyng static assets
        .use(assets({
            source: './assets',
            destination: './assets'
        }))
        .use(msIf(!!process.env.DEBUG, debugUi.report('assets')))

        // Building website
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

    gulp.watch([`./${options.dirSrc}/**/*.md`, './layout/**/*.hbs', './partial/**/*.hbs'], ['metalsmith']);
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