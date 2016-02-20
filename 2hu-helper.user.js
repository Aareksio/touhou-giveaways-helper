// ==UserScript==
// @name         Touhou Giveaways Helper
// @namespace    https://touhou.justarchi.net/
// @version      1.01
// @description  Makes your life easier!
// @author       Mole & Archi
// @match        http://www.steamgifts.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

'use strict';

var GROUP_ID = 11587332;
var TOUHOU_SITE = 'https://touhou.justarchi.net/';
var USER_ID = localStorage.getItem('touhou_user_id');
var LAST_UPDATED = localStorage.getItem('touhou_last_updated');

var USER_DATA, GIVEAWAYS_DATA;
var user_data = localStorage.getItem('touhou_user_data');
if (user_data) {
    USER_DATA = JSON.parse(user_data);
}
var giveaways_data = localStorage.getItem('touhou_giveaways_data');
if (giveaways_data) {
    GIVEAWAYS_DATA = JSON.parse(giveaways_data);
}

if (/steamgifts\.com/.exec(window.location.href)) {
    var current_path = window.location.pathname.split('/');
    removeFromArray(current_path, "");
}

if (current_path) {
    initializeTouhouHelper();

    if (current_path.length === 0) { // Homepage

    } else {
        switch(current_path[0]) {
            case 'giveaways': // Giveaways page
                if (current_path[1] === 'new') { // New giveaway
                    giveawayNew();
                }
                break;
        }
    }
}

/* Functions */
function initializeTouhouHelper() {
    let css = '.touhou_no_enter{background-image:linear-gradient(#FF6D5E 0,#FC6757 50%,#F25E4F 100%);background-image:-moz-linear-gradient(#FF6D5E 0,#FC6757 50%,#F25E4F 100%);background-image:-webkit-linear-gradient(#FF6D5E 0,#FC6757 50%,#F25E4F 100%);border-color:#FF5E41 #F14829 #EA3E1E #FF593A;color:rgba(135,13,0,.95);text-shadow:1px 1px 1px rgba(231,57,39,.5);box-shadow:none!important}';
    let head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    let style = document.createElement('style');
    style.type = 'text/css';
    style.classList.add('touhou_style');
    style.innerHTML = css;
    head.appendChild(style);

    if (!LAST_UPDATED || !USER_DATA || !GIVEAWAYS_DATA || LAST_UPDATED < (Date.now() - (15 * 60 * 1000))) {
        appendTouhouBar(false);
        updateTouhouData();
    } else {
        appendTouhouBar(true);
        updateTouhouGiveaways();
    }
}

function updateTouhouData(refreshID) {
    if (!USER_ID || refreshID) {
        let profileUrl = $('.nav__avatar-outer-wrap').first().attr('href');
        if (profileUrl) {
            $.get(profileUrl, function(page) {
                let user_id = /<a rel="nofollow" target="_blank" href="http:\/\/steamcommunity\.com\/profiles\/([0-9]+)" data-tooltip="Visit Steam Profile">/.exec(page);
                if (user_id) {
                    USER_ID = user_id[1];
                    updateTouhouUserData();
                    updateTouhouGiveawaysData();
                } else {
                    updateTouhouBar('Cannot load steam id...');
                }
            });
        }
    } else {
        updateTouhouUserData();
        updateTouhouGiveawaysData();
    }
}

function updateTouhouUserData() {
    $.get(TOUHOU_SITE + 'api/v1/getUserDetails', {'id': USER_ID}, function(data) {
        USER_DATA = data;
        LAST_UPDATED = Date.now();
        saveUserData();
        updateTouhouBar();
    });
}

function updateTouhouGiveawaysData() {
    $.get(TOUHOU_SITE + 'api/v1/getActiveGiveaways', function(data) {
        GIVEAWAYS_DATA = data;
        saveGiveawaysData();
        updateTouhouGiveaways();
    });
}

function appendTouhouBar(withData) {
    let touhouBar = '' +
        '<div class="touhou_info_container" style="background-color: #1e202b;color: #c7c7c7;font: bold 12px/22px Arial,sans-serif;border-top: 1px solid;border-bottom: 1px solid;border-color: #101015;">' +
        '<nav>' +
        '<div class="nav__left-container">' +
        '<p><a href="' + TOUHOU_SITE + '" target="_blank">Touhou Giveaways Helper</a></p>' +
        '</div>' +
        '<div class="nav__right-container">' +
        generateTouhouData(withData) +
        '</div>' +
        '</nav>' +
        '</div>';
    $('header').after(touhouBar);
}

