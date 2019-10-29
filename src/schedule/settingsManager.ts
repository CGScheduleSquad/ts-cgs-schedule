import ScheduleParamUtils from './utils/scheduleParamUtils';
import { capitalize } from '../utils/formattingUtils';
import { toast } from 'bulma-toast';
import { CookieManager } from '../cookieManager';
import { ScheduleRange, ViewMode } from './rendering/scheduleRange';
import { VeracrossICalUtils } from './veracross/veracrossICalUtils';
import GenericCacheManager from '../globalSettings/genericCacheManager';

let themeCssVariables = [
    '--block-1',
    '--block-2',
    '--block-3',
    '--block-4',
    '--block-5',
    '--block-6',
    '--block-7',
    '--block-activity',
    '--block-free',
    '--text',
    '--link',
    '--border',
    '--divider',
    '--background-color'
];

function createOption(text: string) {
    let opt = document.createElement('option');
    opt.appendChild(document.createTextNode(capitalize(text)));
    opt.value = text;
    return opt;
}

function getParameterCaseInsensitive(object: { [x: string]: any; }, key: string) {
    // @ts-ignore
    return object[Object.keys(object)
        .find(k => k.toLowerCase() === key.toLowerCase())
        ];
}

function applyHighlight() {
    let viewMode = ScheduleParamUtils.getViewMode();
    if (viewMode !== ViewMode.Day) {
        let highlightDay = new ScheduleRange(ScheduleParamUtils.getCurrentDate(), ViewMode.Day).startDate;
        Array.from(document.querySelectorAll(`.daylabel[date='${highlightDay.toString()}']`)).forEach((el: any) => el.classList.add('day-highlight'));
    }
}

export function loadAllSettings(globalSettingsObject: any) {
    if (new URL(window.location.href).hash === '#updated') {

        toast({
            message: 'Settings updated successfully. Please bookmark the new link.',
            type: 'is-info',
            duration: 5000,
            position: 'top-center',
            dismissible: true,
            pauseOnHover: true,
            animate: { in: 'fadeInDown', out: 'fadeOutUp' }
        });

        window.location.hash = '';
    }

    let themesObject = parseThemesObject(globalSettingsObject);
    let linkObject = parseLinkObject(globalSettingsObject);
    let calendarFeedObject = parseCalendarFeedObject(globalSettingsObject);

    loadSettingsModal(themesObject);

    applyThemes(themesObject);
    if (ScheduleParamUtils.getLinksEnabled()) applyClassLinks(linkObject);
    if (ScheduleParamUtils.getHighlightEnabled()) applyHighlight();
    if (ScheduleParamUtils.getCalendarEventsEnabled()) applyCalendarFeeds(calendarFeedObject);
}

function loadSettingsModal(themesObject: {}) {
    let sel = document.getElementById('theme');
    Object.keys(themesObject).forEach((themeName: string) => {
        // @ts-ignore
        sel.appendChild(createOption(themeName));
    });
    // @ts-ignore
    sel.value = ScheduleParamUtils.getTheme();

    // @ts-ignore
    let linksCheckbox = document.getElementById('class-links');
    // @ts-ignore
    linksCheckbox.checked = ScheduleParamUtils.getLinksEnabled();
    // @ts-ignore
    let calendarCheckbox = document.getElementById('calendar-events');
    // @ts-ignore
    calendarCheckbox.checked = ScheduleParamUtils.getCalendarEventsEnabled();
    // @ts-ignore
    let highlightCheckbox = document.getElementById('day-highlight');
    // @ts-ignore
    highlightCheckbox.checked = ScheduleParamUtils.getHighlightEnabled();

    const openModal = () => {
        let settingsAd = document.getElementById('settings-ad');
        if (settingsAd !== null) settingsAd.classList.add('hidden');
        CookieManager.dismissSettingsAd();
        // @ts-ignore
        return document.getElementById('settings-modal').classList.add('is-active');
    };
    // @ts-ignore
    const closeModal = () => document.getElementById('settings-modal').classList.remove('is-active');

    // @ts-ignore
    document.getElementById('settings').firstElementChild.addEventListener('click', () => openModal());
    // @ts-ignore
    document.getElementById('save-settings').addEventListener('click', () => {
        if (
            // @ts-ignore
            highlightCheckbox.checked !== ScheduleParamUtils.getHighlightEnabled()
            // @ts-ignore
            || linksCheckbox.checked !== ScheduleParamUtils.getLinksEnabled()
            // @ts-ignore
            || calendarCheckbox.checked !== ScheduleParamUtils.getCalendarEventsEnabled()
            // @ts-ignore
            || sel.value !== ScheduleParamUtils.getTheme()
        ) {
            let newUrl = new URL(window.location.href);
            // @ts-ignore
            newUrl.searchParams.set('highlight', highlightCheckbox.checked);
            // @ts-ignore
            newUrl.searchParams.set('links', linksCheckbox.checked);
            // @ts-ignore
            newUrl.searchParams.set('calendars', calendarCheckbox.checked);
            // @ts-ignore
            newUrl.searchParams.set('theme', sel.value);
            newUrl.hash = '#updated';
            window.location.href = newUrl.href;
        }
        closeModal();
    });
    [document.getElementsByClassName('modal-background')[0], document.getElementById('cancel-settings')].forEach(
        el => el !== null && el.addEventListener('click', () => closeModal())
    );
}

