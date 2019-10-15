import ScheduleParamUtils from './utils/scheduleParamUtils';
import ScheduleCacheManager from './utils/scheduleCacheManager';
import WindowUtils from '../utils/windowUtils';
import GlobalSettingsCacheManager from '../globalSettings/globalSettingsCacheManager';
import { loadAllSettings } from './settingsManager';
import { toast } from 'bulma-toast';
import ScheduleRenderer from './rendering/scheduleRenderer';

// start loading schedule before dom content has loaded, but only draw when the dom has loaded and the schedule has also
let scheduleAndDomLoaded = new Promise<string>((resolve) => resolve(ScheduleParamUtils.getCalendarUUID()))
    .then((calendarUUID: string) => Promise.all([
    ScheduleCacheManager.getSchedule(calendarUUID),
        WindowUtils.waitForScheduleEvent('DOMContentLoaded')
    ]))
    .then((schedule: any) => schedule[0])
    .catch((reason: any) => {
        console.error(reason);
        alert(reason);
        window.location.href = './index.html'; // exits the page
    });

let scheduleRendered = scheduleAndDomLoaded.then((schedule: any) => {
    ScheduleRenderer.render(schedule);
});

scheduleRendered.then(() => {
    if (new URL(window.location.href).hash === '#new') {
        toast({
            message: 'Schedule generated. Please bookmark the link and/or text it to your phone.',
            type: 'is-info',
            duration: 8000,
            position: 'top-center',
            dismissible: true,
            pauseOnHover: true,
            animate: { in: 'fadeInDown', out: 'fadeOutUp' }
        });

        window.location.hash = '';
    }
});

let scheduleAndGlobalSettingsLoaded = Promise.all([
    GlobalSettingsCacheManager.getGlobalSettings(),
    scheduleRendered
]).then((globalSettings: any) => globalSettings[0]);

scheduleAndGlobalSettingsLoaded.then((globalSettingsObject => {
    loadAllSettings(globalSettingsObject);
}));


