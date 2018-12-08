const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  // if there are no cookies on the request
  if (!req.get('Cookie')) {
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
  }
  //  then res.cookie = { shortlyid: hash }
  // else
  // if there is a cookie on the request
  //  check that there is a hash in the sessions table to match cookie
  //  if there is grab the userID associated with it
  //    create a sessions object {hash, userID, username} and assign it to req.session
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
