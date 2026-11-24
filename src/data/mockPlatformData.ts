import type { AiTask, ChatSession, Organization, PlatformUser } from '../types/api';

export const DEMO_USER: PlatformUser = {
  id: 'usr_jamshidbek_01',
  fullName: 'Jamshidbek Madaminjonov',
  email: 'jamshidbek.m@aljabr.uz',
  role: 'Operations Lead',
  avatarUrl: '/src/assets/images/avatar_aljabr_operator_1795506557970.jpg',
};

export const DEMO_ORGANIZATIONS: Organization[] = [
  {
    id: 'org_tashkent_hq',
    name: 'ALJABR Toshkent HQ',
    code: 'TAS-HQ',
    region: 'Toshkent',
  },
  {
    id: 'org_samarkand_hub',
    name: 'ALJABR Samarqand Hub',
    code: 'SKD-02',
    region: 'Samarqand',
  },
];

export function getSeedChatsForTenant(
  organizationId: string,
  userId: string,
): ChatSession[] {
  if (organizationId === 'org_samarkand_hub') {
    return [
      {
        id: 'chat_skd_01',
        organizationId,
        userId,
        title: 'Samarqand logistika jadvali optimizatsiyasi',
        createdAt: '2026-11-22T09:15:00.000Z',
        updatedAt: '2026-11-22T09:20:00.000Z',
        messages: [
          {
            id: 'msg_skd_1',
            role: 'user',
            content: 'Samarqand hubi uchun haftalik yuk jo‘natish marshrutlari bo‘yicha qisqacha xulosa ber.',
            createdAt: '2026-11-22T09:15:00.000Z',
            status: 'completed',
          },
          {
            id: 'msg_skd_2',
            role: 'assistant',
            agentName: 'Logistics Planner Agent',
            content:
              '### Samarqand Hub marshrut tahlili\n\nOxirgi 14 kunlik jo‘natmalar asosida yuklash oynalarini qayta taqsimlash kechikishlarni **18.4%** ga kamaytiradi:\n\n| Yo‘nalish | Kunlik reys | O‘rtacha yuklama | Tavsiya |\n|---|---|---|---|\n| Samarqand — Buxoro | 4 | 88% | Ertalabki 07:00 oynasini saqlash |\n| Samarqand — Navoiy | 3 | 72% | Ikki reysni birlashtirish |\n| Samarqand — Jizzax | 5 | 91% | Qo‘shimcha zaxira furgon ajratish |',
            createdAt: '2026-11-22T09:16:10.000Z',
            status: 'completed',
          },
        ],
      },
    ];
  }

  return [
    {
      id: 'chat_tas_01',
      organizationId,
      userId,
      title: 'Q4 Ombor qoldiqlari va SLA auditi',
      createdAt: '2026-11-23T11:30:00.000Z',
      updatedAt: '2026-11-23T11:34:00.000Z',
      messages: [
        {
          id: 'msg_tas_1',
          role: 'user',
          content: 'Toshkent markaziy ombori bo‘yicha joriy haftadagi asosiy ko‘rsatkichlarni jadvalda chiqar.',
          createdAt: '2026-11-23T11:30:00.000Z',
          status: 'completed',
        },
        {
          id: 'msg_tas_2',
          role: 'assistant',
          agentName: 'SupplyChain Analyst',
          content:
            '### Toshkent HQ ombor ko‘rsatkichlari\n\nQuyida oxirgi 7 kunlik operatsion ma’lumotlar jamlangan:\n\n| Kategoriya | Kirim (dona) | Chiqim (dona) | SLA bajarilishi |\n|---|---|---|---|\n| Server uskunalari | 142 | 128 | 98.5% |\n| Tarmoq kommunikatorlari | 310 | 295 | 96.2% |\n| POS terminallar | 85 | 84 | 99.1% |\n\n**Tavsiya etilgan keyingi qadamlar:**\n1. Tarmoq kommunikatorlari uchun xavfsizlik zaxirasini 15% ga oshirish.\n2. `TSK-2041` raqamli qayta buyurtma loyihasini AI Tasks bo‘limida ko‘rib chiqish.',
          createdAt: '2026-11-23T11:31:00.000Z',
          status: 'completed',
        },
      ],
    },
    {
      id: 'chat_tas_02',
      organizationId,
      userId,
      title: 'Yetkazib beruvchi shartnomasi tekshiruvi',
      createdAt: '2026-11-21T15:10:00.000Z',
      updatedAt: '2026-11-21T15:14:00.000Z',
      messages: [
        {
          id: 'msg_tas_3',
          role: 'user',
          content: 'Yangi logistika shartnomasida qaysi SLA bandlarini alohida tekshirish kerak?',
          createdAt: '2026-11-21T15:10:00.000Z',
          status: 'completed',
        },
        {
          id: 'msg_tas_4',
          role: 'assistant',
          agentName: 'Compliance Reviewer',
          content:
            '- **Yetkazib berish muddati:** Maksimal 24 soatlik oynani aniq belgilash.\n- **Fors-major xabarnomasi:** Yozma ogohlantirish muddatini 48 soat bilan cheklash.\n- **Ma’lumotlar maxfiyligi:** Yuk xatlari API almashinuvida TLS 1.3 talabi.',
          createdAt: '2026-11-21T15:11:12.000Z',
          status: 'completed',
        },
      ],
    },
  ];
}

