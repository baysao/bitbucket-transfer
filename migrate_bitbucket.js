var page = require('webpage').create();
var config = {
    username: 'my_account',
    password: 'my_password',
    transfer_to: 'other_account',
    filter: 'my_account' /*regex pattern using filter repository that match*/
}

page.onConsoleMessage = function (msg) {
    console.log(msg);
};
page.customHeaders = {
    "Referer": "https://bitbucket.org/account/signin/"
};
var nregx = new RegExp(config.filter);
page.open("https://bitbucket.org/account/signin/", function (status) {
    console.log(status);
    if (status === "success") {
        var csrfmiddlewaretoken = page.evaluate(function () {
            return document.querySelector("input[name='csrfmiddlewaretoken']").value;
        });
        console.log(csrfmiddlewaretoken);
        var server = 'https://bitbucket.org/account/signin/',
            data = 'next=%2Faccount%2Fteam_check%2F%3Fnext%3D&username=' + config.username + '&password=' + config.password + '&csrfmiddlewaretoken=' + csrfmiddlewaretoken;
        page.open(server, 'post', data, function (status) {
            console.log('open:' + server);
            console.log('data:' + data);
            if (status !== 'success') {
                console.log('step 1: login account failed');
            } else {
                console.log('step 1: login account success');
                //page.render('step1.png');
            }
        });
        var repositories = [];
        var ntime = 10000;
        window.setTimeout(function () {
            console.log('step 2: get repositories list');
            function get_repositories_by_page(data, npage, callback) {
                page.open('https://bitbucket.org/' + config.username + '?page=' + npage, function (status) {
                    if (status == 'success') {
                        var links = page.evaluate(function () {
                            return [].map.call(document.querySelectorAll('a.execute'), function (link) {
                                return link.getAttribute('href');
                            });
                        })
                        if (links.length > 0) {
                            for (var i = 0; i < links.length; i++) {

                                if (links[i] && nregx.test(links[i]))
                                    data.push(links[i]);
                            }
                            get_repositories_by_page(data, npage + 1, callback);
                        } else {
                            callback(data);
                        }

                    } else {
                        callback(data);
                    }
                })
            }

            get_repositories_by_page([], 1, function (data) {
                console.log(data.length + ' repositories');
                //page.render('step2.png');
                repositories = data;
            })
        }, ntime);
        ntime = ntime + 10000;
        window.setTimeout(function () {
            console.log('step 3: go to transfer repository');
            function transfer_repository(idx, repositories) {
                console.log('idx:' + idx + ' / ' + repositories.length);
                var repository = repositories[idx];
                console.log('transfer_repository:' + repository);
                console.log('open url:' + 'https://bitbucket.org' + repository + '/admin/transfer');
                page.open('https://bitbucket.org' + repository + '/admin/transfer', function (status) {
                    console.log('status:' + status);
                    if (status == 'success') {
                        var csrfmiddlewaretoken = page.evaluate(function (transfer_to) {
                            document.querySelector("input[name='user']").value = transfer_to;
                            return document.querySelector("input[name='csrfmiddlewaretoken']").value;
                        }, config.transfer_to);
                        console.log('csrfmiddlewaretoken:' + csrfmiddlewaretoken);
                        //page.render('step3.png');
                        var server = 'https://bitbucket.org' + repository + '/admin/transfer',
                            data = 'csrfmiddlewaretoken=' + csrfmiddlewaretoken + '&user=' + config.transfer_to + '&submitbtn=';
                        page.open(server, 'post', data, function (status) {
                            console.log('open:' + server);
                            console.log('data:' + data);
                            if (status !== 'success') {
                                console.log('step 4: transfer ' + repository + ' failed');
                            } else {
                                //page.render('tranfer_done.png');
                                console.log('step 4: transfer ' + repository + ' success');
                                var csrfmiddlewaretoken = page.evaluate(function () {
                                    return document.querySelector("input[name='csrfmiddlewaretoken']").value;
                                });
                                var owner = page.evaluate(function () {
                                    return document.querySelector("input[name='owner']").value;
                                });
                                var docurl = page.evaluate(function () {
                                    return document.URL;
                                });
                                console.log('csrfmiddlewaretoken:' + csrfmiddlewaretoken);
                                console.log('owner:' + owner);
                                console.log('docurl:' + docurl);
                                var data = 'csrfmiddlewaretoken=' + csrfmiddlewaretoken + '&owner=' + owner + '&submitbtn=Accept';
                                //console.log(data);
                                page.open(docurl, 'post', data, function (status) {
                                    if (status !== 'success') {
                                        console.log('step 4: confirm transfer ' + repository + ' failed');
                                    } else {
                                        console.log('step 4: confirm transfer ' + repository + ' success');
                                        //page.render('step4.png');
                                        idx = idx + 1;
                                        if(idx < repositories.length)
                                            transfer_repository(idx, repositories);
                                    }
                                })
                            }
                        });
                    }
                })
            }
            transfer_repository(0, repositories);
        }, ntime)
        //ntime = ntime + 10000;
        //window.setTimeout(function () {
        //    //console.log(repositories);
        //    console.log('step 5: DONE');
        //    page.render('step5.png');
        //    phantom.exit();
        //}, ntime);
    }
});