function updateTouhouBar(msg) {
    let status;
    if (!msg) {
        status = generateTouhouData(true);
    } else {
        status = msg;
    }
    $('.touhou_data').first().html(status);
}

function updateTouhouGiveaways() {
    $('.giveaway__row-outer-wrap').each(function(index, giveaway) {
        let giveawayId = /\/giveaway\/([A-Za-z0-9]+)\//.exec($('.giveaway__heading__name', giveaway).attr('href'));
        if (!giveawayId) {
            return;
        }
        giveawayId = giveawayId[1];

        if (GIVEAWAYS_DATA.hasOwnProperty(giveawayId)) {
            $('.giveaway__column--width-fill', giveaway).after('<div class="touhou_giveaway_points' + (GIVEAWAYS_DATA[giveawayId][0].value > USER_DATA.points_allowed ? ' touhou_no_enter' : '') + '"><span title="TouhouValue: ' + GIVEAWAYS_DATA[giveawayId][0].value + '"><i class="fa fa-jpy"></i>' + GIVEAWAYS_DATA[giveawayId][0].value + '</span></div>');
        }
    });
}

function giveawayNew() {
    $(".form__row--giveaway-keys").after('<div class="form__row"><div class="form__heading"><div class="form__heading__number">3a.</div><div class="form__heading__text">Touhou Giveaways</div></div><div class="form__row__indent"><div id="dateBtn" class="form__submit-button"><i class="fa fa-fast-forward"></i>&nbsp;Fill with default Touhou Giveaways settings</div></div></div>');

    let applyDates = function() {
        let startingDate = new Date().getTime();
        let endingDate = startingDate + (2 * 24 * 60 * 60 * 1000) + (60 * 60 * 1000); // 2 days + 1 hour
        $("input[name='start_time']").val(formatDate(new Date(startingDate)));
        $("input[name='end_time']").val(formatDate(new Date(endingDate)));
    };

    let applyRegionRestrictions = function() {
        $("div[data-checkbox-value='0']").trigger("click");
    };

    let applyGroup = function() {
        $("div[data-checkbox-value='groups']").trigger("click");
        $("div[data-group-id='" + GROUP_ID + "']").trigger("click");
    };

    let applyDescription = function() {
        let description = '### TouhouValue: Default\n';
        let newDesc = description + $("textarea[name='description']").val().replace(description, "");
        $("textarea[name='description']").val(newDesc);
    };

    $("#dateBtn").click(function() {
        applyDates();
        applyRegionRestrictions();
        applyGroup();
        applyDescription();
    });
}

/* Helpers */
function removeFromArray(arr, item) {
    for (let i = arr.length; i--;) {
        if (arr[i] === item) {
            arr.splice(i, 1);
        }
    }
}

function formatDate(date) {
    // Fixed by Archi for all SG weird dates, do not touch
    let formattedDate = $.datepicker.formatDate('M d, yy', date);

    // Hours
    let hours = date.getHours();
    let ampm = '';
    if (hours < 12) {
        ampm = 'am';
        if (hours === 0) {
            hours = 12;
        }
    } else {
        ampm = 'pm';
        if (hours !== 12) {
            hours = hours % 12;
        }
    }

    // Minutes
    let minutes = date.getMinutes();
    if (minutes < 10) {
        minutes = '0' + minutes;
    }

    // Result
    formattedDate += " " + hours + ":" + minutes + " " + ampm;
    return formattedDate;
}

function saveUserData() {
    localStorage.setItem('touhou_user_id', USER_ID);
    localStorage.setItem('touhou_user_data', JSON.stringify(USER_DATA));
    localStorage.setItem('touhou_last_updated', LAST_UPDATED);
}

function saveGiveawaysData() {
    localStorage.setItem('touhou_giveaways_data', JSON.stringify(GIVEAWAYS_DATA));
}

function generateTouhouData(withData) {
    let touhouData = '<p class="touhou_data">';
    if (withData) {
        touhouData += '<b><a href="' + TOUHOU_SITE + 'user/' + USER_ID + '/profile" target="_blank">' + USER_DATA.nickname + '</a></b> (<i class="fa fa-jpy"></i>' + USER_DATA.points_allowed + ')';
    } else {
        touhouData += 'Loading data...';
    }
    touhouData += '</p>';

    return touhouData;
}
