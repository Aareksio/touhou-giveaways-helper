// ==UserScript==
// @name         Touhou Giveaways Helper
// @namespace    https://touhou.justarchi.net/
// @version      1.031
// @description  Makes your life easier!
// @author       Mole & Archi
// @match        https://www.steamgifts.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

'use strict';

/* Customization */

// Default giveaway time (in milliseconds, time before the giveaways ends, one hour will be added to prevent SG fuckups)
const TOUHOU_GIVEAWAY_DEFAULT_TIME = 2 * 24 * 60 * 60 * 1000; // 2 days recommended

// Links - add your own links to the bar! Uncomment (remove initial '//') examples below to see how it works.
const CUSTOM_LINKS = [
    //['My animu and mango', 'http://4chan.org/a/'],
    //['Google', 'http://google.com/'],
];

const GROUP_ID = 11587332;
const SITE_URL = 'https://touhou.justarchi.net/';

let userId = localStorage.getItem('touhou_user_id');
let lastUpdate = localStorage.getItem('touhou_last_updated');

let userData = {};
let giveawaysData = {};
let announcement;

function init() {
    if (!/steamgifts\.com/.exec(window.location.href)) return; // Not on SteamGifts page

    loadCachedData();
    addCustomStyles();
    appendNavigationBar();
    bindButtons();
    fixFuckups();
    updateLatestAnnouncement();

    if (isOldOrInvalidData()) {
        updateData();
    } else {
        updateGiveaways();
    }

    const currentPath = window.location.pathname.split('/');
    removeFromArray(currentPath, "");


    if (currentPath.length !== 0) {
        switch (currentPath[0]) {
            case 'giveaways':
                if (currentPath[1] === 'new') giveawayNew();
                break;
            case 'giveaway':
                giveawayDetails(currentPath[1]);
                break;
        }
    }
}

function loadCachedData() {
    const cachedUserData = localStorage.getItem('touhou_user_data');
    if (cachedUserData) userData = JSON.parse(cachedUserData);

    const cachedGiveawaysData = localStorage.getItem('touhou_giveaways_data');
    if (cachedGiveawaysData) giveawaysData = JSON.parse(cachedGiveawaysData);

    const cachedAnnouncement = localStorage.getItem('touhou_announcement');
    if (cachedAnnouncement) announcement = JSON.parse(cachedAnnouncement);
}

function addCustomStyles() {
    $('body').addClass('touhou_giveaways_helper');

    const css = '.touhou_info_container{background-color:#1e202b;color:#c7c7c7;font:700 12px/22px Arial,sans-serif;border-top:1px solid;border-bottom:1px solid;border-color:#101015}.touhou_info_container_fixed{position:fixed;width:100%;z-index:1;top:39px}.SGPP__gridTileIcons>.touhou_giveaway_points{width:auto;padding-right:8px!important;padding-left:8px;line-height:1.5}.touhou_pointer{cursor:pointer}.touhou_announcement{margin-left:15px}.touhou_announcement a{color:red}.touhou_announcement .touhou_announcement_ignore{color:#c7c7c7}';
    addStyle(css);
}

function bindButtons() {
    $(document).on('click', '.touhou_user_refresh', forceUpdateData);
    $(document).on('click', '.touhou_announcement_link', openAnnouncement);
    $(document).on('click', '.touhou_announcement_ignore', ignoreAnnouncement);
}

function appendNavigationBar() {
    const barHTML = generateBarHTML();
    $('header').after(barHTML);
}

function generateBarHTML() {
    return '' +
        '<div class="touhou_info_container">' +
        '  <nav>' +
        '    <div class="nav__left-container">' +
        '      <p><a href="' + SITE_URL + '" target="_blank">Touhou Giveaways Helper</a></p>' + generateCustomLinksHTML() +
        '    </div>' +
        '    <div class="nav__right-container">' + generateBarUserHTML() + '</div>' +
        '  </nav>' +
        '</div>';
}

function generateCustomLinksHTML() {
    const customLinks = [];
    CUSTOM_LINKS.forEach(link => {
        customLinks.push(`<p>&nbsp;&nbsp;||&nbsp;&nbsp;<a href="${link[0]}" target="_blank">${link[1]}</a></p>`);
    });

    return customLinks.join('');
}

function generateBarUserHTML(forceRefresh) {
    let barData = '<p class="touhou_data">';

    if (isOldOrInvalidData() || forceRefresh) {
        barData += 'Loading data...&nbsp;&nbsp;<i class="fa fa-refresh fa-spin"></i>';
    } else {
        barData += '<b><a href="' + SITE_URL + 'user/' + userId + '/profile" target="_blank">' + userData.nickname + '</a></b> (<i class="fa fa-jpy"></i>' + userData.points_allowed + ') &nbsp;&nbsp;<i class="touhou_user_refresh touhou_pointer fa fa-refresh"></i>';
    }

    barData += '</p>';

    return barData;
}

