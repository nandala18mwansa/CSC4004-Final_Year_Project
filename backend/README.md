# Department Management System - Backend

Django REST API for the Department Management System.

## Setup

### 1. Create virtual environment
```bash
python -m venv venv
.\venv\Scripts\Activate  # Windows
source venv/bin/activate  # Mac/Linux
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run migrations
```bash
python manage.py migrate
```

### 4. Create superuser (optional)
```bash
python manage.py createsuperuser
```

### 5. Run development server
```bash
python manage.py runserver
```

Server runs at `http://127.0.0.1:8000`

---

## API Endpoints

### Authentication
- `POST /api/token/` - Login (get access & refresh tokens)
- `POST /api/token/refresh/` - Refresh access token

### Users
- `POST /api/register/` - Register new user
- `GET /api/profile/` - Get current user profile
- `GET /api/users/` - List all users
- `GET/PATCH /api/users-admin/{id}/` - Admin user management

### Finance
- `GET/POST /api/budgets/` - Budget CRUD
- `GET/POST /api/expenses/` - Expense CRUD
- `GET /api/approvals/` - Approval list

### Activities
- `GET/POST /api/activities/` - Activity CRUD

### Resources
- `GET/POST /api/resources/` - Resource CRUD
- `GET/POST /api/allocations/` - Allocation CRUD

---

## Database

Uses SQLite (`db.sqlite3`) for development. Switch to MySQL in `core/settings.py` for production.

---

## Default Test User

```
Username: testuser
Password: testpass123
Role: Superuser
```
