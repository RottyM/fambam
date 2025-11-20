import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return React.createElement(
		'html',
		null,
		React.createElement(
			'head',
			null,
			React.createElement('meta', {
				name: 'apple-mobile-web-app-title',
				content: 'FamBam',
			})
		),
		React.createElement('body', null, children)
	);
}