const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const { URL } = require('./url');
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

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/config', async function(req, res) {
    res.sendFile(__dirname + '/index.html')
});

app.post('/config', async function(req, res) {
    let document = {
        domain: req.body.domain,
        destination: req.body.destination
    }
    const newURL = new URL(document);
    await newURL.save().then(() => {
        res.redirect('/config')
    }).catch((e) => {
        res.status(504);
        res.send(e);
    });
});

app.get('/config/domains.json', async function(req, res) {
    let domains = await URL.find();
    res.type('json');
    res.send(domains);
})

app.get('/*', async function (req, res) {
    verifyConnected();
    let url = await URL.findOne({ domain: req.subdomains });
    console.log(req.subdomains)
    console.log(url)
    if(url)
        res.redirect('http://' + url.destination)
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

