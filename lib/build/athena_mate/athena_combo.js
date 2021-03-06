/**
* @fileoverview 生成CSS页面片
* @author  liweitao
*/

'use strict';

var through2 = require('through2');
var path = require('path');
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var gutil = require('gulp-util');
var cheerio = require('cheerio');

var Util = require('../../util');

function combo (opts) {
  var config = _.assign({
    app: null,
    module: null,
    cwd: null,
    fdPath: '',
    domain: '',
    shtmlPrefix: '',
    comboPrefix: '/c/=',
    needCombo: false,
    needTimestamp: false
  }, opts);

  var stream = through2.obj(function (file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      if (config.fdPath.lastIndexOf('/') === 0) {
        config.fdPath = config.fdPath + '/';
      }
      var filePathObj = path.parse(file.path);
      var fileName = filePathObj.name;
      var fileContent = file.contents.toString();
      var newFileContent = '';
      var $ = cheerio.load(fileContent, { decodeEntities: false });
      var headChildren = $('head').contents();

      headChildren.each(function (i, item) {
        var nodeType = item.nodeType;
        if (nodeType === 8 && /global:|endglobal/.test(item.data)) {
          $(item).remove();
        }
      });
      var links = null;
      if (config.needCombo) {
        var combofile = config.fdPath + config.app + '/' + config.module + '/' + fileName + '.shtml';
        var href = '//' + config.domain + config.comboPrefix;
        links = $('link[rel=stylesheet][combo-use]');
        links.each(function (i, item) {
          var combouse = item['attribs']['href'];
          if (combouse) {
            combouse = combouse.replace('\/\/' + config.domain, '');
            href += combouse;
            if (i === links.length - 1) {
              href += '';
            } else {
              href += ',';
            }
          }
        });
        if (config.needTimestamp) {
          href += '?t=' + new Date().getTime();
        }
        newFileContent = _.template('<link combofile="<%= combofile %>" rel="stylesheet" href="<%= href %>" />')({
          combofile: combofile,
          href: href
        });
      } else {
        var link = '';
        links = $('link[rel=stylesheet]');
        links.each(function (i, item) {
          var hrefText = item['attribs']['href'];
          if (config.needTimestamp) {
            hrefText += '?t=' + new Date().getTime();
          }
          var linkItem = _.template('<link rel="stylesheet" href="<%= href %>" />')({
            href: hrefText
          });
          link += linkItem;
          if (i === links.length - 1) {
            link += '';
          } else {
            link += '\n';
          }
        });
        newFileContent = link;
      }

      links.remove();
      file.contents = new Buffer(beautifyHtml($.html(), { indent_size: 2, max_preserve_newlines: 1 }));
      this.push(file);
      var commentStr = '<!-- #include virtual="' + Util.urlJoin(config.shtmlPrefix, config.module, fileName + '.shtml') + '" -->\n';
      newFileContent = commentStr + newFileContent;
      var newFile = new gutil.File({
        path: fileName + '.shtml',
        contents: new Buffer(newFileContent)
      });
      this.push(newFile);
      callback();
    } else if (file.isStream()){

      return callback(null, file);
    }
  }, function (callback) {

    callback();
  });
  return stream;
}

module.exports = combo;