import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	AlertCircle,
	ArrowUpDown,
	Check,
	Copy,
	FileText,
	History,
	Paperclip,
	Pencil,
	Plus,
	RotateCcw,
	Search,
	Send,
	Square,
	Trash2,
	Upload,
	X,
} from 'lucide-react'
import type { Translations } from '../i18n/translations'
import { apiClient, ApiClientError } from '../lib/apiClient'
import {
	formatFileSize,
	MAX_ATTACHMENTS_PER_MESSAGE,
	validateAttachmentFile,
} from '../lib/fileValidation'
import type {
	ApiMode,
	ChatAttachment,
	ChatMessage,
	ChatSession,
	ChatSortOrder,
	Locale,
} from '../types/api'
import { SafeMarkdown } from './SafeMarkdown'

interface CommandCenterPageProps {
	chats: ChatSession[]
	activeChatId: string | null
	organizationId: string
	userId: string
	locale: Locale
	apiMode: ApiMode
	t: Translations
	onSelectChat: (chatId: string) => void
	onCreateChat: () => string
	onRenameChat: (chatId: string, title: string) => void
	onDeleteChat: (chatId: string) => void
	onUpdateChatMessages: (
		chatId: string,
		updater: (prev: ChatMessage[]) => ChatMessage[],
		autoTitle?: string,
	) => void
}

