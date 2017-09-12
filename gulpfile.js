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

let gulp = require('gulp');
let less = require('gulp-less');
let sourcemaps = require('gulp-sourcemaps');
let LessAutoprefix = require('less-plugin-autoprefix');
let CleanCss = require('less-plugin-clean-css');

let BrowserSync = require('browser-sync');
let runSequence = require('run-sequence');

let linkGen = require('./util/linkGen');

let options = {
    dirBuild: '_build',
    dirPublish: '_publish',
    dirSrc: 'src',
    localeDefault: 'ru',
    localeList: ['ru', 'en'],
    canonical: 'http://www.example.com'
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
        
        // Adds created and updated attributes to files based on cached information saved in a file
        .use(updated())
        .use(msIf(!!process.env.DEBUG, debugUi.report('updated')))

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

        // Compiling layouts
        .use(layout({
            engine: 'vash',
            default: 'layout.cshtml',
            directory: 'layout'
        }))
        .use(msIf(!!process.env.DEBUG, debugUi.report('layout')))

        // Add links to use with sitemap
        .use(linkGen({
            propertyCaption: 'sitemapLinks'
        }))
        .use(msIf(!!process.env.DEBUG, debugUi.report('linkGen')))

        // Generating sitemap
        .use(sitemap({
            hostname: options.canonical,
            omitIndex: true,
            modifiedProperty: 'updated',
            links: 'sitemapLinks'
        }))
        .use(msIf(!!process.env.DEBUG, debugUi.report('sitemap')))

        // Generating robots txt
        .use(robots({
            allow: '/',
            sitemap: `${options.canonical}/sitemap.xml`
        }))
        .use(msIf(!!process.env.DEBUG, debugUi.report('robots')))

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
    let autoprefix = new LessAutoprefix({ browsers: ['last 3 versions', 'IE 8', '> 0.5%'] });
    let cleanCss = new CleanCss();

    return gulp.src('./less/**/*.less')
        .pipe(sourcemaps.init())
        .pipe(less({
            plugins: [autoprefix, cleanCss]
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

gulp.task('build', function (callback) {
    process.env.DEBUG = 'YES';
    runSequence('metalsmith', 'less', callback);
});

gulp.task('publish', function (callback) {
    delete process.env.DEBUG;
    runSequence('metalsmith', 'less', callback);
});