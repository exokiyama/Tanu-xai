import { writeFile } from 'node:fs/promises';
import { allCommands } from '../dist/Tanu/handlers/commands.js';
import { renderMenu } from '../dist/Tanu/handlers/menu-engine.js';
import '../dist/Tanu/plugins.js';
const commands = allCommands(); const patterns = commands.map(command => command.name); const duplicates = patterns.filter((name, index) => patterns.indexOf(name) !== index); const invalid = commands.filter(command => !command.name || !command.description || !command.category || typeof command.handler !== 'function'); const menu = renderMenu(); const report = `# V2.3 Command Audit\n\n- Registered commands: ${commands.length}\n- Duplicate command names: ${new Set(duplicates).size ? [...new Set(duplicates)].join(', ') : 'none'}\n- Invalid metadata/handlers: ${invalid.length}\n- Forbidden public menu terms: ${/dailyreport|haxtan|botversion|\\.script|\\.support/.test(menu) ? 'found' : 'none'}\n- Catalog and runtime imports: valid\n`;
if (duplicates.length || invalid.length || /dailyreport|haxtan|botversion|\.script|\.support/.test(menu)) throw new Error(report); await writeFile('AUDIT_COMMANDS_V23.md', report); console.log(report.trim());
