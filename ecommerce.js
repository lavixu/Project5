var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
	extended : false
}));
var cookieParser = require('cookie-parser');
app.use(cookieParser());
var util = require('util');
var mysql = require("mysql");

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
	host : 'ec2-54-172-126-97.compute-1.amazonaws.com:9200',
	log : 'error'
});

var con = mysql.createConnection({
	host : "project5.cscv2yh95ore.us-east-1.rds.amazonaws.com",
	user : "root",
	password : "test1234",
	database : 'ecommerce',
	multipleStatements: true
});

app.get('/index', function(req, res) {
	res.send("alive");
});

con.connect(function(err) {
	if (err) {
		console.log('Error connecting to Db');
		return;
	}
	// console.log('Connection established');
});

var mysql_select = function(con, query, callback) {
	con.query(query, function(err, rows, fields) {
		if (err) {
			callback(err, null);
		} else {
			callback(null, rows);
		}
	});

};

var get_cookies = function(request) {
	// console.log(util.inspect(request.headers.cookie, {showHidden: false,
	// depth: null}));
	var cookies = {};
	request.headers && request.headers.cookie
			&& request.headers.cookie.split(';').forEach(function(cookie) {
				var parts = cookie.split("=");
				cookies[parts[0].trim()] = (parts[1] || '').trim();
			});
	return cookies;
};

var verify_user = function(req) {
	cookie_val = get_cookies(req);
	if (!cookie_val || cookie_val["username"] == null) {
		return false;
	}
	return cookie_val["username"];
}

app.post('/login', function(req, res) {
                    params = req.body;
					console.log("calling login with " + JSON.stringify(params));
					var username = params["username"];
					var password = params["password"];
					var queryString = 'SELECT * FROM users where username = "'
							+ username + '" and password = "' + password
							+ '" ;';
					//console.log("queryString is " + queryString);
					mysql_select(
							con,
							queryString,
							function(err, data) {
								if (err) {
									console.log("ERROR : ", err);
								} else {
									//console.log("result from db is : ", data);
									if (data != null && data.length >= 1) {
										res.cookie("username", username, {expires : new Date(new Date().getTime() + 15 * 60 * 1000)});
										result = "Welcome " + data[0]["fname"];
										console.log("returning result : "
												+ result);
										res.send(JSON.stringify(result));
									} else {
										result = "That username and password combination was not correct";
										console.log("returning result : "
												+ result);
										res.send(JSON.stringify(result));
									}
								}
							});
				});

app.post('/logout', function(req, res) {
	var verified_user = verify_user(req);
	if (verified_user) {
		res.clearCookie("username");
		console.log("returning: You have been successfully logged out");
		res.send("You have been logged out");
	} else {
		console.log("returning: You are not currently logged in");
		res.send("You are not currently logged in");
	}
});

app.listen(3000, function() {
	console.log('Example app listening on port 3000!');
});

