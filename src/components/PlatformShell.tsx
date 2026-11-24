import React, { useState } from 'react'
import {
	Building2,
	CheckSquare,
	LayoutDashboard,
	LogOut,
	Menu,
	MessageSquare,
	Moon,
	Plus,
	Settings,
	Sun,
	X,
} from 'lucide-react'
import type { Translations } from '../i18n/translations'
import type {
	ApiMode,
	Locale,
	Organization,
	PlatformRoute,
	PlatformUser,
	ThemeMode,
} from '../types/api'

interface PlatformShellProps {
	activeRoute: PlatformRoute
	onNavigate: (route: PlatformRoute) => void
	onNewChat: () => void
	user: PlatformUser
	organizations: Organization[]
	activeOrganizationId: string
	onChangeOrganization: (orgId: string) => void
	apiMode: ApiMode
	locale: Locale
	onChangeLocale: (locale: Locale) => void
	theme: ThemeMode
	onToggleTheme: () => void
	onSignOut: () => void
	t: Translations
	children: React.ReactNode
}

export const PlatformShell: React.FC<PlatformShellProps> = ({
	activeRoute,
	onNavigate,
	onNewChat,
	user,
	organizations,
	activeOrganizationId,
	onChangeOrganization,
	apiMode,
	locale,
	onChangeLocale,
	theme,
	onToggleTheme,
	onSignOut,
	t,
	children,
}) => {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [avatarFailed, setAvatarFailed] = useState(false)

	const navItems: Array<{
		id: PlatformRoute
		label: string
		icon: React.ComponentType<{ className?: string }>
	}> = [
		{ id: 'overview', label: t.nav.overview, icon: LayoutDashboard },
		{ id: 'command-center', label: t.nav.commandCenter, icon: MessageSquare },
		{ id: 'tasks', label: t.nav.aiTasks, icon: CheckSquare },
		{ id: 'settings', label: t.nav.settings, icon: Settings },
	]

	const activeRouteLabel =
		navItems.find(item => item.id === activeRoute)?.label ?? t.nav.commandCenter

	const initials = user.fullName
		.split(' ')
		.slice(0, 2)
		.map(part => part[0]?.toUpperCase() ?? '')
		.join('')

	const handleNavClick = (route: PlatformRoute) => {
		onNavigate(route)
		setMobileMenuOpen(false)
	}

	const sidebarContent = (
		<div className='flex h-full flex-col justify-between bg-navy-900 text-white dark:bg-navy-950'>
			<div>
				<div className='flex h-14 items-center justify-between border-b border-navy-800 px-5'>
					<button
						type='button'
						onClick={() => handleNavClick('overview')}
						className='font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0'
					>
						ALJABR
						<span
							className='mt-0.5 block h-0.5 w-8 rounded-full bg-gold-400'
							aria-hidden='true'
						/>
					</button>
					<button
						type='button'
						onClick={() => setMobileMenuOpen(false)}
						aria-label='Close navigation'
						className='rounded-md p-1.5 text-slate-300 hover:bg-navy-800 hover:text-white lg:hidden'
					>
						<X className='h-5 w-5' />
					</button>
				</div>

				<div className='border-b border-navy-800 px-4 py-3.5'>
					<label
						htmlFor='org-switcher'
						className='mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gold-300'
					>
						<Building2 className='h-3.5 w-3.5' />
						<span>{t.header.organizationLabel}</span>
					</label>
					<select
						id='org-switcher'
						value={activeOrganizationId}
						onChange={e => onChangeOrganization(e.target.value)}
						className='w-full rounded-lg border border-navy-700 bg-navy-800 px-2.5 py-2 text-xs font-medium text-white transition-colors focus:border-gold-400 focus:outline-none'
					>
						{organizations.map(org => (
							<option key={org.id} value={org.id}>
								{org.name} ({org.code})
							</option>
						))}
					</select>
				</div>

				<nav aria-label='Platform navigation' className='space-y-1 p-3'>
					{navItems.map(item => {
						const Icon = item.icon
						const isActive = activeRoute === item.id
						return (
							<button
								key={item.id}
								type='button'
								onClick={() => handleNavClick(item.id)}
								className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-gold-400 ${
									isActive
										? 'bg-navy-800 text-gold-300 ring-1 ring-gold-500/40'
										: 'text-slate-300 hover:bg-navy-800/70 hover:text-white'
								}`}
							>
								<Icon className='h-4 w-4 shrink-0' />
								<span className='truncate'>{item.label}</span>
							</button>
						)
					})}
				</nav>
			</div>

			<div className='border-t border-navy-800 p-4'>
				<div className='mb-3 flex items-center gap-3'>
					{!avatarFailed && user.avatarUrl ? (
						<img
							src={user.avatarUrl}
							alt={user.fullName}
							referrerPolicy='no-referrer'
							onError={() => setAvatarFailed(true)}
							className='h-9 w-9 shrink-0 rounded-full border border-gold-500/50 object-cover'
						/>
					) : (
						<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-500/50 bg-navy-800 text-xs font-semibold text-gold-300'>
							{initials}
						</div>
					)}
					<div className='min-w-0 flex-1'>
						<p className='truncate text-sm font-semibold text-white'>
							{user.fullName}
						</p>
						<p className='truncate text-xs text-gold-300/90'>{user.role}</p>
					</div>
				</div>
				<button
					type='button'
					onClick={onSignOut}
					className='flex w-full items-center justify-center gap-2 rounded-lg border border-navy-700 bg-navy-800/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-gold-500/40 hover:bg-navy-800 hover:text-white focus-visible:outline-2 focus-visible:outline-gold-400'
				>
					<LogOut className='h-3.5 w-3.5' />
					<span>{t.header.signOut}</span>
				</button>
			</div>
		</div>
	)

	return (
		<div className='flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 dark:bg-navy-900 dark:text-slate-100'>
			{/* Desktop Sidebar */}
			<aside className='hidden w-64 shrink-0 border-r border-navy-800 lg:block'>
				{sidebarContent}
			</aside>

			{/* Mobile Drawer */}
			{mobileMenuOpen && (
				<div className='fixed inset-0 z-50 flex lg:hidden'>
					<div
						className='fixed inset-0 bg-navy-950/65'
						onClick={() => setMobileMenuOpen(false)}
						aria-hidden='true'
					/>
					<aside className='relative z-10 w-72 max-w-[85vw] border-r border-navy-800 shadow-xl'>
						{sidebarContent}
					</aside>
				</div>
			)}

			{/* Main Viewport */}
			<div className='flex min-w-0 flex-1 flex-col'>
				{/* Top Bar Contract: Breadcrumb — Controls — Primary Action */}
				<header className='flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 dark:border-navy-800 dark:bg-navy-950'>
					<div className='flex min-w-0 items-center gap-3'>
						<button
							type='button'
							onClick={() => setMobileMenuOpen(true)}
							aria-label='Open navigation'
							className='rounded-lg p-2 text-navy-800 hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-navy-800'
						>
							<Menu className='h-5 w-5' />
						</button>
						<div className='flex min-w-0 items-center gap-2 text-sm'>
							<span className='hidden font-medium text-slate-500 sm:inline whitespace-nowrap dark:text-slate-400'>
								{t.platformName}
							</span>
							<span
								className='hidden text-gold-500 sm:inline'
								aria-hidden='true'
							>
								/
							</span>
							<span className='truncate font-semibold text-navy-900 dark:text-white'>
								{activeRouteLabel}
							</span>
						</div>
					</div>

					<div className='flex shrink-0 items-center gap-2 sm:gap-3'>
						<span className='hidden text-xs text-slate-500 md:inline whitespace-nowrap dark:text-slate-400'>
							{apiMode === 'demo' ? t.header.demoBanner : t.header.liveBanner}
						</span>

						<div
							role='group'
							aria-label='Language switcher'
							className='flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-navy-800 dark:bg-navy-900'
						>
							{(['uz', 'en', 'ru'] as const).map(code => (
								<button
									key={code}
									type='button'
									onClick={() => onChangeLocale(code)}
									className={`rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors whitespace-nowrap shrink-0 ${
										locale === code
											? 'bg-white text-navy-900 shadow-xs ring-1 ring-gold-500/35 dark:bg-navy-800 dark:text-gold-300'
											: 'text-slate-600 hover:text-navy-900 dark:text-slate-400 dark:hover:text-white'
									}`}
								>
									{code}
								</button>
							))}
						</div>

						<button
							type='button'
							onClick={onToggleTheme}
							aria-label={
								theme === 'dark' ? t.header.lightMode : t.header.darkMode
							}
							title={theme === 'dark' ? t.header.lightMode : t.header.darkMode}
							className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-navy-800 transition-colors hover:border-gold-500/50 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-gold-500 dark:border-navy-800 dark:bg-navy-900 dark:text-gold-300 dark:hover:bg-navy-800'
						>
							{theme === 'dark' ? (
								<Sun className='h-4 w-4' />
							) : (
								<Moon className='h-4 w-4' />
							)}
						</button>

						<button
							type='button'
							onClick={onNewChat}
							className='inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-gold-500/40 bg-navy-900 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-gold-500 whitespace-nowrap dark:border-gold-400/50 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400'
						>
							<Plus className='h-4 w-4' />
							<span className='hidden sm:inline'>{t.header.newChat}</span>
						</button>
					</div>
				</header>

				<main className='min-h-0 flex-1 overflow-y-auto'>{children}</main>
			</div>
		</div>
	)
}
