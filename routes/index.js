var express = require('express');
var crypto = require('crypto');
var mysql = require('./../database');
var markdown = require('markdown-js');

var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    //res.render('index', {title: 'Express'});
    var page = req.query.page || 1;
    var start = (page - 1) * 4;
    var end = page * 4;
    var queryCount = 'select count(*) as articleNum from article';
    var queryArticle = 'select * from article order by articleId desc limit ' + start + ',' + end;

    //var query = "select * from article order by articleId desc";
    mysql.query(queryArticle, function (err, rows, fields) {
        var articles = rows;
        articles.forEach(function (value) {
            var year = value.articleTime.getFullYear();
            var month = value.articleTime.getMonth() + 1 > 10 ? value.articleTime.getMonth() : '0' + (value.articleTime.getMonth() + 1);
            var date = value.articleTime.getDate() + 1 > 10 ? value.articleTime.getDate() : '0' + (value.articleTime.getDate() + 1);
            value.articleTime = year + '-' + month + '-' + date;
        });
        mysql.query(queryCount, function (err, rows, fields) {
            var articleNum = rows[0].articleNum;
            var pageNum = Math.ceil(articleNum / 4);
            res.render("index", {articles: articles, user: req.session.user, pageNum: pageNum, page: page});
        });
    });
});

/*登录页面*/
router.get('/login', function (req, res, next) {
    res.render('login', {message: ""});
});

/*登录验证*/
router.post('/login', function (req, res, next) {
    var name = req.body.name;
    //var nn = req.query.name;
    var password = req.body.password;
    var hash = crypto.createHash('md5');
    hash.update(password);
    password = hash.digest('hex');
    console.log("密码：" + password);
    var query = 'select * from author where authorName=' + mysql.escape(name) + ' and authorPassword=' + mysql.escape(password);
    //var query = 'select * from author where authorName=' + mysql.escape(name);
    mysql.query(query, function (err, rows, fields) {
        if (err) {
            console.log(err);
            return;
        }
        var user = rows[0];
        if (!user) {
            res.render('login', {message: '用户名或者密码错误'});
            return;
        }
        req.session.user = user;
        res.redirect('/');
    });

});

/**
 * 文章内容页
 */
router.get('/articles/:articleID', function (req, res, next) {
    var articleID = req.params.articleID
    var query = 'select * from article where articleID=' + mysql.escape(articleID);
    mysql.query(query, function (err, rows, fields) {
        if (err) {
            console.log(err);
            return;
        }
        var updateSql = 'update article set articleClick = articleClick + 1 where articleId = ' + mysql.escape(articleID);
        //为啥在前面？
        var article = rows[0];
        mysql.query(updateSql, function (err, rows, fields) {
            var year = article.articleTime.getFullYear();
            var month = article.articleTime.getMonth() + 1 > 10 ? article.articleTime.getMonth() : '0' + (article.articleTime.getMonth() + 1);
            var date = article.articleTime.getDate() + 1 > 10 ? article.articleTime.getDate() : '0' + (article.articleTime.getDate() + 1);
            article.articleTime = year + '-' + month + '-' + date;
            res.render('article', {article: article, user: req.session.user});
        });
    });
});

/**
 * 写文章页面
 */
router.get('/edit', function (req, res, next) {
    var user = req.session.user;
    if (!user) {
        res.redirect('/login');
        return;
    }
    res.render('edit', {user: req.session.user});
});

/**
 * 写文章页面2
 */
router.get('/edit2', function (req, res, next) {
    var user = req.session.user;
    if (!user) {
        res.redirect('/login');
        return;
    }
    res.render('edit2', {user: req.session.user});
});

/*保存文章*/
router.post('/edit', function (req, res, next) {
    var title = req.body.title;
    var content = req.body.content;
    var author = req.session.user.authorName;
    var query = 'insert article set articleTitle =' + mysql.escape(title) + ', articleAuthor = ' + mysql.escape(author) + ', articleContent = ' + mysql.escape(content) + ', articleTime=curdate()';
    mysql.query(query, function (err, rows, fields) {
        if (err) {
            console.log(err);
            return;
        }
        res.redirect('/');
    });

});

/**
 * 友情链接
 */
router.get('/friends', function (req, res, next) {
    res.render('friends', {user: req.session.user});
});

/**
 * 关于博客
 */
router.get('/about', function (req, res, next) {
    res.render('about', {user: req.session.user});
});

/**
 * 登出博客
 */
router.get('/logout', function (req, res, next) {
    req.session.user = null;
    res.redirect('/');
});

/**
 * 修改文章
 */
router.get('/modify/:articleId', function (req, res, next) {
    var articleId = req.params.articleId;
    var user = req.session.user;
    var query = 'select * from article where articleId = ' + mysql.escape(articleId);
    if (!user) {
        res.redirect('/');
        return;
    }
    mysql.query(query, function (err, rows, fields) {
        if (err) {
            console.log(err);
            return;
        }
        var article = rows[0];
        var title = article.articleTitle;
        var content = article.articleContent;
        res.render('modify', {user: user, articleId: articleId, title: title, content: content});
    });
});

/*更新文章*/
router.post('/modify/:articleId', function (req, res, next) {
    var articleId = req.params.articleId;
    var user = req.session.user;
    var title = req.body.title;
    var content = req.body.content;
    var query = 'update article set articleTitle =' + mysql.escape(title) + ', articleContent = ' + mysql.escape(content) + 'where articleId = ' + mysql.escape(articleId);
    mysql.query(query, function (err, rows, fields) {
        if (err) {
            console.log(err);
            return;
        }
        res.redirect('/');
    });

});

/*删除文章*/
router.get('/delete/:articleId', function (req, res, next) {
    var articleId = req.params.articleId;
    var user = req.session.user;
    var query = 'delete from article where articleId = ' + mysql.escape(articleId);
    if (!user) {
        res.redirect('/login');
        return;
    }
    mysql.query(query, function (err, rows, fields) {
        if (err) {
            console.log(err);
            return;
        }
        res.redirect('/');
    });

});


module.exports = router;
