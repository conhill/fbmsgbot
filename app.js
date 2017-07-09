var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");
//var mongoose = require("mongoose");

//var db = mongoose.connect(process.env.MONGODB_URI);
//var Movie = require("./models/movie");

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

// Server index page
app.get("/", function(req, res) {
    res.send("Deployed!");
});

// Facebook Webhook
// Used for verification
app.get("/webhook", function(req, res) {
    if (req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
        console.log("Verified webhook");
        res.status(200).send(req.query["hub.challenge"]);
    } else {
        console.error("Verification failed. The tokens do not match.");
        res.sendStatus(403);
    }
});

// All callbacks for Messenger will be POST-ed here
app.post("/webhook", function(req, res) {
    // Make sure this is a page subscription
    //if (req.body.object == "page") {
        // Iterate over each entry
        // There may be multiple entries if batched
        req.body.entry.forEach(function(entry) {
            // Iterate over each messaging event
            entry.messaging.forEach(function(event) {
                if (event.postback) {
                    processPostback(event);
                } else if (event.message) {
                    processMessage(event);
                }
            });
        });

        res.sendStatus(200);
    //}
});

function processPostback(event) {
    var senderId = event.sender.id;
    var payload = event.postback.payload;

    if (payload === "Greeting") {
        // Get user's first name from the User Profile API
        // and include it in the greeting
        request({
            url: "https://graph.facebook.com/v2.6/" + senderId,
            qs: {
                access_token: process.env.PAGE_ACCESS_TOKEN,
                fields: "first_name"
            },
            method: "GET"
        }, function(error, response, body) {
            var greeting = "";
            if (error) {
                console.log("Error getting user's name: " + error);
            } else {
                var bodyObj = JSON.parse(body);
                name = bodyObj.first_name;
                greeting = "Hi " + name + ". ";
            }
            var message = greeting + "My name is Ringo Bot 4000. I can send random NYT articles";
            sendMessage(senderId, { text: message });
        });
    } else if (payload === "Correct") {
        sendMessage(senderId, { text: "Awesome! Enter 'nyt' for a random nyt article." });
    } else if (payload === "Incorrect") {
        sendMessage(senderId, { text: "Oops! Sorry about that. Try typing 'nyt' correctly" });
    }
}

function processMessage(event) {
    if (!event.message.is_echo) {
        var message = event.message;
        var senderId = event.sender.id;

        console.log("Received message from senderId: " + senderId);
        console.log("Message is: " + JSON.stringify(message));

        // You may get a text or attachment but not both
        if (message.text) {
            var formattedMsg = message.text.toLowerCase().trim();

            // If we receive a text message, check to see if it matches any special
            // keywords and send back the corresponding movie detail.
            // Otherwise search for new movie.
            switch (formattedMsg) {
                case "ringo nyt":
                    findNYTArticle(senderId);
                    break;

                default:
                    findNYTArticle(senderId);
            }
        } else if (message.attachments) {
            sendMessage(senderId, { text: "Sorry, I don't understand your request." });
        }
    }
}

function findNYTArticle(userId) {
    request.get({
        url: "https://api.nytimes.com/svc/search/v2/articlesearch.json",
        qs: {
            'api-key': "fca6d877b0354be1b1006d1d4091d3d7",
            'sort': "newest",
            'fl': "web_url,headline"
        },
    }, function(err, response, body) {
        if (err) {
            console.log("Database error: " + err);
        } else {
            body = JSON.parse(body);
            var tweet = '';
            //use checkTweet to get a tweet against current tweets
            body.response.docs[0].main

            message = {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: [{
                            title: body.response.docs[0].headline.main,
                            subtitle: "Here is your article",
                            default_action: {
                                type: "web_url",
                                url: body.response.docs[0].web.url,
                                messenger_extensions: true,
                                webview_height_ratio: "tall",
                                fallback_url: "www.jakeleeman.com"
                            },
                        }]
                    }
                }
            };
            sendMessage(userId, message);
        }
    });
}

// sends message to user
function sendMessage(recipientId, message) {
    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
        method: "POST",
        json: {
            recipient: { id: recipientId },
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log("Error sending message: " + response.error);
        }
    });
}
