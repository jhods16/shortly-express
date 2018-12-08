const models = require('../models');
const Promise = require('bluebird');

const createSessionAndAttachCookie = (req, res, next) => {
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
    
      res.cookie('shortlyid', result.hash);
      
      next();
      throw ('done');
    })
    .catch(() => {});
};

module.exports.createSession = (req, res, next) => {
  // if there are no cookies on the request
  console.log('inside create session', req.cookies, req.get('Cookie'));
  if (!req.cookies || Object.keys(req.cookies).length === 0) {
  //  models.Sessions.create()
    createSessionAndAttachCookie(req, res, next);
  // else
  } else {
    console.log('inside else', req.cookies, req.get('Cookie'));
    //  check that there is a hash in the sessions table to match cookie
    models.Sessions.get({hash: req.cookies['shortlyid']})
      .then(result => {
        console.log('tried to get', result);
        // if result is undefined (cookie not in sessions database)
        if (result === undefined) {
          createSessionAndAttachCookie(req, res, next);
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
        console.log('userId?', userId);
        if (userId === null) {
          next();
          throw ('no userId');
        }
        return models.Users.get({id: userId});
      })
      .then(result => {
        console.log(result);
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
