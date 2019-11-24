const path = require("path");

module.exports = {
    mode: 'development',
    entry: {
        app: './src/main.ts'
    },
    output: {
        path: path.join(__dirname, "public"),
        publicPath: "/",
        filename: 'bundle.js',
        library: ["com", "example"],
        libraryTarget: 'umd',
    },
    devtool: 'inline-source-map',
    module: {
        rules:[
            {
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    devServer: {
        open: false,
        openPage: "index.html",
        contentBase: path.join(__dirname, 'public'),
        watchContentBase: true,
        port: 3000,
        host: "0.0.0.0",
    },
};
