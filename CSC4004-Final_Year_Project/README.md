# Departmental Resource and Financial Management System

This project contains a Django REST API backend and a Vite React frontend for managing departmental budgets, expense approvals, activities, and resource allocations.

## Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.mysql.example .env
python manage.py migrate
python manage.py runserver
```

The cleaned project includes `backend/database_cleaned_mysql.sql`, which restores the old useful data into the readable table names used by the updated code. Import it before starting the backend:

```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < database_cleaned_mysql.sql
```

Then edit `backend/.env` and set `DB_PASSWORD` to your local MySQL password. The database name is `Departmental_Management_System`.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend API to be available at `http://127.0.0.1:8000/api/` unless `src/utils/api.js` is changed.

## Verification

```bash
cd backend
python manage.py test

cd ../frontend
npm run lint
npm run build
```

## Database notes

The old raw dump was replaced with `backend/database_cleaned_mysql.sql`. It keeps the application usable with MySQL while removing obsolete table names and generated clutter. The readable application tables are:

- `users`
- `users_groups`
- `users_user_permissions`
- `budgets`
- `expenses`
- `approvals`
- `transactions`
- `resources`
- `allocations`
- `activities`
