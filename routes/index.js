
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
  var torrents = 0, peers = 0;
  rc.scard('info_hashes', function(err, reply) {
    if (!err) torrents = reply;
    rc.scard('peers', function(err, reply) {
      if (!err) peers = reply;
      res.render('index', {title: 'Node.js BitTorrent Tracker', torrents: torrents, peers: peers});
    });
  });
};

exports.announce = function(req, res) {

  var response = {}
    , info_hash = foo(req.param('info_hash'))
    , peer_port = req.param('port') || 0
    , peer_id = foo(req.param('peer_id')) || ''
    , peer_ip = req.param('ip') || req.connection.remoteAddress
    , compact = req.param('compact') || '1'
    , no_peer_id = req.param('no_peer_id') || '0'
    , numwant = parseInt(req.param('numwant')) || 50
    , seeders_count = 0
    , leechers_count = 0
    , peers_count = 0
    , completed_count = 0
  ;

  res.header('Content-Type', 'text/plain');



  // global response parameters

  response['tracker id'] = 'Node BitTorrent Tracker';
  response['warning message'] = 'the tracker is running an experimental version';
  response['interval'] = 600;

  // handling some invalid requests

  if (info_hash == '') {
    response = {};
    response['failure code'] = 101;
    response['failure reason'] = 'info_hash is required';
    res.end(bencode.encode(response), 'binary');
    return;
  }
  else if (peer_id == '') {
    response = {};
    response['failure code'] = 102;
    response['failure reason'] = 'peer_id is required';
    res.end(bencode.encode(response), 'binary');
    return;
  }

  // incrementing peers count;
  rc.sadd('peers:' + info_hash, peer_id);

  // saving peer parameters
  rc.hmset('info_hash:' + info_hash + ':peer:' + peer_id, 'ip', peer_ip, 'port', peer_port);

  // assigning some global metrics

  rc.sadd('info_hashes', info_hash);
  rc.sadd('peers', peer_id);


  // handling the 'event' param

  if (req.param('event') !== undefined) {
    switch (req.param('event')) {
      case 'completed':
        rc.hincrby('completed:' + info_hash, 1);
        break;
      case 'stopped':
        rc.srem('peers', peer_id);
        if (req.param('left') !== undefined && req.param('left') == 0) {
          rc.srem('seeders:' + info_hash, peer_id);
        }
        break;
    }
  }

  // handling the seeders count

  if (req.param('left') !== undefined && req.param('left') == 0) {
    rc.sadd('seeders:' + info_hash, peer_id);
  }


  // preparing the response['peers']

  if (compact == '1') response['peers'] = '';
  else response['peers'] = [];


  // building the response body
  
  rc.scard('seeders:' + info_hash, function(err, reply) {
    if (!err) seeders_count = reply;
    rc.scard('peers:' + info_hash, function(err, reply) {
      if (!err) peers_count = reply;

      rc.smembers('peers:' + info_hash, function(err, replies) {
        if (err) throw err;
        replies.forEach(function(p_id, i) {
          rc.hgetall('info_hash:' + info_hash + ':peer:' + p_id, function(err, peer) {
            if (err) throw err;
            if (compact == '1') {
              var addr = [], temp = peer['ip'].split('.');
              for (var i = 0; i < temp.length; i++) {
                var val = parseInt(temp[i]);
                addr.push(val);
              }
              var temp_port = parseInt(peer['port']);
              addr.push(temp_port >> 8);
              addr.push(temp_port & 0xFF);
              var buf = new Buffer(addr), s = buf.toString('binary');
              response['peers'] += s;
            }
            else {
              var temp = {};
              if ( no_peer_id != 1 ) {
                temp['peer id'] = p_id;
              }
              temp['ip'] = peer['ip'];
              temp['port'] = parseInt(peer['port']);
              response['peers'].push(temp);
            }
            if (i >= 50 || i >= peers_count || i >= numwant) {
              response['complete'] = seeders_count;
              response['incomplete'] = peers_count - seeders_count;
              // console.log(util.inspect(response));
              res.end(bencode.encode(response), 'binary');
            }
          });
        });
      });
    });
  });
};



exports.scrape = function(req, res) {

  res.header('Content-Type', 'text/plain');

  var response = {};
  response['files'] = {};

  if (req.param('info_hash').length === undefined) {
    var info_hash = foo(req.param('info_hash'));
    rc.scard('seeders:' + info_hash, function (err, seeders_count) {
      if (err) throw err;
      rc.scard('peers:' + info_hash, function(err, peers_count) {
        if (err) throw err;
        rc.get('completed:' + info_hash, function(err, downloaded_count) {
          if (err) throw err;
          response['files'][info_hash] = {};
          response['files'][info_hash]['complete'] = seeders_count;
          response['files'][info_hash]['downloaded'] = downloaded_count;
          response['files'][info_hash]['incomplete'] = peers_count - seeders_count;
          res.end(bencode.encode(response), 'binary');
        });
      });
    });
  }
  else {
    res.end(bencode.encode(''), 'binary');
  }
};