app.post(new RegExp('(registerUser|updateInfo)'),
				function(req, res) {
					params = req.body;
					var operation = req.params[0];
					console.log(operation + "operation");
					console.log("received params" + JSON.stringify(req.params));
					var username = params["username"];
					var password = params["password"];
					var fname = params["fname"];
					var lname = params["lname"];
					var address = params["address"];
					var zip = params["zip"];
					var city = params["city"];
					var state = params["state"];
					var email = params["email"];
					if (operation == "registerUser") {
//						console.log("received operation" + operation
//								+ " with params " + JSON.stringify(params));
						if (!username || !password || !fname || !lname || !zip
								|| !city || !state || !email) {
							console.log("received empty params ");
							result = "There was a problem with this action. All of the fields are required. The registration should fail if any of the fields are left blank";
							//console.log(result + "is being returned");
							res.send(JSON.stringify(result));
							return;
						}
						if (zip.toString().length != 5) {
							zip = 0
						}
						//else if (zip.toString().length != 5
						//		|| email.indexOf("@") < 0) {
						//	result = "There was a problem with this action.";
						//      console.log(result + "is being returned");
						//	res.send(JSON.stringify(result));
						//	return;
						//	}

						// var queryString = 'SELECT * FROM users where username
						// = "' + username + '" and fname = "' + fname + '" and
						// lname = "' + lname + '";';
						var queryString = 'SELECT * FROM users where username = "'+ username + '";';
						//console.log(queryString + "is the string");
						mysql_select(
								con,
								queryString,
								function(err, data) {
									if (err) {
										console.log("ERROR IN SELECT : ", err);
									} else {
										//console.log("result from db is : ",data);
										if (data != null && data.length >= 1) {
											result = "The system should not allow duplicate registrations";
											res.send(JSON.stringify(result));
										} else {
											var strTest = [ fname, lname,
													address, city, zip, email,
													username, password ]
											var values = "'"
													+ strTest.join("','") + "'";
											var queryString1 = 'insert into users (fname, lname, address, city, zip_code, email, username, password) values ('
													+ values + ');';
											mysql_select(
													con,
													queryString1,
													function(err1, data1) {
														if (err1) {
															console.log("ERROR IN INSERT : ", err1);
														} else {
															//console.log("DATA: ", data1);
															result = "Your account has been registered";
															//console.log(result + "is being returned");
															res.send(JSON.stringify(result));
															return;
														}
													});
										}
									}
								});
					} else {
						console.log("received operation" + operation
								+ " with params " + JSON.stringify(params));
						var verified_user = verify_user(req);
						if (!verified_user) {
							console.log(" You must be logged in to perform this action   is being returned");
							res.send(JSON.stringify("You must be logged in to perform this action"));
							return;
						} else if (verified_user != username) {
							res.send(JSON.stringify("You cannot update info of user who has logged in. There was a problem with this action."));
							return;
						} else if ((zip && zip.toString().length != 5)
								|| (email && email.indexOf("@") < 0)) {
							result = "All of the fields are required. There was a problem with this action. zipcode must have 5 digits.";
							console.log(result + "is being returned");
							res.send(JSON.stringify(result));
							return;
						} else {
							var queryBuilder = "";
							if (username) {
								queryBuilder = queryBuilder + "username = '"
										+ username + "',";
							}
							if (password) {
								queryBuilder = queryBuilder + "password = '"
										+ password + "',";
							}
							if (fname) {
								queryBuilder = queryBuilder + "fname = '"
										+ fname + "',";
							}
							if (lname) {
								queryBuilder = queryBuilder + "lname = '"
										+ lname + "',";
							}
							if (address) {
								queryBuilder = queryBuilder + "address = '"
										+ address + "',";
							}
							if (city) {
								queryBuilder = queryBuilder + "city = '" + city
										+ "',";
							}
							if (zip) {
								queryBuilder = queryBuilder + "zip_code = '"
										+ zip + "',";
							}
							if (email) {
								queryBuilder = queryBuilder + "email = '"
										+ email + "',";
							}
							if (state) {
								queryBuilder = queryBuilder + "state = '"
										+ state + "',";
							}
							queryBuilder = queryBuilder.substring(0,
									queryBuilder.length - 1);
							var insertStmt = "update users  SET "
									+ queryBuilder + " where username = '"
									+ username + "';";
							console.log(insertStmt + "is the insert statement");
							mysql_select(
									con,
									insertStmt,
									function(err1, data1) {
										if (err1) {
											console.log("ERROR IN INSERT : ",
													err1);
											result = "There was a problem with this action";
											res.send(JSON.stringify(result));
											return;
										} else {
											//console.log("DATA: ", data1);
											result = "Your information has been updated";
											console.log(result
													+ "is being returned");
											res.send(JSON.stringify(result));
											return;
										}
									});
						}

					}
				});

