const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  // if there are no cookies on the request
  console.log('inside create session', req.cookies, req.get('Cookie'));
  if (!req.cookies || Object.keys(req.cookies).length === 0) {
  //  models.Sessions.create()
    models.Sessions.create()
      .then(result => {
        return models.Sessions.get({id: result.insertId});
      })
      .then(result => {
        req.session = { hash: result.hash };
        res.cookies = { 
          shortlyid: {
            value: result.hash
          } 
        };
        next();
      });
  // else
  } else {
    console.log('inside else', req.cookies, req.get('Cookie'));
    //  check that there is a hash in the sessions table to match cookie
    models.Sessions.get({hash: req.cookies['shortlyid']})
      .then(result => {
        console.log('tried to get', result);
        req.session = {
          hash: result.hash,
          userId: result.userId
        };
        return result.userId;
      })
      .then((userId) => {
        console.log('userId?', userId);
        if (userId === null) {
          next();
        }
        return models.Users.get({id: userId});
      })
      .then(result => {
        console.log(result);
        req.session.user = {username: result.username};
        next();
      });
    
  }
  //  if there is grab the userId associated with it
  //    create a sessions object {hash, userId, username} and assign it to req.session
  //  if there is not a matching cookie
  //    delete the cookie and create a new one
  //    models.Sessions.create()
  //    then res.cookie = { shortlyid: hash }
  //    
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

//  retrieve results from the sessions query
//  use userID to reference users table and get username
//  req.sessions = { hash, userID, user.username }