function isOldOrInvalidData() {
    return !lastUpdate || !userData || !giveawaysData || lastUpdate < (Date.now() - (15 * 60 * 1000));
}

function updateBarUserSection(html) {
    if (!html) html = generateBarUserHTML();
    $('.touhou_data').first().html(html);
}

function forceUpdateData() {
    return updateData(true);
}

function updateData(forceRefresh) {
    if (!forceRefresh && userId) {
        updateUserData();
        updateGiveawaysData();
    }

    updateBarUserSection(generateBarUserHTML(true));

    const profileUrl = $('.nav__avatar-outer-wrap').first().attr('href');

    if (!profileUrl) eraseUserData();

    $.get(profileUrl, function(page) {
        const userIdMatches = /<a rel="nofollow" target="_blank" href="http:\/\/steamcommunity\.com\/profiles\/([0-9]+)" data-tooltip="Visit Steam Profile">/.exec(page);

        if (!userIdMatches) return eraseUserData();

        userId = userIdMatches[1];
        updateUserData();
        updateGiveawaysData();
    });
}

function eraseUserData() {
    updateBarUserSection('<p>Not logged in...&nbsp;&nbsp;<i class="touhou_user_refresh touhou_pointer fa fa-refresh"></i></p>');

    localStorage.removeItem('touhou_user_id');
    localStorage.removeItem('touhou_user_data');
    localStorage.removeItem('touhou_last_updated');
    localStorage.removeItem('touhou_giveaways_data');
}

function updateUserData() {
    $.get(SITE_URL + 'api/v1/getUserDetails', { 'id': userId }, function(data) {
        userData = data;
        lastUpdate = Date.now();
        saveUserData();
        updateBarUserSection();
    }).fail(function() {
        updateBarUserSection('<p>Failed to load user data...&nbsp;&nbsp;<i class="touhou_user_refresh touhou_pointer fa fa-refresh"></i></p>');
    });
}

function updateGiveawaysData() {
    $.get(SITE_URL + 'api/v1/getActiveGiveaways', function(data) {
        giveawaysData = data;
        saveGiveawaysData();
        updateGiveaways();
    });
}

function updateLatestAnnouncement() {
    $.get(SITE_URL + 'api/v1/getLatestAnnouncement', function(data) {
        if (!announcement || data.id !== announcement.id) announcement = data;
        displayAnnouncement();
        localStorage.setItem('touhou_announcement', JSON.stringify(announcement));
    });
}

function displayAnnouncement() {
    if (!announcement || announcement.seen) return;

    $('.touhou_info_container .nav__left-container').append(`<p class="touhou_announcement">New announcement: <a class="touhou_announcement_link" data-id="${announcement.id}" href="http://steamcommunity.com/groups/touhou-ga#announcements/detail/${announcement.id}" target="_blank">${announcement.title}</a> <a class="touhou_announcement_ignore" data-id="${announcement.id}" href="#" onclick="return false;">x</a></p>`);
    console.log('Latest announcement: ', announcement);
}

function openAnnouncement() {
    announcement.seen = true;
    $('.touhou_announcement').remove();
    localStorage.setItem('touhou_announcement', JSON.stringify(announcement));
}

function ignoreAnnouncement() {
    announcement.seen = true;
    $('.touhou_announcement').remove();
    localStorage.setItem('touhou_announcement', JSON.stringify(announcement));
}

function saveUserData() {
    localStorage.setItem('touhou_user_id', userId);
    localStorage.setItem('touhou_user_data', JSON.stringify(userData));
    localStorage.setItem('touhou_last_updated', lastUpdate);
}

function saveGiveawaysData() {
    localStorage.setItem('touhou_giveaways_data', JSON.stringify(giveawaysData));
}

function updateGiveaways(endless) {
    const updater = function() {
        $('.giveaway__row-outer-wrap').each(function(index, giveaway) {
            const giveawayIdMatches = /\/giveaway\/([A-Za-z0-9]+)\//.exec($('.giveaway__heading__name', giveaway).attr('href'));
            if (!giveawayIdMatches) return;

            const giveawayId = giveawayIdMatches[1];

            if (giveawaysData.hasOwnProperty(giveawayId) && !$('.touhou_giveaway_points', giveaway).length) {
                const badgesHTML = generateGiveawayBadges(giveawayId);
                $('.giveaway__column--width-fill', giveaway).after(badgesHTML);
            }
        });
    };

    updater();
    if (endless) setInterval(updater, 1000);
}