function parseThemesObject(globalSettingsObject: any) {
    var namePattern = /^[\w| ]+$/i;
    var colorPattern = /^#([0-9a-f]{3})([0-9a-f]{3})?$/i;
    let themesObject = {};
    globalSettingsObject.themes.forEach((theme: any) => {
        if (theme.length < themeCssVariables.length + 1) return;
        // @ts-ignore
        let textValues = theme.slice(1, themeCssVariables.length + 1);
        if (namePattern.test(theme[0]) && textValues.every((value: string) => colorPattern.test(value))) {
            // @ts-ignore
            themesObject[theme[0].toLowerCase()] = textValues;
        } else {
            console.log('Ignored theme entry: ');
            console.log(theme);
        }
    });
    return themesObject;
}

function applyThemes(themesObject: { [x: string]: any; }) {
    let urlTheme = ScheduleParamUtils.getTheme();
    let selectedTheme: string[] = getParameterCaseInsensitive(themesObject, urlTheme);
    if (selectedTheme !== undefined) {
        selectedTheme.forEach(((value, index) => {
            document.documentElement.style.setProperty(themeCssVariables[index], value);
        }));
    }
}

const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
const classNamePattern = /^[^<>\n\\=]+$/;
const blockNumberPattern = /^[1-7]$/;

function parseLinkObject(globalSettingsObject: any) {
    const minLength = 3;

    let linkObject = {};
    globalSettingsObject.dayLinks.forEach((linkEntry: any) => {
        if (linkEntry.length < minLength) return;
        let className = linkEntry[0];
        let blockNumber = linkEntry[1];
        let filteredLinks = linkEntry.slice(2).filter((link: string) => urlPattern.test(link));
        if (classNamePattern.test(className) && blockNumberPattern.test(blockNumber) && filteredLinks.length >= 1) {
            // @ts-ignore
            linkObject[className + blockNumber] = filteredLinks;
        } else {
            console.log('Ignored link entry: ');
            console.log(linkEntry);
        }
    });
    return linkObject;
}

function parseCalendarFeedObject(globalSettingsObject: any) {
    let length = 4;

    let allClassIds = getAllClassIds();
    let calFeedsObject = {};
    globalSettingsObject.calFeeds.forEach((thing: any) => {
        if (thing.length !== length) return;
        let className = thing[0];
        let blockNumber = thing[1];
        let canvasId = thing[2];
        let calendarUrl = thing[3];
        if (classNamePattern.test(className) && blockNumberPattern.test(blockNumber) && classNamePattern.test(canvasId) && urlPattern.test(calendarUrl)) {
            let classKey = className + blockNumber;
            if (allClassIds.has(classKey)) {
                // @ts-ignore
                calFeedsObject[classKey] = [canvasId, calendarUrl];
            }
        }
    });
    return calFeedsObject;
}

function forceOpenTabIfSafari(href: string) {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isSafari) {
        let a = document.createElement('a');
        a.setAttribute('href', href);
        a.setAttribute('target', '_blank');

        let dispatch = document.createEvent('HTMLEvents');
        dispatch.initEvent('click', true, true);
        a.dispatchEvent(dispatch);
    } else {
        window.open(href, '_blank');
    }
}