app.post('/productsPurchased', function(req, res) {
			params = req.body;
			username = params["username"];
			console.log("Invoking Product Purchases for username" + username);
			var verified_user = verify_user(req);
//			 if (verified_user != "jadmin") {
//				console.log("returning: Only admin can perform this action");
//				result = "Only admin can perform this action";
//				res.send(JSON.stringify(result));
//				return;
//			 }
			var selectStmt = "select productName, quantity from customerPurchases   where username = '" + username + "';";
			mysql_select(con, selectStmt, function(err1, data1) {
						if (err1) {
							console.log("ERROR IN INSERT : ", err1);
							result = "There was a problem with this action";
							res.send(JSON.stringify(result));
							return;
						} else {
							result  = [];
							//console.log(JSON.stringify(data1.length) + "haha");
			                for(var i = 0; i < data1.length; i++) {
			                	var tmp = [];
			                	//console.log(data1[i] + "HAHAHA");
			                	tmp.push(data1[i]["productName"]);
			                	tmp.push(data1[i]["quantity"]);
			                	result.push(tmp);
			                }
							//console.log("DATA: ", result);
							res.send(JSON.stringify(result));
							return;
						}
					});
});

app.post('/getRecommendations', function(req, res) {
	params = req.body;
	asin = params["asin"];
	console.log("Received asin" + asin);
    var selectStmt = "select * from reco   where product1 = '" + asin + "'  or product2 = '" + asin + "' order by count desc limit 5;";
	mysql_select(con, selectStmt,
			function(err1, data1) {
				if (err1) {
					console.log("ERROR IN INSERT : ", err1);
					result = "There was a problem with this action";
					res.send(JSON.stringify(result));
					return;
				} else {
					var final_result = []
					for(var i = 0; i < data1.length; i++ )
	                	{
	                	    if(data1[i]["product1"] == asin) {
	                		 final_result.push(data1[i]["product2"]);
	                		 } else {
	                			 final_result.push(data1[i]["product1"]);
	                		 }
	                		
	                		 
	                	}
					console.log("returning: ", final_result);
					res.send(JSON.stringify(final_result));
					return;
				}
			});
});
		


app.post('/buyProducts', function(req, res) {
			params = req.body;
			//console.log("Received params" + JSON.stringify(params));
			asins = params["asin"];
		//	console.log("ASINF are" + JSON.stringify(asins));
			var verified_user = verify_user(req);
			var username = verified_user;
			//console.log("username is" + username);
			if(!asins || !verified_user) {
				var result = "There was a problem with this action";
				res.send(JSON.stringify(result));
				return;
			}
		   //Given username, list all the productPurchased by them along with quantities.
			var buf = ""
			var	tmp1 = asins.substring(1, asins.length - 1);
			tmp1 = tmp1.split(",");
		    for(var i = 0; i < tmp1.length; i ++) {
				console.log(tmp1[i] + "processing");
				buf += "('" + tmp1[i] + "','" + username + "', 1),";
			}
			buf = buf.substring(0, buf.length - 1);
			    var updateStmt = "insert into customerPurchases (productName, username, quantity) values" + buf + " on duplicate key update quantity = quantity + 1;"
				mysql_select(con, updateStmt,
										function(err2, data2) {
											if (err2) {
												console.log("ERROR IN INSERT : ", err2);
												result = "There was a problem with this action";
												res.send(JSON.stringify(result));
												return;
											} else {
												result = "The product information has been updated";
											    // Now update the recommendation table also with the values!!
												var tmp = []
												var query = "";
												for(var i = 0; i< asins.length; i ++)
											   {
												  for(var j = i+1; j < asins.length; j++)
											    {
													tmp.push([asins[i], asins[j]]);
													}
												}
												for(var i = 0; i < tmp.length; i++) {
													var tmp1 = tmp[i];
													if(tmp1[0] < tmp1[1]) {
													    var pr1 = tmp1[0];
													    var pr2 = tmp1[1];
													    
													} else
													{
														var pr1 = tmp1[1];
													    var pr2 = tmp1[0];
													}
													var buf = "('" + pr1 + "','" + pr2 + "', 1)";
													query += "insert into reco (product1, product2, count) values" + buf  +
										   		       " on duplicate key update count = count + 1; ";
													
												}
												buf = buf.substring(0, buf.length - 1);
											   
						             		  // console.log(query + " \nHAHA");
											   mysql_select(con, query,
														function(err2, data2) {
															if (err2) {
																console.log("ERROR IN INSERT : ", err2);
																result = "There was a problem with this action";
																res.send(JSON.stringify(result));
																return;
															} else {
																//console.log("returning happy");
																 res.send(JSON.stringify("The product information has been updated"));
															     return;
															}
																
															});
												
											}
											});
			    });


