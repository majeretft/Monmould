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
let sitemap = require('metalsmith-sitemap');
let robots = require('metalsmith-robots');
let updated = require('metalsmith-updated');
let htmlMinifier = require('metalsmith-html-minifier');

let gulp = require('gulp');
let less = require('gulp-less');
let sourcemaps = require('gulp-sourcemaps');
let LessAutoprefix = require('less-plugin-autoprefix');
let CleanCss = require('less-plugin-clean-css');

let BrowserSync = require('browser-sync');
let runSequence = require('run-sequence');

let linkGen = require('./util/linkGen');

// **** EVNIRONMENT VARIABLES **** //
const trueValue = 'YES';

let vars = {
    DEBUG: 'DEBUG',
    FORCE_OPTIMIZATION: 'FORCE_OPTIMIZATION'
};

process.env[vars.DEBUG] = trueValue;

let isDeclared = function (variable) {
    if (!(variable in vars))
        throw `Variable ${variable} is not supported`;

    return process.env[variable] && process.env[variable] === trueValue;
};

let declare = function (variable) {
    if (!(variable in vars))
        throw `Variable ${variable} is not supported`;

    process.env[variable] = trueValue;
};

let revoke = function (variable) {
    if (!(variable in vars))
        throw `Variable ${variable} is not supported`;

    if (variable in process.env)
        process.env[variable] = undefined;
};
// **** EVNIRONMENT VARIABLES **** //

let options = {
    dirBuild: '_build',
    dirPublish: '_publish',
    dirSrc: 'src',
    localeDefault: 'ru',
    localeList: ['ru', 'en'],
    // TODO: Change http://www.example.com to real url
    canonical: isDeclared(vars.DEBUG) ? 'http://localhost:3000' : 'http://www.example.com'
};

let getDir = function () {
    return isDeclared(vars.DEBUG) ? options.dirBuild : options.dirPublish;
};

gulp.task('default', function () {
    console.log('default');
});

gulp.task('metalsmith', function (callback) {
    let metalsmith = Metalsmith(__dirname);

    metalsmith
        .source(`./${options.dirSrc}`)
        .destination(`./${getDir()}`)
        .clean(!isDeclared(vars.DEBUG))

        // Adding environment variables to metadata
        .use(environment())
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('environment')))

        // Adds created and updated attributes to files based on cached information saved in a file
        .use(updated())
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('updated')))

        // Splitting src by localization
        .use(collections({
            'root_en': `*_en.md`,
            'root_ru': `*_ru.md`,
            'root_test_en': `test/*_en.md`,
            'root_test_ru': `test/*_ru.md`
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('collections')))

        // Adding multiple trees for each locale
        .use(multiLanguage({
            default: options.localeDefault,
            locales: options.localeList
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('multiLanguage')))

        // Adding localization for strings in layouts and partials
        .use(i18n({
            default: options.localeDefault,
            locales: options.localeList,
            directory: 'locales',
            objectNotation: true
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('i18n')))

        // Compiling markdown to html
        .use(markdownit())
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('markdownit')))

        // Compiling partials
        // .use(inPlace({
        //     pattern: ['./layout/**/*.hbs', './partial/**/*.hbs']
        // }))
        // .use(msIf(isDeclared(vars.DEBUG), debugUi.report('inPlace')))

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
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('permalinks')))

        // Compiling layouts
        .use(layout({
            engine: 'vash',
            default: 'layout.cshtml',
            directory: 'layout'
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('layout')))

        // Minify html output
        .use(msIf(
            !isDeclared(vars.DEBUG) || (isDeclared(vars.DEBUG) && isDeclared(vars.FORCE_OPTIMIZATION)),
            htmlMinifier("*.html", {
                removeEmptyElements: true,
                removeEmptyAttributes: true,
                removeComments: true,
                removeAttributeQuotes: false,
                processConditionalComments: false,
                keepClosingSlash: true
            })
        ))
        .use(msIf(
            isDeclared(vars.DEBUG) && isDeclared(vars.FORCE_OPTIMIZATION),
            debugUi.report('htmlMinifier')
        ))

        // Add links to use with sitemap
        .use(linkGen({
            propertyCaption: 'sitemapLinks'
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('linkGen')))

        // Generating sitemap
        .use(sitemap({
            hostname: options.canonical,
            omitIndex: true,
            modifiedProperty: 'updated',
            links: 'sitemapLinks'
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('sitemap')))

        // Generating robots txt
        .use(robots({
            allow: '/',
            sitemap: `${options.canonical}/sitemap.xml`
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('robots')))

        // Copiyng static assets
        .use(assets({
            source: './assets',
            destination: './assets'
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('assets')))

        // Building website
        .build(function (err) {
            if (err)
                throw err;
        });

    callback();
});

gulp.task('less', function () {
    let autoprefix = new LessAutoprefix({ browsers: ['last 3 versions', 'IE 8', '> 0.5%'] });
    let cleanCss = new CleanCss();

    let plugins = 
        !isDeclared(vars.DEBUG) || (isDeclared(vars.DEBUG) && isDeclared(vars.FORCE_OPTIMIZATION))
        ? [autoprefix, cleanCss]
        : [];

    return gulp.src('./less/**/*.less')
        .pipe(sourcemaps.init())
        .pipe(less({
            plugins: plugins
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(`./${getDir()}/css`));
});

gulp.task('serve', ['build'], function () {
    let browserSync = BrowserSync.create();
    browserSync.init({
        server: { baseDir: `./${getDir()}` },
        notify: false
    });

    gulp.watch([`./${options.dirSrc}/**/*.md`, './layout/**/*.cshtml', './partial/**/*.cshtml'], ['metalsmith']);
    gulp.watch(['./less/**/*.less'], ['less']);
});

gulp.task('serve-optimize', ['build-optimize'], function () {
    let browserSync = BrowserSync.create();
    browserSync.init({
        server: { baseDir: `./${getDir()}` },
        notify: false
    });

    gulp.watch([`./${options.dirSrc}/**/*.md`, './layout/**/*.cshtml', './partial/**/*.cshtml'], ['metalsmith']);
    gulp.watch(['./less/**/*.less'], ['less']);
});

gulp.task('build', function (callback) {
    declare(vars.DEBUG);
    revoke(vars.FORCE_OPTIMIZATION);
    runSequence('metalsmith', 'less', callback);
});

gulp.task('build-optimize', function (callback) {
    declare(vars.DEBUG);
    declare(vars.FORCE_OPTIMIZATION);
    runSequence('metalsmith', 'less', callback);
});

gulp.task('publish', function (callback) {
    revoke(vars.DEBUG);
    revoke(vars.FORCE_OPTIMIZATION);
    runSequence('metalsmith', 'less', callback);
});