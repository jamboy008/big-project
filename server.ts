import 'dotenv/config'
import express, {
	type Request,
	type Response,
	type NextFunction,
} from 'express'
import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { GoogleGenAI } from '@google/genai'
import { createServer as createViteServer } from 'vite'
import {
	DEMO_ORGANIZATIONS,
	DEMO_USER,
	INITIAL_DEMO_TASKS,
	getSeedChatsForTenant,
} from './src/data/mockPlatformData.ts'
import {
	ALLOWED_EXTENSIONS,
	MAX_ATTACHMENT_SIZE_BYTES,
	validateAttachmentFile,
} from './src/lib/fileValidation.ts'
import type { AiTask, ChatStreamRequest, Locale } from './src/types/api.ts'

const PORT = Number(process.env.PORT) || 3000
const IS_PROD =
	process.env.NODE_ENV === 'production' || process.argv.includes('--prod')

function getValidatedFastApiUrl(): string | null {
	const raw = process.env.FASTAPI_BACKEND_URL?.trim()
	if (!raw) return null
	try {
		const parsed = new URL(raw)
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
			return null
		}
		return parsed.toString().replace(/\/+$/, '')
	} catch {
		return null
	}
}

function getGeminiClient(): GoogleGenAI | null {
	const key = process.env.GEMINI_API_KEY?.trim()
	if (!key || key === 'MY_GEMINI_API_KEY') {
		return null
	}
	return new GoogleGenAI({ apiKey: key })
}

// Server-side in-memory demo state (isolated per process, never exposes secrets)
let sessionActive = true
const tasksStore: AiTask[] = INITIAL_DEMO_TASKS.map(t => ({
	...t,
	steps: t.steps.map(s => ({ ...s })),
}))

const ALLOWED_ORG_IDS = new Set(DEMO_ORGANIZATIONS.map(org => org.id))

function requirePlatformSession(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	if (!sessionActive) {
		res.status(401).json({
			error: {
				code: 'UNAUTHENTICATED',
				message: 'Frontend 1 platform session is not active.',
				status: 401,
			},
		})
		return
	}

	const orgId =
		(typeof req.query.organizationId === 'string'
			? req.query.organizationId
			: null) ??
		req.header('x-aljabr-org-id') ??
		DEMO_ORGANIZATIONS[0].id

	if (!ALLOWED_ORG_IDS.has(orgId)) {
		res.status(403).json({
			error: {
				code: 'ORG_ACCESS_DENIED',
				message: 'Requested organization is outside current user permissions.',
				status: 403,
			},
		})
		return
	}

	next()
}

function parseMultipartSingleFile(
	bodyBuffer: Buffer,
	contentType: string,
): {
	fileName: string
	mimeType: string
	dataLength: number
	organizationId: string
} | null {
	const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType)
	if (!boundaryMatch) return null
	const boundary = boundaryMatch[1] ?? boundaryMatch[2]
	if (!boundary) return null

	const rawText = bodyBuffer.toString('latin1')
	const parts = rawText.split(`--${boundary}`)
	let fileName = ''
	let mimeType = 'application/octet-stream'
	let dataLength = 0
	let organizationId = DEMO_ORGANIZATIONS[0].id

	for (const part of parts) {
		const headerEnd = part.indexOf('\r\n\r\n')
		if (headerEnd === -1) continue
		const headersText = part.slice(0, headerEnd)
		let bodyPart = part.slice(headerEnd + 4)
		if (bodyPart.endsWith('\r\n')) {
			bodyPart = bodyPart.slice(0, -2)
		}

		const nameMatch = /name="([^"]+)"/i.exec(headersText)
		const fieldName = nameMatch?.[1]
		const filenameMatch = /filename="([^"]*)"/i.exec(headersText)

		if (filenameMatch) {
			fileName = Buffer.from(filenameMatch[1], 'latin1').toString('utf8')
			const ctMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headersText)
			if (ctMatch?.[1]) {
				mimeType = ctMatch[1].trim()
			}
			dataLength = Buffer.byteLength(bodyPart, 'latin1')
		} else if (fieldName === 'organizationId') {
			organizationId = bodyPart.trim()
		}
	}

	if (!fileName) return null
	return { fileName, mimeType, dataLength, organizationId }
}

