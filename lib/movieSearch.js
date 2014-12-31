/**
 * @author Longbo Ma
 */
var request = require('./request'),
  config = require("../conf/config"),
  $ = require('jQuery');

var movie = function (options, cb) {
  this.q = options.q;
  this.callback = cb || function () {};
  this.userAgent = options.userAgent || config.userAgent;
};

/**
 *  解析html数据
 **/
movie.prototype.parseBody = function (body) {
  var doc = $(body),
      arr = [],
      sources;
  // var sources_html = doc.find("div.source.source_one").html();
  sources = doc.find("div.source.source_one span a");
  if (sources) {
  // 	console.log(sources.length);
  	for(var i = 0, total = sources.length; i < total; i++) {
  		var link = $(sources[i]);
  		arr.push({
  		  iconImage: link.html(),//图标image标签
  		  title: link.attr("title"),//a标签标题
  		  href: link.attr("href")//a标签href
  		});
  	}
  	
  }
  
	console.log(arr);
	this.callback(arr);
};


/**
 * 发送查询请求
 **/
movie.prototype.searchSources = function () {
  var self = this;
  request({
    url: "http://www.soku.com/v?keyword="+this.q,
    headers: {
      'user-agent': this.userAgent
    }
  },function (err, res, body) {
    if (!err) {
      self.parseBody(body);
    }
  });
};

module.exports = function (options, cb) {
  new movie(options, cb).searchSources();
};