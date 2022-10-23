const express = require('express');
const app = express();
const mongoose = require('mongoose');
const { URL } = require('./URL');
const { mongoose: mongooseConfig } = require('./config.json');
const { uri, database, options } = mongooseConfig;
const { port: PORT } = require('./config.json');

let connection;

async function connect() {
    await mongoose.connect(`${uri}/${database}`, options);

    connection = mongoose.connection;
    connection.on('error', console.error.bind(console, 'connection error:'));
}

function verifyConnected() {
    if (!connection) {
        throw new Error('Cannot make database requests without being connected');
    }
}

app.get('/config', async function(req, res) {
    res.sendFile('./index.html')
});

app.get('/*', async function (req, res) {
    verifyConnected();
    let url = await URL.findOne({ domain: req.subdomains });
    if(url)
        res.redirect(url.destination)
    else
        res.sendStatus(404);
});

connect().then(async () => {
    console.log("Database Connected");
    app.listen(PORT, function(err){
        if (err) console.log(err);
        console.log("Server listening on PORT", PORT);
    });
});

