import fs from 'fs';
import path from 'path';

// Define the type for our tagColors object
type TagColors = {
	[key: string]: string;
};

// Default tag colors
const defaultTagColors: TagColors = {
	Networking: 'orange',
	Productivity: 'red',
	Security: 'gray',
	'Open Source': 'yellow',
	Privacy: 'green',
	Tools: 'red',
	'Content Management': 'gray',
	APIs: 'blue',
	Automation: 'yellow',
	Whisper: 'default',
	AI: 'purple',
	DevOps: 'blue',
};

const tagColorsPath = path.join(process.cwd(), 'src', 'data', 'tagColors.json');

let tagColors: TagColors;

if (!fs.existsSync(tagColorsPath)) {
	// If the file doesn't exist, create it with default content
	fs.writeFileSync(tagColorsPath, JSON.stringify(defaultTagColors, null, 2));
	console.log('Created default tagColors.json file.');
	tagColors = defaultTagColors;
} else {
	// If the file exists, read its content
	const fileContent = fs.readFileSync(tagColorsPath, 'utf-8');
	tagColors = JSON.parse(fileContent) as TagColors;
}

export function getTagBackgroundColor(tag: string): string {
	const color = tagColors[tag] || tagColors[unslugify(tag)] || 'default';
	switch (color) {
		case 'blue':
			return 'bg-blue-100 dark:bg-blue-800';
		case 'green':
			return 'bg-green-100 dark:bg-green-800';
		case 'red':
			return 'bg-red-100 dark:bg-red-800';
		case 'yellow':
			return 'bg-yellow-100 dark:bg-yellow-800';
		case 'orange':
			return 'bg-orange-100 dark:bg-orange-800';
		case 'purple':
			return 'bg-purple-100 dark:bg-purple-800';
		case 'pink':
			return 'bg-pink-100 dark:bg-pink-800';
		case 'gray':
			return 'bg-gray-100 dark:bg-gray-800';
		default:
			return 'bg-zinc-100 dark:bg-zinc-800';
	}
}

function unslugify(slug: string): string {
	return slug
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
