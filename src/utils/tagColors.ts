import tagColorsData from '../data/tagColors.json';

// Define the type for our tagColors object
type TagColors = {
	[key: string]: string;
};

// Cast the imported data to our TagColors type
const tagColors: TagColors = tagColorsData as TagColors;

export function getTagBackgroundColor(tag: string): string {
	const color = tagColors[tag] || tagColors[unslugify(tag)] || 'default';
	switch (color) {
		case 'blue':
			return 'bg-blue-100 dark:bg-blue-900';
		case 'green':
			return 'bg-green-100 dark:bg-green-900';
		case 'red':
			return 'bg-red-100 dark:bg-red-900';
		case 'yellow':
			return 'bg-yellow-100 dark:bg-yellow-900';
		case 'orange':
			return 'bg-orange-100 dark:bg-orange-900';
		case 'purple':
			return 'bg-purple-100 dark:bg-purple-900';
		case 'pink':
			return 'bg-pink-100 dark:bg-pink-900';
		case 'gray':
			return 'bg-gray-100 dark:bg-gray-900';
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
