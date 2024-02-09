// vite.config.js
const path = require("path");

export default {
    // to autorize this extension
    assetsInclude: ['**/*.glb'],

    // for css URL for FONT
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '')
        }
    }
}

