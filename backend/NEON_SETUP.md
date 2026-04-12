# Neon Database Setup Guide

This guide will help you configure your application to use Neon PostgreSQL database.

## What is Neon?

Neon is a serverless PostgreSQL platform that separates storage and compute, offering features like:
- Instant database branching
- Automatic scaling
- Built-in connection pooling
- Free tier available

## Setup Instructions

### Step 1: Create a Neon Account

1. Go to [https://neon.tech](https://neon.tech)
2. Sign up for a free account (GitHub, Google, or email)
3. Create a new project

### Step 2: Get Your Connection String

1. In the Neon Console, go to your project dashboard
2. Click on "Connect" or find the connection string in the overview
3. Copy the connection string (it looks like):
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

### Step 3: Configure Your Environment

1. Open the `.env` file in the `backend` folder
2. Replace the `DATABASE_URL` with your Neon connection string:
   ```env
   DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

3. (Optional) Update other settings:
   ```env
   SECRET_KEY=your-secure-random-string-at-least-32-characters
   DEFAULT_ADMIN_USERNAME=your-admin-username
   DEFAULT_ADMIN_PASSWORD=your-secure-password
   ```

### Step 4: Install Dependencies

Navigate to the backend folder and install the required packages:

```bash
cd backend
pip install -r requirements.txt
```

### Step 5: Run Database Migrations

The tables will be created automatically when you start the backend server for the first time.

### Step 6: Start the Backend Server

```bash
cd backend
python main.py
```

Or using uvicorn directly:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 7: Verify Connection

Visit `http://localhost:8000/api/health` in your browser or use curl:

```bash
curl http://localhost:8000/api/health
```

You should see:
```json
{
  "status": "healthy",
  "database": "Neon PostgreSQL"
}
```

## Connection Pooling Configuration

The application is configured with optimal connection pooling settings for Neon:

- `pool_size=10`: Number of connections to keep open
- `max_overflow=20`: Additional connections allowed during peak load
- `pool_pre_ping=True`: Health check before using connections
- `pool_recycle=300`: Recycle connections after 5 minutes

## Security Best Practices

1. **Never commit `.env` to version control** - It's already in `.gitignore`
2. **Use strong passwords** - Generate secure random strings for:
   - `SECRET_KEY` (JWT signing)
   - `DEFAULT_ADMIN_PASSWORD`
   - Database password
3. **Enable branch protection** in Neon Console for production
4. **Use environment-specific branches** - Dev, Staging, Production

## Troubleshooting

### Connection Issues

1. **SSL Error**: Make sure your connection string includes `?sslmode=require`
2. **Timeout**: Check your firewall settings and Neon project status
3. **Authentication Failed**: Verify username and password in connection string

### Common Errors

**Error: `psycopg2.OperationalError: connection closed`**
- Solution: The connection pooling settings will handle this automatically

**Error: `no such table`**
- Solution: Tables are created on startup. Check the console for any migration errors.

**Error: `too many connections`**
- Solution: Reduce `pool_size` in `main.py` and `course_routes.py`

## Migration from SQLite

Your existing SQLite data won't automatically migrate to Neon. To migrate:

1. Export data from SQLite (using a script or tool)
2. Start the app with Neon configured
3. Import data using the API endpoints or a migration script

## Useful Links

- [Neon Documentation](https://neon.tech/docs)
- [Neon CLI](https://neon.tech/docs/reference/cli-install)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLAlchemy PostgreSQL Dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html)

## Support

For issues related to Neon:
- Check Neon's status page: https://status.neon.tech
- Join Neon's Discord community
- Contact Neon support through the console

For application issues:
- Check the backend logs for detailed error messages
- Verify all environment variables are correctly set
