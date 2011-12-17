
function hexEncode(str){
  var result = '', l = str.length, index=0;
  while (index < l){
    result += str.charCodeAt(index++).toString(16);
  }
  return result;
};

function urlDecode(str){
  str  =str.replace(new RegExp('\\+','g'),' ');
  return unescape(str);
};

function foo(str) {
  if (str == '' || typeof(str) == 'undefined' ) return '';
  return hexEncode(urlDecode(str)).toLowerCase();
};

var redis = require('redis')
  , rc = redis.createClient()
  , util = require('util')
  , bencode = require('../lib/bencode')
  ;

rc.on('error', function (err) {
  console.log(err);
});



exports.index = function(req, res){
  res.render('index', { title: 'Node.js BitTorrent Tracker' });
};


var db = {}; // a db emulation just to test the bittorrent protocol



exports.announce = function(req, res) {

  var info_hash = foo(req.param('info_hash'))
      peer_port = req.param('port') || 0
      ;

  if (db[info_hash] === undefined) {
    console.log('db.info_hash === undefined');  
    db[info_hash] = {};
    db[info_hash].peers = {};
    db[info_hash].complete = {};
  }

  var peer_ip = req.connection.remoteAddress;
  if ( db[info_hash].peers[peer_ip] === undefined) {
    db[info_hash].peers[peer_ip] = {};
  }

  db[info_hash].peers[peer_ip].peer_id = foo(req.param('peer id'));
  db[info_hash].peers[peer_ip].port = req.param('port') || 0;
  db[info_hash].peers[peer_ip].peer_id = req.param('peer_id') || 0;

  if (req.param('left') !== undefined && req.param('left') == 0 && db[info_hash].complete[peer_ip] === undefined) {
    db[info_hash].complete[peer_ip] = '';
  }

  console.log(util.inspect(db));
  peers_count = Object.keys(db[info_hash].peers).length;
  complete_count = Object.keys(db[info_hash].complete).length


  var announce = {};
  announce.peer_id = foo(req.param('peer_id'));
  announce.port = req.param('port');
  announce.uploaded = req.param('uploaded');
  announce.downloaded = req.param('downloaded');
  announce.left = req.param('left');
//  console.log(util.inspect(announce));

  var response = {};
  response['interval'] = 10;
  response['complete'] = complete_count;
  response['incomplete'] = peers_count - complete_count;

  if (req.param('compact') !== undefined || req.param('compact') == 0) {
    response['peers'] = '';
  }
  else {
    response['peers'] = [];
    for (var p in db[info_hash].peers) {
      var temp = {};
      temp['peer id'] = db[info_hash].peers[p].peer_id;
      temp['ip'] = p;
      temp['port'] = db[info_hash].peers[p].port;
      response['peers'].push(temp);
    }
  }


  res.header('Content-Type', 'text/plain');
  res.end(bencode.encode(response));
};



exports.scrape = function(req, res) {
//  console.log(util.inspect(req.param('info_hash')));
  var info_hash = urlDecode(req.param('info_hash'));
//  console.log(info_hash.length);
  var response = {};
  response['files'] = {};
  response['files'][info_hash] = {};
  response['files'][info_hash]['complete'] = 9;
  response['files'][info_hash]['downloaded'] = 19;
  response['files'][info_hash]['incomplete'] = 5;

  res.header('Content-Type', 'text/plain');
  res.end(bencode.encode(response));
};