function buildDemoMarkdownReply(
	prompt: string,
	locale: Locale,
	attachmentsCount: number,
): string {
	const cleanSnippet = prompt.replace(/[<>&]/g, '').slice(0, 120)
	if (locale === 'en') {
		return [
			`### Operational Summary`,
			`Processed your request: **${cleanSnippet || 'Operational inquiry'}**${
				attachmentsCount > 0
					? ` (${attachmentsCount} verified attachment(s) included)`
					: ''
			}.`,
			'',
			'| Metric | Baseline | Current Status | Priority |',
			'|---|---|---|---|',
			'| SLA Compliance | 95.0% | 97.8% | Nominal |',
			'| Queue Throughput | 120 ops/hr | 146 ops/hr | Optimal |',
			'| Pending Approvals | 3 items | 1 item | Action Required |',
			'',
			'- **Next step 1:** Review `TSK-2041` in the **AI Tasks** module for human sign-off.',
			'- **Next step 2:** Verify BFF `/api/v1/` contract alignment before enabling live FastAPI routing.',
			'',
			'```typescript',
			'const controller = new AbortController();',
			'await apiClient.streamChat(payload, callbacks, { signal: controller.signal });',
			'```',
		].join('\n')
	}

	if (locale === 'ru') {
		return [
			`### Операционная сводка`,
			`Запрос обработан: **${cleanSnippet || 'Операционный запрос'}**${
				attachmentsCount > 0
					? ` (учтено проверенных файлов: ${attachmentsCount})`
					: ''
			}.`,
			'',
			'| Показатель | План | Текущее значение | Статус |',
			'|---|---|---|---|',
			'| Выполнение SLA | 95.0% | 97.8% | В норме |',
			'| Пропускная способность | 120 оп/ч | 146 оп/ч | Оптимально |',
			'| Ожидают подтверждения | 3 задачи | 1 задача | Требует внимания |',
			'',
			'- **Шаг 1:** Проверьте задачу `TSK-2041` в разделе **AI Tasks**.',
			'- **Шаг 2:** Убедитесь, что BFF `/api/v1/` подключён к корпоративному FastAPI backend.',
			'',
			'```typescript',
			'const controller = new AbortController();',
			'await apiClient.streamChat(payload, callbacks, { signal: controller.signal });',
			'```',
		].join('\n')
	}

	return [
		`### Operatsion tahlil xulosasi`,
		`So‘rovingiz qayta ishlandi: **${cleanSnippet || 'Operatsion topshiriq'}**${
			attachmentsCount > 0
				? ` (${attachmentsCount} ta tekshirilgan fayl biriktirildi)`
				: ''
		}.`,
		'',
		'| Ko‘rsatkich | Reja | Joriy holat | Ustuvorlik |',
		'|---|---|---|---|',
		'| SLA bajarilishi | 95.0% | 97.8% | Barqaror |',
		'| Qayta ishlash tezligi | 120 op/soat | 146 op/soat | Optimal |',
		'| Tasdiq kutayotganlar | 3 ta | 1 ta | Nazoratda |',
		'',
		'- **1-qadam:** **AI Tasks** bo‘limida `TSK-2041` vazifasini ko‘rib chiqing.',
		'- **2-qadam:** Jonli muhitga o‘tishda `/api/v1/` BFF shartnomalarini FastAPI backend bilan tasdiqlang.',
		'',
		'```typescript',
		'const controller = new AbortController();',
		'await apiClient.streamChat(payload, callbacks, { signal: controller.signal });',
		'```',
	].join('\n')
}

function writeSseEvent(res: Response, event: string, data: unknown): void {
	res.write(`event: ${event}\n`)
	res.write(`data: ${JSON.stringify(data)}\n\n`)
}

