var express = require('express');  
var bodyParser = require('body-parser');  
var request = require('request');  
var app = express();

app.use(bodyParser.urlencoded({extended: false}));  
app.use(bodyParser.json());  
app.listen((process.env.PORT || 3000));

// Server frontpage
app.get('/', function (req, res) {  
    res.send('This is TestBot Server');
});

// Facebook Webhook
app.get('/webhook', function (req, res) {  
    if (req.query['hub.verify_token'] === process.env.VERIFICATION_TOKEN) {
        res.send(req.query['hub.challenge']);
    } else {
        res.send('Invalid verify token');
    }
});

app.post('/webhook', function (req, res) {  
    var events = req.body.entry[0].messaging;
    for (i = 0; i < events.length; i++) {
        var event = events[i];
        res.send(event.message.text);
        if(event.message.text === "ringo nyt"){

        	request.get({
			    url: "https://api.nytimes.com/svc/topstories/v2/home.json",
			    qs: {
			        'api-key': "fca6d877b0354be1b1006d1d4091d3d7",
			    },
			}, function(err, response, body) {
			    if (err) {
			        console.log("Database error: " + err);
			    } else {
			        body = JSON.parse(body);
			       	var i = Math.floor(Math.random() * 25) + 1  
			        message2 = {
					    "attachment":{
					      "type":"template",
					      "payload":{
					        "template_type":"generic",
					        "elements":[
					           {
					            "title": body.results[i].title,
					            "subtitle":"Heres you article",
					            "image_url": body.results[i].multimedia[0].url,
					            "default_action": {
					              "type": "web_url",
					              "url": body.results[i].url,
					              "webview_height_ratio": "tall",
					            },
					            "buttons":[
					              {
					                "type":"web_url",
					                "url":body.results[i].url,
					                "title":"View Website"
					              }            
					            ]      
					          }
					        ]
					      }
					    }
					};
			        sendMessage(event.sender.id, message2);
			    }
			});
        }
    }
    res.sendStatus(200);
});

function sendMessage(recipientId, message) {  
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: recipientId},
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
};
