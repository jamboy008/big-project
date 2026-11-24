import React, { useState } from 'react'
import { Check, Lock, ShieldCheck, Trash2 } from 'lucide-react'
import type { Translations } from '../i18n/translations'
import type { ApiMode, Locale, ThemeMode } from '../types/api'

interface SettingsPageProps {
	apiMode: ApiMode
	locale: Locale
	onChangeLocale: (locale: Locale) => void
	theme: ThemeMode
	onSetTheme: (theme: ThemeMode) => void
	onClearLocalCache: () => void
	t: Translations
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
	apiMode,
	locale,
	onChangeLocale,
	theme,
	onSetTheme,
	onClearLocalCache,
	t,
}) => {
	const [cleared, setCleared] = useState(false)

	const handleClear = () => {
		onClearLocalCache()
		setCleared(true)
		setTimeout(() => setCleared(false), 2400)
	}

	return (
		<div className='mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8'>
			<div className='space-y-1'>
				<h1 className='font-display text-2xl font-bold tracking-tight text-navy-900 dark:text-white'>
					{t.settings.title}
				</h1>
				<p className='text-sm text-slate-600 dark:text-slate-300'>
					{t.settings.subtitle}
				</p>
			</div>

			{/* Read-only BFF Architecture Settings (no user-editable API URL!) */}
			<section className='space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-navy-800 dark:bg-navy-950'>
				<div className='flex items-center gap-2'>
					<Lock className='h-4 w-4 text-gold-600 dark:text-gold-400' />
					<h2 className='text-base font-semibold text-navy-900 dark:text-white'>
						{t.settings.architectureSection}
					</h2>
				</div>

				<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
					<div className='rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-navy-800 dark:bg-navy-900'>
						<p className='text-xs text-slate-500 dark:text-slate-400'>
							{t.settings.bffEndpointLabel}
						</p>
						<p className='mt-1 font-mono text-sm font-semibold text-navy-900 dark:text-white'>
							/api/v1
						</p>
					</div>
					<div className='rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-navy-800 dark:bg-navy-900'>
						<p className='text-xs text-slate-500 dark:text-slate-400'>
							{t.settings.apiModeLabel}
						</p>
						<p className='mt-1 font-mono text-sm font-semibold uppercase text-navy-900 dark:text-gold-300'>
							{apiMode}
						</p>
					</div>
					<div className='rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-navy-800 dark:bg-navy-900'>
						<p className='text-xs text-slate-500 dark:text-slate-400'>
							{t.settings.authProviderLabel}
						</p>
						<p className='mt-1 font-mono text-sm font-semibold text-navy-900 dark:text-white'>
							Frontend 1 SSO
						</p>
					</div>
				</div>

				<div className='space-y-2 border-t border-slate-200 pt-4 dark:border-navy-800'>
					<p className='flex items-center gap-1.5 text-xs font-semibold text-navy-900 dark:text-white'>
						<ShieldCheck className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
						<span>{t.settings.securityPolicyTitle}</span>
					</p>
					<ul className='space-y-1.5 text-xs text-slate-600 dark:text-slate-300'>
						{t.settings.securityPolicyItems.map((item, idx) => (
							<li key={idx} className='flex items-start gap-2'>
								<span aria-hidden='true'>·</span>
								<span>{item}</span>
							</li>
						))}
					</ul>
				</div>
			</section>

			{/* Preferences */}
			<section className='space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-navy-800 dark:bg-navy-950'>
				<h2 className='text-base font-semibold text-navy-900 dark:text-white'>
					{t.settings.preferencesSection}
				</h2>

				<div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
					<div>
						<p className='mb-2 text-xs font-medium text-slate-600 dark:text-slate-400'>
							{t.settings.languageLabel}
						</p>
						<div className='inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-navy-800 dark:bg-navy-900'>
							{(
								[
									{ code: 'uz', label: 'O‘zbekcha' },
									{ code: 'en', label: 'English' },
									{ code: 'ru', label: 'Русский' },
								] as const
							).map(lang => (
								<button
									key={lang.code}
									type='button'
									onClick={() => onChangeLocale(lang.code)}
									className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
										locale === lang.code
											? 'bg-white text-navy-900 shadow-xs ring-1 ring-gold-500/35 dark:bg-navy-800 dark:text-gold-300'
											: 'text-slate-600 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white'
									}`}
								>
									{lang.label}
								</button>
							))}
						</div>
					</div>

					<div>
						<p className='mb-2 text-xs font-medium text-slate-600 dark:text-slate-400'>
							{t.settings.themeLabel}
						</p>
						<div className='inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-navy-800 dark:bg-navy-900'>
							<button
								type='button'
								onClick={() => onSetTheme('light')}
								className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
									theme === 'light'
										? 'bg-white text-navy-900 shadow-xs ring-1 ring-gold-500/35 dark:bg-navy-800 dark:text-gold-300'
										: 'text-slate-600 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white'
								}`}
							>
								{t.header.lightMode}
							</button>
							<button
								type='button'
								onClick={() => onSetTheme('dark')}
								className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
									theme === 'dark'
										? 'bg-white text-navy-900 shadow-xs ring-1 ring-gold-500/35 dark:bg-navy-800 dark:text-gold-300'
										: 'text-slate-600 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white'
								}`}
							>
								{t.header.darkMode}
							</button>
						</div>
					</div>
				</div>

				<div className='flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-navy-800'>
					<button
						type='button'
						onClick={handleClear}
						className='inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-navy-900 transition-colors hover:border-gold-500/50 hover:bg-slate-50 dark:border-navy-800 dark:bg-navy-900 dark:text-slate-100 dark:hover:bg-navy-800'
					>
						<Trash2 className='h-3.5 w-3.5' />
						<span>{t.settings.clearLocalCache}</span>
					</button>
					{cleared && (
						<span className='inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400'>
							<Check className='h-3.5 w-3.5' />
							<span>{t.settings.cacheCleared}</span>
						</span>
					)}
				</div>
			</section>
		</div>
	)
}
