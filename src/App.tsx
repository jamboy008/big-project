import { useCallback, useEffect, useMemo, useState } from 'react'
import { Lock, RefreshCw } from 'lucide-react'
import { AiTasksPage } from './components/AiTasksPage'
import { CommandCenterPage } from './components/CommandCenterPage'
import { OverviewPage } from './components/OverviewPage'
import { PlatformShell } from './components/PlatformShell'
import { SettingsPage } from './components/SettingsPage'
import {
	DEMO_ORGANIZATIONS,
	DEMO_USER,
	getSeedChatsForTenant,
	INITIAL_DEMO_TASKS,
} from './data/mockPlatformData'
import { TRANSLATIONS } from './i18n/translations'
import { apiClient } from './lib/apiClient'
import {
	clearAllSensitiveLocalData,
	loadTenantChats,
	purgeLegacyUnsafeStorage,
	saveTenantChats,
} from './lib/tenantStorage'
import type {
	AiTask,
	ChatMessage,
	ChatSession,
	Locale,
	PlatformRoute,
	PlatformSession,
	ThemeMode,
} from './types/api'

const THEME_STORAGE_KEY = 'aljabr_theme_v1'
const LOCALE_STORAGE_KEY = 'aljabr_locale_v1'

function readInitialTheme(): ThemeMode {
	try {
		const saved = localStorage.getItem(THEME_STORAGE_KEY)
		if (saved === 'dark' || saved === 'light') return saved
	} catch {
		// Ignore storage error
	}
	return 'light'
}

function readInitialLocale(): Locale {
	try {
		const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
		if (saved === 'uz' || saved === 'en' || saved === 'ru') return saved
	} catch {
		// Ignore storage error
	}
	return 'uz'
}

