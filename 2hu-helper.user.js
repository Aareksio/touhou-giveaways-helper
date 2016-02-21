// ==UserScript==
// @name         Touhou Giveaways Helper
// @namespace    https://touhou.justarchi.net/
// @version      1.018
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
    fixFuckups();

    if (current_path.length === 0) { // Homepage

    } else {
        switch(current_path[0]) {
            case 'giveaways': // Giveaways page
                if (current_path[1] === 'new') { // New giveaway
                    giveawayNew();
                }
                break;
            case 'giveaway':
                giveawayDetails(current_path[1]);
                break;
        }
    }
}

/* Functions */
function initializeTouhouHelper() {
    $('body').addClass('touhou_giveaways_helper');

    let css = '.touhou_info_container{background-color:#1e202b;color:#c7c7c7;font:700 12px/22px Arial,sans-serif;border-top:1px solid;border-bottom:1px solid;border-color:#101015}.touhou_info_container_fixed{position:fixed;width:100%;z-index:1;top:39px}.touhou_pointer{cursor:pointer}';
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

    $(document).on('click', '.touhou_user_refresh', function() {
        updateTouhouData(true);
    });
}

function updateTouhouData(refreshID) {
    if (!USER_ID || refreshID) {
        updateTouhouBar(generateTouhouData(false));
        let profileUrl = $('.nav__avatar-outer-wrap').first().attr('href');
        if (profileUrl) {
            $.get(profileUrl, function(page) {
                let user_id = /<a rel="nofollow" target="_blank" href="http:\/\/steamcommunity\.com\/profiles\/([0-9]+)" data-tooltip="Visit Steam Profile">/.exec(page);
                if (user_id) {
                    USER_ID = user_id[1];
                    updateTouhouUserData();
                    updateTouhouGiveawaysData();
                } else {
                    updateTouhouBar('Cannot load steam id...&nbsp;&nbsp;<i class="touhou_user_refresh touhou_pointer fa fa-refresh"></i>');
                }
            });
        } else {
            updateTouhouBar('Not logged in...&nbsp;&nbsp;<i class="touhou_user_refresh touhou_pointer fa fa-refresh"></i>');
            localStorage.removeItem('touhou_user_id');
            localStorage.removeItem('touhou_user_data');
            localStorage.removeItem('touhou_last_updated');
            localStorage.removeItem('touhou_giveaways_data');
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
    }).fail(function() {
        updateTouhouBar('Cannot load user data...&nbsp;&nbsp;<i class="touhou_user_refresh touhou_pointer fa fa-refresh"></i>');
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
        '<div class="touhou_info_container">' +
        '   <nav>' +
        '       <div class="nav__left-container">' +
        '           <p><a href="' + TOUHOU_SITE + '" target="_blank">Touhou Giveaways Helper</a></p>' +
        '       </div>' +
        '       <div class="nav__right-container">' +
                    generateTouhouData(withData) +
        '       </div>' +
        '   </nav>' +
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
            $('.touhou_giveaway_points', giveaway).remove();
            $('.giveaway__column--width-fill', giveaway).after('<div class="touhou_giveaway_points' + (GIVEAWAYS_DATA[giveawayId][0].value > USER_DATA.points_allowed ? ' giveaway__column--contributor-level--negative' : ' giveaway__column--region-restricted') + '"><span title="TouhouValue: ' + GIVEAWAYS_DATA[giveawayId][0].value + '"><i class="fa fa-jpy"></i>' + GIVEAWAYS_DATA[giveawayId][0].value + (GIVEAWAYS_DATA[giveawayId][0].points * GIVEAWAYS_DATA[giveawayId][0].multiplier > GIVEAWAYS_DATA[giveawayId][0].value ? ' (-' + Math.round((1 - (GIVEAWAYS_DATA[giveawayId][0].value/(GIVEAWAYS_DATA[giveawayId][0].points * GIVEAWAYS_DATA[giveawayId][0].multiplier))) * 100) + '%)' : '') + '</span></div>');
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
        let descarea = $("textarea[name='description']");
        let description = '### TouhouValue: Default\n';
        let newDesc = description + descarea.val().replace(description, "");
        descarea.val(newDesc);
    };

    $("#dateBtn").click(function() {
        applyDates();
        applyRegionRestrictions();
        applyGroup();
        applyDescription();
    });
}

function giveawayDetails(giveaway_id) {
    if (!giveaway_id) {
        return;
    }

    $.get(TOUHOU_SITE + 'api/v1/getGiveawayDetails', {'id': giveaway_id}, function(data) {
        if (data.success) {
            $('.featured__column--width-fill').after('<div class="featured__column' + (data.value > USER_DATA.points_allowed ? ' featured__column--contributor-level--negative' : ' featured__column--region-restricted') + '"><span title="TouhouValue: ' + data.value + '"><i class="fa fa-jpy"></i>' + data.value + (data.points * data.multiplier > data.value ? ' (-' + Math.round((1 - (data.value/(data.points * data.multiplier))) * 100) + '%)' : '') + '</span></div>');
        }
    });
}

function fixFuckups() {
    let header = $('header');
    let touhou_header = $('.touhou_info_container');

    let fixExtendedSG = function() {
        if (header.css('position') === 'fixed' ) {
            touhou_header.addClass('touhou_info_container_fixed');
            $('body').css('padding-top', '25px');
        }
    };

    let fixSGPP = function() {
        if (header.hasClass('SPGG_FixedNavbar')) {
            if (!touhou_header.hasClass('touhou_info_container_fixed')) {
                touhou_header.addClass('touhou_info_container_fixed');
            }
            touhou_header.css('z-index', 10);
            $('body').css('padding-top', '63px');
        }
    };

    setTimeout(fixExtendedSG, 10);
    setTimeout(fixSGPP, 500); // 500ms, half a second before it loads, quality extension!
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
        touhouData += '<b><a href="' + TOUHOU_SITE + 'user/' + USER_ID + '/profile" target="_blank">' + USER_DATA.nickname + '</a></b> (<i class="fa fa-jpy"></i>' + USER_DATA.points_allowed + ')&nbsp;&nbsp;<i class="touhou_user_refresh touhou_pointer fa fa-refresh"></i>';
    } else {
        touhouData += 'Loading data...&nbsp;&nbsp;<i class="fa fa-refresh fa-spin"></i>';
    }
    touhouData += '</p>';

    return touhouData;
}