function applyClassLinks(linkObject: any) {

    let linkObjectKeys = Object.keys(linkObject);

    Array.from(document.getElementsByClassName('coursename')).forEach((courseName: Element): any => {
        // @ts-ignore
        let parentElement = courseName.parentElement;
        if (parentElement === null) return;
        let blocklabel = parentElement.getAttribute('blocklabel');
        // @ts-ignore
        let workingKey = courseName.innerText + blocklabel;
        let linkObjectElement = linkObject[workingKey];
        // @ts-ignore // TODO: Remove
        if (courseName.innerText === 'Lunch') linkObjectElement = ['https://www.sagedining.com/menus/catlingabelschool/'];
        if (linkObjectElement === undefined) return;
        parentElement.classList.add('has-link', 'link-index-' + linkObjectKeys.indexOf(workingKey));
        parentElement.addEventListener('click', event => {
            if (event.shiftKey) {
                event.preventDefault();
                const modal = document.createElement('div');
                const modalBackground = document.createElement('div');
                const modalContent = document.createElement('div');
                const modalClose = document.createElement('button');

                modal.classList.add('bulma', 'modal', 'is-clipped');
                modalBackground.classList.add('bulma', 'modal-background');
                modalContent.classList.add('bulma', 'modal-card');
                modalClose.classList.add('bulma', 'modal-close', 'is-large');

                modal.append(modalBackground, modalContent, modalClose);
                document.body.appendChild(modal);

                modalContent.innerHTML = `
                    <header class="modal-card-head">
                      <p class="modal-card-title">Modal title</p>
                    </header>
                    <section class="modal-card-body">
                      <!-- Content ... -->
                    </section>
                    <footer class="modal-card-foot">
                      <button class="button is-success" id="modal-save">Save changes</button>
                    </footer>
                `;
                modalContent.style.marginTop = '-90vh';
                [modalClose, document.getElementById('modal-save')].forEach(e => e.addEventListener('click', () => document.body.removeChild(modal)));
            } else {
                forceOpenTabIfSafari(linkObjectElement[0]);
            }
        });
    });

    linkObjectKeys.forEach((className, classNameIndex) => {
        let items: {} = {};
        linkObject[className].forEach((link: string) => {
            // @ts-ignore
            items[link] = { name: link.substring(0, 50).replace('https://', '').replace('http://', '') + (link.length > 50 ? '...' : '') };
        });
        // @ts-ignore
        $.contextMenu({
            selector: '.link-index-' + classNameIndex,
            callback: function(key: string | undefined) {
                window.open(key, '_blank');
            },
            items: items
        });
    });
}

function getAllClassIds() {
    let listOfClasses = new Set();
    Array.from(document.getElementsByClassName('coursename')).forEach((courseName: Element): any => {
        // @ts-ignore
        let parentElement = courseName.parentElement;
        if (parentElement === null) return;
        let blocklabel = parentElement.getAttribute('blocklabel');
        // @ts-ignore
        let workingKey = courseName.innerText + blocklabel;
        listOfClasses.add(workingKey);
    });
    return listOfClasses;
}

function applyCalendarFeeds(calendarFeedObject: any) {
    let feedKeyToCalendar = (key: string) => GenericCacheManager.getCacheResults(key, calendarFeedObject[key][1]).then(icsString => {
        // @ts-ignore
        let parsedPath = ICAL.parse(icsString);
        return parsedPath[2];
    }).then(calendarEvents => {
        return calendarEvents
            .map((event: any) => {
                try {
                    let date = VeracrossICalUtils.getDate(event[1]);
                    let title = VeracrossICalUtils.getTitle(event[1]);
                    let splitTitle = title.split(' [');
                    let description = splitTitle[0].replace(/\(.+\)/, '').trim();
                    let canvasId = splitTitle[1].slice(0, -1);

                    if (
                        date === null || canvasId !== calendarFeedObject[key][0]
                    )
                        return null;

                    return { date, description, canvasId, title: key.slice(0, -1), blocklabel: key.slice(-1)};
                } catch (e) {
                    return null;
                }
            })
            .filter((rawBlock: any) => rawBlock !== null);
    }).catch((e: Error) => {
        console.warn(e);
        console.warn('Calendar link returned 404!');
        return null;
    });

    let allCalPromises = Object.keys(calendarFeedObject).map(feedKeyToCalendar);
    Promise.all(allCalPromises).then((calendars: Array<any>) => {
        calendars.filter((value => value !== undefined && value !== null)).forEach((calendarEvents: Array<object>) => {
            calendarEvents.forEach((value: any) => {
                Array.from(document.querySelectorAll(`td[blocklabel='${value.blocklabel}'][title='${value.title}'][date='${value.date}'] > .subtitle`)).forEach((el: any) => {
                   el.value = ` ${value.description} `;
                   el.classList.add('calendar-feed-subtitle')
                });
            })
        });
    });
}