export default function App() {
	const [theme, setTheme] = useState<ThemeMode>(readInitialTheme)
	const [locale, setLocale] = useState<Locale>(readInitialLocale)
	const [activeRoute, setActiveRoute] =
		useState<PlatformRoute>('command-center')

	// Session comes exclusively from Frontend 1 / BFF. ?embed parameter is NEVER trusted to bypass auth.
	const [session, setSession] = useState<PlatformSession>({
		authenticated: true,
		user: DEMO_USER,
		organizations: DEMO_ORGANIZATIONS,
		activeOrganizationId: DEMO_ORGANIZATIONS[0].id,
		apiMode: 'demo',
		authProvider: 'frontend-1-sso',
	})

	const [activeOrgId, setActiveOrgId] = useState<string>(
		DEMO_ORGANIZATIONS[0].id,
	)
	const [chats, setChats] = useState<ChatSession[]>(() => {
		purgeLegacyUnsafeStorage()
		return (
			loadTenantChats(DEMO_ORGANIZATIONS[0].id, DEMO_USER.id) ??
			getSeedChatsForTenant(DEMO_ORGANIZATIONS[0].id, DEMO_USER.id)
		)
	})
	const [activeChatId, setActiveChatId] = useState<string | null>(() => {
		const initial =
			loadTenantChats(DEMO_ORGANIZATIONS[0].id, DEMO_USER.id) ??
			getSeedChatsForTenant(DEMO_ORGANIZATIONS[0].id, DEMO_USER.id)
		return initial[0]?.id ?? null
	})

	const [tasks, setTasks] = useState<AiTask[]>(
		INITIAL_DEMO_TASKS.filter(
			task => task.organizationId === DEMO_ORGANIZATIONS[0].id,
		),
	)
	const [tasksLoading, setTasksLoading] = useState(false)
	const [tasksError, setTasksError] = useState<string | null>(null)

	const t = TRANSLATIONS[locale]

	// Sync Tailwind dark class on <html>
	useEffect(() => {
		const root = document.documentElement
		if (theme === 'dark') {
			root.classList.add('dark')
		} else {
			root.classList.remove('dark')
		}
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme)
		} catch {
			// Ignore storage error
		}
	}, [theme])

	useEffect(() => {
		document.documentElement.lang = locale
		try {
			localStorage.setItem(LOCALE_STORAGE_KEY, locale)
		} catch {
			// Ignore storage error
		}
	}, [locale])

	const loadTenantState = useCallback((orgId: string, userId: string) => {
		const saved = loadTenantChats(orgId, userId)
		const tenantChats =
			saved && saved.length > 0 ? saved : getSeedChatsForTenant(orgId, userId)
		setChats(tenantChats)
		setActiveChatId(tenantChats[0]?.id ?? null)
	}, [])

	// Verify session with BFF on mount (never bypassing via ?embed query param)
	useEffect(() => {
		let cancelled = false
		const bootstrap = async () => {
			try {
				const serverSession = await apiClient.getSession()
				if (!cancelled) {
					setSession(serverSession)
					if (
						serverSession.authenticated &&
						serverSession.user &&
						serverSession.activeOrganizationId
					) {
						setActiveOrgId(serverSession.activeOrganizationId)
						loadTenantState(
							serverSession.activeOrganizationId,
							serverSession.user.id,
						)
					}
				}
			} catch {
				// Retain clean demo fallback if running in isolated unit harness
			}
		}
		void bootstrap()
		return () => {
			cancelled = true
		}
	}, [loadTenantState])

	const loadTasksForOrg = useCallback(
		async (orgId: string) => {
			if (!session.authenticated || !session.user) return
			setTasksLoading(true)
			setTasksError(null)
			try {
				const res = await apiClient.listTasks(orgId, {
					organizationId: orgId,
					userId: session.user.id,
				})
				setTasks(res.tasks)
			} catch (err) {
				setTasksError(
					err instanceof Error ? err.message : 'Failed to load AI tasks.',
				)
			} finally {
				setTasksLoading(false)
			}
		},
		[session.authenticated, session.user],
	)

	// Fetch tasks for active organization from BFF
	useEffect(() => {
		if (!session.authenticated || !session.user) return
		let cancelled = false
		const userId = session.user.id
		apiClient
			.listTasks(activeOrgId, {
				organizationId: activeOrgId,
				userId,
			})
			.then(res => {
				if (!cancelled) {
					setTasks(res.tasks)
					setTasksError(null)
				}
			})
			.catch(err => {
				if (!cancelled) {
					setTasksError(
						err instanceof Error ? err.message : 'Failed to load AI tasks.',
					)
				}
			})
		return () => {
			cancelled = true
		}
	}, [activeOrgId, session.authenticated, session.user])

	const handleChangeOrganization = useCallback(
		(orgId: string) => {
			setActiveOrgId(orgId)
			if (session.user) {
				loadTenantState(orgId, session.user.id)
			}
		},
		[loadTenantState, session.user],
	)

	const persistChats = useCallback(
		(nextChats: ChatSession[]) => {
			if (!session.user) return
			saveTenantChats(activeOrgId, session.user.id, nextChats)
		},
		[activeOrgId, session.user],
	)

	const handleCreateChat = useCallback((): string => {
		const userId = session.user?.id ?? DEMO_USER.id
		const now = new Date().toISOString()
		const newId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
		const newChat: ChatSession = {
			id: newId,
			organizationId: activeOrgId,
			userId,
			title: t.chat.newChat,
			createdAt: now,
			updatedAt: now,
			messages: [],
		}
		setChats(prev => {
			const next = [newChat, ...prev]
			persistChats(next)
			return next
		})
		setActiveChatId(newId)
		setActiveRoute('command-center')
		return newId
	}, [activeOrgId, persistChats, session.user, t.chat.newChat])

	const handleRenameChat = useCallback(
		(chatId: string, title: string) => {
			setChats(prev => {
				const next = prev.map(c =>
					c.id === chatId
						? { ...c, title, updatedAt: new Date().toISOString() }
						: c,
				)
				persistChats(next)
				return next
			})
		},
		[persistChats],
	)

	const handleDeleteChat = useCallback(
		(chatId: string) => {
			setChats(prev => {
				const next = prev.filter(c => c.id !== chatId)
				persistChats(next)
				if (activeChatId === chatId) {
					setActiveChatId(next[0]?.id ?? null)
				}
				return next
			})
		},
		[activeChatId, persistChats],
	)

	const handleUpdateChatMessages = useCallback(
		(
			chatId: string,
			updater: (prev: ChatMessage[]) => ChatMessage[],
			autoTitle?: string,
		) => {
			setChats(prev => {
				const next = prev.map(chat => {
					if (chat.id !== chatId) return chat
					return {
						...chat,
						title: autoTitle ?? chat.title,
						updatedAt: new Date().toISOString(),
						messages: updater(chat.messages),
					}
				})
				persistChats(next)
				return next
			})
		},
		[persistChats],
	)

	const handleTaskDecision = useCallback(
		async (taskId: string, decision: 'approve' | 'reject', note?: string) => {
			if (!session.user) return
			const res = await apiClient.submitTaskDecision(
				taskId,
				{ decision, note },
				{ organizationId: activeOrgId, userId: session.user.id },
			)
			setTasks(prev => prev.map(task => (task.id === taskId ? res.task : task)))
		},
		[activeOrgId, session.user],
	)

	const handleSignOut = async () => {
		clearAllSensitiveLocalData()
		setChats([])
		setActiveChatId(null)
		setTasks([])
		try {
			await apiClient.signOut()
		} catch {
			// Ignore network errors on signout
		}
		setSession(prev => ({
			...prev,
			authenticated: false,
			user: null,
		}))
	}

	const handleRestoreSession = async () => {
		try {
			const restored = await apiClient.restoreSession()
			const targetOrg =
				restored.activeOrganizationId || DEMO_ORGANIZATIONS[0].id
			setSession(restored)
			setActiveOrgId(targetOrg)
			if (restored.user) {
				loadTenantState(targetOrg, restored.user.id)
			}
		} catch {
			setSession({
				authenticated: true,
				user: DEMO_USER,
				organizations: DEMO_ORGANIZATIONS,
				activeOrganizationId: DEMO_ORGANIZATIONS[0].id,
				apiMode: 'demo',
				authProvider: 'frontend-1-sso',
			})
			setActiveOrgId(DEMO_ORGANIZATIONS[0].id)
			loadTenantState(DEMO_ORGANIZATIONS[0].id, DEMO_USER.id)
		}
	}

	const activeOrganization = useMemo(
		() =>
			session.organizations.find(o => o.id === activeOrgId) ??
			DEMO_ORGANIZATIONS[0],
		[session.organizations, activeOrgId],
	)

	if (!session.authenticated || !session.user) {
		return (
			<div className='flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-navy-900 dark:text-slate-100'>
				<div className='w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-xs dark:border-navy-800 dark:bg-navy-950'>
					<div className='mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-navy-50 text-navy-900 ring-1 ring-gold-500/30 dark:bg-navy-900 dark:text-gold-400'>
						<Lock className='h-5 w-5' />
					</div>
					<h1 className='font-display text-lg font-bold text-navy-900 dark:text-white'>
						{t.platformName}
					</h1>
					<p className='text-sm text-slate-600 dark:text-slate-400'>
						{t.header.signedOutNotice}
					</p>
					<button
						type='button'
						onClick={() => void handleRestoreSession()}
						className='inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gold-500/40 bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 dark:border-gold-400/50 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400'
					>
						<RefreshCw className='h-4 w-4' />
						<span>{t.header.restoreSession}</span>
					</button>
				</div>
			</div>
		)
	}

	return (
		<PlatformShell
			activeRoute={activeRoute}
			onNavigate={setActiveRoute}
			onNewChat={() => {
				handleCreateChat()
			}}
			user={session.user}
			organizations={
				session.organizations.length > 0
					? session.organizations
					: DEMO_ORGANIZATIONS
			}
			activeOrganizationId={activeOrgId}
			onChangeOrganization={handleChangeOrganization}
			apiMode={session.apiMode}
			locale={locale}
			onChangeLocale={setLocale}
			theme={theme}
			onToggleTheme={() =>
				setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
			}
			onSignOut={() => void handleSignOut()}
			t={t}
		>
			{activeRoute === 'overview' && (
				<OverviewPage
					organization={activeOrganization}
					chats={chats}
					tasks={tasks}
					onNavigate={setActiveRoute}
					t={t}
				/>
			)}

			{activeRoute === 'command-center' && (
				<CommandCenterPage
					chats={chats}
					activeChatId={activeChatId}
					organizationId={activeOrgId}
					userId={session.user.id}
					locale={locale}
					apiMode={session.apiMode}
					t={t}
					onSelectChat={setActiveChatId}
					onCreateChat={handleCreateChat}
					onRenameChat={handleRenameChat}
					onDeleteChat={handleDeleteChat}
					onUpdateChatMessages={handleUpdateChatMessages}
				/>
			)}

			{activeRoute === 'tasks' && (
				<AiTasksPage
					tasks={tasks}
					isLoading={tasksLoading}
					loadError={tasksError}
					onRetryLoad={() => void loadTasksForOrg(activeOrgId)}
					onTaskDecision={handleTaskDecision}
					t={t}
				/>
			)}

			{activeRoute === 'settings' && (
				<SettingsPage
					apiMode={session.apiMode}
					locale={locale}
					onChangeLocale={setLocale}
					theme={theme}
					onSetTheme={setTheme}
					onClearLocalCache={() => {
						clearAllSensitiveLocalData()
						const fresh = getSeedChatsForTenant(activeOrgId, session.user!.id)
						setChats(fresh)
						setActiveChatId(fresh[0]?.id ?? null)
					}}
					t={t}
				/>
			)}
		</PlatformShell>
	)
}
