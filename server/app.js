const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const cookieParser = require('./middleware/cookieParser');
const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser);
app.use(Auth.createSession);

const verifySession = (req) => {
  return models.Sessions.isLoggedIn(req.session);
};

app.get('/', 
  (req, res) => {
    if (verifySession(req)) {
      res.render('index');
    } else {
      res.redirect('/login');
    }
  });

app.get('/create', 
  (req, res) => {
    if (verifySession(req)) {
      res.render('index');
    } else {
      res.redirect('/login');
    }
  });

app.get('/links', 
  (req, res, next) => {
    if (verifySession(req)) {
      models.Links.getAll()
        .then(links => {
          res.status(200).send(links);
        })
        .error(error => {
          res.status(500).send(error);
        });
    } else {
      res.redirect('/login');
    }
  });

app.post('/links', 
  (req, res, next) => {
    if (verifySession(req)) {
      var url = req.body.url;
      if (!models.Links.isValidUrl(url)) {
        // send back a 404 if link is not valid
        return res.sendStatus(404);
      }

      return models.Links.get({ url })
        .then(link => {
          if (link) {
            throw link;
          }
          return models.Links.getUrlTitle(url);
        })
        .then(title => {
          return models.Links.create({
            url: url,
            title: title,
            baseUrl: req.headers.origin
          });
        })
        .then(results => {
          return models.Links.get({ id: results.insertId });
        })
        .then(link => {
          throw link;
        })
        .error(error => {
          res.status(500).send(error);
        })
        .catch(link => {
          res.status(200).send(link);
        });
    } else {
      res.redirect('/login');
    }
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', 
  (req, res) => {
    res.render('login');
  });

app.post('/login', 
  (req, res) => {
    // get username
    var username = req.body.username;
    // get password
    var password = req.body.password;
    var userId;
    // check if user exists and password is correct
    models.Users.get({ username })
      .then(results => {
        userId = results.id;
        return models.Users.compare(password, results.password, results.salt);
      })
      .then(isCorrect => {
        if (isCorrect) {
          // update sessions table userID with id from user table
          models.Sessions.update({hash: req.session.hash}, { userId })
            .then(() => {
              res.redirect('/');
            });
        } else {
          throw isCorrect;
        }
      })
      .catch((err) => {
        res.redirect('/login');
      });
  });

app.get('/signup', 
  (req, res) => {
    res.render('signup');
  });

app.post('/signup', 
  (req, res) => {
    //get username
    var username = req.body.username;
    //get password
    var password = req.body.password;
    var userId;
    //get cookie from header?
    if (username.length === 0 || password.length === 0) {
      res.redirect('/signup');
      return;
    }
    //pass these values along to models.Users.create
    models.Users.create({ username, password })
      .then((results) => {
        models.Sessions.update({hash: req.session.hash}, { userId: results.insertId })
          .then(() => {
            res.redirect('/');
          });
      })
      .catch((err) => {
        res.redirect('/signup');
      });

  });

app.get('/logout',
  (req, res) => {
    // delete session from sessions db
    models.Sessions.delete({hash: req.session.hash})
      .then(() => {
        return Auth.createSessionAndAttachCookie(req, res);
      })
      .then(() => {
        res.redirect('/login');
      });
    // reassign a cookie - createSessionAndAttachCookie
  });

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
