// =======================
// get the packages we need
// =======================
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var morgan = require('morgan');
var loki = require('lokijs');

var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file

// =======================
// configuration =========
// =======================
var port = process.env.PORT || 8080; // used to create, sign, and verify tokens

// in-memory database: lokijs
var db = new loki('user.json');
var user = db.addCollection('user');

app.set('superSecret', config.secret); // secret variable

// use body parser so we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// =======================
// routes ================
// =======================
// basic route
app.get('/', function (req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});

app.get('/setup', function (req, res) {
  // save the sample user
  user.insert({
    name: 'Luis Garcia',
    password: 'pass',
    admin: true
  });
  console.log('User saved successfully');
  res.json({ success: true });
});

// API ROUTES -------------------

// get an instance of the router for api routes
var apiRoutes = express.Router();

// route to authenticate a user (POST http://localhost:8080/api/authenticate)
apiRoutes.post('/authenticate', function (req, res) {

  // find the user
  let name = req.body.name;
  let user_found = user.find({ 'name': String(name) })[0];

  if (!user_found) {
    res.json({ success: false, message: 'Authentication failed. User not found.' });
  } else if (user_found) {
    // check if password matches
    if (user_found.password != req.body.password) {
      res.json({ success: false, message: 'Authentication failed. Wrong password.' });
    } else {
      // if user is found and password is right
      // create a token
      var token = jwt.sign(user_found, app.get('superSecret'), {
        expiresIn: 60 * 60 * 24 // expires in 24 hours
      });
      // return the information including token as JSON
      res.json({
        success: true,
        message: 'Enjoy your token!',
        token: token
      });
    }
  }

});

// route middleware to verify a token, 
// 1. above this mothed no authentication is required
// 2. below this method every http request will need authentication 
apiRoutes.use(function (req, res, next) {
//apiRoutes.get('/testToken', function (req, res) {  

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function (err, decoded) {
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        next();
        //return res.json({ success: true, message: 'Authenticated!!.' });
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({
      success: false,
      message: 'No token provided.'
    });

  }
});

// route to show a random message (GET http://localhost:8080/api/)
apiRoutes.get('/', function (req, res) {
  res.json({ message: 'Welcome to the coolest API on earth!' });
});

// route to return all users (GET http://localhost:8080/api/users)
apiRoutes.get('/users', function (req, res) {
  res.json(user.find());
});

// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

// =======================
// start the server ======
// =======================
app.listen(port);
console.log('Magic happens at http://localhost:' + port);