app.post('/addProducts', function(req, res) {
					params = req.body;
					console.log("received params" + JSON.stringify(params));
					var verified_user = verify_user(req);
					if (!verified_user) {
						res.send(JSON.stringify("You must be logged in to perform this action"));
						return;
					} else if (verified_user != "jadmin") {
						console.log("returning: Only admin can perform this action");
						res.send(JSON.stringify("Only admin can perform this action"));
						return;
					} else {
						// check if al the info is present, if yes if the
						// product Id is not present already.
						var productId = params["asin"];
						var group = params["group"];
						var name = params["name"];
						var productDescription = params["productDescription"];
						console.log("Received" + productId + " " + group + " " + name + " " + productDescription + " ");
						if (!productId || !group || !name || !productDescription) {
							console.log("returning: something empty!! There was a problem with this action");
							result = "There was a problem with this action";
							res.send(JSON.stringify(result));
							return;
						}
//						} else if ((group != "Book") && (group != "DVD")
//								&& (group != "Music")
//								&& (group != "Electronics")
//								&& (group != "Home") && (group != "Beauty")
//								&& (group != "Toys") && (group != "Clothing")
//								&& (group != "Sports")
//								&& (group != "Automotive")
//								&& (group != "Handmade")) {
//							console.log("returning: group mismatch!! There was a problem with this action");
//							result = "There was a problem with this action";
//							res.send(JSON.stringify(result));
//							return;
//						}
							else {
							client.create({
												index : 'product',
												type : 'product',
												body : {
													asin : productId,
													title : name,
													categories : group,
													description : productDescription
												}
											},
											function(error, response) {
												if (error) {
													console.log("ERROR IN INSERT : ",error);
													result = "There was a problem with this action, does not allow duplicated productId";
													res.send(JSON.stringify(result));
													return;
												} else {
													//console.log("DATA: ", response);
													console.log("returning: The product has been added to the system");
													result = "The product has been added to the system";
													res.send(JSON.stringify(result));
													return;
												}
											});
						}
					}
				});

app.post('/modifyProduct',
				function(req, res) {
					params = req.body;
					var username = params["username"];
					var password = params["password"];
					var verified_user = verify_user(req);
					if (!verified_user) {
						res.send(JSON.stringify("You must be logged in to perform this action"));
						return;
					} else if (verified_user != "jadmin") {
						res.send(JSON.stringify("Only admin can perform this action"));
						return;
					} else {
						var productId = params["asin"];
						var name = params["name"];
						var productDescription = params["productDescription"];
						var categories = params["categories"];
						console.log("received" + productId + "\t" + name + "\t"
								+ productDescription);
						if (!productId || !name || !productDescription) {
							result = "There was a problem with this action";
							res.send(JSON.stringify(result));
							return
                    	}
						var matchParams = {}
						if (productId) {
							matchParams["asin"] = productId
						}
						var asinSearchParams = {
							index : 'product',
							type : 'product',
							q : 'asin:' + productId
						};

						console.log("search params are "
								+ JSON.stringify(asinSearchParams));
						client.search(asinSearchParams,
										function(error, response) {
											if (error) {
												console.log("ERROR IN fetch : ",
														error);
												result = "There was a problem with this action.";
												res.send(JSON.stringify(result));
												return;
											}
											total = response.hits.total
											if (total == 0) {
												result = "There was a problem with this action.";
												res.send(JSON.stringify(result));
												return;
											}
											id = response.hits.hits[0]["_id"]
											console.log("ID IS " + id);
											console.log(JSON.stringify(response));
											client.index(
															{
																index : 'product',
																type : 'product',
																id : id,
																body : {
																	asin : productId,
																	title : name,
																	description : productDescription,
																	categories: categories
																}
															},
															function(error,response) {
																result = "The product information has been updated";
																res.send(JSON.stringify(result));
																return;
															});

										});
					}
				});

