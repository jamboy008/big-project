import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { sanitizeHref } from '../lib/sanitizeUrl'

interface SafeMarkdownProps {
	content: string
}

type BlockNode =
	| { type: 'heading'; level: 1 | 2 | 3; text: string }
	| { type: 'paragraph'; text: string }
	| { type: 'blockquote'; text: string }
	| { type: 'ul'; items: string[] }
	| { type: 'ol'; items: string[] }
	| { type: 'code'; language: string; code: string }
	| { type: 'table'; headers: string[]; rows: string[][] }

function parseBlocks(markdown: string): BlockNode[] {
	const lines = markdown.replace(/\r\n/g, '\n').split('\n')
	const blocks: BlockNode[] = []
	let i = 0

	while (i < lines.length) {
		const line = lines[i]
		const trimmed = line.trim()

		if (!trimmed) {
			i += 1
			continue
		}

		// Fenced code block
		if (trimmed.startsWith('```')) {
			const language = trimmed.slice(3).trim() || 'text'
			const codeLines: string[] = []
			i += 1
			while (i < lines.length && !lines[i].trim().startsWith('```')) {
				codeLines.push(lines[i])
				i += 1
			}
			if (i < lines.length && lines[i].trim().startsWith('```')) {
				i += 1
			}
			blocks.push({ type: 'code', language, code: codeLines.join('\n') })
			continue
		}

		// Headings
		const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed)
		if (headingMatch) {
			const level = headingMatch[1].length as 1 | 2 | 3
			blocks.push({ type: 'heading', level, text: headingMatch[2] })
			i += 1
			continue
		}

		// Table detection (header row + separator row |---|)
		if (
			trimmed.includes('|') &&
			i + 1 < lines.length &&
			/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(lines[i + 1])
		) {
			const splitRow = (rowLine: string): string[] =>
				rowLine
					.trim()
					.replace(/^\|/, '')
					.replace(/\|$/, '')
					.split('|')
					.map(cell => cell.trim())

			const headers = splitRow(line)
			i += 2
			const rows: string[][] = []
			while (i < lines.length && lines[i].trim().includes('|')) {
				rows.push(splitRow(lines[i]))
				i += 1
			}
			blocks.push({ type: 'table', headers, rows })
			continue
		}

		// Blockquote
		if (trimmed.startsWith('>')) {
			const quoteLines: string[] = []
			while (i < lines.length && lines[i].trim().startsWith('>')) {
				quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
				i += 1
			}
			blocks.push({ type: 'blockquote', text: quoteLines.join(' ') })
			continue
		}

		// Unordered list
		if (/^[-*+]\s+/.test(trimmed)) {
			const items: string[] = []
			while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
				items.push(lines[i].trim().replace(/^[-*+]\s+/, ''))
				i += 1
			}
			blocks.push({ type: 'ul', items })
			continue
		}

		// Ordered list
		if (/^\d+\.\s+/.test(trimmed)) {
			const items: string[] = []
			while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
				items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
				i += 1
			}
			blocks.push({ type: 'ol', items })
			continue
		}

		// Paragraph
		const paraLines: string[] = []
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!lines[i].trim().startsWith('```') &&
			!/^(#{1,3})\s+/.test(lines[i].trim()) &&
			!/^\s*[-*+]\s+/.test(lines[i]) &&
			!/^\s*\d+\.\s+/.test(lines[i]) &&
			!lines[i].trim().startsWith('>')
		) {
			paraLines.push(lines[i].trim())
			i += 1
		}
		blocks.push({ type: 'paragraph', text: paraLines.join(' ') })
	}

	return blocks
}

function renderInlineNodes(text: string, keyPrefix: string): React.ReactNode[] {
	// Tokenize inline markdown: [label](url), `code`, **bold**, *italic*
	const pattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
	const parts = text.split(pattern)

	return parts.map((part, idx) => {
		const key = `${keyPrefix}-${idx}`
		if (!part) return null

		if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
			return (
				<code
					key={key}
					className='rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800 dark:bg-slate-800 dark:text-slate-200'
				>
					{part.slice(1, -1)}
				</code>
			)
		}

		if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
			return (
				<strong
					key={key}
					className='font-semibold text-slate-900 dark:text-slate-100'
				>
					{part.slice(2, -2)}
				</strong>
			)
		}

		if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
			return (
				<em key={key} className='italic'>
					{part.slice(1, -1)}
				</em>
			)
		}

		const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
		if (linkMatch) {
			const label = linkMatch[1]
			const safeUrl = sanitizeHref(linkMatch[2])
			if (!safeUrl) {
				return <span key={key}>{label}</span>
			}
			return (
				<a
					key={key}
					href={safeUrl}
					target='_blank'
					rel='noopener noreferrer'
					className='font-medium text-navy-700 underline decoration-gold-500/70 underline-offset-2 hover:text-navy-900 dark:text-gold-300 dark:decoration-gold-400/50'
				>
					{label}
				</a>
			)
		}

		return <React.Fragment key={key}>{part}</React.Fragment>
	})
}

