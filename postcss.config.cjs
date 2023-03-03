const purgecss = require('@fullhuman/postcss-purgecss')

module.exports = {
    plugins: [
        purgecss({
            content: ['./**/*.html', './**/*.svelte'],
        })
    ]
}