app.post('/viewUsers',
				function(req, res) {
					params = req.body;
					var username = params["username"];
					var password = params["password"];
					var verified_user = verify_user(req);
					if (!verified_user) {
						res.send(JSON.stringify("You must be logged in to perform this action"));
						return;
					} else if (verified_user != "jadmin") {
						res.send(JSON.stringify("Only admin can perform this action"));
						return;
					} else {
						var fname = params["fname"];
						var lname = params["lname"];
						var queryBuilder = "";
						if (fname) {
							queryBuilder = " fname like '%" + fname + "%' ";
						}
						if (lname) {
							queryBuilder = " lname like '%" + lname + "%' ";
						}
						if (queryBuilder.length > 0) {
							queryBuilder = " where " + queryBuilder;
						}
						var selectStmt = "select fname, lname from users"
								+ queryBuilder + ";";
						console.log(selectStmt + " is the selectStmt");
						mysql_select(con,selectStmt, function(err1, data1) {
									if (err1) {
										//console.log("ERROR IN INSERT : ", err1);
										result = "There was a problem with this action.";
										res.send(JSON.stringify(result));
										return;
									} else {
										//console.log("DATA: ", data1);
										var resultArr = [];
										for ( var i = 0; i < data1.length; i++) {
											console.log(data1[i]["fname"] + "is data");
											resultArr.push({
												fname : data1[i]["fname"],
												lname : data1[i]["lname"]
											});
										}
										res.send(JSON.stringify({
											user_list : resultArr
										}));
										return;
									}
								});
                  }

				});

app.post('/viewProducts',
				function(req, res) {
					params = req.body;
					var asin = params["asin"];
					var group = params["group"];
					var keyword = params["keyword"];
					console.log("Recieved params" + JSON.stringify(params));
					var perPage = 1000
					var pageNum = 1
					if (!(keyword == null || keyword == undefined)) {
						var searchKeywordParams = {
							index : 'product',
							type : 'product',
							from : (pageNum - 1) * perPage,
							size : perPage,
							body : {
								
										query : {
											wildcard : {
												title : "*" + keyword + "*"
											}
										}
									
							}
						
						};
					}

					if (!(asin == null || asin == undefined)) {
						var asinSearchParams = {
							index : 'product',
							type : 'product',
							// asin: asin
							body : {
								query : {
									match : {
										asin : asin
									}
								}
							}
						};
					}

					if (!(group == null || group == undefined)) {
						var groupSearchParams = {
							index : 'product',
							type : 'product',
							// asin: asin
							body : {
								query : {
									match : {
										categories : group
									}
								}
							}
						};
					}

					var searchParams = ""
					if (!(asin == null || asin == undefined)) {
						searchParams = asinSearchParams
					} else if (!(keyword == null || keyword == undefined)) {
						searchParams = searchKeywordParams
					} else if (!((group == null) || (group == undefined))) {
						searchParams = groupSearchParams

					} else {
						perPage = 1000
						searchParams = {
							index : 'product',
							from : (pageNum - 1) * perPage,
							size : 1000,
							body : {
								query : {
									query_string : {
										query : "*",
									}
								}
							}
						};
					}

					// console.log(searchParams + "are the params");
					client
							.search(
									searchParams,
									function(err, esRes) {
										if (err) {
											// handle error
											console.log("Error happened" + err);
											res.send(JSON.stringify("Something wrong happened"));
											return;
										}
										var returningResults = []
										var results = esRes.hits.hits;
										var count = 0

										if (esRes.hits.total == 0) {
											result = "There were no products in the system that met that criteria";
											res.send(JSON.stringify(result));
											return;
										}
										if (esRes.hits.total < perPage) {
											count = esRes.hits.total
										} else {
											count = perPage
										}
										// console.log(esRes.hits.total + "is
										// the total!!! *******************");
										// console.log(JSON.stringify(esRes.hits)
										// + "are the hits
										// ************************");
										console.log(count + "is the count");
										// console.log(JSON.stringify(results[0]));
										for ( var i = 0; i < count; i++) {
											 console.log("processing &&&&&" + JSON.stringify(results[i]));
											returningResults
													.push({"name":results[i]["_source"]["title"]});
											//returningResults.push(results[i]["_source"]["asin"]);
										}
										
										console.log(JSON.stringify({product_list : returningResults}));
										res.send(JSON.stringify({
											product_list : returningResults
										}));
									});

				});

