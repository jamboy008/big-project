import React, { useMemo, useState } from 'react'
import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Loader2,
	RotateCcw,
	Search,
	ShieldAlert,
	Slash,
	X,
	XCircle,
} from 'lucide-react'
import type { Translations } from '../i18n/translations'
import type { AiTask, TaskStatus } from '../types/api'

interface AiTasksPageProps {
	tasks: AiTask[]
	isLoading: boolean
	loadError: string | null
	onRetryLoad: () => void
	onTaskDecision: (
		taskId: string,
		decision: 'approve' | 'reject',
		note?: string,
	) => Promise<void>
	t: Translations
}

const TASK_STATUSES: ReadonlyArray<TaskStatus> = [
	'Pending',
	'Running',
	'Completed',
	'Failed',
	'Cancelled',
	'Awaiting Approval',
]

function StatusLabel({ status, label }: { status: TaskStatus; label: string }) {
	switch (status) {
		case 'Completed':
			return (
				<span className='inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'>
					<CheckCircle2 className='h-3.5 w-3.5 shrink-0' />
					<span>{label}</span>
				</span>
			)
		case 'Running':
			return (
				<span className='inline-flex items-center gap-1.5 text-xs font-medium text-navy-700 dark:text-gold-300'>
					<Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin' />
					<span>{label}</span>
				</span>
			)
		case 'Awaiting Approval':
			return (
				<span className='inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400'>
					<AlertTriangle className='h-3.5 w-3.5 shrink-0' />
					<span>{label}</span>
				</span>
			)
		case 'Failed':
			return (
				<span className='inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400'>
					<XCircle className='h-3.5 w-3.5 shrink-0' />
					<span>{label}</span>
				</span>
			)
		case 'Cancelled':
			return (
				<span className='inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400'>
					<Slash className='h-3.5 w-3.5 shrink-0' />
					<span>{label}</span>
				</span>
			)
		case 'Pending':
			return (
				<span className='inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300'>
					<Clock className='h-3.5 w-3.5 shrink-0' />
					<span>{label}</span>
				</span>
			)
	}
}

