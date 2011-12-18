
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

  var peer_ip = req.param('ip') || req.connection.remoteAddress
      peer_id = foo(req.param('peer_id'));
      ;
  if ( db[info_hash].peers[peer_id] === undefined) {
    db[info_hash].peers[peer_id] = {};
  }

  db[info_hash].peers[peer_id].port = req.param('port') || 0;
  db[info_hash].peers[peer_id].peer_ip = peer_ip;

  if (req.param('left') !== undefined && req.param('left') == 0 && db[info_hash].complete[peer_id] === undefined) {
    db[info_hash].complete[peer_id] = '';
  }

  console.log(util.inspect(db));
  peers_count = Object.keys(db[info_hash].peers).length;
  complete_count = Object.keys(db[info_hash].complete).length;

  var response = {};
  response['interval'] = 10;
  response['complete'] = complete_count;
  response['incomplete'] = peers_count - complete_count;

  if (req.param('compact') !== undefined || req.param('compact') == 0) {
    response['peers'] = '';
    for (var p in db[info_hash].peers) {
      var addr = []
      var temp = p.split('.');
      for ( var i = 0; i < temp.length; i++) {
        var val = parseInt(temp[i]);
        addr.push(val);
      }
      addr.push(peer_port >> 8);
      addr.push(peer_port & 0xFF);

      var buf = new Buffer(addr);
      var s = buf.toString('binary', 0, 6);
      response['peers'] += s;
   }
  }
  else {
    response['peers'] = [];
    for (var p in db[info_hash].peers) {
      var temp = {};
      temp['peer id'] = p;
      temp['ip'] = db[info_hash].peers[p].peer_ip;
      temp['port'] = db[info_hash].peers[p].port;
      response['peers'].push(temp);
    }
  }


  res.header('Content-Type', 'text/plain');
  res.end(bencode.encode(response), 'binary');
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
  res.end(bencode.encode(response), 'binary');
};
