import joplin from 'api';
import { Settings, Todo, Summary } from './types';
import { summaries } from './settings_tables';
import { get_summary_note_id } from './summary_note';

export async function update_summary(summary_map: Summary, settings: Settings) {
	let bodyFunc = summaries[settings.summary_type].func;

	const summaryBody = await bodyFunc(summary_map, settings);
	await setSummaryBody(summaryBody);
}

async function setSummaryBody(summaryBody: string) {
	const summary_id = await get_summary_note_id();

	if (!summary_id) {
		console.warn("Summary note has not been created yet");
		return;
	}

	// Get the current summary note so that we can preserve aspects of it
	const summaryNote = await joplin.data.get(['notes', summary_id], { fields: ['body'] });
	// Preserve the content after the hr
	let spl = summaryNote.body.split(/<!-- inline-todo-plugin -->/gm);
	spl[0] = summaryBody;
	const body = spl.join("\n<!-- inline-todo-plugin -->");
	await joplin.data.put(['notes', summary_id], null, { body: body });

	// https://github.com/laurent22/joplin/issues/5955
	const currentNote = await joplin.workspace.selectedNote();
	if (currentNote.id == summary_id) {
		joplin.commands.execute('editor.setText', body);
	}
}