export const INITIAL_DEMO_TASKS: AiTask[] = [
  {
    id: 'TSK-2041',
    organizationId: 'org_tashkent_hq',
    title: 'Ombor zaxirasi qayta buyurtma rejasini nashr etish',
    category: 'logistics',
    agentName: 'SupplyChain Agent',
    status: 'Awaiting Approval',
    startedAt: '2026-11-23T10:12:00.000Z',
    completedAt: null,
    summary: 'Q4 uchun 18 ta SKU bo‘yicha yetkazib berish jadvali loyihasi tayyorlandi.',
    resultDetail:
      'Toshkent markaziy omborida 18 ta pozitsiya minimal qoldiq chegarasidan pastga tushgan. Yetkazib beruvchilarga jo‘natish uchun xarid so‘rovi emas, balki omborlararo ichki ko‘chirish (transfer) jadvali tuzildi.',
    errorReason: null,
    requiresHumanApproval: true,
    approvalActionLabel: 'Ichki ombor ko‘chirish jadvalini tasdiqlash',
    steps: [
      { label: 'ERP qoldiq ma’lumotlarini yig‘ish', completed: true, timestamp: '10:12:04' },
      { label: 'Talab prognozini hisoblash', completed: true, timestamp: '10:12:19' },
      { label: 'Operatsion menejer tasdig‘ini kutish', completed: false },
    ],
  },
  {
    id: 'TSK-2040',
    organizationId: 'org_tashkent_hq',
    title: 'Yetkazib beruvchi SLA shartnomasi muvofiqlik tahlili',
    category: 'compliance',
    agentName: 'Contract Analyst',
    status: 'Completed',
    startedAt: '2026-11-23T09:05:00.000Z',
    completedAt: '2026-11-23T09:07:42.000Z',
    summary: '24 betlik PDF shartnomada 2 ta o‘rta darajadagi SLA nomuvofiqligi aniqlandi.',
    resultDetail:
      '4.2-bandda kechikish jarimasi muddati noaniq ko‘rsatilgan; 7.1-bandda ma’lumotlarni saqlash muddati 3 yildan 5 yilga yangilanishi tavsiya etiladi.',
    errorReason: null,
    requiresHumanApproval: false,
    approvalActionLabel: null,
    steps: [
      { label: 'Hujjat matnini ajratib olish', completed: true, timestamp: '09:05:11' },
      { label: 'Korporativ SLA shabloni bilan solishtirish', completed: true, timestamp: '09:06:50' },
      { label: 'Yakuniy xulosani shakllantirish', completed: true, timestamp: '09:07:42' },
    ],
  },
  {
    id: 'TSK-2039',
    organizationId: 'org_tashkent_hq',
    title: 'Haftalik operatsion KPI hisobotini yig‘ish',
    category: 'analytics',
    agentName: 'Ops Telemetry Agent',
    status: 'Running',
    startedAt: '2026-11-23T11:40:00.000Z',
    completedAt: null,
    summary: 'Hududiy filiallar bo‘yicha buyurtma bajarilish tezligi agregatsiya qilinmoqda.',
    resultDetail: null,
    errorReason: null,
    requiresHumanApproval: false,
    approvalActionLabel: null,
    steps: [
      { label: 'Filial ma’lumotlarini olish', completed: true, timestamp: '11:40:09' },
      { label: 'Anomaliyalarni tekshirish', completed: false },
      { label: 'Hisobotni eksport qilish', completed: false },
    ],
  },
  {
    id: 'TSK-2038',
    organizationId: 'org_tashkent_hq',
    title: 'CRM eksport faylini sinxronizatsiya qilish',
    category: 'operations',
    agentName: 'Data Sync Agent',
    status: 'Failed',
    startedAt: '2026-11-23T07:50:00.000Z',
    completedAt: '2026-11-23T07:51:15.000Z',
    summary: 'Tashqi CRM eksport manbasida ustun formati mos kelmadi.',
    resultDetail: null,
    errorReason:
      'SCHEMA_MISMATCH: "delivery_window_utc" ustuni ISO-8601 formatida emas ("N/A" qiymati topildi, 148-qator).',
    requiresHumanApproval: false,
    approvalActionLabel: null,
    steps: [
      { label: 'CSV eksportini o‘qish', completed: true, timestamp: '07:50:12' },
      { label: 'Sana formatini validatsiya qilish', completed: false },
    ],
  },
  {
    id: 'TSK-2037',
    organizationId: 'org_tashkent_hq',
    title: 'Yangi xodimlar onboarding hujjat paketini tayyorlash',
    category: 'hr',
    agentName: 'HR Onboarding Agent',
    status: 'Pending',
    startedAt: '2026-11-23T11:44:00.000Z',
    completedAt: null,
    summary: '3 nafar yangi muhandis uchun ichki qo‘llanma va kirish ro‘yxati navbatda.',
    resultDetail: null,
    errorReason: null,
    requiresHumanApproval: false,
    approvalActionLabel: null,
    steps: [
      { label: 'Navbatda kutilmoqda', completed: false },
    ],
  },
  {
    id: 'TSK-2036',
    organizationId: 'org_tashkent_hq',
    title: 'Arxivlangan 2025 buyurtmalarini qayta indekslash',
    category: 'operations',
    agentName: 'Archive Indexer',
    status: 'Cancelled',
    startedAt: '2026-11-22T18:00:00.000Z',
    completedAt: '2026-11-22T18:02:10.000Z',
    summary: 'Operator so‘rovi bilan rejalashtirilgan texnik oynaga ko‘chirildi.',
    resultDetail: null,
    errorReason: 'Operator tomonidan bekor qilindi.',
    requiresHumanApproval: false,
    approvalActionLabel: null,
    steps: [
      { label: 'Indekslash tayyorgarligi', completed: true, timestamp: '18:00:15' },
      { label: 'Bekor qilindi', completed: false },
    ],
  },
  {
    id: 'TSK-3011',
    organizationId: 'org_samarkand_hub',
    title: 'Samarqand ombori kunlik inventarizatsiya aktini tasdiqlash',
    category: 'logistics',
    agentName: 'Logistics Planner Agent',
    status: 'Awaiting Approval',
    startedAt: '2026-11-23T08:30:00.000Z',
    completedAt: null,
    summary: 'SKD-02 ombori bo‘yicha 420 ta pozitsiya tekshirildi, tafovut 0.2%.',
    resultDetail:
      'Inventarizatsiya yakunlandi. Hisobdan chiqarish yoki moliyaviy operatsiya mavjud emas; faqat ombor qoldiq reyestrini yangilash tasdig‘i so‘ralmoqda.',
    errorReason: null,
    requiresHumanApproval: true,
    approvalActionLabel: 'SKD-02 qoldiq reyestrini yangilashni tasdiqlash',
    steps: [
      { label: 'Shtrix-kod skanerlash loglarini yuklash', completed: true, timestamp: '08:31:00' },
      { label: 'Tafovutlarni solishtirish', completed: true, timestamp: '08:33:14' },
      { label: 'Menejer tasdig‘ini kutish', completed: false },
    ],
  },
];
