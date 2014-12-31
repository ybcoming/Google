/**
 * @author Longbo Ma
 */
var request = require('../lib/request');
var cheerio = require('cheerio');
var config = require('../config');
var mobile = require('../lib/mobile');

var content_language_matrix = [
    /*所有语言*/ '',
    /*简体中文*/ 'lang_zh-CN',
    /*繁体中文*/ 'lang_zh-TW',
    /*所有中文*/ 'lang_zh-CN|lang_zh-TW',
    /*英文*/     'lang_en',
    /*韩文*/     'lang_ko',
    /*日文*/     'lang_ja',
    /*法文*/     'lang_fr',
    /*德文*/     'lang_de',
    /*西班牙*/   'lang_es',
    /*意大利*/   'lang_it',
];

var gsearch = function (options, cb) {
//    console.log('new gsearch...');
    options = options || {};
    this.start = options.start || 0;
    this.q = options.q;
    this.callback = cb || function(s){};
    this.userAgent = options.userAgent || config.userAgent;
    if (options.lr) {//搜索内容语言,不是界面语言
        this.lr = isNaN(options.lr) ? '' : content_language_matrix[parseInt(options.lr)] || '';
    }
    this.result = {};
    // console.log(this.result);
    this.config = {
        base_url: config.g_url,
        lang: config.language
    };
};

/**
 * 根据UserAgent检查是否为移动端请求
 **/
gsearch.prototype.checkMobile = function () {
    var isMobile = this.isMobile = mobile.isMobile(this.userAgent);
    if (isMobile) {
        this.userAgent = config.userAgent;
    }
    this.result.isMobile = isMobile;
};

/**
 * 解析html数据
 **/
gsearch.prototype.parseResponse = function (body) {
    console.time("gsearch_cheerio");
    var arr = [];
    var $ = cheerio.load(body);
    var search = $("#search").find("li.g");
    var resultStats = $("#resultStats").html() || "";
//    console.log(search.length);
    for (var i = 0; i < search.length; i++) {
        var sItem = $(search[i]);
        var link = sItem.find("h3.r a");
        var url = link.attr("href");
        if (url && url.indexOf('/search?') !== 0) {
            var title = link.html();
            var content = sItem.find("span.st").html();
            var cite = sItem.find("cite").html();
//            console.log("title:  " + title);
//            console.log("url: " + url);
//            console.log("content: " + content);
//            console.log("cite: " + cite);
//            console.log("\n\n");

            arr.push({
                title: title,
                url: url,
                cite: cite,
                content: content
            });
        }
    }


    var hasExtrares = false, extrares = {};
    var exTitle = $("#brs h3").html();
    if (exTitle) {
        var brs_cols, _brs_cols = [];
        hasExtrares = true;
        extrares.title = exTitle;
        brs_cols = $("div.brs_col");

        for (var i = 0; i < brs_cols.length; i++) {
            var _cols = $(brs_cols[i]).find('a');
            var _col = [];
            for (var j = 0; j < _cols.length; j++) {
                var _text = $(_cols[j]).text();
                var _html = $(_cols[j]).html();
                _text = _text.replace(/[ ]/g, "+");
                _text = encodeURI(_text);
                // console.log(_text);
                _col.push({
                    content: _html,
                    url: '/search?q='+_text
                });
            }
            _brs_cols.push(_col);
        }

        extrares.arr = _brs_cols;
        // console.log(extrares);
    }
	console.timeEnd("gsearch_cheerio");
    extrares.has = hasExtrares;
    
    this.result['extrares'] = extrares;
    this.result['resultStats'] = resultStats;
    this.result['data'] = arr;
};

gsearch.prototype.render = function (body) {
    this.parseResponse(body);
    this.callback(this.result);
};

/**
 * 发送查询请求
 **/
gsearch.prototype.request = function () {
    var self = this;
    if (!this.q) {
        this.callback([]);
        return;
    }
    this.checkMobile();
    var qs = {
        start: this.start,
        q: this.q,
        hl: this.config.lang//界面语言
    };
    
    if (this.lr) {//查询结果语言
        qs.lr = this.lr;
    }
    
    var headers = {
        'accept-language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6',
        'user-agent': this.userAgent,
        'referer': this.config.base_url
    };

    var options = {
        url: this.config.base_url+'/search',
        headers: headers,
        qs: qs
    };
//    console.log('open request...');
    request(options, function (err, res, body) {
        if (!err) {
            self.parseCookies(res);
            self.render(body);
        }
    });
};

gsearch.prototype.parseCookies = function (res) {
    var cookieUtil = require('cookie');
    var cookies = res.headers['set-cookie'];
    var cookieArr = [];
    if (cookies && cookies.length > 0) {
        for (var i = 0; i < cookies.length; i++) {
            var cookieItem = cookieUtil.parse(cookies[i]);
            if (cookieItem.domain) {
                delete cookieItem.domain;
            }
            if (cookieItem.path) {
                cookieItem.path = '/';
            }

            var tempArr = [];
            for (var key in cookieItem) {
                tempArr.push(key+'='+cookieItem[key]);
            }
            cookieArr.push(tempArr.join('; '));
        };
    }
    console.log(cookieArr);
};

module.exports = function (options,cb) {
    new gsearch(options,cb).request();
};