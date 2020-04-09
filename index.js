var express = require('express');

const app = express();
const port = 8000;

var session = require('express-session');
var validator = require('express-validator');
var bodyParser = require('body-parser');
const expressSanitizer = require('express-sanitizer');
const fileUpload = require('express-fileupload');

/// added for session management
app.use(session({
	secret: 'coffee',
	resave: false,
	saveUninitialized: false,
	cookie: {
		expires: 600000
	}
}));
// use sanitizer
app.use(expressSanitizer());
// use file upload
app.use(fileUpload());

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost/recipebook";
MongoClient.connect(url, function(err,db) {
	if(err) throw err;
	console.log("Database created!");
	db.close();
}); 

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
// new code added to your Express web server
require('./routes/main')(app);
app.set('views', './views');
app.set('view engine', 'pug');
//////////////

app.listen(port, () => console.log(`App listening on port ${port}`));
