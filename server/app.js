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


app.get('/', 
  (req, res) => {
    res.render('index');
  });

app.get('/create', 
  (req, res) => {
    res.render('index');
  });

app.get('/links', 
  (req, res, next) => {
    models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  });

app.post('/links', 
  (req, res, next) => {
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
    console.log('got username:', username);
    //get password
    var password = req.body.password;
    var userId;
    console.log('got password:', password);
    //get cookie from header?
    //pass these values along to models.Users.create
    models.Users.create({ username, password })
      .then((results) => {
        console.log('before update sessions database', req.session.hash);
        models.Sessions.update({hash: req.session.hash}, { userId: results.insertId })
          .then(() => {
            console.log('in then after update');
            res.redirect('/');
          });
      })
      .catch((err) => {
        console.log(err);
        res.redirect('/signup');
        // res.status(400).send(err);
      });
    //  if err
    //    redirect back to signup -- user already exists
    //  else
    //    respond with 201, headers -- including cookie?
    //    respond with any other info?
    //    redirect to index -- in the future we will need to do something re the session
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