function CodeBlock({ language, code }: { language: string; code: string }) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(code)
			setCopied(true)
			setTimeout(() => setCopied(false), 1800)
		} catch {
			// Clipboard fallback ignored
		}
	}

	return (
		<div className='my-3 overflow-hidden rounded-lg border border-navy-800 bg-navy-950 text-slate-100'>
			<div className='flex items-center justify-between border-b border-navy-800 bg-navy-900 px-3 py-1.5 text-xs text-gold-300'>
				<span className='font-mono'>{language}</span>
				<button
					type='button'
					onClick={handleCopy}
					className='inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium text-slate-200 transition-colors hover:bg-navy-800 hover:text-white focus-visible:outline-2 focus-visible:outline-gold-400'
				>
					{copied ? (
						<Check className='h-3.5 w-3.5 text-emerald-400' />
					) : (
						<Copy className='h-3.5 w-3.5' />
					)}
					<span>{copied ? 'Copied' : 'Copy'}</span>
				</button>
			</div>
			<pre className='overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-slate-100'>
				<code>{code}</code>
			</pre>
		</div>
	)
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ content }) => {
	const blocks = parseBlocks(content)

	return (
		<div className='space-y-2.5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200'>
			{blocks.map((block, index) => {
				const key = `md-${index}`
				switch (block.type) {
					case 'heading': {
						if (block.level === 1) {
							return (
								<h2
									key={key}
									className='pt-1 text-lg font-semibold text-slate-900 dark:text-white'
								>
									{renderInlineNodes(block.text, key)}
								</h2>
							)
						}
						if (block.level === 2) {
							return (
								<h3
									key={key}
									className='pt-1 text-base font-semibold text-slate-900 dark:text-white'
								>
									{renderInlineNodes(block.text, key)}
								</h3>
							)
						}
						return (
							<h4
								key={key}
								className='pt-1 text-sm font-semibold text-slate-900 dark:text-white'
							>
								{renderInlineNodes(block.text, key)}
							</h4>
						)
					}

					case 'paragraph':
						return (
							<p key={key} className='break-words'>
								{renderInlineNodes(block.text, key)}
							</p>
						)

					case 'blockquote':
						return (
							<blockquote
								key={key}
								className='rounded-lg border border-gold-500/35 bg-gold-50/35 px-3.5 py-2.5 text-sm text-slate-700 dark:border-gold-500/35 dark:bg-navy-900/70 dark:text-slate-300'
							>
								{renderInlineNodes(block.text, key)}
							</blockquote>
						)

					case 'ul':
						return (
							<ul key={key} className='list-disc space-y-1 pl-5'>
								{block.items.map((item, idx) => (
									<li key={`${key}-li-${idx}`}>
										{renderInlineNodes(item, `${key}-li-${idx}`)}
									</li>
								))}
							</ul>
						)

					case 'ol':
						return (
							<ol key={key} className='list-decimal space-y-1 pl-5'>
								{block.items.map((item, idx) => (
									<li key={`${key}-li-${idx}`}>
										{renderInlineNodes(item, `${key}-li-${idx}`)}
									</li>
								))}
							</ol>
						)

					case 'code':
						return (
							<CodeBlock
								key={key}
								language={block.language}
								code={block.code}
							/>
						)

					case 'table':
						return (
							<div
								key={key}
								className='my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-navy-800'
							>
								<table className='w-full border-collapse text-left text-sm'>
									<thead>
										<tr className='border-b border-slate-200 bg-slate-50 dark:border-navy-800 dark:bg-navy-900/80'>
											{block.headers.map((header, hIdx) => (
												<th
													key={`${key}-h-${hIdx}`}
													className='px-3.5 py-2 text-xs font-semibold text-navy-900 dark:text-gold-300'
												>
													{renderInlineNodes(header, `${key}-h-${hIdx}`)}
												</th>
											))}
										</tr>
									</thead>
									<tbody className='divide-y divide-slate-200 dark:divide-navy-800'>
										{block.rows.map((row, rIdx) => (
											<tr
												key={`${key}-r-${rIdx}`}
												className='bg-white transition-colors hover:bg-slate-50/70 dark:bg-navy-950 dark:hover:bg-navy-900/50'
											>
												{block.headers.map((_h, cIdx) => (
													<td
														key={`${key}-r-${rIdx}-c-${cIdx}`}
														className='px-3.5 py-2 text-slate-700 tabular-nums dark:text-slate-300'
													>
														{renderInlineNodes(
															row[cIdx] ?? '',
															`${key}-r-${rIdx}-c-${cIdx}`,
														)}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)
				}
			})}
		</div>
	)
}