function createMessageId(prefix: string): string {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return `${prefix}_${crypto.randomUUID()}`
	}
	return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export const CommandCenterPage: React.FC<CommandCenterPageProps> = ({
	chats,
	activeChatId,
	organizationId,
	userId,
	locale,
	apiMode,
	t,
	onSelectChat,
	onCreateChat,
	onRenameChat,
	onDeleteChat,
	onUpdateChatMessages,
}) => {
	const [searchQuery, setSearchQuery] = useState('')
	const [sortOrder, setSortOrder] = useState<ChatSortOrder>('newest')
	const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false)

	const [editingChatId, setEditingChatId] = useState<string | null>(null)
	const [editingTitle, setEditingTitle] = useState('')
	const [deletingChatId, setDeletingChatId] = useState<string | null>(null)

	const [draft, setDraft] = useState('')
	const [isStreaming, setIsStreaming] = useState(false)
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

	const [attachments, setAttachments] = useState<ChatAttachment[]>([])
	const [uploadError, setUploadError] = useState<string | null>(null)
	const [isDraggingOver, setIsDraggingOver] = useState(false)

	const streamAbortRef = useRef<AbortController | null>(null)
	const uploadAbortMapRef = useRef<Map<string, AbortController>>(new Map())
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const textareaRef = useRef<HTMLTextAreaElement | null>(null)
	const messagesEndRef = useRef<HTMLDivElement | null>(null)

	const activeChat = useMemo(
		() => chats.find(c => c.id === activeChatId) ?? null,
		[chats, activeChatId],
	)

	const filteredChats = useMemo(() => {
		const q = searchQuery.trim().toLowerCase()
		const matched = chats.filter(chat => {
			if (!q) return true
			if (chat.title.toLowerCase().includes(q)) return true
			return chat.messages.some(m => m.content.toLowerCase().includes(q))
		})

		return [...matched].sort((a, b) => {
			const timeA = new Date(a.updatedAt).getTime()
			const timeB = new Date(b.updatedAt).getTime()
			return sortOrder === 'newest' ? timeB - timeA : timeA - timeB
		})
	}, [chats, searchQuery, sortOrder])

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
	}, [activeChat?.messages.length, isStreaming])

	// Cancel active stream & pending uploads if org changes or component unmounts
	useEffect(() => {
		const uploadMap = uploadAbortMapRef.current
		return () => {
			streamAbortRef.current?.abort()
			for (const ctrl of uploadMap.values()) {
				ctrl.abort()
			}
			uploadMap.clear()
		}
	}, [organizationId])

	const adjustTextareaHeight = (el: HTMLTextAreaElement) => {
		el.style.height = 'auto'
		el.style.height = `${Math.min(el.scrollHeight, 180)}px`
	}

	const handleFilesSelected = async (fileList: FileList | File[]) => {
		setUploadError(null)
		const files = Array.from(fileList)
		if (files.length === 0) return

		const currentActiveCount = attachments.filter(
			a => a.status === 'ready' || a.status === 'uploading',
		).length

		if (currentActiveCount + files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
			setUploadError(
				locale === 'uz'
					? `Bir xabarga ko‘pi bilan ${MAX_ATTACHMENTS_PER_MESSAGE} ta fayl biriktirish mumkin.`
					: locale === 'ru'
						? `Можно прикрепить не более ${MAX_ATTACHMENTS_PER_MESSAGE} файлов.`
						: `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`,
			)
			return
		}

		for (const file of files) {
			const validation = validateAttachmentFile(file, locale)
			if (!validation.valid || !validation.extension) {
				setUploadError(validation.errorMessage ?? 'Invalid file.')
				continue
			}

			const tempId = `att_tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
			const controller = new AbortController()
			uploadAbortMapRef.current.set(tempId, controller)

			const pendingItem: ChatAttachment = {
				id: tempId,
				fileName: validation.sanitizedName,
				extension: validation.extension,
				mimeType: file.type || 'application/octet-stream',
				sizeBytes: file.size,
				uploadedAt: new Date().toISOString(),
				status: 'uploading',
				progress: 5,
			}

			setAttachments(prev => [...prev, pendingItem])

			try {
				const uploaded = await apiClient.uploadAttachment(
					file,
					organizationId,
					progress => {
						setAttachments(prev =>
							prev.map(item =>
								item.id === tempId ? { ...item, progress } : item,
							),
						)
					},
					{
						signal: controller.signal,
						organizationId,
						userId,
					},
				)

				setAttachments(prev =>
					prev.map(item => (item.id === tempId ? uploaded : item)),
				)
			} catch (err) {
				if (err instanceof ApiClientError && err.isAborted) {
					setAttachments(prev => prev.filter(item => item.id !== tempId))
				} else {
					const msg = err instanceof Error ? err.message : t.chat.errorFallback
					setAttachments(prev =>
						prev.map(item =>
							item.id === tempId
								? { ...item, status: 'error', errorMessage: msg }
								: item,
						),
					)
					setUploadError(msg)
				}
			} finally {
				uploadAbortMapRef.current.delete(tempId)
			}
		}
	}

	const handleCancelOrRemoveAttachment = (id: string) => {
		const controller = uploadAbortMapRef.current.get(id)
		if (controller) {
			controller.abort()
			uploadAbortMapRef.current.delete(id)
		}
		setAttachments(prev => prev.filter(item => item.id !== id))
	}

	const executeStreamRequest = async (
		targetChatId: string,
		promptText: string,
		readyAttachments: ChatAttachment[],
		assistantMsgId: string,
		historySnapshot: Array<{ role: ChatMessage['role']; content: string }>,
	) => {
		const controller = new AbortController()
		streamAbortRef.current = controller
		setIsStreaming(true)

		await apiClient.streamChat(
			{
				chatId: targetChatId,
				organizationId,
				message: promptText,
				history: historySnapshot,
				attachments: readyAttachments.map(a => ({
					id: a.id,
					fileName: a.fileName,
					extension: a.extension,
					sizeBytes: a.sizeBytes,
				})),
				locale,
			},
			{
				onMeta: meta => {
					onUpdateChatMessages(targetChatId, prev =>
						prev.map(m =>
							m.id === assistantMsgId ? { ...m, agentName: meta.agentName } : m,
						),
					)
				},
				onDelta: chunk => {
					onUpdateChatMessages(targetChatId, prev =>
						prev.map(m =>
							m.id === assistantMsgId
								? { ...m, content: `${m.content}${chunk}` }
								: m,
						),
					)
				},
				onDone: () => {
					setIsStreaming(false)
					streamAbortRef.current = null
					onUpdateChatMessages(targetChatId, prev =>
						prev.map(m =>
							m.id === assistantMsgId ? { ...m, status: 'completed' } : m,
						),
					)
				},
				onError: err => {
					setIsStreaming(false)
					streamAbortRef.current = null
					onUpdateChatMessages(targetChatId, prev =>
						prev.map(m =>
							m.id === assistantMsgId
								? {
										...m,
										status: err.isAborted ? 'stopped' : 'error',
										errorMessage: err.isAborted ? undefined : err.message,
									}
								: m,
						),
					)
				},
			},
			{
				signal: controller.signal,
				organizationId,
				userId,
			},
		)
	}

	const handleSendMessage = async (overrideText?: string) => {
		const text = (overrideText ?? draft).trim()
		const readyAttachments = attachments.filter(a => a.status === 'ready')
		const hasUploading = attachments.some(a => a.status === 'uploading')

		if (isStreaming || hasUploading) return
		if (!text && readyAttachments.length === 0) return

		const targetChatId = activeChat?.id ?? onCreateChat()
		const existingMessages = activeChat?.messages ?? []

		const userMessage: ChatMessage = {
			id: createMessageId('msg_u'),
			role: 'user',
			content: text || readyAttachments.map(a => a.fileName).join(', '),
			createdAt: new Date().toISOString(),
			status: 'completed',
			attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
		}

		const assistantMsgId = createMessageId('msg_a')
		const assistantPlaceholder: ChatMessage = {
			id: assistantMsgId,
			role: 'assistant',
			content: '',
			createdAt: new Date().toISOString(),
			status: 'streaming',
			agentName: 'ALJABR Command Agent',
		}

		const autoTitle =
			existingMessages.length === 0
				? (text || readyAttachments[0]?.fileName || t.chat.newChat).slice(0, 48)
				: undefined

		onUpdateChatMessages(
			targetChatId,
			prev => [...prev, userMessage, assistantPlaceholder],
			autoTitle,
		)

		if (!overrideText) {
			setDraft('')
			if (textareaRef.current) {
				textareaRef.current.style.height = 'auto'
			}
		}
		setAttachments([])
		setUploadError(null)

		const historySnapshot = existingMessages.slice(-8).map(m => ({
			role: m.role,
			content: m.content,
		}))

		await executeStreamRequest(
			targetChatId,
			userMessage.content,
			readyAttachments,
			assistantMsgId,
			historySnapshot,
		)
	}

	const handleStopStreaming = () => {
		streamAbortRef.current?.abort()
	}

	const handleRetryMessage = async (failedMsgId: string) => {
		if (!activeChat || isStreaming) return
		const msgIdx = activeChat.messages.findIndex(m => m.id === failedMsgId)
		if (msgIdx <= 0) return

		// Find preceding user message
		let userMsg: ChatMessage | null = null
		for (let i = msgIdx - 1; i >= 0; i -= 1) {
			if (activeChat.messages[i].role === 'user') {
				userMsg = activeChat.messages[i]
				break
			}
		}
		if (!userMsg) return

		onUpdateChatMessages(activeChat.id, prev =>
			prev.map(m =>
				m.id === failedMsgId
					? { ...m, content: '', status: 'streaming', errorMessage: undefined }
					: m,
			),
		)

		const historySnapshot = activeChat.messages
			.slice(0, msgIdx - 1)
			.slice(-8)
			.map(m => ({ role: m.role, content: m.content }))

		await executeStreamRequest(
			activeChat.id,
			userMsg.content,
			userMsg.attachments ?? [],
			failedMsgId,
			historySnapshot,
		)
	}

	const handleCopyMessage = async (msgId: string, content: string) => {
		try {
			await navigator.clipboard.writeText(content)
			setCopiedMessageId(msgId)
			setTimeout(() => setCopiedMessageId(null), 1800)
		} catch {
			// Ignore clipboard failures
		}
	}

	const startRename = (chat: ChatSession) => {
		setEditingChatId(chat.id)
		setEditingTitle(chat.title)
		setDeletingChatId(null)
	}

	const commitRename = (chatId: string) => {
		const trimmed = editingTitle.trim()
		if (trimmed) {
			onRenameChat(chatId, trimmed)
		}
		setEditingChatId(null)
	}

	const historySidebarContent = (
		<div className='flex h-full flex-col bg-white dark:bg-navy-950'>
			<div className='space-y-2.5 border-b border-slate-200 p-3.5 dark:border-navy-800'>
				<div className='flex items-center justify-between'>
					<h2 className='text-sm font-semibold text-navy-900 dark:text-white'>
						{t.chat.historyTitle}
					</h2>
					<div className='flex items-center gap-1'>
						<button
							type='button'
							onClick={() =>
								setSortOrder(prev => (prev === 'newest' ? 'oldest' : 'newest'))
							}
							title={
								sortOrder === 'newest' ? t.chat.sortNewest : t.chat.sortOldest
							}
							className='inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-gold-500/40 hover:bg-slate-50 dark:border-navy-800 dark:text-slate-300 dark:hover:bg-navy-900'
						>
							<ArrowUpDown className='h-3 w-3' />
							<span>
								{sortOrder === 'newest' ? t.chat.sortNewest : t.chat.sortOldest}
							</span>
						</button>
						<button
							type='button'
							onClick={() => {
								onCreateChat()
								setMobileHistoryOpen(false)
							}}
							aria-label={t.chat.newChat}
							className='rounded-md border border-gold-500/40 bg-navy-900 p-1.5 text-white transition-colors hover:bg-navy-800 dark:border-gold-400/50 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400'
						>
							<Plus className='h-3.5 w-3.5' />
						</button>
					</div>
				</div>

				<div className='relative'>
					<Search className='pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400' />
					<input
						type='search'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						placeholder={t.chat.searchPlaceholder}
						aria-label={t.chat.searchPlaceholder}
						className='w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-navy-800 focus:bg-white focus:outline-none dark:border-navy-800 dark:bg-navy-900 dark:text-slate-100 dark:focus:border-gold-400 dark:focus:bg-navy-950'
					/>
				</div>
			</div>

			<div className='flex-1 space-y-1 overflow-y-auto p-2.5'>
				{filteredChats.length === 0 ? (
					<p className='px-2 py-6 text-center text-xs text-slate-500 dark:text-slate-400'>
						{t.chat.emptyHistory}
					</p>
				) : (
					filteredChats.map(chat => {
						const isSelected = chat.id === activeChat?.id
						const isEditing = editingChatId === chat.id
						const isConfirmingDelete = deletingChatId === chat.id

						return (
							<div
								key={chat.id}
								className={`group rounded-lg border p-2.5 transition-colors ${
									isSelected
										? 'border-gold-500/50 bg-gold-50/40 dark:border-gold-500/40 dark:bg-navy-800/70'
										: 'border-transparent hover:bg-slate-100/80 dark:hover:bg-navy-900/70'
								}`}
							>
								{isEditing ? (
									<div className='flex items-center gap-1.5'>
										<input
											type='text'
											value={editingTitle}
											onChange={e => setEditingTitle(e.target.value)}
											onKeyDown={e => {
												if (e.key === 'Enter') commitRename(chat.id)
												if (e.key === 'Escape') setEditingChatId(null)
											}}
											autoFocus
											className='min-w-0 flex-1 rounded border border-gold-500 bg-white px-2 py-1 text-xs text-slate-900 focus:outline-none dark:bg-navy-900 dark:text-white'
										/>
										<button
											type='button'
											onClick={() => commitRename(chat.id)}
											aria-label={t.chat.save}
											className='rounded p-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
										>
											<Check className='h-3.5 w-3.5' />
										</button>
										<button
											type='button'
											onClick={() => setEditingChatId(null)}
											aria-label={t.chat.cancel}
											className='rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-navy-800'
										>
											<X className='h-3.5 w-3.5' />
										</button>
									</div>
								) : isConfirmingDelete ? (
									<div className='space-y-2'>
										<p className='truncate text-xs font-medium text-slate-800 dark:text-slate-200'>
											{chat.title}
										</p>
										<div className='flex items-center gap-1.5'>
											<button
												type='button'
												onClick={() => {
													onDeleteChat(chat.id)
													setDeletingChatId(null)
												}}
												className='rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700'
											>
												{t.chat.confirmDelete}
											</button>
											<button
												type='button'
												onClick={() => setDeletingChatId(null)}
												className='rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-navy-700 dark:text-slate-300 dark:hover:bg-navy-800'
											>
												{t.chat.cancel}
											</button>
										</div>
									</div>
								) : (
									<div className='flex items-start justify-between gap-2'>
										<button
											type='button'
											onClick={() => {
												onSelectChat(chat.id)
												setMobileHistoryOpen(false)
											}}
											className='min-w-0 flex-1 text-left'
										>
											<p className='truncate text-xs font-semibold text-navy-900 dark:text-slate-100'>
												{chat.title}
											</p>
											<p className='mt-1 font-mono text-[11px] text-slate-500 tabular-nums dark:text-slate-400'>
												{chat.updatedAt.slice(0, 10)} · {chat.messages.length}
											</p>
										</button>
										<div className='flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100'>
											<button
												type='button'
												onClick={() => startRename(chat)}
												aria-label={t.chat.renameChat}
												title={t.chat.renameChat}
												className='rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-gold-300'
											>
												<Pencil className='h-3.5 w-3.5' />
											</button>
											<button
												type='button'
												onClick={() => setDeletingChatId(chat.id)}
												aria-label={t.chat.deleteChat}
												title={t.chat.deleteChat}
												className='rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400'
											>
												<Trash2 className='h-3.5 w-3.5' />
											</button>
										</div>
									</div>
								)}
							</div>
						)
					})
				)}
			</div>
		</div>
	)

	return (
		<div
			className='relative flex h-full w-full overflow-hidden'
			onDragOver={e => {
				e.preventDefault()
				setIsDraggingOver(true)
			}}
			onDragLeave={e => {
				if (e.currentTarget === e.target) {
					setIsDraggingOver(false)
				}
			}}
			onDrop={e => {
				e.preventDefault()
				setIsDraggingOver(false)
				if (e.dataTransfer.files?.length) {
					void handleFilesSelected(e.dataTransfer.files)
				}
			}}
		>
			{/* Desktop Chat History Pane */}
			<div className='hidden w-72 shrink-0 border-r border-slate-200 md:block dark:border-navy-800'>
				{historySidebarContent}
			</div>

			{/* Mobile Chat History Drawer */}
			{mobileHistoryOpen && (
				<div className='fixed inset-0 z-40 flex md:hidden'>
					<div
						className='fixed inset-0 bg-navy-950/60'
						onClick={() => setMobileHistoryOpen(false)}
						aria-hidden='true'
					/>
					<div className='relative z-10 w-80 max-w-[85vw] border-r border-slate-200 shadow-xl dark:border-navy-800'>
						{historySidebarContent}
					</div>
				</div>
			)}

			{/* Drag & Drop Visual Overlay */}
			{isDraggingOver && (
				<div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-navy-950/30 backdrop-blur-[1px]'>
					<div className='flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gold-500 bg-white px-8 py-6 text-center shadow-lg dark:bg-navy-950'>
						<Upload className='h-7 w-7 text-navy-900 dark:text-gold-400' />
						<p className='text-sm font-semibold text-navy-900 dark:text-white'>
							{t.chat.dropFilesHere}
						</p>
						<p className='text-xs text-slate-500 dark:text-slate-400'>
							{t.chat.supportedFormatsHint}
						</p>
					</div>
				</div>
			)}

			{/* Main Conversation Column */}
			<div className='flex min-w-0 flex-1 flex-col bg-slate-50 dark:bg-navy-900'>
				{/* Sub-toolbar for mobile history toggle & mode note */}
				<div className='flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 dark:border-navy-800 dark:bg-navy-950'>
					<div className='flex min-w-0 items-center gap-2.5'>
						<button
							type='button'
							onClick={() => setMobileHistoryOpen(true)}
							className='inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 md:hidden dark:border-navy-800 dark:text-slate-200'
						>
							<History className='h-3.5 w-3.5' />
							<span>{t.chat.historyTitle}</span>
						</button>
						<h1 className='truncate text-sm font-semibold text-navy-900 dark:text-white'>
							{activeChat?.title ?? t.chat.newChat}
						</h1>
					</div>
					<span className='shrink-0 text-xs text-slate-500 dark:text-slate-400'>
						{apiMode === 'demo' ? t.header.demoBanner : t.header.liveBanner}
					</span>
				</div>

				{/* Messages Viewport */}
				<div className='flex-1 overflow-y-auto px-4 py-6 sm:px-6'>
					<div className='mx-auto max-w-3xl space-y-5'>
						{!activeChat || activeChat.messages.length === 0 ? (
							<div className='rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-navy-800 dark:bg-navy-950'>
								<h2 className='font-display text-xl font-bold text-navy-900 dark:text-white'>
									{t.chat.emptyConversationTitle}
								</h2>
								<p className='mt-1.5 text-sm text-slate-600 dark:text-slate-400'>
									{t.chat.emptyConversationSubtitle}
								</p>
								<div className='mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3'>
									{t.chat.prompts.map((item, idx) => (
										<button
											key={idx}
											type='button'
											onClick={() => void handleSendMessage(item.prompt)}
											className='rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-left transition-colors hover:border-gold-500/50 hover:bg-gold-50/30 dark:border-navy-800 dark:bg-navy-900 dark:hover:border-gold-400/50 dark:hover:bg-navy-800/70'
										>
											<p className='text-xs font-semibold text-navy-900 dark:text-white'>
												{item.title}
											</p>
											<p className='mt-1 line-clamp-3 text-xs text-slate-600 dark:text-slate-400'>
												{item.prompt}
											</p>
										</button>
									))}
								</div>
							</div>
						) : (
							activeChat.messages.map(message => {
								const isUser = message.role === 'user'
								return (
									<div
										key={message.id}
										className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
									>
										<div
											className={`w-full rounded-xl border p-4 sm:p-5 ${
												isUser
													? 'max-w-2xl border-navy-200 bg-navy-50/70 dark:border-navy-700 dark:bg-navy-800/70'
													: 'border-slate-200 bg-white dark:border-navy-800 dark:bg-navy-950'
											}`}
										>
											<div className='mb-2 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400'>
												<span className='font-medium text-navy-800 dark:text-slate-200'>
													{isUser
														? 'Operator'
														: (message.agentName ?? 'ALJABR Command Agent')}
												</span>
												<span className='font-mono tabular-nums'>
													{message.createdAt.slice(11, 16)}
												</span>
											</div>

											{message.attachments &&
												message.attachments.length > 0 && (
													<div className='mb-3 flex flex-wrap gap-2'>
														{message.attachments.map(att => (
															<div
																key={att.id}
																className='inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 dark:border-navy-800 dark:bg-navy-900 dark:text-slate-300'
															>
																<FileText className='h-3.5 w-3.5 text-navy-800 dark:text-gold-400' />
																<span className='max-w-[180px] truncate font-medium'>
																	{att.fileName}
																</span>
																<span className='font-mono text-[11px] text-slate-500 tabular-nums'>
																	{formatFileSize(att.sizeBytes)}
																</span>
															</div>
														))}
													</div>
												)}

											{isUser ? (
												<p className='whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900 dark:text-slate-100'>
													{message.content}
												</p>
											) : (
												<>
													{message.content ? (
														<SafeMarkdown content={message.content} />
													) : message.status === 'streaming' ? (
														<p className='text-sm text-slate-500 dark:text-slate-400'>
															{t.chat.streamingLabel}
														</p>
													) : null}

													{message.status === 'stopped' && (
														<p className='mt-3 text-xs font-medium text-amber-700 dark:text-amber-400'>
															{t.chat.stoppedNotice}
														</p>
													)}

													{message.status === 'error' && (
														<div className='mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'>
															<span className='flex items-center gap-1.5'>
																<AlertCircle className='h-4 w-4 shrink-0' />
																<span>
																	{message.errorMessage ?? t.chat.errorFallback}
																</span>
															</span>
															<button
																type='button'
																onClick={() =>
																	void handleRetryMessage(message.id)
																}
																className='inline-flex items-center gap-1 rounded bg-red-700 px-2.5 py-1 font-medium text-white hover:bg-red-800'
															>
																<RotateCcw className='h-3 w-3' />
																<span>{t.chat.retry}</span>
															</button>
														</div>
													)}

													{message.status !== 'streaming' &&
														message.content && (
															<div className='mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5 dark:border-navy-800/80'>
																<button
																	type='button'
																	onClick={() =>
																		void handleCopyMessage(
																			message.id,
																			message.content,
																		)
																	}
																	className='inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-navy-900 dark:hover:text-gold-300'
																>
																	{copiedMessageId === message.id ? (
																		<>
																			<Check className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
																			<span>{t.chat.copied}</span>
																		</>
																	) : (
																		<>
																			<Copy className='h-3.5 w-3.5' />
																			<span>{t.chat.copy}</span>
																		</>
																	)}
																</button>
															</div>
														)}
												</>
											)}
										</div>
									</div>
								)
							})
						)}
						<div ref={messagesEndRef} />
					</div>
				</div>

				{/* Composer */}
				<div className='border-t border-slate-200 bg-white px-4 py-3.5 sm:px-6 dark:border-navy-800 dark:bg-navy-950'>
					<div className='mx-auto max-w-3xl space-y-2.5'>
						{uploadError && (
							<div
								role='alert'
								className='flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
							>
								<span className='flex items-center gap-1.5'>
									<AlertCircle className='h-4 w-4 shrink-0' />
									<span>{uploadError}</span>
								</span>
								<button
									type='button'
									onClick={() => setUploadError(null)}
									aria-label='Dismiss error'
									className='rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/40'
								>
									<X className='h-3.5 w-3.5' />
								</button>
							</div>
						)}

						{attachments.length > 0 && (
							<div className='flex flex-wrap gap-2'>
								{attachments.map(att => (
									<div
										key={att.id}
										className='flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-navy-800 dark:bg-navy-900'
									>
										<FileText className='h-3.5 w-3.5 shrink-0 text-navy-800 dark:text-gold-400' />
										<div className='min-w-0'>
											<p className='max-w-[160px] truncate font-medium text-slate-800 dark:text-slate-200'>
												{att.fileName}
											</p>
											<p className='font-mono text-[11px] text-slate-500 tabular-nums'>
												{att.status === 'uploading'
													? `${t.chat.uploadingFile} ${att.progress}%`
													: `${att.extension.toUpperCase()} · ${formatFileSize(att.sizeBytes)}`}
											</p>
											{att.status === 'uploading' && (
												<div className='mt-1 h-1 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-800'>
													<div
														className='h-full bg-gold-500 transition-all'
														style={{ width: `${att.progress}%` }}
													/>
												</div>
											)}
										</div>
										<button
											type='button'
											onClick={() => handleCancelOrRemoveAttachment(att.id)}
											aria-label={
												att.status === 'uploading'
													? t.chat.cancelUpload
													: t.chat.removeAttachment
											}
											title={
												att.status === 'uploading'
													? t.chat.cancelUpload
													: t.chat.removeAttachment
											}
											className='rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white'
										>
											<X className='h-3.5 w-3.5' />
										</button>
									</div>
								))}
							</div>
						)}

						<div className='flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 focus-within:border-navy-800 focus-within:bg-white dark:border-navy-800 dark:bg-navy-900 dark:focus-within:border-gold-400 dark:focus-within:bg-navy-950'>
							<input
								ref={fileInputRef}
								type='file'
								multiple
								accept='.pdf,.docx,.xlsx,.csv,.txt,.png,.jpg,.jpeg'
								onChange={e => {
									if (e.target.files?.length) {
										void handleFilesSelected(e.target.files)
										e.target.value = ''
									}
								}}
								className='hidden'
							/>
							<button
								type='button'
								onClick={() => fileInputRef.current?.click()}
								aria-label={t.chat.attachFiles}
								title={`${t.chat.attachFiles} (${t.chat.supportedFormatsHint})`}
								className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-navy-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-gold-300'
							>
								<Paperclip className='h-4 w-4' />
							</button>

							<textarea
								ref={textareaRef}
								rows={1}
								value={draft}
								onChange={e => {
									setDraft(e.target.value)
									adjustTextareaHeight(e.target)
								}}
								onKeyDown={e => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault()
										void handleSendMessage()
									}
								}}
								placeholder={t.chat.composerPlaceholder}
								aria-label={t.chat.composerPlaceholder}
								className='max-h-44 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100'
							/>

							{isStreaming ? (
								<button
									type='button'
									onClick={handleStopStreaming}
									className='inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 whitespace-nowrap'
								>
									<Square className='h-3.5 w-3.5 fill-current' />
									<span>{t.chat.stop}</span>
								</button>
							) : (
								<button
									type='button'
									onClick={() => void handleSendMessage()}
									disabled={
										(!draft.trim() &&
											attachments.filter(a => a.status === 'ready').length ===
												0) ||
										attachments.some(a => a.status === 'uploading')
									}
									className='inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-gold-500/40 bg-navy-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap dark:border-gold-400/50 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400'
								>
									<Send className='h-3.5 w-3.5' />
									<span>{t.chat.send}</span>
								</button>
							)}
						</div>

						<p className='text-xs text-slate-500 dark:text-slate-400'>
							{t.chat.supportedFormatsHint}
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
