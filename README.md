# Daily Card

Telegram Mini App показывает карточку дня и автоматически регистрирует
пользователей для уведомлений. Администратор загружает новую карточку через
защищённую Supabase Edge Function.

## Локальный запуск

Требуются Node.js 22+, npm и Supabase CLI.

1. Скопируйте `.env.example` в `.env.local`.
2. Укажите URL Supabase, publishable key и Telegram ID администратора.
3. Выполните:

```sh
npm ci
npm run dev
```

Полная проверка проекта:

```sh
npm run check
npm audit --audit-level=high
```

## Supabase

Примените миграции и настройте серверные секреты:

```sh
supabase db push
supabase secrets set \
  BOT_TOKEN=... \
  ADMIN_ID=... \
  ALLOWED_ORIGIN=https://YOUR_SITE_ORIGIN
```

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` предоставляются функциям
платформой. Service-role key нельзя помещать в `VITE_*`: эти значения доступны
в браузере.

Разверните функции:

```sh
supabase functions deploy subscribe-user
supabase functions deploy upload-card
```

Миграции создают таблицы, бакет `card-images`, ограничения файлов и RLS.
Запись карточек, подписчиков и файлов выполняется только Edge Functions.

## Безопасность загрузки

`upload-card` проверяет подпись и возраст Telegram `initData`, серверный
`ADMIN_ID`, размер, MIME-тип и сигнатуру JPEG, PNG или WebP. При ошибке БД новый
файл удаляется; после успешной замены удаляется предыдущий.

## Откат

Версия до усиления безопасности сохранена в Git-ветке
`backup/pre-changes-20260725-130138`. Возврат Git-ветки не отменяет уже
применённые миграции удалённой базы.
