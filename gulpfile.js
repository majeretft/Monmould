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
let sitemap = require('metalsmith-sitemap');
let robots = require('metalsmith-robots');
let updated = require('metalsmith-updated');
let htmlMinifier = require('metalsmith-html-minifier');
let favicons = require('metalsmith-favicons');

let gulp = require('gulp');
let less = require('gulp-less');
let sourcemaps = require('gulp-sourcemaps');
let LessAutoprefix = require('less-plugin-autoprefix');
let CleanCss = require('less-plugin-clean-css');

let BrowserSync = require('browser-sync');
let runSequence = require('run-sequence');

let linkGen = require('./util/linkGen');
let breadcrumbGen = require('./util/breadcrumbGen');
let i18n = require('./util/localizationHelper');
let multiLanguage = require('./util/localizationCollectionHelper');

// **** EVNIRONMENT VARIABLES **** //
const trueValue = 'YES';

let vars = {
    DEBUG: 'DEBUG',
    FORCE_OPTIMIZATION: 'FORCE_OPTIMIZATION',
    FORCE_CLEAN: 'FORCE_CLEAN'
};

process.env[vars.DEBUG] = trueValue;

let isDeclared = function (variable) {
    if (!(variable in vars))
        throw `Variable ${variable} is not supported`;

    return process.env[variable] && process.env[variable] === trueValue ? true : false;
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
        delete process.env[variable];
};
// **** EVNIRONMENT VARIABLES **** //

let options = {
    dirBuild: '_build',
    dirPublish: '_publish',
    dirSrc: 'src',
    localeDefault: 'ru',
    localeList: ['ru', 'en'],
    canonical: 'http://monmold.ru',
    buildVersion: '0.0.1'
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
        .clean(!isDeclared(vars.DEBUG) || isDeclared(vars.FORCE_CLEAN))

        .metadata({
            buildVersion: options.buildVersion
        })

        // Adding environment variables to metadata
        .use(environment())
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('environment')))

        // Adds created and updated attributes to files based on cached information saved in a file
        .use(updated())
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('updated')))

        // Splitting src by localization
        .use(collections({
            'root_en': '*_en.*',
            'root_ru': '*_ru.*',
            'root_portfolio_en': 'portfolio/*_en.*',
            'root_portfolio_ru': 'portfolio/*_ru.*',
            'root_portfolio_mold-design_en': 'portfolio/mold-design/*_en.*',
            'root_portfolio_mold-design_ru': 'portfolio/mold-design/*_ru.*',
            'root_portfolio_mold-for-custom-part_en': 'portfolio/mold-for-custom-part/*_en.*',
            'root_portfolio_mold-for-custom-part_ru': 'portfolio/mold-for-custom-part/*_ru.*',
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
        .use(markdownit({
            'html': true
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('markdownit')))

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
                match: { collection: 'root_portfolio_en' },
                pattern: ':locale/portfolio/:uri/'
            }, {
                match: { collection: 'root_portfolio_ru' },
                pattern: 'portfolio/:uri/'
            }, {
                match: { collection: 'root_portfolio_mold-design_en' },
                pattern: ':locale/portfolio/mold-design/:uri/'
            }, {
                match: { collection: 'root_portfolio_mold-design_ru' },
                pattern: 'portfolio/mold-design/:uri/'
            }, {
                match: { collection: 'root_portfolio_mold-for-custom-part_en' },
                pattern: ':locale/portfolio/mold-for-custom-part/:uri/'
            }, {
                match: { collection: 'root_portfolio_mold-for-custom-part_ru' },
                pattern: 'portfolio/mold-for-custom-part/:uri/'
            }]
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('permalinks')))

        // Add breadcrumbs
        .use(breadcrumbGen())
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('breadcrumbGen')))

        // Compiling partials
        .use(inPlace())
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('inPlace')))

        // Compiling layouts
        .use(layout({
            engine: 'vash',
            default: 'layout.vash',
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
            disallow: '/',
            sitemap: `${isDeclared(vars.DEBUG) ? 'http://localhost:3000' : options.canonical}/sitemap.xml`
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('robots')))

        // Copiyng static assets
        .use(assets({
            source: './assets',
            destination: './assets'
        }))
        .use(msIf(isDeclared(vars.DEBUG), debugUi.report('assets')))

        // Generating favicon
        .use(msIf(
            !isDeclared(vars.DEBUG) || (isDeclared(vars.DEBUG) && isDeclared(vars.FORCE_OPTIMIZATION)), 
            favicons({
                src: 'assets/logo_src.png',
                dest: './',
                icons: {
                    android: true,
                    appleIcon: true,
                    favicons: true,
                    firefox: true,
                    opengraph: true,
                    twitter: true,
                    windows: true,
                    yandex: true
                }
            })
        ))
        .use(msIf(
            isDeclared(vars.DEBUG) && isDeclared(vars.FORCE_OPTIMIZATION),
            debugUi.report('favicon')
        ))

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

    return gulp.src('./less/index.less')
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

    gulp.watch([`./${options.dirSrc}/**/*`, './layout/**/*', './partial/**/*'], ['metalsmith']);
    gulp.watch(['./less/**/*'], ['less']);
});

gulp.task('serve-optimize', ['build-optimize'], function () {
    let browserSync = BrowserSync.create();
    browserSync.init({
        server: { baseDir: `./${getDir()}` },
        notify: false
    });

    gulp.watch([`./${options.dirSrc}/**/*`, './layout/**/*', './partial/**/*'], ['metalsmith']);
    gulp.watch(['./less/**/*'], ['less']);
});

gulp.task('build', function (callback) {
    declare(vars.DEBUG);
    revoke(vars.FORCE_OPTIMIZATION);
    revoke(vars.FORCE_CLEAN);
    runSequence('metalsmith', 'less', callback);
});

gulp.task('build-optimize', function (callback) {
    declare(vars.DEBUG);
    declare(vars.FORCE_OPTIMIZATION);
    revoke(vars.FORCE_CLEAN);
    runSequence('metalsmith', 'less', callback);
});

gulp.task('build-clean', function (callback) {
    declare(vars.DEBUG);
    revoke(vars.FORCE_OPTIMIZATION);
    declare(vars.FORCE_CLEAN);
    runSequence('metalsmith', 'less', callback);
});

gulp.task('publish', function (callback) {
    revoke(vars.DEBUG);
    revoke(vars.FORCE_OPTIMIZATION);
    declare(vars.FORCE_CLEAN);
    runSequence('metalsmith', 'less', callback);
});