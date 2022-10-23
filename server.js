const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const queryString = require('query-string');
const axios = require('axios');
const { URL } = require('./url');
const { mongoose: mongooseConfig } = require('./config.json');
const { uri, database, options } = mongooseConfig;
const { github: github } = require('./config.json');
const { domain, APP_ID, APP_SECRET } = github;
const { emails: emails } = require('./config.json');
const { port: PORT } = require('./config.json');

/**
 * DB Connection Shit
 */
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

/**
 * GitHub Auth
 */
const params = queryString.stringify({
    client_id: APP_ID,
    redirect_uri: `${domain}/config`,
    scope: ['read:user', 'user:email'].join(' '), // space seperated string
    allow_signup: true,
});

const githubLoginUrl = `https://github.com/login/oauth/authorize?${params}`;

async function getAccessTokenFromCode(code) {
    const { data } = await axios({
        url: 'https://github.com/login/oauth/access_token',
        method: 'get',
        params: {
            client_id: APP_ID,
            client_secret: APP_SECRET,
            redirect_uri: `${domain}/config`,
            code,
        },
    });
    /**
     * GitHub returns data as a string we must parse.
     */
    const parsedData = queryString.parse(data);
    //console.log(parsedData); // { token_type, access_token, error, error_description }
    if (parsedData.error) /*throw new Error(parsedData.error_description)*/ return null;
    return parsedData.access_token;
}

async function getGitHubUserData(access_token) {
    const { data } = await axios({
        url: 'https://api.github.com/user',
        method: 'get',
        headers: {
            Authorization: `token ${access_token}`,
        },
    });
    //console.log(data); // { id, email, name, login, avatar_url }
    return data;
}

async function verifyGitHubAuth(code) {
    let token = await getAccessTokenFromCode(code);
    if(!token) return false;
    let data = await getGitHubUserData(token);
    if(!data) return false;
    return emails.includes(data.email);
}


/**
 * Express endpoints
 */
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/config', async function(req, res) {
    let { code } = req.query;
    if(!code || !await verifyGitHubAuth(code))
        return res.redirect(githubLoginUrl);
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

app.get('/authenticate/github', async function(req, res) {
    res.redirect('/config');
})

app.get('/config/domains.json', async function(req, res) {
    let domains = await URL.find();
    res.type('json');
    res.send(domains);
})

app.get('/*', async function (req, res) {
    if(req.subdomains[0] === 'config')
        return res.redirect('/config');
    verifyConnected();
    let url = await URL.findOne({ domain: req.subdomains });
    if(url)
        res.redirect('http://' + url.destination)
    else
        res.sendStatus(404);
});

/**
 * Start app
 */
connect().then(async () => {
    console.log("Database Connected");
    app.listen(PORT, function(err){
        if (err) console.log(err);
        console.log("Server listening on PORT", PORT);
    });
});

