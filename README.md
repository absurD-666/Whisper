# Whisper Messenger

Безопасный мессенджер со сквозным шифрованием.

## Возможности

- Текстовые сообщения
- Голосовые сообщения
- Аудио и видеозвонки (WebRTC)
- Загрузка изображений
- Профили пользователей с аватарами
- Контакты и поиск по никнейму
- Онлайн-статусы
- Защита аутентификации

## Технологии

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Shadcn UI
- Convex (бэкенд и база данных)
- Convex Auth
- Framer Motion
- Lucide Icons
- Electron (десктопная версия)

## Запуск

```bash
# Установка зависимостей
bun install

# Запуск в режиме разработки
bun run dev

# Сборка веб-версии
bun run build
```

## Десктопная версия (Electron)

```bash
# Сборка .exe установщика для Windows
bun run electron:build

# Портативная версия (без установки)
bun run electron:build:portable
```

Файлы установщика появятся в папке `release/`.

## Структура проекта

```
src/
├── pages/          # Страницы (Landing, Auth, Messenger)
├── components/     # React компоненты
│   └── ui/         # Shadcn UI компоненты
├── convex/         # Бэкенд (схемы, запросы, мутации)
├── hooks/          # React хуки
├── lib/            # Утилиты
├── assets/         # Статические ресурсы
└── types/          # TypeScript типы

electron/           # Electron main process
build/              # Иконки для сборки
public/             # Статические файлы для веб-версии
```

## Окружение

Переменные окружения настраиваются через платформу Convex:

- `VITE_CONVEX_URL` — URL Convex backend (клиент)
- `CONVEX_DEPLOYMENT` — Convex deployment (сервер)
