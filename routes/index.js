
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Node.js BitTorrent Tracker' });
};

exports.announce = function(req, res) {
  res.end('/announce');
};

exports.scrape = function(req, res) {
  res.end('/scrape');
};
