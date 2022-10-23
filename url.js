const { Schema, model } = require('mongoose');

const URLSchema = new Schema({
	domain: String,
	destination: String,
});

const URL = model('URL', URLSchema);

module.exports = {
	URLSchema: URLSchema,
	URL: URL
};
