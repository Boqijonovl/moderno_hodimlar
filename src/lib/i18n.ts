export const translations = {
  uz: {
    // Menu
    menu_home: "Asosiy",
    menu_attendance: "Davomat",
    menu_sales: "Savdolar",
    menu_settings: "Sozlamalar",
    
    // Admin Panel
    admin_panel: "Admin Panel",
    admin_panel_desc: "Barcha xodimlar, davomat va savdolar statistikasini boshqarish.",
    go_to_panel: "Panelga O'tish",
    
    // Home
    welcome: "Xush kelibsiz",
    open_app: "Ilovani ochish uchun quyidagi tugmani bosing!",
    blocked_title: "Kirish Taqiqlangan",
    blocked_desc: "Sizning akkauntingiz admin tomonidan bloklangan.",
    no_permission: "Sizda ushbu bo'limdan foydalanish ruxsati yo'q",
    
    // Attendance
    check_in: "Ishga keldim",
    check_out: "Yakunladim",
    history: "Tarix",
    total_late: "Umumiy kechikish",
    no_attendance: "Hali davomat qayd etilmagan.",
    entry: "Kirish",
    exit: "Chiqish",
    reason: "Izoh",
    on_time: "Vaqtida",
    late: "Kechikdi",
    absent: "Kelmagan",
    gps_error: "Qurilmangizda GPS yo'q yoki ruxsat etilmagan",
    getting_gps: "Geolokatsiya olinmoqda...",
    network_error: "Tarmoq xatosi",
    minute: "daqiqa",
    hour: "soat",
    
    // Sales
    add_sale: "Savdo qo'shish",
    item_name: "Tovar nomi",
    price: "Summa",
    payment_method: "To'lov turi",
    cash: "Naqd",
    card: "Karta",
    installment: "Nasiya",
    add_btn: "Qo'shish",
    adding: "Qo'shilmoqda...",
    no_sales: "Hali savdolar qayd etilmagan.",
    category: "Mebel Kategoriyasi",
    success: "Qabul qilindi!",
    success_msg: "Sotuv muvaffaqiyatli saqlandi va adminga yuborildi.",
    error: "Xatolik",
    
    // Settings
    personal_info: "Shaxsiy Ma'lumotlar",
    name: "Ismingiz",
    save: "Saqlash",
    saving: "Saqlanmoqda...",
    app_settings: "Ilova Sozlamalari",
    system_lang: "Tizim Tili",
    theme: "Rang Mavzusi",
    light: "Yorug'",
    dark: "Qorong'u",
    success_save: "Muvaffaqiyatli saqlandi"
  },
  ru: {
    // Menu
    menu_home: "Главная",
    menu_attendance: "Посещаемость",
    menu_sales: "Продажи",
    menu_settings: "Настройки",
    
    // Admin Panel
    admin_panel: "Панель Админа",
    admin_panel_desc: "Управление сотрудниками, посещаемостью и продажами.",
    go_to_panel: "Перейти в Панель",
    
    // Home
    welcome: "Добро пожаловать",
    open_app: "Нажмите кнопку ниже, чтобы открыть приложение!",
    blocked_title: "Доступ Запрещен",
    blocked_desc: "Ваш аккаунт заблокирован администратором.",
    no_permission: "У вас нет разрешения на использование этого раздела",
    
    // Attendance
    check_in: "Пришел на работу",
    check_out: "Завершил",
    history: "История",
    total_late: "Общее опоздание",
    no_attendance: "Посещаемость еще не зарегистрирована.",
    entry: "Вход",
    exit: "Выход",
    reason: "Причина",
    on_time: "Вовремя",
    late: "Опоздал",
    absent: "Отсутствует",
    gps_error: "На вашем устройстве нет GPS или доступ запрещен",
    getting_gps: "Получение геолокации...",
    network_error: "Ошибка сети",
    minute: "минут",
    hour: "час",
    
    // Sales
    add_sale: "Добавить продажу",
    item_name: "Название товара",
    price: "Сумма",
    payment_method: "Тип оплаты",
    cash: "Наличные",
    card: "Карта",
    installment: "В рассрочку",
    add_btn: "Добавить",
    adding: "Добавление...",
    no_sales: "Продажи еще не зарегистрированы.",
    category: "Категория мебели",
    success: "Принято!",
    success_msg: "Продажа успешно сохранена и отправлена администратору.",
    error: "Ошибка",
    
    // Settings
    personal_info: "Личные Данные",
    name: "Ваше имя",
    save: "Сохранить",
    saving: "Сохранение...",
    app_settings: "Настройки Приложения",
    system_lang: "Язык Системы",
    theme: "Тема Цветов",
    light: "Светлая",
    dark: "Темная",
    success_save: "Успешно сохранено"
  }
};

export type Language = 'uz' | 'ru';
export type TranslationKey = keyof typeof translations.uz;

export function useTranslation(lang: Language = 'uz') {
  return function t(key: TranslationKey): string {
    return translations[lang][key] || translations['uz'][key] || key;
  };
}