export const AiTasksPage: React.FC<AiTasksPageProps> = ({
	tasks,
	isLoading,
	loadError,
	onRetryLoad,
	onTaskDecision,
	t,
}) => {
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL')
	const [agentFilter, setAgentFilter] = useState<string>('ALL')
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
	const [decisionNote, setDecisionNote] = useState('')
	const [submittingDecision, setSubmittingDecision] = useState(false)
	const [decisionError, setDecisionError] = useState<string | null>(null)

	const uniqueAgents = useMemo(() => {
		return Array.from(new Set(tasks.map(task => task.agentName))).sort()
	}, [tasks])

	const filteredTasks = useMemo(() => {
		const q = searchQuery.trim().toLowerCase()
		return tasks.filter(task => {
			if (statusFilter !== 'ALL' && task.status !== statusFilter) return false
			if (agentFilter !== 'ALL' && task.agentName !== agentFilter) return false
			if (!q) return true
			return (
				task.id.toLowerCase().includes(q) ||
				task.title.toLowerCase().includes(q) ||
				task.agentName.toLowerCase().includes(q)
			)
		})
	}, [tasks, searchQuery, statusFilter, agentFilter])

	const selectedTask = useMemo(
		() => tasks.find(task => task.id === selectedTaskId) ?? null,
		[tasks, selectedTaskId],
	)

	const handleDecision = async (decision: 'approve' | 'reject') => {
		if (!selectedTask) return
		setDecisionError(null)
		setSubmittingDecision(true)
		try {
			await onTaskDecision(selectedTask.id, decision, decisionNote)
			setDecisionNote('')
		} catch (err) {
			setDecisionError(
				err instanceof Error ? err.message : 'Unable to submit decision.',
			)
		} finally {
			setSubmittingDecision(false)
		}
	}

	return (
		<div className='mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8'>
			<div className='space-y-1'>
				<h1 className='font-display text-2xl font-bold tracking-tight text-navy-900 dark:text-white'>
					{t.tasks.title}
				</h1>
				<p className='text-sm text-slate-600 dark:text-slate-400'>
					{t.tasks.subtitle}
				</p>
			</div>

			{/* Explicit Financial Safety Policy Notice */}
			<div className='flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-navy-800 dark:bg-navy-950 dark:text-slate-300'>
				<ShieldAlert className='mt-0.5 h-4 w-4 shrink-0 text-gold-600 dark:text-gold-400' />
				<span>{t.tasks.financialRestrictionNote}</span>
			</div>

			{/* Search & Filters */}
			<div className='flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-navy-800 dark:bg-navy-950'>
				<div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
					<div className='relative flex-1'>
						<Search className='pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400' />
						<input
							type='search'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							placeholder={t.tasks.searchPlaceholder}
							aria-label={t.tasks.searchPlaceholder}
							className='w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-800 focus:bg-white focus:outline-none dark:border-navy-800 dark:bg-navy-900 dark:text-slate-100 dark:focus:border-gold-400 dark:focus:bg-navy-950'
						/>
					</div>

					<select
						value={agentFilter}
						onChange={e => setAgentFilter(e.target.value)}
						aria-label={t.tasks.allAgents}
						className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-navy-800 focus:outline-none dark:border-navy-800 dark:bg-navy-900 dark:text-slate-100 dark:focus:border-gold-400'
					>
						<option value='ALL'>{t.tasks.allAgents}</option>
						{uniqueAgents.map(agent => (
							<option key={agent} value={agent}>
								{agent}
							</option>
						))}
					</select>
				</div>

				{/* Status Segmented Tabs */}
				<div className='flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-navy-900'>
					<button
						type='button'
						onClick={() => setStatusFilter('ALL')}
						className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
							statusFilter === 'ALL'
								? 'bg-white text-navy-900 shadow-xs ring-1 ring-gold-500/35 dark:bg-navy-800 dark:text-gold-300'
								: 'text-slate-600 hover:text-navy-900 dark:text-slate-400 dark:hover:text-slate-200'
						}`}
					>
						{t.tasks.allStatuses}
					</button>
					{TASK_STATUSES.map(status => (
						<button
							key={status}
							type='button'
							onClick={() => setStatusFilter(status)}
							className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
								statusFilter === status
									? 'bg-white text-navy-900 shadow-xs ring-1 ring-gold-500/35 dark:bg-navy-800 dark:text-gold-300'
									: 'text-slate-600 hover:text-navy-900 dark:text-slate-400 dark:hover:text-slate-200'
							}`}
						>
							{t.tasks.statuses[status]}
						</button>
					))}
				</div>
			</div>

			{/* Tasks Table / States */}
			{isLoading ? (
				<div className='space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-navy-800 dark:bg-navy-950'>
					{[0, 1, 2, 3].map(row => (
						<div
							key={row}
							className='h-11 animate-pulse rounded-lg bg-slate-100 dark:bg-navy-900'
						/>
					))}
				</div>
			) : loadError ? (
				<div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-white p-8 text-center dark:border-red-900/50 dark:bg-navy-950'>
					<XCircle className='h-7 w-7 text-red-600 dark:text-red-400' />
					<div>
						<p className='text-sm font-semibold text-navy-900 dark:text-white'>
							{t.tasks.errorTitle}
						</p>
						<p className='mt-1 text-xs text-slate-600 dark:text-slate-400'>
							{loadError}
						</p>
					</div>
					<button
						type='button'
						onClick={onRetryLoad}
						className='inline-flex items-center gap-1.5 rounded-lg border border-gold-500/40 bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-800 dark:border-gold-400/50 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400'
					>
						<RotateCcw className='h-3.5 w-3.5' />
						<span>{t.tasks.retryLoad}</span>
					</button>
				</div>
			) : filteredTasks.length === 0 ? (
				<div className='rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-navy-800 dark:bg-navy-950'>
					<p className='text-sm font-semibold text-navy-900 dark:text-white'>
						{t.tasks.emptyTitle}
					</p>
					<p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
						{t.tasks.emptySubtitle}
					</p>
				</div>
			) : (
				<div className='overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-navy-800 dark:bg-navy-950'>
					<table className='w-full border-collapse text-left text-sm'>
						<thead>
							<tr className='border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-navy-800 dark:bg-navy-900/70 dark:text-slate-300'>
								<th className='px-4 py-3'>{t.tasks.taskId}</th>
								<th className='px-4 py-3'>{t.tasks.taskName}</th>
								<th className='px-4 py-3'>{t.tasks.agent}</th>
								<th className='px-4 py-3'>{t.tasks.status}</th>
								<th className='px-4 py-3'>{t.tasks.startedAt}</th>
								<th className='px-4 py-3'>{t.tasks.completedAt}</th>
								<th className='px-4 py-3 text-right'>{t.tasks.actions}</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-slate-200 dark:divide-navy-800'>
							{filteredTasks.map(task => (
								<tr
									key={task.id}
									onClick={() => {
										setSelectedTaskId(task.id)
										setDecisionError(null)
									}}
									className='cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-navy-900/60'
								>
									<td className='px-4 py-3 font-mono text-xs font-medium text-slate-600 tabular-nums whitespace-nowrap dark:text-slate-400'>
										{task.id}
									</td>
									<td className='max-w-xs px-4 py-3'>
										<p className='truncate font-medium text-navy-900 dark:text-slate-100'>
											{task.title}
										</p>
									</td>
									<td className='px-4 py-3 text-xs text-slate-600 whitespace-nowrap dark:text-slate-300'>
										{task.agentName}
									</td>
									<td className='px-4 py-3 whitespace-nowrap'>
										<StatusLabel
											status={task.status}
											label={t.tasks.statuses[task.status]}
										/>
									</td>
									<td className='px-4 py-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap dark:text-slate-400'>
										{task.startedAt.slice(0, 16).replace('T', ' ')}
									</td>
									<td className='px-4 py-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap dark:text-slate-400'>
										{task.completedAt
											? task.completedAt.slice(0, 16).replace('T', ' ')
											: '—'}
									</td>
									<td className='px-4 py-3 text-right whitespace-nowrap'>
										<button
											type='button'
											onClick={e => {
												e.stopPropagation()
												setSelectedTaskId(task.id)
												setDecisionError(null)
											}}
											className='rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-navy-800 hover:border-gold-500/40 hover:bg-slate-100 dark:border-navy-800 dark:text-slate-200 dark:hover:bg-navy-800'
										>
											{t.tasks.viewDetails}
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Task Detail Modal */}
			{selectedTask && (
				<div
					role='dialog'
					aria-modal='true'
					aria-labelledby='task-detail-title'
					className='fixed inset-0 z-50 flex items-center justify-center bg-navy-950/65 p-4'
				>
					<div className='max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-navy-800 dark:bg-navy-950'>
						<div className='flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-navy-800'>
							<div>
								<p className='font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400'>
									{selectedTask.id} · {selectedTask.agentName}
								</p>
								<h2
									id='task-detail-title'
									className='mt-1 text-lg font-semibold text-navy-900 dark:text-white'
								>
									{selectedTask.title}
								</h2>
							</div>
							<button
								type='button'
								onClick={() => setSelectedTaskId(null)}
								aria-label={t.tasks.close}
								className='rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-navy-800'
							>
								<X className='h-5 w-5' />
							</button>
						</div>

						<div className='space-y-5 p-6 text-sm'>
							<div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-navy-800 dark:bg-navy-900'>
								<StatusLabel
									status={selectedTask.status}
									label={t.tasks.statuses[selectedTask.status]}
								/>
								<div className='font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400'>
									{selectedTask.startedAt.slice(0, 19).replace('T', ' ')}
									{selectedTask.completedAt
										? ` → ${selectedTask.completedAt.slice(0, 19).replace('T', ' ')}`
										: ''}
								</div>
							</div>

							<p className='text-slate-700 dark:text-slate-300'>
								{selectedTask.summary}
							</p>

							{selectedTask.resultDetail && (
								<div className='space-y-1.5'>
									<h3 className='text-xs font-semibold text-navy-900 dark:text-white'>
										{t.tasks.resultSection}
									</h3>
									<div className='rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700 dark:border-navy-800 dark:bg-navy-900 dark:text-slate-300'>
										{selectedTask.resultDetail}
									</div>
								</div>
							)}

							{selectedTask.errorReason && (
								<div className='space-y-1.5'>
									<h3 className='text-xs font-semibold text-red-700 dark:text-red-400'>
										{t.tasks.errorSection}
									</h3>
									<div className='rounded-lg border border-red-200 bg-red-50 p-3.5 font-mono text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'>
										{selectedTask.errorReason}
									</div>
								</div>
							)}

							<div className='space-y-2'>
								<h3 className='text-xs font-semibold text-navy-900 dark:text-white'>
									{t.tasks.stepsSection}
								</h3>
								<ul className='divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-navy-800 dark:border-navy-800'>
									{selectedTask.steps.map((step, idx) => (
										<li
											key={idx}
											className='flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs'
										>
											<span className='flex items-center gap-2 text-slate-800 dark:text-slate-200'>
												{step.completed ? (
													<CheckCircle2 className='h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400' />
												) : (
													<Clock className='h-3.5 w-3.5 shrink-0 text-slate-400' />
												)}
												<span>{step.label}</span>
											</span>
											<span className='font-mono text-[11px] text-slate-500 tabular-nums'>
												{step.timestamp ?? '—'}
											</span>
										</li>
									))}
								</ul>
							</div>

							{selectedTask.status === 'Awaiting Approval' &&
								selectedTask.requiresHumanApproval && (
									<div className='space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20'>
										<h3 className='text-xs font-semibold text-amber-900 dark:text-amber-300'>
											{t.tasks.approvalSection}
										</h3>
										{selectedTask.approvalActionLabel && (
											<p className='text-xs font-medium text-slate-800 dark:text-slate-200'>
												{selectedTask.approvalActionLabel}
											</p>
										)}

										<textarea
											rows={2}
											value={decisionNote}
											onChange={e => setDecisionNote(e.target.value)}
											placeholder={t.tasks.approvalNotePlaceholder}
											className='w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-navy-800 focus:outline-none dark:border-navy-800 dark:bg-navy-900 dark:text-slate-100 dark:focus:border-gold-400'
										/>

										{decisionError && (
											<p className='text-xs text-red-700 dark:text-red-400'>
												{decisionError}
											</p>
										)}

										<div className='flex flex-wrap items-center justify-end gap-2'>
											<button
												type='button'
												disabled={submittingDecision}
												onClick={() => void handleDecision('reject')}
												className='rounded-lg border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-navy-900 dark:text-red-300 dark:hover:bg-red-950/40'
											>
												{t.tasks.rejectAction}
											</button>
											<button
												type='button'
												disabled={submittingDecision}
												onClick={() => void handleDecision('approve')}
												className='rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50'
											>
												{t.tasks.approveAction}
											</button>
										</div>
									</div>
								)}
						</div>

						<div className='flex justify-end border-t border-slate-200 px-6 py-3.5 dark:border-navy-800'>
							<button
								type='button'
								onClick={() => setSelectedTaskId(null)}
								className='rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-navy-800 hover:bg-slate-50 dark:border-navy-800 dark:text-slate-200 dark:hover:bg-navy-900'
							>
								{t.tasks.close}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
