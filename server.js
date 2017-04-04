'use strict'

let express = require('express');
let mongoose = require('mongoose');
let bodyParser = require('body-parser');
let Comment = require('./model/commentSchema');
var mysql = require('mysql');

let app = express();
let apiRouter = express.Router();
let router = express.Router();

const port = 4000;

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'PASSWORD',
  database : 'comments'
});


mongoose.connect('mongodb://localhost/mongo');

//parse json
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//setting headers
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

app.use(express.static('build'));

router.get('/', function(req, res) {
  res.send('index');
});

//initialize API
apiRouter.get('/', function(req, res) {
  connection.query('SELECT * FROM comment', function(err, rows){
    if (err) {
      res.send(err);
    }
    res.json({"everything": "is working"})
  });
});

//adding /comments route
apiRouter.route('/comments')
  //client requesting all comments
  .get(function(req, res) {
    connection.query('SELECT * FROM comment', function(err, rows){
      if (err)
        res.send(err);
      res.json(rows)
    });
  })
  //client posting new comment
  .post(function(req, res) {
    var comment = new Object;
    (req.body.author) ? comment.author = req.body.author : null;
    (req.body.text) ? comment.text = req.body.text : null;
    comment.date = new Date().toUTCString();
    //comment.date = Date.now();
    comment.id = Date.now();
    comment.color1 = (Math.floor((Math.random() * 255) + 1));
    comment.color2 = (Math.floor((Math.random() * 255) + 1));
    comment.color3 = (Math.floor((Math.random() * 255) + 1));
    comment.opacity = .3;

    connection.query('INSERT INTO comment SET ?', comment, function(err, result) {
      if (err) res.send(err);
      res.send('ok');
      io.sockets.emit('newComment', comment);
    });
  });

//adding route for specific comments
apiRouter.route('/comments/:comment_id')
  //client updating a comment
  .put(function(req, res) {
    let Id = req.params.comment_id;
    let author = req.body.author;
    let text = req.body.text;
    let opacity = req.body.opacity + .1;
    if (opacity >= 1) opacity = 1;
    connection.query("UPDATE comment SET author = COALESCE(?,author), text = COALESCE(?,text), opacity = ?  WHERE id = ?",[author,text,opacity,Id], function(err, result) {
      if (err) res.send(err);
      connection.query("SELECT * FROM comment WHERE id = ?", Id, function(err, result) {
        if (err) res.send(err);
        res.send('ok');
        io.sockets.emit('editComment', result);
      })
    });
  })
  //client deleting a comment
  .delete(function(req, res) {
    let Id = req.params.comment_id;
    connection.query("DELETE from comment WHERE id = ?", Id, function(err, result) {
      if (err) res.send(err);
      res.send('ok');
      io.sockets.emit('removeComment', Id);
    });
  });

app.use('/api', apiRouter);
app.use('/', router);

let server = app.listen(port, () => {
  console.log('Listening on 4000');
});

const io = require('socket.io')(server);

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});
