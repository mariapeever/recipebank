/* 
 * App: RecipeBank
 * Author: mpeev001
 */
RecipeBank is a Node.js/Express/Pug/MongoDB/SASS application with support for multi-user accounts. Users are allowed to search, browse and view all recipes, and to create, update and delete their own recipes. The choice of database management system is MongoDB, which is a document-oriented database and was selected for its flexibility. Some routes of the app are public, including home/index, login, register, registered and api, while others require authentication, including loggedin, logout, search, addrecipe, recipeadded, updaterecipe/*, recipeupdated/*, deleterecipe/*, recipedeleted/*, search, search-results, list, myrecipes and recipes/*. The index route is public and renders a home page with links to the login and register routes. Once the user logges in, however, it displays a search form. This is achieved by passing the authentication status of the user to pug and and an if else statement to return the content appropriate for the user access level. 

The navigation bar is dynamic in a samilar way - links to routes that should be accessed by authorised users only are visible to registered and logged in users only. Links to updaterecipe/* and deleterecipe/* routes are also visible to the users with appropriate privileges, i.e. a user can see update and delete buttons on recipe listings only if they are the author of the recipe. All other recipe listings have a view-only access to unauthorised users. To achieve this, access to see links to the updaterecipe/* and deleterecipe/* routes is granted if the looked up value for the author's name from the users collection matches the _id of the user, stored in collection recipes. The extracted name from collection users then has to match the user's name stored in the session data stored in req.session.userId. 

The login route presents a login form to the user with name (text) and password (password) fields and has a post request leading to the loggedin route. Express-validator validates the name and password fields - a check confirms that the fields are not empty. If any of the fields is empty, the user is redirected back to the login page. A MongoDB database connection is established, first to confirm that the user's name is registered and in the users collection and if not, the message route is rendered to notify the user that their username (name) is unknown or not registered. If the user's name if found in the users collection, the entered user's password is compared against the one stored in the user's record in a hashed form and using the bcrypt module. If the passwords do not match, a message is sent to the user to notify them of an incorrect password, otherwise the user is authenticated, the user's name is stored in req.session.userId and a user's session is established.

In addition to setting an authentication cookie with express-session, the login route adds an object to the nonce_tokens array to store the user's tokens throughout their session. The logout route, on the other hand, destroys the user's nonce_tokens object along with any stored nonce tokens. 

The register routes presents a registration form to the user, which contains fields: name(text, 5 to 30 characters long) for username, first (text, alphanumeric) for first name, last (text, alphanumeric) for last name, email (email, a valid email) for email and password (password, 8 to 128 characters long and containing at least one a number). The form features both client-side (html5) and server-side validation (express-validator). A post request pointing to route registered validates all the fields, stores the values in collection users and confirms the users registration. The password is hashed with bcrypt with 10 salt rounds and stored in a hashed form.

The addrecipe route (main.js, lines 144-146) requires authentication and presents a form to the user to create a new recipe. It contains fields name (the recipe's title, text, alphanumeric), description (a description of the recipe, text, alphanumeric with some special characters allowed - ()?!@#$%^&'-/, time (cooking time, time, hh:mm format), calories (calories in grams, number, numeric), sodium (sodium in milligrams, number, numeric), fat (fat in grams, number, numeric), protein (protein in grams, number, numeric), carbs (carbs in grams, number, numeric), fiber (fiber in grams, number, numeric), img (title of the recipe's image, file, jpg/JPG/jpeg/JPEG/png/PNG/webp/WEBP), ingredients (a fieldset with text fields for ingredients, text, alphanumeric with some special characters allowed - ()?!@#$%^&'-/) and directions: (a fieldset with text fields for directions, text, alphanumeric with some special characters allowed - ()?!@#$%^&'-/).
The addrecipe form's post request points to the recipeadded route. The recipeadded route (main.js, lines 147-298) validates (express-validator) and sanitizes (express-sanitizer) all values and generates additional fields to be stored in the recipes collection, including published (a ISODate timestamp), slug (the slug of the recipe, a unique dash-separated string generated from the name of the recipe) (main.js, lines 227-262), user (a DBRef reference to the author's record in the users collection). Validation of the ingredients, directions and image fields is completed manually with regular expressions to match field names /^ingredient-[0-9]{1,2}$/ and /^direction-[0-9]{1,2}$/ as well as to confirm their format. Custom error messages are set and pushed to the errors array (main.js, 177-213). If the errors array is not empty, the message pug file is rendered to notify the user for the errors in a user-friendly manner. Otherwise, a mongoDB database connection is established, a find query locates the current user in collection users by req.session.userId. If successful, a second query extracts all slug values from collection recipes to generate a new slug that is unique, the image file is moved to the public/images directory, the record is inserted into collection recipes with a reference to the user's record in collection users and a confirmation page is rendered (recipeadded.pug).

The wild card routes either set/create or require a nonce when accessed. A user has to be authenticated (logged in) to access the updaterecipe/* route (lines 300-357, main.js). To accesses the updaterecipe/* route, where * is the recipe slug of the recipe being updated, the user must be the author of the recipe. The route creates a nonce and presents an update recipe form, similar to the addrecipe form, but previously entered values are rendered and editable. A connection to mongoDB recipebank is established. An aggregate query gets all field values of the current recipe from collection recipes and looks up the author's details in collection users. The slug and author of the recipe would always match a single record, which is returned in the results array and its values are rendered in updaterecipe.pug. 

Once changes are published (the recipe is updated), the updated values and the user are directed to /recipeupdated/* route (main.js, lines 356-549) via a post request and the nonce created by the updaterecipe/* route is verified. If the nonce verification fails, the message.pug page is rendered to notify the user of the error. Similarly, to the recipeadded route, the recipeupdated route validates and sanitizes all field values (express-validation, manual validation and express-sanitizer). If the name of the recipe has been updated, a new slug is generated and the record of the recipe in recipes is then updated with all new values using an undateOne query. The recipeupdated.pug file is rendered to confirm the changes.

A second wind card route is the deleterecipe/* route (main.js, lines 550 - 604), where * is the slug of the recipe. The route allows deletion of a user's recipe. Similarly, to the updaterecipe/* route, it sets a nonce, finds the record of the recipe using an aggregate query, which looks up the user's record in collection users and has to match the recipe's slug and its author with the current user and the recipe being deleted. If successful, deleterecipe.pug is rendered for a deletion confirmation and to create the nonce. The route contains three options on the confirmation page - to view, update or delete the recipe. The delete recipe button in any other route links to the deleterecipe/* route, but from the deleterecipe/* route itself, it points to recipedeleted/*. 

The recipedeleted/* route (main.js, lines 605 - 662) is accessed via an app.get request rather than app.post, since no fields are passed as values. The nonce is verified and if verification is successful, a mongoDB connection is established to locate the record of the recipe being deleted in collection recipes. The route locates the name, slug and author of the recipe in collection recipes, looksup the user's record in collection users and matches the slug and the current user's name (req.session.userId) to the those stored in the collection. If successful, a deleteOne query deletes the record and renders message.pug to notify the user that the deletion is successul.

The search route renders the search.pug page, which presents a search form to authenticated users. The form collects a keyword query and sends it in a get request to the search-results route. 

The search-results route establishes database connection and aggregates all records in collection recipes with a lookup to collection users. The query then matches the user's keyword to the name, description and ingredients of all recipes as a regular expression and presents the results back to the user (main.js, lines 683 - 716). Finally, it renders search-results.pug, which presents a collection of all recipes matching the keyword of the user.

The list route (main.js, lines 724-772) aggregates all recipes in the recipes collection with a lookup to collection users to locate the author's details. It then sorts the results by published date ascending and presents them to authenticated users, rendering the list.pug file.

Route myrecipes is similar to list but lists only the current user's recipes. It aggregates all recipes in the recipes collection with a lookup to collection users to locate the author's details, matches the author's name to the current user's name as stored in req.session.userId and sorts the recipes by published date in an ascending order.

The recipes/* route is another wild card route to render a recipe's full details and includes description, ingredients and directions, which not included in the listing pages. It aggregates the recipe in the recipes collection with collection users to locate the author's details and matches the received slug in the url to the existing records. If a recipe exists, it renders recipe.pug and presents the recipe's full details.

Finally, the api route aggregates collection recipes with a lookup the collection users to gether author details and responds with the results in a json format. 

MongoDB DATABASE SCHEMA

recipebank (db)

recipe: 
{
  _id: <ObjectId>,
  name: "Recipe name",
  published: ISODate("2020-04-09T14:22:51.671Z"), 
  slug: Recipe-Name,
  user: {
	  $ref: "users",                            
	  $id: ObjectId("5e8f281e5bfd5a05f5014004"), ||-------------------|
	  _id: ObjectId("5e8f281e5bfd5a05f5014004"), ||-------------------|
	  $db: "recipebank"                                               |
	},                                                                |
  description: "Recipe description and information",								|
  time: ISODate("2020-04-09T14:31:48.968Z"),												|
  calories: "300",                                                  |
  sodium: "200",																										|
  fat: "7",																													|
  protein: "45",																										|
  carbs: "80",																											|
  fiber: "15",																											|
  img: "recipe-img.jpg",																						|
  ingredients: ["Ingredient 1", "Ingredient 2", "Ingredient 3"],		|
  directions: ["Step 1", "Step 2", "Step 3"]												|
});																																	|
																																		|
user: 																															|
{																																		|
	_id: <ObjectId>, ||-----------------------------------------------|
	name: admin,
	first: Mariya,
	last: Peeva,
	email: mpeev001@gold.ac.uk,
	password: "$2b$10$QmVpL9N71Ud55XclLDXJc.Xwoy.MurT6yYF/cr1iDF9V7oZf1sCl."
}

RECIPE BANK

|---------------------------|
| recipe                    |
|---------------------------|
  _id 											
  name
  published
  slug
  user: {
	  $ref: "users",                          
	  $id: <ObjectId>  |------------|
	  _id: <ObjectId>  |------------|
	  $db: "recipebank"             |          
	},                              |                                  
  description											|
  time														|
  calories                        |                  
  sodium													|					
  fat															|							
  protein													|					
  carbs														|					
  fiber														|
  img															|
  ingredients											|	
  directions											|
  																|
|----------------------------|		|	
| users 										 |		|
|----------------------------|		|
	_id,	<-------------------------|
	name
	first
	last
	email
	password
|----------------------------|


recipebank (db)
  user (collection)
		_id, the ObjectId of the user's record
		name, the user's name (username)
		first, the user's first name
		last, the user's last name
		email, the user's email
		password, the user's password (hashed)

	recipes (collection)
		_id, the ObjectId of the recipe record
		name, the recipe's title
		published, published ISODate of the recipe
		slug, the slug of the recipe (link to the recipe)
		user, a DBRef reference to the author's record in the users collection
		description, a description of the recipe
		time, cooking time in hh:mm format
		calories: calories in grams
		sodium: sodium in milligrams
		fat: fat in grams
		protein: protein in grams
		carbs: carbs in grams
		fiber: fiber in grams
		img: title of the recipe's image
		ingredients: an array of ingredients
		directions: an array of directions





