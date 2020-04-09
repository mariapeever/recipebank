module.exports = function(app)
{
  const {check, validationResult} = require('express-validator');
  const redirectLogin = (req,res,next) => {
    if (!req.session.userId) {
      res.redirect('/login');
    } else {
      next();
    }
  }
  // create a nonce
  const nonce = require('node-nonce').config({
    secret: 'coffee'
  });
  var nonce_tokens = [];

  const nutritionData = {
    caloriesRDA: 2000,
    sodiumRDA: 2300,
    fatRDA: 60.5,
    proteinRDA: 51,
    carbsRDA: 130,
    fiberRDA: 28
  }
  app.get('/', function(req,res) {
    var loggedIn = false;
    if (req.session.userId) {
      loggedIn = true;
    } 
    res.render('index', { title: 'Search or post recipes', header: 'Search your favourite recipes', featured: 'Here, you can search or post your favourite recipes.', search: 'Search', searchPlaceholder: 'What do you want to eat today?', submit: 'Search', register: 'Register', login: 'Login', loggedIn: loggedIn });
  });
  app.get('/login', function(req,res) {
    res.render('login', { title: 'Login!', header: 'Login', message: 'Login to your account.', name: 'Username', namePlaceholder: 'Your username...',password: 'Password', passwordPlaceholder: 'Your password...', submit: 'Login', loggedIn: false });
  });
  app.post('/loggedin', [
    check('name').not().isEmpty().withMessage('Username must not be empty.'),
    check('password').not().isEmpty().withMessage('Password must not be empty.')
  ], function(req,res) {
    // check for validation errors
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      res.redirect('./login');
    } else {
      //saving data in the database
      var MongoClient = require('mongodb').MongoClient;
      var url = 'mongodb://localhost';
      MongoClient.connect(url, function(err, client) {
        if(err) throw err;
        const bcrypt = require('bcrypt');
        // sanitize fields
        const plainPassword = req.sanitize(req.body.password);
        var name = req.sanitize(req.body.name);
        var db = client.db('recipebank'); 
        // find username in db
        db.collection('users').findOne({'name': name}, function(err,result) {
          if(result) {
            var hashedPassword = result.password;
            // compare passwords
            bcrypt.compare(plainPassword, hashedPassword, function(err,result) {
              if(result) {
                // **** save user session here, when login is successful
                req.session.userId = name;
                nonce_tokens.push({user: req.session.userId, tokens: []});
                console.log(nonce_tokens);
                res.render('message', { message: 'You are now logged in, ' + name + '. Your password is ' + plainPassword, loggedIn: true });
              } else {
                res.render('message', { message: 'Incorrect password. Please try to login with a different password or register.', loggedIn: false });
              }
            });
          } else {
            res.render('message', { message: 'Unknown username. Please try to login with a different username or register.', loggedIn: false });
          }
        });
      });
    }
  });
  app.get('/logout', redirectLogin, function(req,res) {
    // distroy session
    nonce_tokens.splice(nonce_tokens.indexOf(e => e.user == req.session.userId), 1);
    req.session.destroy(err => {
      if (err) {
        return res.redirect('./');
      }
      res.render('message', { message: 'You are now logged out.' });
    });
  });
  app.get('/register', function(req,res) {
    res.render('register', { title: 'Register!', header: 'Register', message: 'Complete the form below to register for an account.', name: 'Username', nameHelp: 'Username must be between 5 and 30 characters long.', namePlaceholder: 'Your username...', first: 'First name', firstPlaceholder: 'Your first name...', last: 'Last name', lastPlaceholder: 'Your last name...', email: 'Email', emailPlaceholder: 'Your email...', password: 'Password', passwordHelp: 'Password must be at least 8 characters long and must contain a number.', passwordPlaceholder: 'Your password...', submit: 'Register'});
  });
  app.post('/registered', [
    check('name').isLength({ min:5, max:30}).withMessage('Username must be between 5 and 30 characters long.'),
    check('first')
      .not().isEmpty().withMessage('First name must not be empty.')
      .matches(/^[a-zA-Z0-9\s.,'\-]+$/, 'g').withMessage('First name must be alphanumeric.'),
    check('last')
      .not().isEmpty().withMessage('Last name must not be empty.')
      .matches(/^[a-zA-Z0-9\s.,'\-]+$/, 'g').withMessage('Last name must be alphanumeric.'),
    check('password')
      .isLength({ min: 8, max: 128}).withMessage('Password must between 8 and 128 characters long.')
      .matches(/\d/).withMessage('Password must contain a number.')
    ], function(req,res) {
    // check for validation errors
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      res.redirect('./register');
    } else {
      // saving data in the database
      var MongoClient = require('mongodb').MongoClient;
      var url = 'mongodb://localhost';
      MongoClient.connect(url, function(err, client) {
        if (err) throw err;
        const bcrypt = require('bcrypt');
        const saltRounds = 10;
        //sanitize fields
        const plainPassword = req.sanitize(req.body.password);
        var name = req.sanitize(req.body.name);
        var first = req.sanitize(req.body.first);
        var last = req.sanitize(req.body.last);
        var email = req.sanitize(req.body.email);
        // hash the password and save user data
        bcrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {
          if (err) throw err;
          // store hashed password in your database
          var db = client.db('recipebank')
          // find the username
          db.collection('users').findOne({'name': name}, function(err,result) {
            if(!result) {
              db.collection('users').insertOne({
                'name': name,
                'first': first,
                'last': last,
                'email': email,
                'password': hashedPassword
              });
              client.close();
              res.render('message', { message: 'You are now registered, Your username is ' + name + ', your password is ' + plainPassword + ' and your hashed password is ' + hashedPassword + '.', loggedIn: false });
            } else {
              res.render('message', { message: 'The username ' + name + ' is not available. Please try to register with a different username.', loggedIn: false });
            }
          });
        });
      });
    }
  });
  app.get('/addrecipe', redirectLogin, function(req,res) {
    res.render('addrecipe', { title: 'Add a recipe', header: 'Add a recipe', message: 'Complete the form below to add a recipe.', name: 'Title', namePlaceholder: 'Recipe title...', nameHelp: 'Title must be alphanumeric.', description: 'Description', descriptionPlaceholder: 'About the recipe...', descriptionHelp: 'Must be alphanumeric and can contain the following special characters only: .,\(\)?!@#\$%\^&\'\-\/', time: 'Cooking time', timePlaceholder: 'Cooking time...', min: 'Minutes', calories: 'Calories', caloriesPlaceholder: 'Number of calories...', caloriesHelp: 'Calories must be a number.', ingredients: 'Ingredients', ingredientPlaceholder: 'Add an ingredient...', addIngredient: 'Add ingredient',  ingredientsHelp: 'Must be alphanumeric and can contain the following special characters only: .,\(\)?!@#\$%\^&\'.', sodium: 'Sodium', sodiumPlaceholder: 'Milligrams of sodium (mg)...', sodiumHelp: 'Sodium must be in milligrams.', fat: 'Fat', fatPlaceholder: 'Grams of fat (g)...', fatHelp: 'Fat must be in grams.', protein: 'Protein', proteinPlaceholder: 'Grams of protein (g)...', proteinHelp: 'Protein must be in grams.', carbs: 'Carbs', carbsPlaceholder: 'Grams of carbs (g)...', carbsHelp: 'Carbs must be in grams.', fiber: 'Fiber', fiberPlaceholder: 'Grams of fiber (g)...', fiberHelp: 'Fiber must be in grams.', directions: 'Directions', directionsPlaceholder: 'Add directions...', addDirections: 'Add directions', directionsHelp: 'Must be alphanumeric and can contain the following special characters only: .,\(\)?!@#\$%\^&\'.', image: 'Upload an image', imgHelp: 'The image must be jpg/jpeg, png or webp.', loggedIn: true });
  });
  app.post('/recipeadded', [
    check('name')
      .not().isEmpty().withMessage('Recipe title must not be empty.')
      .matches(/^[A-z0-9À-ž\s']+$/, 'g').withMessage('Recipe title must be alphanumeric.'),
    check('description')
      .not().isEmpty().withMessage('Description must not be empty.')
      .matches(/^[A-z0-9À-ž\s.,\(\)\-\/?!@#\$%\^&']+$/, 'g').withMessage('Description must be alphanumeric.'),
    check('time')
      .not().isEmpty().withMessage('Cooking time must not be empty.')
      .matches(/^[0-9]{2,2}:[0-9]{2,2}$/, 'g').withMessage('Time must be in format hh:mm.'),
    check('calories')
      .isNumeric().withMessage('Calories must be numeric.'),
    check('sodium')
      .isNumeric().withMessage('Sodium must be numeric.'),
    check('fat')
      .isNumeric().withMessage('Fat must be numeric.'),
    check('protein')
      .isNumeric().withMessage('Protein must be numeric.'),
    check('carbs')
      .isNumeric().withMessage('Carbs must be numeric.'),
    check('fiber')
      .isNumeric().withMessage('Fiber must be numeric.'),
    check('ingredient-0')
      .not().isEmpty().withMessage('Ingredient must not be empty.')
      .matches(/^[A-z0-9À-ž\s.,\(\)\-\/?!@#\$%\^&']+$/, 'g').withMessage('Ingredient must be alphanumeric.'),
    check('direction-0')
      .not().isEmpty().withMessage('Directions must not be empty.')
      .matches(/^[A-z0-9À-ž\s.,\(\)\-\/?!@#\$%\^&']+$/, 'g').withMessage('Directions must be alphanumeric.')
    ], redirectLogin, function(req,res) { 
    const errors = validationResult(req);
    var ingredients = [];
    var directions = [];
    for (let [key, value] of Object.entries(req.body)) {
      if(`${value}` != '') {
        if(`${key}`.match(/^ingredient-[0-9]{1,2}$/)) {
          if(`${value}`.match(/^[A-z0-9À-ž\s.,\(\)\-\/?!@#\$%\^&']+$/)) {
            ingredients.push(req.sanitize(`${value}`));
          } else {
            errors.errors.push({
              value: `${value}`,
              msg: 'Ingredient must be alphanumeric.',
              param: `${key}`,
              location: 'body'
            });
          }
        } else if(`${key}`.match(/^direction-[0-9]{1,2}$/)) {
          if(`${value}`.match(/^[A-z0-9À-ž\s.,\(\)\-\/?!@#\$%\^&']+$/)) {
            directions.push(req.sanitize(`${value}`));
          } else {
            errors.errors.push({
              value: `${value}`,
              msg: 'Direction must be alphanumeric.',
              param: `${key}`,
              location: 'body'
            });
          }        
        }
      }
    }
    if(req.files && !req.files.recipeImg.name.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|webp|WEBP)$/)) {
      errors.errors.push({
        value: req.files.recipeImg.name,
        msg: 'Image must be jpg/jpeg, png or webp.',
        param: 'recipeImg',
        location: 'body'
      });
    }
    if(!errors.isEmpty()) {
      res.render('message', { title: 'Errors', message: 'Errors:', errors: errors.errors });
    } else {
      // saving data in database
      var MongoClient = require('mongodb').MongoClient;
      var url = 'mongodb://localhost';
      MongoClient.connect(url, function(err, client) {
        if (err) throw err;
        // sanitize fields
        var db = client.db('recipebank');
        db.collection('users').findOne({ 'name': req.session.userId }, function(findErr,result) {
          if(findErr) throw findErr;
          else
            db.collection('recipes').find({}, {'slug': 1 }).toArray((findErr, results) => {
              if (findErr) throw findErr;
              else
                // sanitize fields
                var name = req.sanitize(req.body.name);
                var description = req.sanitize(req.body.description);
                var time = req.sanitize(req.body.time);
                var calories = req.sanitize(req.body.calories);
                var sodium = req.sanitize(req.body.sodium);
                var fat = req.sanitize(req.body.fat);
                var protein = req.sanitize(req.body.protein);
                var carbs = req.sanitize(req.body.carbs);
                var fiber = req.sanitize(req.body.fiber);
                var img;
                if(req.files) {
                  img = req.sanitize(req.files.recipeImg.name);
                  req.files.recipeImg.mv('./public/images/' + img, function(err) {
                    if (err) throw err;
                  });
                } else {
                  img = 'placeholder.png';
                }
                var ingredientsNumber = ingredients.length;
                // generate unique slug
                var count = 0;
                results.forEach(e => {
                  if(e.name == name) {
                    count++
                  }
                });
                var slug;
                if (count > 0) {
                  slug = name.replace(/ /g, '-') + '-' + count;
                } else {
                  slug = name.replace(/ /g, '-');
                }
                var date = new Date();
                // generate new ObjectID
                var ObjectID = require('mongodb').ObjectID;
                var objectId = new ObjectID();
                // insert recipe into collection with ref of author
                db.collection('recipes').insertOne({
                  '_id': objectId,
                  'name': name,
                  'published': date, 
                  'slug': slug,
                  'user': {
                      "$ref" : "users",
                      "$id" : result._id,
                      "_id" : result._id,
                      "$db" : "recipebank"
                    },
                  'description': description,
                  'time': time,
                  'calories': calories,
                  'sodium': sodium,
                  'fat': fat,
                  'protein': protein,
                  'carbs': carbs,
                  'fiber': fiber,
                  'img': img,
                  'ingredients': ingredients,
                  'directions': directions
                });
                client.close();
                var recipe = { author: [{ name: result.name }], description: description, time: time, calories: calories, sodium: sodium, fat: fat, protein: protein, carbs: carbs, fiber: fiber, img: img, ingredients: ingredients,directions: directions, slug: slug };
                res.render('recipeadded', { title: 'Recipe for ' + name + ' Added Successfully', recipe: recipe, header: 'Recipe for ' + name + ' added', message: 'The recipe for ' + name + ' was added successfully.',descriptionLabel: 'Description', ingredientsLabel: 'Ingredients', directionsLabel: 'Directions', timeLabel: 'Cooking time', timeUnit: 'Minutes', nutritionLabel: 'Nutrition', caloriesRDA: nutritionData.caloriesRDA, caloriesLabel: 'Calories', caloriesUnit: 'kcal', sodiumRDA: nutritionData.sodiumRDA, sodiumLabel: 'Sodium', sodiumUnit: 'mg', fatRDA: nutritionData.fatRDA, fatLabel: 'Fat', fatUnit: 'g', proteinRDA: nutritionData.proteinRDA, proteinLabel: 'Protein', proteinUnit: 'g', carbsRDA: nutritionData.carbsRDA, carbsLabel: 'Carbs', carbsUnit: 'g', fiberRDA: nutritionData.fiberRDA, fiberLabel: 'Fiber', fiberUnit: 'g', images: '/images/', viewRecipe: '/recipes/', viewLabel: 'See directions', updateRecipe: '/updaterecipe/', updateLabel: 'Update', deleteRecipe: '/deleterecipe/', deleteLabel: 'Delete', user: req.session.userId, loggedIn: true });
            });
        }); 
      });
    }
  });
  app.get('/updaterecipe/*', redirectLogin, function(req,res) {
    var slug = req.sanitize(req.url.replace('/updaterecipe/',''));
     // init
    nonce.init(req, res); // request and response (HTTP)
    nonce_tokens.find(e => e.user == req.session.userId).tokens.push(nonce.create('update_'+slug));
    console.log(nonce_tokens);
    var MongoClient = require('mongodb').MongoClient;
    var url = 'mongodb://localhost';
    MongoClient.connect(url, function (err, client) {
      if (err) throw err;
      var db = client.db('recipebank');
      // find recipes
      db.collection('recipes').aggregate([
        { '$lookup': { 
            'from': 'users',
            'localField': 'user._id',
            'foreignField': '_id',
            'as': 'author' 
          }
        },
        { '$project': 
          { 
            'author': { 
              'name': 1,
            },
            'name': 1,
            'user': 1,
            'slug': 1,
            'description': 1,
            'time': 1,
            'calories': 1,
            'sodium': 1,
            'fat': 1,
            'protein': 1,
            'carbs': 1,
            'fiber': 1,
            'img': 1,
            'ingredients': 1,
            'directions': 1
          }
        },
        { 
          '$match': { 
            'slug': slug,
            'author': [{
              'name': req.session.userId
            }] 
          }
        }]).toArray((findErr, results) => {
        if (results.length) {
          var result = results[0];
          res.render('updaterecipe', { title: 'Update recipe', header: 'Update recipe', result: result, message: 'Complete the form below to add a recipe.', name: 'Title', namePlaceholder: 'Recipe title...', nameHelp: 'Title must be alphanumeric.', description: 'Description', descriptionPlaceholder: 'About the recipe...', descriptionHelp: 'Must be alphanumeric and can contain the following special characters only: .,\(\)?!@#\$%\^&\'\-\/', time: 'Cooking time', timePlaceholder: 'Cooking time...', min: 'Minutes', calories: 'Calories', caloriesPlaceholder: 'Number of calories...', caloriesHelp: 'Calories must be a number.', ingredients: 'Ingredients', ingredientPlaceholder: 'Add an ingredient...', addIngredient: 'Add ingredient',  ingredientsHelp: 'Must be alphanumeric and can contain the following special characters only: .,\(\)?!@#\$%\^&\'.\/\-', sodium: 'Sodium', sodiumPlaceholder: 'Milligrams of sodium (mg)...', sodiumHelp: 'Sodium must be in milligrams.', fat: 'Fat', fatPlaceholder: 'Grams of fat (g)...', fatHelp: 'Fat must be in grams.', protein: 'Protein', proteinPlaceholder: 'Grams of protein (g)...', proteinHelp: 'Protein must be in grams.', carbs: 'Carbs', carbsPlaceholder: 'Grams of carbs (g)...', carbsHelp: 'Carbs must be in grams.', fiber: 'Fiber', fiberPlaceholder: 'Grams of fiber (g)...', fiberHelp: 'Fiber must be in grams.', directions: 'Directions', directionsPlaceholder: 'Add directions...', addDirections: 'Add directions', directionsHelp: 'Must be alphanumeric and can contain the following special characters only: .,\(\)?!@#\$%\^&\'.\/\-', image: 'Upload an image', imgHelp: 'The image must be jpg/jpeg, png or webp.', loggedIn: true });
        } else {
          res.render('message', { title: 'Not authorised', message: 'Oops! You are not authorised to update this recipe.', loggedIn: true });
        }
      });
    });
  });
  app.post('/recipeupdated/*', [
    check('name')
      .not().isEmpty().withMessage('Recipe title must not be empty.')
      .matches(/^[A-z0-9À-ž\s']+$/, 'g').withMessage('Recipe title must be alphanumeric.'),
    check('ingredient-0')
      .not().isEmpty().withMessage('Ingredient must not be empty.')
      .matches(/^[A-z0-9À-ž\s.,\(\)\-\/?!@#\$%\^&']+$/, 'g').withMessage('Ingredient must be alphanumeric.'),
    check('direction-0')
      .not().isEmpty().withMessage('Directions must not be empty.')
      .matches(/^[A-z0-9À-ž\s.,\(\)\-\/?!@#\$%\^&']+$/, 'g').withMessage('Directions must be alphanumeric.'),
    check('description')
      .not().isEmpty().withMessage('Description must not be empty.')
      .matches(/^[A-z0-9À-ž\s.,\(\)\-\/?!@#\$%\^&']+$/, 'g').withMessage('Description must be alphanumeric.'),
    check('time')
      .not().isEmpty().withMessage('Cooking time must not be empty.')
      .matches(/^[0-9]{2,2}:[0-9]{2,2}$/, 'g').withMessage('Time must be in format hh:mm.'),
    check('calories')
      .isNumeric().withMessage('Calories must be numeric.'),
    check('sodium')
      .isNumeric().withMessage('Sodium must be numeric.'),
    check('fat')
      .isNumeric().withMessage('Fat must be numeric.'),
    check('protein')
      .isNumeric().withMessage('Protein must be numeric.'),
    check('carbs')
      .isNumeric().withMessage('Carbs must be numeric.'),
    check('fiber')
      .isNumeric().withMessage('Fiber must be numeric.')
    ], redirectLogin, function(req,res) { 
    var prevSlug = req.sanitize(req.url.replace('/recipeupdated/',''));
    var nonce_token = false;
    var userTokens = nonce_tokens.indexOf(nonce_tokens.find(e => e.user == req.session.userId));
    for(var i = 0; i < nonce_tokens[userTokens].tokens.length; i++) {
      if(nonce.verify(nonce_tokens[userTokens].tokens[i], 'update_'+prevSlug)) {
        nonce_token = true;
        nonce_tokens[userTokens].tokens.splice(i,1);
        break;
      }
    }
    if(!nonce_token) {
      res.send('Oops! You are not authorised to update this recipe.<br><a href="/">Home</a>');
    } else {
      const errors = validationResult(req);
      var ingredients = [];
      var directions = [];
      for (let [key, value] of Object.entries(req.body)) {
        if(`${value}` != '') {
          if(`${key}`.match(/^ingredient-[0-9]{1,2}$/)) {
            if(`${value}`.match(/^[A-z0-9À-ž\s.,\(\)\-\/?!@#\$%\^&']+$/)) {
              ingredients.push(req.sanitize(`${value}`));
            } else {
              errors.errors.push({
                value: `${value}`,
                msg: 'Ingredient must be alphanumeric.',
                param: `${key}`,
                location: 'body'
              });
            }
          } else if(`${key}`.match(/^direction-[0-9]{1,2}$/)) {
            if(`${value}`.match(/^[A-z0-9À-ž\s.,\(\)\-\/?!@#\$%\^&']+$/)) {
              directions.push(req.sanitize(`${value}`));
            } else {
              errors.errors.push({
                value: `${value}`,
                msg: 'Direction must be alphanumeric.',
                param: `${key}`,
                location: 'body'
              });
            }        
          }
        }
      }
      if(req.files && !req.files.recipeImg.name.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|webp|WEBP)$/)) {
        errors.errors.push({
          value: req.files.recipeImg.name,
          msg: 'Image must be jpg/jpeg, png or webp.',
          param: 'recipeImg',
          location: 'body'
        });
      }
      if(!errors.isEmpty()) {
        res.render('message', { title: 'Errors', message: 'Errors:', errors: errors.errors });
      } else {
        // saving data in database
        var MongoClient = require('mongodb').MongoClient;
        var url = 'mongodb://localhost';
        MongoClient.connect(url, function(err, client) {
          if (err) throw err;
          // sanitize fields
          var db = client.db('recipebank');
          db.collection('recipes').aggregate([
            { '$lookup': { 
                'from': 'users',
                'localField': 'user._id',
                'foreignField': '_id',
                'as': 'author' 
              }
            },
            { '$project': 
              { 
                'author': { 
                  'name': 1,
                },
                'name': 1,
                'user': 1,
                'slug': 1,
                'description': 1,
                'time': 1,
                'calories': 1,
                'sodium': 1,
                'fat': 1,
                'protein': 1,
                'carbs': 1,
                'fiber': 1,
                'img': 1,
                'ingredients': 1,
                'directions': 1
              }
            },
            { 
              '$match': { 
                'slug': prevSlug,
                'author': [{
                  'name': req.session.userId
                }] 
              }
            }]).toArray((findErr, results) => {
            if (results.length) {
              var result = results[0];
              if(result.author[0].name == req.session.userId && result.slug == prevSlug) {

                var name = req.sanitize(req.body.name);
                var description = req.sanitize(req.body.description);
                var time = req.sanitize(req.body.time);
                var calories = req.sanitize(req.body.calories);
                var sodium = req.sanitize(req.body.sodium);
                var fat = req.sanitize(req.body.fat);
                var protein = req.sanitize(req.body.protein);
                var carbs = req.sanitize(req.body.carbs);
                var fiber = req.sanitize(req.body.fiber);
                var ingredientsNumber = result.ingredients.length;
                var img;
                if(req.files) {
                  img = req.sanitize(req.files.recipeImg.name);
                  req.files.recipeImg.mv('./public/images/' + img, function(err) {
                    if (err) throw err;
                  });
                } else {
                  img = 'placeholder.png';
                }
                var slug = prevSlug;
                if (name != result.name) {
                  var count = 0;
                  results.forEach(e => {
                    if(e.name == name) {
                      count++
                    }
                  });
                  if (count > 0) {
                    slug = name.replace(/ /g, '-') + '-' + count;
                  } else {
                    slug = name.replace(/ /g, '-');
                  }
                }
                db.collection('recipes').updateOne(
                  {'slug': prevSlug },
                  {'$set': {
                    'name': name,
                    'slug': slug,
                    'description': description,
                    'time': time,
                    'calories': calories,
                    'sodium': sodium,
                    'fat': fat,
                    'protein': protein,
                    'carbs': carbs,
                    'fiber': fiber,
                    'img': img,
                    'ingredients': ingredients,
                    'directions': directions
                }});
                var recipe = { author: [{ name: result.author[0].name }], description: description, time: time, calories: calories, sodium: sodium, fat: fat, protein: protein, carbs: carbs, fiber: fiber, img: img, ingredients: ingredients,directions: directions, slug: slug };
                client.close();
                res.render('recipeupdated', { title: 'Recipe for ' + name + ' Updated Successfully', recipe: recipe, header: 'Recipe for ' + name + ' updated', message: 'The recipe for ' + name + ' was updated successfully.', descriptionLabel: 'Description', ingredientsLabel: 'Ingredients', directionsLabel: 'Directions', timeLabel: 'Cooking time', timeUnit: 'Minutes', nutritionLabel: 'Nutrition', caloriesRDA: nutritionData.caloriesRDA, caloriesLabel: 'Calories', caloriesUnit: 'kcal', sodiumRDA: nutritionData.sodiumRDA, sodiumLabel: 'Sodium', sodiumUnit: 'mg', fatRDA: nutritionData.fatRDA, fatLabel: 'Fat', fatUnit: 'g', proteinRDA: nutritionData.proteinRDA, proteinLabel: 'Protein', proteinUnit: 'g', carbsRDA: nutritionData.carbsRDA, carbsLabel: 'Carbs', carbsUnit: 'g', fiberRDA: nutritionData.fiberRDA, fiberLabel: 'Fiber', fiberUnit: 'g', images: '/images/', viewRecipe: '/recipes/', viewLabel: 'See directions', updateRecipe: '/updaterecipe/', updateLabel: 'Update', deleteRecipe: '/deleterecipe/', deleteLabel: 'Delete', user: req.session.userId, loggedIn: true });   
              }
            } else {
              res.render('message', { title: 'Not authorised', message: 'Oops! You are not authorised to update this recipe.', loggedIn: true });
            }
          });
        }); 
      }
    }
    
  });
  app.get('/deleterecipe/*', redirectLogin, function(req,res) {
    var slug = req.sanitize(req.url.replace('/deleterecipe/',''));
     // init
    nonce.init(req, res); // request and response (HTTP)
    nonce_tokens.find(e => e.user == req.session.userId).tokens.push(nonce.create('delete_'+slug));
    console.log(nonce_tokens);
    var MongoClient = require('mongodb').MongoClient;
    var url = 'mongodb://localhost';
    MongoClient.connect(url, function (err, client) {
      if (err) throw err;
      var db = client.db('recipebank');
      // find recipes
      db.collection('recipes').aggregate([
        { '$lookup': { 
            'from': 'users',
            'localField': 'user._id',
            'foreignField': '_id',
            'as': 'author' 
          }
        },
        { '$project': 
          { 
            'author': { 
              'name': 1,
            },
            'name': 1,
            'slug': 1,
            'description': 1,
            'time': 1,
            'calories': 1,
            'sodium': 1,
            'fat': 1,
            'protein': 1,
            'carbs': 1,
            'fiber': 1,
            'img': 1,
            'ingredients': 1,
            'directions': 1
          }
        },
        { '$match': { 
            'slug': slug,
            'author': [{
              'name': req.session.userId
            }]
          }
        }]).toArray((findErr, results) => {
        if(results.length) {   
          var result = results[0];
          res.render('deleterecipe', { title: 'Delete ' + result.name, message: 'Are you sure that you want to delete this recipe?', recipe: result, descriptionLabel: 'Description', ingredientsLabel: 'Ingredients', directionsLabel: 'Directions', timeLabel: 'Cooking time', timeUnit: 'Minutes', nutritionLabel: 'Nutrition', caloriesRDA: nutritionData.caloriesRDA, caloriesLabel: 'Calories', caloriesUnit: 'kcal', sodiumRDA: nutritionData.sodiumRDA, sodiumLabel: 'Sodium', sodiumUnit: 'mg', fatRDA: nutritionData.fatRDA, fatLabel: 'Fat', fatUnit: 'g', proteinRDA: nutritionData.proteinRDA, proteinLabel: 'Protein', proteinUnit: 'g', carbsRDA: nutritionData.carbsRDA, carbsLabel: 'Carbs', carbsUnit: 'g', fiberRDA: nutritionData.fiberRDA, fiberLabel: 'Fiber', fiberUnit: 'g', images: '/images/',  viewRecipe: '/recipes/', viewLabel: 'See directions', updateRecipe: '/updaterecipe/', updateLabel: 'Update', deleteRecipe: '/recipedeleted/', deleteLabel: 'Delete', user: req.session.userId, loggedIn: true });
        } else {
          res.render('message', { title: 'Not authorised', message: 'Oops! You are not authorised to delete this recipe.' });
        }
      }); 
    });
  });
  app.get('/recipedeleted/*', redirectLogin, function(req,res) { 
    var slug = req.sanitize(req.url.replace('/recipedeleted/',''));
    var nonce_token = false;
    var userTokens = nonce_tokens.indexOf(nonce_tokens.find(e => e.user == req.session.userId));
    for(var i = 0; i < nonce_tokens[userTokens].tokens.length; i++) {
      if(nonce.verify(nonce_tokens[userTokens].tokens[i], 'delete_'+slug)) {
        nonce_token = true;
        nonce_tokens[userTokens].tokens.splice(i,1);
        break;
      }
    }
    if(!nonce_token) {
      res.render('message', { title: 'Not authorised', message: 'Oops! Something went wrong. If the recipe is yours, please try to delete it again from My Recipes.' });
    } else {
      // saving data in database
      var MongoClient = require('mongodb').MongoClient;
      var url = 'mongodb://localhost';
      MongoClient.connect(url, function(err, client) {
        if (err) throw err;
        // sanitize fields
        var db = client.db('recipebank');
        db.collection('recipes').aggregate([
        { '$lookup': { 
            'from': 'users',
            'localField': 'user._id',
            'foreignField': '_id',
            'as': 'author' 
          }
        },
        { '$project': 
          { 
            '_id': 1,
            'name': 1,
            'slug': 1,
            'author': { 
              'name': 1,
            }
          }
        },
        { '$match': { 
            'slug': slug,
            'author': [{
              'name': req.session.userId
            }]
          }
        }]).toArray((findErr, results) => {
          if(results.length) {
            var result = results[0];
            db.collection('recipes').deleteOne({ '_id': result._id });
            client.close();
            res.render('message', { title: 'Recipe for ' + result.name + ' Deleted', header: 'Recipe for ' + result.name + ' deleted', message: 'The recipe for ' + result.name + ' was deleted successfully.',  loggedIn: true }); 
          } else {
            res.render('message', { title: 'Not authorised', message: 'Oops! You are not authorised to delete this recipe.', loggedIn: true });
          }
        });
      });
    }
  });
  app.get('/search', redirectLogin, function(req,res) {
    res.render('search', { title: 'Search!', header: 'Search your favourite recipes', message: 'Here, you can search for your favourite recipes and ingredients.',search: 'Search', searchPlaceholder: 'What do you want to eat today?', submit: 'Search', loggedIn: true });
  });
  app.get('/search-results', [
    check('keyword').not().isEmpty().withMessage('Keyword must not be empty.')
    ], redirectLogin, function(req,res) {
    // check for validation errors
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
      res.redirect('./search');
    } else {
      //connect to MongoDB
      var MongoClient = require('mongodb').MongoClient;
      var url = 'mongodb://localhost';
      MongoClient.connect(url, function (err, client) {
        if (err) throw err;
        var db = client.db('recipebank');
        //sanitize keyword
        var queryKeyword = req.sanitize(req.query.keyword);
        // find results
        db.collection('recipes').aggregate([
          { '$lookup': { 
              'from': 'users',
              'localField': 'user._id',
              'foreignField': '_id',
              'as': 'author' 
            }
          },
          { '$project': 
            { 
              'author': { 
                'name': 1,
              },
              'name': 1,
              'slug': 1,
              'description': 1,
              'time': 1,
              'calories': 1,
              'sodium': 1,
              'fat': 1,
              'protein': 1,
              'carbs': 1,
              'fiber': 1,
              'img': 1,
              'ingredients': 1,
              'directions': 1
            }
          },
          { '$match': { '$or': [
            { 'name': { '$regex': queryKeyword, '$options': 'i' } }, 
            { 'description': { '$regex': queryKeyword, '$options': 'i' } }, 
            { 'ingredients': { $elemMatch: { '$regex': queryKeyword, '$options': 'i' } }}
          ]}},
        ]).toArray((findErr, results) => {
        if(findErr) throw findErr;
        else
          res.render('search-results', { title: 'Search results for: ' + queryKeyword, header: 'Search results for: ' + queryKeyword, message: 'Below are the available recipes matching: ' + queryKeyword, searchResults: results,  descriptionLabel: 'Description', ingredientsLabel: 'Ingredients', directionsLabel: 'Directions', timeLabel: 'Cooking time', timeUnit: 'Minutes', nutritionLabel: 'Nutrition', caloriesRDA: nutritionData.caloriesRDA, caloriesLabel: 'Calories', caloriesUnit: 'kcal', sodiumRDA: nutritionData.sodiumRDA, sodiumLabel: 'Sodium', sodiumUnit: 'mg', fatRDA: nutritionData.fatRDA, fatLabel: 'Fat', fatUnit: 'g', proteinRDA: nutritionData.proteinRDA, proteinLabel: 'Protein', proteinUnit: 'g', carbsRDA: nutritionData.carbsRDA, carbsLabel: 'Carbs', carbsUnit: 'g', fiberRDA: nutritionData.fiberRDA, fiberLabel: 'Fiber', fiberUnit: 'g', images: '/images/',  viewRecipe: '/recipes/', viewLabel: 'See directions', updateRecipe: '/updaterecipe/', updateLabel: 'Update', deleteRecipe: '/recipedeleted/', deleteLabel: 'Delete', user: req.session.userId, loggedIn: true })
        });
      });
    }
  });
  app.get('/list', redirectLogin, function(req,res) {
    // connect to MongoDB
    var MongoClient = require('mongodb').MongoClient;
    var url = 'mongodb://localhost';
    MongoClient.connect(url, function (err, client) {
      if (err) throw err;
      var db = client.db('recipebank');
      // find recipes
      db.collection('recipes').aggregate([
        { '$lookup': { 
            'from': 'users',
            'localField': 'user._id',
            'foreignField': '_id',
            'as': 'author' 
          }
        },
        { '$project': 
          { 'author': { 
              'name': 1,
            },
            'name': 1,
            'slug': 1,
            'published': 1,
            'description': 1,
            'time': 1,
            'calories': 1,
            'sodium': 1,
            'fat': 1,
            'protein': 1,
            'carbs': 1,
            'fiber': 1,
            'img': 1,
            'ingredients': 1,
            'directions': 1
          },
        },
        { '$sort': 
          { 
            'published': -1
          }
        }]).toArray((findErr, results) => {
        if(findErr) throw findErr;
        else
          // nutrition constants
          res.render('list', { title: 'Recipes on RecipeBank', header: 'Recipes', message: 'Browse your favourite recipes.', recipes: results, descriptionLabel: 'Description', ingredientsLabel: 'Ingredients', directionsLabel: 'Directions', timeLabel: 'Cooking time', timeUnit: 'Minutes', nutritionLabel: 'Nutrition', caloriesRDA: nutritionData.caloriesRDA, caloriesLabel: 'Calories', caloriesUnit: 'kcal', sodiumRDA: nutritionData.sodiumRDA, sodiumLabel: 'Sodium', sodiumUnit: 'mg', fatRDA: nutritionData.fatRDA, fatLabel: 'Fat', fatUnit: 'g', proteinRDA: nutritionData.proteinRDA, proteinLabel: 'Protein', proteinUnit: 'g', carbsRDA: nutritionData.carbsRDA, carbsLabel: 'Carbs', carbsUnit: 'g', fiberRDA: nutritionData.fiberRDA, fiberLabel: 'Fiber', fiberUnit: 'g', images: '/images/', viewRecipe: '/recipes/', viewLabel: 'See directions', updateRecipe: '/updaterecipe/', updateLabel: 'Update', deleteRecipe: '/deleterecipe/', deleteLabel: 'Delete', user: req.session.userId, loggedIn: true });
        client.close();
      });
    });
  });
  app.get('/myrecipes', redirectLogin, function(req,res) {
    // connect to MongoDB
    var MongoClient = require('mongodb').MongoClient;
    var url = 'mongodb://localhost';
    MongoClient.connect(url, function (err, client) {
      if (err) throw err;
      var db = client.db('recipebank');
      // find recipes
      db.collection('recipes').aggregate([
        { '$lookup': { 
            'from': 'users',
            'localField': 'user._id',
            'foreignField': '_id',
            'as': 'author' 
          }
        },
        { '$project': 
          { 
            'author': { 
              'name': 1
            },
            'name': 1,
            'slug': 1,
            'published': 1,
            'description': 1,
            'time': 1,
            'calories': 1,
            'sodium': 1,
            'fat': 1,
            'protein': 1,
            'carbs': 1,
            'fiber': 1,
            'img': 1,
            'ingredients': 1,
            'directions': 1
          }
        },
        { '$match': { 
            'author': [{ 
              'name' : req.session.userId 
            }]
          }
        },
        { 
          '$sort': { 
            'published': -1
          }
        }]).toArray((findErr, results) => {
        if(findErr) throw findErr;
        else
          // nutrition constants
          res.render('list', { title: 'Recipes on RecipeBank', header: 'Recipes', message: 'Browse your favourite recipes.', recipes: results, descriptionLabel: 'Description', ingredientsLabel: 'Ingredients', directionsLabel: 'Directions', timeLabel: 'Cooking time', timeUnit: 'Minutes', nutritionLabel: 'Nutrition', caloriesRDA: nutritionData.caloriesRDA, caloriesLabel: 'Calories', caloriesUnit: 'kcal', sodiumRDA: nutritionData.sodiumRDA, sodiumLabel: 'Sodium', sodiumUnit: 'mg', fatRDA: nutritionData.fatRDA, fatLabel: 'Fat', fatUnit: 'g', proteinRDA: nutritionData.proteinRDA, proteinLabel: 'Protein', proteinUnit: 'g', carbsRDA: nutritionData.carbsRDA, carbsLabel: 'Carbs', carbsUnit: 'g', fiberRDA: nutritionData.fiberRDA, fiberLabel: 'Fiber', fiberUnit: 'g', images: '/images/', viewRecipe: '/recipes/', viewLabel: 'See directions', updateRecipe: '/updaterecipe/', updateLabel: 'Update', deleteRecipe: '/deleterecipe/', deleteLabel: 'Delete', user: req.session.userId, loggedIn: true });
        client.close();
      });
    });
  });
  app.get('/recipes/*', redirectLogin, function(req,res) {
    var slug = req.sanitize(req.url.replace('/recipes/',''));
    var MongoClient = require('mongodb').MongoClient;
    var url = 'mongodb://localhost';
    MongoClient.connect(url, function (err, client) {
      if (err) throw err;
      var db = client.db('recipebank');
      // find recipes
      db.collection('recipes').aggregate([
        { '$match': { 
            'slug': slug 
          }
        },
        { '$lookup': { 
            'from': 'users',
            'localField': 'user._id',
            'foreignField': '_id',
            'as': 'author' 
          }
        },
        { '$project': 
          { 
            'author': { 
              'name': 1,
            },
            'name': 1,
            'slug': 1,
            'description': 1,
            'time': 1,
            'calories': 1,
            'sodium': 1,
            'fat': 1,
            'protein': 1,
            'carbs': 1,
            'fiber': 1,
            'img': 1,
            'ingredients': 1,
            'directions': 1
          }
        }
        ]).toArray((findErr, results) => {
        if (findErr) throw findErr;
        else      
          res.render('recipe', { title: results[0].name, recipe: results[0], descriptionLabel: 'Description', ingredientsLabel: 'Ingredients', directionsLabel: 'Directions', timeLabel: 'Cooking time', timeUnit: 'Minutes', nutritionLabel: 'Nutrition', caloriesRDA: nutritionData.caloriesRDA, caloriesLabel: 'Calories', caloriesUnit: 'kcal', sodiumRDA: nutritionData.sodiumRDA, sodiumLabel: 'Sodium', sodiumUnit: 'mg', fatRDA: nutritionData.fatRDA, fatLabel: 'Fat', fatUnit: 'g', proteinRDA: nutritionData.proteinRDA, proteinLabel: 'Protein', proteinUnit: 'g', carbsRDA: nutritionData.carbsRDA, carbsLabel: 'Carbs', carbsUnit: 'g', fiberRDA: nutritionData.fiberRDA, fiberLabel: 'Fiber', fiberUnit: 'g', images: '/images/', updateRecipe: '/updaterecipe/', updateLabel: 'Update', deleteRecipe: '/deleterecipe/', deleteLabel: 'Delete', user: req.session.userId, loggedIn: true });
      }); 
    });
  });
  app.get('/api', function (req, res) {
    // connect to MongoDB
    var MongoClient = require('mongodb').MongoClient;
    var url = 'mongodb://localhost';
    MongoClient.connect(url, function (err, client) {
      if(err) throw err;
      var db = client.db('recipebank');
      // find books
      db.collection('recipes').aggregate([
        { '$lookup': { 
            'from': 'users',
            'localField': 'user._id',
            'foreignField': '_id',
            'as': 'author' 
          }
        },
        { '$project': 
          { 
            'author': { 
              'name': 1
            },
            'name': 1,
            'slug': 1,
            'published': 1,
            'description': 1,
            'time': 1,
            'calories': 1,
            'sodium': 1,
            'fat': 1,
            'protein': 1,
            'carbs': 1,
            'fiber': 1,
            'img': 1,
            'ingredients': 1,
            'directions': 1
          }
        },
        { 
          '$sort': { 
            'published': -1
          }
        }]).toArray((findErr, results) => {
        if (findErr) throw findErr;
        else
          // json response
          res.json(results);
        client.close();
      });
    });
  });
}
