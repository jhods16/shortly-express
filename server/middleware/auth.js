const models = require('../models');
const Promise = require('bluebird');

module.exports.createSessionAndAttachCookie = (req, res) => {
  return models.Sessions.create()
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
    
      res.cookie('shortlyid', result.hash);
    })
    .catch(() => {});
};

module.exports.createSession = (req, res, next) => {
  // if there are no cookies on the request
  if (!req.cookies || Object.keys(req.cookies).length === 0) {
  //  models.Sessions.create()
    module.exports.createSessionAndAttachCookie(req, res)
      .then(() => {
        next();
        throw ('done');
      })
      .catch(() => {});
    
  // else
  } else {
    //  check that there is a hash in the sessions table to match cookie
    models.Sessions.get({hash: req.cookies['shortlyid']})
      .then(result => {
        if (result === undefined) {
          module.exports.createSessionAndAttachCookie(req, res)
            .then(() => {
              next();
              throw ('done');
            })
            .catch(() => {});
        }
        //   attach new cookie to response
        //   next
        req.session = {
          hash: result.hash,
          userId: result.userId
        };
        return result.userId;
      })
      .then((userId) => {
        if (userId === null) {
          next();
          throw ('no userId');
        }
        return models.Users.get({id: userId});
      })
      .then(result => {
        req.session.user = {username: result.username};
        next();
      })
      .catch(() => {
        return;
      });
    
  } 
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

//  retrieve results from the sessions query
//  use userID to reference users table and get username
//  req.sessions = { hash, userID, user.username }