async function startServer(): Promise<void> {
	const app = express()

	app.use((_req, res, next) => {
		res.setHeader('X-Content-Type-Options', 'nosniff')
		res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
		res.setHeader(
			'Permissions-Policy',
			'camera=(), microphone=(), geolocation=()',
		)
		next()
	})

	// Raw buffer parser strictly for multipart file uploads on /api/v1/files/upload
	app.post(
		'/api/v1/files/upload',
		requirePlatformSession,
		express.raw({ type: 'multipart/form-data', limit: '11mb' }),
		(req: Request, res: Response) => {
			const contentType = req.header('content-type') ?? ''
			if (!Buffer.isBuffer(req.body)) {
				res.status(400).json({
					error: {
						code: 'INVALID_UPLOAD_BODY',
						message: 'Expected multipart/form-data payload.',
						status: 400,
					},
				})
				return
			}

			const parsed = parseMultipartSingleFile(req.body, contentType)
			if (!parsed) {
				res.status(400).json({
					error: {
						code: 'MISSING_FILE',
						message: 'No file found in upload payload.',
						status: 400,
					},
				})
				return
			}

			if (!ALLOWED_ORG_IDS.has(parsed.organizationId)) {
				res.status(403).json({
					error: {
						code: 'ORG_ACCESS_DENIED',
						message: 'Organization access denied.',
						status: 403,
					},
				})
				return
			}

			const validation = validateAttachmentFile({
				name: parsed.fileName,
				size: parsed.dataLength,
				type: parsed.mimeType,
			})

			if (!validation.valid || !validation.extension) {
				res.status(400).json({
					error: {
						code: validation.errorCode ?? 'INVALID_FILE',
						message: validation.errorMessage ?? 'File validation failed.',
						status: 400,
					},
				})
				return
			}

			res.status(201).json({
				attachment: {
					id: `att_${crypto.randomUUID()}`,
					fileName: validation.sanitizedName,
					extension: validation.extension,
					mimeType: parsed.mimeType,
					sizeBytes: parsed.dataLength,
					uploadedAt: new Date().toISOString(),
					status: 'ready',
					progress: 100,
				},
			})
		},
	)

	app.use(express.json({ limit: '1mb' }))

	app.get('/api/v1/health', (_req: Request, res: Response) => {
		res.json({ status: 'ok', bff: 'v1' })
	})

	app.get('/api/v1/system/config', (_req: Request, res: Response) => {
		const fastApiUrl = getValidatedFastApiUrl()
		const gemini = getGeminiClient()
		const apiMode =
			process.env.API_MODE === 'live' && fastApiUrl ? 'live' : 'demo'

		res.json({
			apiMode,
			bffVersion: 'v1',
			backendConfigured: Boolean(fastApiUrl),
			geminiConfigured: Boolean(gemini),
			allowedExtensions: [...ALLOWED_EXTENSIONS],
			maxFileSizeBytes: MAX_ATTACHMENT_SIZE_BYTES,
		})
	})

	app.get('/api/v1/auth/session', (_req: Request, res: Response) => {
		const fastApiUrl = getValidatedFastApiUrl()
		const apiMode =
			process.env.API_MODE === 'live' && fastApiUrl ? 'live' : 'demo'

		if (!sessionActive) {
			res.json({
				authenticated: false,
				user: null,
				organizations: [],
				activeOrganizationId: '',
				apiMode,
				authProvider: 'frontend-1-sso',
			})
			return
		}

		res.json({
			authenticated: true,
			user: DEMO_USER,
			organizations: DEMO_ORGANIZATIONS,
			activeOrganizationId: DEMO_ORGANIZATIONS[0].id,
			apiMode,
			authProvider: 'frontend-1-sso',
		})
	})

	app.post('/api/v1/auth/signout', (_req: Request, res: Response) => {
		sessionActive = false
		res.json({ ok: true })
	})

	app.post('/api/v1/auth/restore', (_req: Request, res: Response) => {
		sessionActive = true
		const fastApiUrl = getValidatedFastApiUrl()
		const apiMode =
			process.env.API_MODE === 'live' && fastApiUrl ? 'live' : 'demo'
		res.json({
			authenticated: true,
			user: DEMO_USER,
			organizations: DEMO_ORGANIZATIONS,
			activeOrganizationId: DEMO_ORGANIZATIONS[0].id,
			apiMode,
			authProvider: 'frontend-1-sso',
		})
	})

	app.get(
		'/api/v1/chats',
		requirePlatformSession,
		(req: Request, res: Response) => {
			const orgId =
				typeof req.query.organizationId === 'string'
					? req.query.organizationId
					: DEMO_ORGANIZATIONS[0].id
			const chats = getSeedChatsForTenant(orgId, DEMO_USER.id)
			res.json({ chats, mode: 'demo' })
		},
	)

	app.get(
		'/api/v1/tasks',
		requirePlatformSession,
		(req: Request, res: Response) => {
			const orgId =
				typeof req.query.organizationId === 'string'
					? req.query.organizationId
					: DEMO_ORGANIZATIONS[0].id
			const filtered = tasksStore.filter(t => t.organizationId === orgId)
			res.json({ tasks: filtered, mode: 'demo' })
		},
	)

	app.post(
		'/api/v1/tasks/:id/decision',
		requirePlatformSession,
		(req: Request, res: Response) => {
			const taskId = String(req.params.id ?? '')
			const { decision, note } = (req.body ?? {}) as {
				decision?: 'approve' | 'reject'
				note?: string
			}

			if (decision !== 'approve' && decision !== 'reject') {
				res.status(400).json({
					error: {
						code: 'INVALID_DECISION',
						message: 'Decision must be "approve" or "reject".',
						status: 400,
					},
				})
				return
			}

			const taskIndex = tasksStore.findIndex(t => t.id === taskId)
			if (taskIndex === -1) {
				res.status(404).json({
					error: {
						code: 'TASK_NOT_FOUND',
						message: 'Task not found.',
						status: 404,
					},
				})
				return
			}

			const task = tasksStore[taskIndex]
			const orgHeader = req.header('x-aljabr-org-id')
			if (orgHeader && task.organizationId !== orgHeader) {
				res.status(403).json({
					error: {
						code: 'ORG_ACCESS_DENIED',
						message: 'Task does not belong to active organization.',
						status: 403,
					},
				})
				return
			}

			// Guardrail: block financial payment actions strictly
			if ((task.category as string) === 'financial_payment') {
				res.status(403).json({
					error: {
						code: 'FINANCIAL_ACTION_FORBIDDEN',
						message: 'Financial payment approvals via AI are prohibited.',
						status: 403,
					},
				})
				return
			}

			if (task.status !== 'Awaiting Approval') {
				res.status(409).json({
					error: {
						code: 'INVALID_STATE',
						message: 'Only tasks awaiting approval can be decided.',
						status: 409,
					},
				})
				return
			}

			const now = new Date().toISOString()
			const updatedTask: AiTask = {
				...task,
				status: decision === 'approve' ? 'Completed' : 'Cancelled',
				completedAt: now,
				approvalNote:
					typeof note === 'string' ? note.trim().slice(0, 400) : undefined,
				errorReason:
					decision === 'reject'
						? (typeof note === 'string' && note.trim()) ||
							'Operator tomonidan rad etildi.'
						: null,
				steps: task.steps.map((step, idx) =>
					idx === task.steps.length - 1
						? {
								...step,
								completed: decision === 'approve',
								timestamp: now.slice(11, 19),
							}
						: step,
				),
			}

			tasksStore[taskIndex] = updatedTask
			res.json({ task: updatedTask })
		},
	)

	app.post(
		'/api/v1/chat/stream',
		requirePlatformSession,
		async (req: Request, res: Response) => {
			const body = (req.body ?? {}) as Partial<ChatStreamRequest>
			const message =
				typeof body.message === 'string' ? body.message.trim() : ''
			const locale: Locale =
				body.locale === 'en' || body.locale === 'ru' ? body.locale : 'uz'
			const attachments = Array.isArray(body.attachments)
				? body.attachments
				: []

			if (!message && attachments.length === 0) {
				res.status(400).json({
					error: {
						code: 'EMPTY_PROMPT',
						message: 'Message or attachment is required.',
						status: 400,
					},
				})
				return
			}

			res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
			res.setHeader('Cache-Control', 'no-cache, no-transform')
			res.setHeader('Connection', 'keep-alive')
			res.flushHeaders?.()

			let closed = false
			req.on('close', () => {
				closed = true
			})

			const gemini = getGeminiClient()
			if (gemini) {
				writeSseEvent(res, 'meta', {
					agentName: 'ALJABR Command Agent',
					mode: 'live',
				})

				try {
					const attachmentContext =
						attachments.length > 0
							? `\nAttached verified files: ${attachments
									.map(a => `${a.fileName} (${a.extension})`)
									.join(', ')}`
							: ''
					const systemInstruction =
						locale === 'uz'
							? 'Siz ALJABR AI Business Operations Platform operatsion yordamchisisiz. Javoblarni aniq, professional korporativ uslubda Markdown, jadvallar va ro‘yxatlar bilan bering. Moliyaviy to‘lovlarni tasdiqlamang.'
							: locale === 'ru'
								? 'Вы операционный ассистент ALJABR AI Business Operations Platform. Отвечайте профессионально, используя Markdown, таблицы и списки. Не подтверждайте финансовые платежи.'
								: 'You are the ALJABR AI Business Operations Platform assistant. Respond clearly in corporate Markdown with tables and structured lists. Never approve or initiate financial payments.'

					const responseStream = await gemini.models.generateContentStream({
						model: 'gemini-2.5-flash',
						contents: `${message}${attachmentContext}`,
						config: {
							systemInstruction,
						},
					})

					for await (const chunk of responseStream) {
						if (closed) break
						if (chunk.text) {
							writeSseEvent(res, 'delta', { text: chunk.text })
						}
					}

					if (!closed) {
						writeSseEvent(res, 'done', { ok: true })
						res.end()
					}
					return
				} catch (err) {
					console.error(
						'Gemini streaming error, falling back to deterministic BFF stream:',
						err,
					)
				}
			}

			// Deterministic corporate streaming fallback (Demo Mode)
			writeSseEvent(res, 'meta', {
				agentName: 'ALJABR Ops Assistant (Demo)',
				mode: 'demo',
			})

			const fullReply = buildDemoMarkdownReply(
				message,
				locale,
				attachments.length,
			)
			const tokens = fullReply.match(/\S+\s*|\n+/g) ?? [fullReply]

			for (const token of tokens) {
				if (closed) break
				writeSseEvent(res, 'delta', { text: token })
				await new Promise(resolve => setTimeout(resolve, 22))
			}

			if (!closed) {
				writeSseEvent(res, 'done', { ok: true })
				res.end()
			}
		},
	)

	// Unknown /api/v1 routes return structured JSON 404
	app.use('/api/v1', (_req: Request, res: Response) => {
		res.status(404).json({
			error: {
				code: 'NOT_FOUND',
				message: 'Requested API endpoint does not exist.',
				status: 404,
			},
		})
	})

	const httpServer = http.createServer(app)

	if (IS_PROD) {
		const distDir = path.resolve(process.cwd(), 'dist')
		app.use(express.static(distDir))
		app.get('*', (_req: Request, res: Response) => {
			const indexFile = path.join(distDir, 'index.html')
			if (fs.existsSync(indexFile)) {
				res.sendFile(indexFile)
			} else {
				res.status(404).send('Build artifacts not found.')
			}
		})
	} else {
		const vite = await createViteServer({
			server: {
				middlewareMode: true,
				// HMR runs on the main HTTP server, so a separate port (24678) is not needed
				hmr: { server: httpServer },
			},
			appType: 'spa',
		})
		app.use(vite.middlewares)
	}

	const MAX_PORT_ATTEMPTS = 10
	let currentPort = PORT
	let attempts = 0

	httpServer.on('error', (err: NodeJS.ErrnoException) => {
		if (err.code === 'EADDRINUSE' && attempts < MAX_PORT_ATTEMPTS) {
			attempts += 1
			console.warn(
				`Port ${currentPort} band, ${currentPort + 1} sinab ko'rilmoqda...`,
			)
			currentPort += 1
			httpServer.listen(currentPort, '0.0.0.0')
			return
		}
		console.error('Server xatosi:', err)
		process.exit(1)
	})

	httpServer.on('listening', () => {
		console.warn(
			`ALJABR BFF + Platform running on http://localhost:${currentPort}`,
		)
	})

	httpServer.listen(currentPort, '0.0.0.0')
}

startServer().catch(err => {
	console.error('Failed to start ALJABR server:', err)
	process.exit(1)
})
