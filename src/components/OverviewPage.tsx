import React from 'react'
import {
	ArrowRight,
	CheckSquare,
	MessageSquare,
	ShieldCheck,
} from 'lucide-react'
import type { Translations } from '../i18n/translations'
import type {
	AiTask,
	ChatSession,
	Organization,
	PlatformRoute,
} from '../types/api'

interface OverviewPageProps {
	organization: Organization
	chats: ChatSession[]
	tasks: AiTask[]
	onNavigate: (route: PlatformRoute) => void
	t: Translations
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
	organization,
	chats,
	tasks,
	onNavigate,
	t,
}) => {
	const activeCount = tasks.filter(
		task => task.status === 'Running' || task.status === 'Pending',
	).length
	const approvalCount = tasks.filter(
		task => task.status === 'Awaiting Approval',
	).length

	return (
		<div className='mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8'>
			<div className='flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center dark:border-navy-800 dark:bg-navy-950'>
				<div className='space-y-1.5'>
					<p className='text-xs font-medium text-gold-700 dark:text-gold-400'>
						{organization.name} · {organization.code} · {organization.region}
					</p>
					<h1 className='font-display text-2xl font-bold tracking-tight text-navy-900 text-balance dark:text-white'>
						{t.overview.title}
					</h1>
					<p className='max-w-2xl text-sm text-slate-600 dark:text-slate-300'>
						{t.overview.subtitle}
					</p>
				</div>

				<div className='flex shrink-0 flex-wrap items-center gap-2.5'>
					<button
						type='button'
						onClick={() => onNavigate('command-center')}
						className='inline-flex items-center gap-2 rounded-lg border border-gold-500/40 bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 whitespace-nowrap dark:border-gold-400/50 dark:bg-gold-500 dark:text-navy-950 dark:hover:bg-gold-400'
					>
						<MessageSquare className='h-4 w-4' />
						<span>{t.overview.openCommandCenter}</span>
					</button>
					<button
						type='button'
						onClick={() => onNavigate('tasks')}
						className='inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-900 transition-colors hover:border-gold-500/40 hover:bg-slate-50 whitespace-nowrap dark:border-navy-800 dark:bg-navy-900 dark:text-slate-100 dark:hover:bg-navy-800'
					>
						<CheckSquare className='h-4 w-4' />
						<span>{t.overview.openTasks}</span>
					</button>
				</div>
			</div>

			{/* 3-Column Metrics Strip */}
			<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
				<div className='rounded-xl border border-slate-200 bg-white p-5 dark:border-navy-800 dark:bg-navy-950'>
					<p className='text-xs font-medium text-slate-500 dark:text-slate-400'>
						{t.overview.activeTasksLabel}
					</p>
					<p className='mt-2 font-mono text-3xl font-semibold text-navy-900 tabular-nums dark:text-white'>
						{activeCount}
					</p>
				</div>

				<div className='rounded-xl border border-slate-200 bg-white p-5 dark:border-navy-800 dark:bg-navy-950'>
					<p className='text-xs font-medium text-slate-500 dark:text-slate-400'>
						{t.overview.awaitingApprovalLabel}
					</p>
					<p className='mt-2 font-mono text-3xl font-semibold text-gold-600 tabular-nums dark:text-gold-400'>
						{approvalCount}
					</p>
				</div>

				<div className='rounded-xl border border-slate-200 bg-white p-5 dark:border-navy-800 dark:bg-navy-950'>
					<p className='text-xs font-medium text-slate-500 dark:text-slate-400'>
						{t.overview.chatsCountLabel}
					</p>
					<p className='mt-2 font-mono text-3xl font-semibold text-navy-900 tabular-nums dark:text-white'>
						{chats.length}
					</p>
				</div>
			</div>

			{/* Integration Architecture Summary */}
			<div className='rounded-xl border border-slate-200 bg-white p-6 dark:border-navy-800 dark:bg-navy-950'>
				<div className='flex items-start gap-3'>
					<ShieldCheck className='mt-0.5 h-5 w-5 shrink-0 text-gold-600 dark:text-gold-400' />
					<div className='space-y-2'>
						<h2 className='text-base font-semibold text-navy-900 dark:text-white'>
							{t.overview.architectureTitle}
						</h2>
						<p className='text-sm text-slate-600 dark:text-slate-300'>
							{t.overview.architectureDesc}
						</p>
						<div className='flex flex-wrap items-center gap-2 pt-1 font-mono text-xs text-navy-800 dark:text-slate-200'>
							<span>Frontend (React + TS Strict)</span>
							<ArrowRight className='h-3.5 w-3.5 text-gold-500' />
							<span>BFF (/api/v1/*)</span>
							<ArrowRight className='h-3.5 w-3.5 text-gold-500' />
							<span>FastAPI Business Backend</span>
							<ArrowRight className='h-3.5 w-3.5 text-gold-500' />
							<span>AI Engine</span>
						</div>
					</div>
				</div>
			</div>

			{/* Recent Tasks Preview */}
			<div className='overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-navy-800 dark:bg-navy-950'>
				<div className='flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-navy-800'>
					<h2 className='text-sm font-semibold text-navy-900 dark:text-white'>
						{t.overview.recentTasksTitle}
					</h2>
					<button
						type='button'
						onClick={() => onNavigate('tasks')}
						className='text-xs font-semibold text-navy-800 underline decoration-gold-500/70 underline-offset-2 hover:text-navy-900 dark:text-gold-300'
					>
						{t.overview.openTasks}
					</button>
				</div>
				<div className='divide-y divide-slate-200 dark:divide-navy-800'>
					{tasks.slice(0, 4).map(task => (
						<div
							key={task.id}
							className='flex flex-col justify-between gap-2 px-5 py-3 sm:flex-row sm:items-center'
						>
							<div className='min-w-0'>
								<p className='truncate text-sm font-medium text-slate-900 dark:text-slate-100'>
									<span className='mr-2 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400'>
										{task.id}
									</span>
									{task.title}
								</p>
								<p className='text-xs text-slate-500 dark:text-slate-400'>
									{task.agentName} ·{' '}
									{task.startedAt.slice(0, 16).replace('T', ' ')}
								</p>
							</div>
							<span className='shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300'>
								{t.tasks.statuses[task.status]}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
