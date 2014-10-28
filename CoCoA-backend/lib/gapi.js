var google = require('googleapis'),
    OAuth2 = google.auth.OAuth2,
    client = '807229978561-auq7ocqi9e08busho2j3mjav94r39b94.apps.googleusercontent.com',
    secret = '0J7yQzy4i2j_9wuB4pEEfG2C',
    redirect = 'http://localhost:3000/oauth2callback',
    //redirect = '54.169.89.65:3000/oauth2callback',
    calendar_auth_url = '',
    oauth2Client =new OAuth2(client, secret, redirect);


var authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [  
            'https://www.googleapis.com/auth/plus.me',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/drive.file'
        ]
});

var googlePlus = google.plus('v1');
var googleDrive = google.drive({ version: 'v2', auth: oauth2Client });

exports.authUrl = authUrl;
exports.oauth2Client = oauth2Client;
exports.googlePlus = googlePlus;
exports.googleDrive = googleDrive;

exports.ping = function() {
    console.log('pong');
};