function generateGiveawayBadges(giveawayId) {
    if (!giveawayId) return '';
    const giveaway = giveawaysData[giveawayId][0];
    if (!giveaway) return '';

    const discount = calculateDiscount(giveaway);

    return '' +
        '<div class="touhou_giveaway_points' + (giveaway.value > userData.points_allowed ? ' giveaway__column--contributor-level--negative' : ' giveaway__column--region-restricted') + '">' +
        '  <span title="TouhouValue: ' + giveaway.value + '"><i class="fa fa-jpy"></i>' + giveaway.value + (discount ? ' (-' + discount + '%)' : '') + '</span>' +
        '</div>';
}

function calculateDiscount(giveaway) {
    return Math.round((1 - (giveaway.value / (giveaway.points * giveaway.multiplier))) * 100);
}

function giveawayNew() {
    $(".form__row--giveaway-keys").after('<div class="form__row"><div class="form__heading"><div class="form__heading__number">3a.</div><div class="form__heading__text">Group Giveaways</div></div><div class="form__row__indent"><div class="form__submit-button touhouBtn"><i class="fa fa-fast-forward"></i>&nbsp;Touhou</div>&nbsp;<div class="form__submit-button touhouBtn js__submit-form"><i class="fa fa-fast-forward"></i>&nbsp;Touhou and confirm</div></div></div>');

    const applyDates = function() {
        let startingDate = new Date();
        let endingDate = new Date(startingDate.getTime() + TOUHOU_GIVEAWAY_DEFAULT_TIME + (60 * 60 * 1000)); // Extra 1 hour
        $("input[name='start_time']").val(formatDate(startingDate));
        $("input[name='end_time']").val(formatDate(endingDate));
    };

    const applyRegionRestrictions = function() {
        $("div[data-checkbox-value='0']").trigger("click");
    };

    const applyGroup = function() {
        $("div[data-checkbox-value='groups']").trigger("click");
        var groupButton = $("div[data-group-id='" + GROUP_ID + "']");
        if (!groupButton.hasClass('is-selected')) {
            groupButton.trigger("click");
        }
    };

    const applyDescription = function() {
        let descarea = $("textarea[name='description']");
        let description = '### TouhouValue: Default\n';
        let newDesc = description + descarea.val().replace(description, "");
        descarea.val(newDesc);
    };

    $(".js__submit-form.touhouBtn").click(function() {
        return $(this).closest("form").submit();
    });

    $(".touhouBtn").click(function() {
        applyDates();
        applyRegionRestrictions();
        applyGroup();
        applyDescription();
    });
}

function giveawayDetails(giveawayId) {
    if (!giveawayId || !giveawaysData.hasOwnProperty(giveawayId)) return;

    $.get(SITE_URL + 'api/v1/getGiveawayDetails', { 'id': giveawayId }, function(data) {
        if (!data.success) return;

        const discount = calculateDiscount(data);
        const badges = '' +
            '<div class="touhou_giveaway_points featured__column' + (data.value > userData.points_allowed ? ' featured__column--contributor-level--negative' : ' featured__column--region-restricted') + '">' +
            '  <span title="TouhouValue: ' + data.value + '"><i class="fa fa-jpy"></i>' + data.value + (discount ? ' (-' + discount + '%)' : '') + '</span>' +
            '</div>';
        $('.featured__column--width-fill').after(badges);
    });
}

function fixFuckups() {
    let header = $('header');
    let touhou_header = $('.touhou_info_container');

    const fixExtendedSG = function() {
        if (header.css('position') === 'fixed') {
            touhou_header.addClass('touhou_info_container_fixed');
            $('body').css('padding-top', '25px');
        }
    };

    const fixSGPP = function() {
        if (header.hasClass('SPGG_FixedNavbar')) {
            if (!touhou_header.hasClass('touhou_info_container_fixed')) {
                touhou_header.addClass('touhou_info_container_fixed');
            }
            touhou_header.css('z-index', 10);
            $('body').css('padding-top', '63px');
        }

        $('img[src="https://raw.githubusercontent.com/nandee95/Extended_Steamgifts/master/img/logo_trans.png"]', touhou_header).remove();
    };

    const fixESGST = function() {
        if (header.hasClass('esgst-fh')) {
            touhou_header.css('z-index', 998);
            $('.esgst-fh-sibling').css('margin-top', '37px');
        }
    };

    setTimeout(fixExtendedSG, 10);
    setTimeout(fixSGPP, 500);
    setTimeout(fixESGST, 500);
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

    // Fix hours
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

    // Fix minutes
    let minutes = date.getMinutes();
    if (minutes < 10) {
        minutes = '0' + minutes;
    }

    // Return result
    return $.datepicker.formatDate('M d, yy', date) + " " + hours + ":" + minutes + " " + ampm;
}

function addStyle(css) {
    let style = $('.touhou_style');
    if (style.length) {
        style.html(style.html() + css);
    } else {
        $('head').append('<style class="touhou_style" type="text/css">' + css + '</style>');
    }
}

init();
