import joplin from 'api';
import { MenuItemLocation, SettingItemType } from 'api/types';
import { SummaryBuilder } from './builder';
import { Note, Settings, Todo, ItemChangeEvent, ItemChangeEventType } from './types';
import { update_summary } from './summary';
import { regexes, regexTitles, summaryTitles } from './settings_tables';
import { create_summary_note } from './summary_note';


async function getSettings(): Promise<Settings> {
	return {
		scan_period_s: await joplin.settings.value('scanPeriod'),
		scan_period_c: await joplin.settings.value('scanPeriodRequestCount'),
		todo_type: regexes[await joplin.settings.value('regexType')],
		summary_type: await joplin.settings.value('summaryType'),
	};
}

joplin.plugins.register({
	onStart: async function() {
		await joplin.settings.registerSection('settings.calebjohn.todo', {
			label: 'Inline TODO',
			iconName: 'fa fa-check'
		});
		await joplin.settings.registerSettings({
			'regexType': {
				value: 'list',
				type: SettingItemType.String,
				isEnum: true,
				options: regexTitles,
				section: 'settings.calebjohn.todo',
				public: true,
				label: 'Choose the inline TODO style (default is recommended)',
			},
			'summaryType': {
				value: 'plain',
				type: SettingItemType.String,
				isEnum: true,
				options: summaryTitles,
				section: 'settings.calebjohn.todo',
				public: true,
				label: 'Choose a Summary Note Format. Check the project page for examples',
			},
			'scanPeriod': {
				value: 1,
				type: SettingItemType.Int,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				minimum: 0,
				maximum: 99,
				step: 1,
				label: 'Scan Period',
			},
			'scanPeriodRequestCount': {
				value: 8,
				type: SettingItemType.Int,
				section: 'settings.calebjohn.todo',
				public: true,
				advanced: true,
				minimum: 1,
				maximum: 999999,
				step: 1,
				label: 'Scan Period Allowed Requests',
			},
		});

		await joplin.commands.register({
			name: "inlineTodo.createSummaryNote",
			label: "Create TODO Summary Note",
			execute: async () => {
				await create_summary_note();
			},
		});

		await joplin.views.menuItems.create(
			"createSummaryNoteMenuTools",
			"inlineTodo.createSummaryNote",
			MenuItemLocation.Tools
		);

		const builder = new SummaryBuilder(await getSettings());
		// Make sure everything is up to date on start
		// This is purposefully run in the background 
		builder.search_in_all();

		await joplin.settings.onChange(async (event) => {
			builder.settings = await getSettings();

			if (event.keys.includes('regexType')) {
				// This is purposefully run in the background 
				builder.search_in_all();
			} else if (event.keys.includes('summaryType')) {
				await update_summary(builder.summary, builder.settings);
			}
		});

		await joplin.workspace.onNoteSelectionChange(async () => {
			await builder.search_in_changed();
		});

		await joplin.workspace.onSyncComplete(async () => {
			await builder.search_in_changed();
		});
	},
});