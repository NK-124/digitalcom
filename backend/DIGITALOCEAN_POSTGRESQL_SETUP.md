# DigitalOcean PostgreSQL Setup Guide

This guide will help you configure your application to use DigitalOcean PostgreSQL database.

## What is DigitalOcean PostgreSQL?

DigitalOcean Managed Databases provides fully managed PostgreSQL databases with features like:
- Automated backups and point-in-time recovery
- High availability with standby nodes
- Connection pooling with PgBouncer
- Automatic updates and maintenance
- SSL/TLS encryption

## Setup Instructions

### Step 1: Create a DigitalOcean Account

1. Go to [https://www.digitalocean.com](https://www.digitalocean.com)
2. Sign up for an account (or log in)
3. Create a new project or use an existing one

### Step 2: Create a PostgreSQL Database

1. In the DigitalOcean Control Panel, go to **Databases** → **Create Database**
2. Choose **PostgreSQL** as the database engine
3. Select your configuration:
   - **Region**: Choose the closest region to your application
   - **Version**: Latest stable version recommended
   - **Plan**: Start with Basic for development, HA for production
4. Click **Create Database Cluster**

### Step 3: Get Connection String

1. Once the database is provisioned, go to the database dashboard
2. Under **Connection Details**, select your connection method
3. Choose **Node** or **Connection Pool** (Connection Pool recommended for production)
4. Copy the connection string:

   ```
   postgresql://username:password@db-postgresql-nyc1-12345-do-user-123456-0.b.db.ondigitalocean.com:25060/dbname?sslmode=require
   ```

### Step 4: Configure Your Application

1. Copy `.env.example` to `.env` in the `backend/` directory:
   ```bash
   cp .env.example .env
   ```

2. Replace the `DATABASE_URL` with your DigitalOcean connection string:

   ```
   DATABASE_URL=postgresql://username:password@db-postgresql-nyc1-12345-do-user-123456-0.b.db.ondigitalocean.com:25060/dbname?sslmode=require
   ```

3. For connection pooling (recommended for production):
   ```
   DATABASE_URL=postgresql://username:password@db-postgresql-nyc1-12345-do-user-123456-0.c.db.ondigitalocean.com:25061/defaultdb?sslmode=require&channel_binding=require
   ```

### Step 5: Configure Firewall (Optional but Recommended)

1. In the DigitalOcean database dashboard, go to **Settings** → **Trusted Sources**
2. Add your application's IP address or VPC network
3. For development, you can allow all IPs temporarily

### Step 6: Test the Connection

Run your application:

```bash
cd backend
python main.py
```

You should see:
```
[OK] Database connected: DigitalOcean PostgreSQL
```

## Connection Pooling (Recommended)

DigitalOcean provides built-in connection pooling with PgBouncer:

1. Go to your database dashboard
2. Navigate to **Connection Pools**
3. Create a new pool:
   - **Pool Name**: `default-pool`
   - **Database**: `defaultdb`
   - **User**: `doadmin`
   - **Pool Size**: 25 (adjust based on your plan)
   - **Pool Mode**: `Transaction` (recommended for web apps)

Use the connection pool port (usually 25061) instead of the direct node port (25060).

## Production Best Practices

1. **Use connection pooling** - Reduces connection overhead
2. **Enable SSL** - Always use `sslmode=require` or `verify-full`
3. **Set up alerts** - Configure CPU, memory, and disk usage alerts
4. **Enable backups** - Configure automated backup retention (7-30 days)
5. **Use VPC networking** - Keep database traffic within private network
6. **Enable connection limits** - Prevent connection exhaustion

## Migration from SQLite

Your existing SQLite data won't automatically migrate to DigitalOcean. To migrate:

1. Export your SQLite data
2. Configure the PostgreSQL connection
3. Tables will be created automatically on first run
4. Import your data using SQL scripts or a migration tool

## Troubleshooting

### Connection Refused

1. Verify your connection string
2. Check that your IP is in Trusted Sources
3. Ensure SSL mode is enabled

### Too Many Connections

1. Use connection pooling
2. Reduce `pool_size` in SQLAlchemy engine configuration
3. Check for connection leaks in your code

### Timeout Errors

1. Verify network connectivity
2. Check DigitalOcean database metrics
3. Ensure your firewall allows outbound connections on port 25060/25061

## Useful Links

- [DigitalOcean Managed Databases](https://www.digitalocean.com/products/managed-databases-postgresql)
- [DigitalOcean PostgreSQL Documentation](https://docs.digitalocean.com/products/databases/postgresql/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLAlchemy PostgreSQL Dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html)

## Support

For issues related to DigitalOcean:
- Check DigitalOcean status page: https://status.digitalocean.com
- Create a support ticket in your DigitalOcean dashboard
- Join DigitalOcean community forums
