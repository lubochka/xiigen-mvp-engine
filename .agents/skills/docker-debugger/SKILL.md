---
name: docker-debugger
version: "2.0.0"
description: >
  Docker debugging skill for the xiigen-dynamic-forms WordPress plugin test stack.
  Covers: WordPress 6.7 + MySQL 8 + wp-cli + Playwright + xiigen-mock containers.
  Includes known issues from Phases 1-3, structured failure patterns with
  Symptoms → Diagnostic → Fixes, and a complete quick reference.
author: luba
updated: "2026-03-18"
priority: HIGH
triggers:
  - "docker error"
  - "container won't start"
  - "test timeout"
  - "MySQL connection refused"
  - "WordPress not ready"
  - "Playwright fails"
  - "health check failing"
  - "docker compose up"
  - "port already in use"
  - "SHORTINIT"
  - "wpdb error"
  - "E2E test timeout"
  - "Playwright can't reach WordPress"
invoked_by: "dev-safety-skill (when Docker tests fail)"
---

# Docker Debugger v2.0
## xiigen-dynamic-forms test stack — merged knowledge from Phases 1-3

---

## OUR DOCKER STACK (docker-compose.test.yml)

| Service | Image | Host Port | Health Check |
|---------|-------|-----------|-------------|
| **wordpress** | wordpress:6.7-php8.2-apache | 18080 | `curl -f http://localhost:80/wp-login.php` |
| **mysql** | mysql:8.0 | 13306 | `mysqladmin ping -h localhost` |
| **wp-cli** | wordpress:cli-php8.2 | — | One-shot: runs setup-wordpress.sh then exits |
| **playwright** | mcr.microsoft.com/playwright | — | Runs e2e tests then exits |
| **xiigen-mock** | node:20-slim | 19090 | `curl -f http://localhost:3000/health` |
| **wordpress-tenant-b** | wordpress:6.7-php8.2-apache | 18081 | Phase 9 only |
| **mysql-b** | mysql:8.0 | — | Phase 9 only |

**Zero cloud credentials.** Everything runs locally.

---

## STEP 0 — Always Start Here

Before debugging anything, gather state:

```bash
# 1. What's running and what exited?
docker compose -f docker-compose.test.yml ps -a
docker compose -f docker-compose.test.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# 2. Check health status
docker compose -f docker-compose.test.yml ps --format "table {{.Name}}\t{{.Health}}"

# 3. Recent logs (last 50 lines per service)
docker compose -f docker-compose.test.yml logs --tail 50

# 4. Disk space (Docker can fill up)
docker system df
```

---

## KNOWN ISSUES FROM PHASES 1-3

These are **confirmed** issues discovered during execution. Codex MUST know these.

### Issue 1: WordPress container has NO wp-cli
**Root cause:** The official `wordpress:6.7-php8.2-apache` image doesn't include wp-cli.
**Fix:** Never run `wp` inside the wordpress container. Use the wp-cli service:
```bash
docker compose -f docker-compose.test.yml run --rm wp-cli wp post create --post_title="Test" --post_status=publish
```
**Caveat:** `docker compose run` creates a NEW container. The wp-cli service must connect to the same MySQL.

### Issue 2: mysqli only — NO pdo_mysql
**Root cause:** WordPress container has `mysqli` but NOT `pdo_mysql` by default.
**Fix:** All database access must use `$wpdb` (mysqli internally). Never use PDO.
```bash
docker compose -f docker-compose.test.yml exec wordpress php -m | grep -i mysql
# Expected: mysqli (NOT pdo_mysql)
```

### Issue 3: SHORTINIT integration tests
**Root cause:** `SHORTINIT` loads only bare minimum (wpdb, NOT options API, NOT plugin API).
**Fix:** Integration tests needing `$wpdb` use SHORTINIT. Tests needing full WP API use `bootstrap-wp.php`.
```php
// SHORTINIT: Only $wpdb available. No get_option(), no add_action().
// Full WP: Everything available, but slower.
```

### Issue 4: WP_SITEURL not set
**Root cause:** WordPress stores site URL in DB. If wp-cli sets it before port mapping is active, it uses internal port (80) not mapped port (18080).
**Fix:** In `setup-wordpress.sh`:
```bash
wp option update siteurl "http://localhost:18080" --allow-root
wp option update home "http://localhost:18080" --allow-root
```

### Issue 5: E2E posts must be pre-seeded
**Root cause:** Can't use wp-cli inside wordpress container (Issue 1). wp-cli service exits after setup.
**Fix:** Pre-seed posts in `scripts/setup-wordpress.sh`:
```bash
wp post create --post_title="Test Form Page" --post_name="test-form-page" \
  --post_content='[xiigen_form id="contact"]' --post_status=publish --allow-root
```
E2E tests navigate to `?name=test-form-page` (follows 301 to pretty permalink).

### Issue 6: REST API basic auth not available
**Root cause:** WordPress requires Application Passwords plugin for REST basic auth. Not installed.
**Fix:** E2E tests use cookie-based auth (login via wp-login.php, use session cookie).
Unit/integration tests mock the REST request + use CapabilityChecker injection from Phase 3.

### Issue 7: PHPUnit 10 compatibility
**Root cause:** PHPUnit 10 removed legacy features. WP_Mock may not be compatible.
**Fix:** Use manual stubs in `tests/php/stubs/wp-functions.php` instead of WP_Mock:
```php
if (!function_exists('wp_nonce_field')) {
    function wp_nonce_field($action = -1, $name = '_wpnonce', $referer = true, $echo = true) {
        $field = '<input type="hidden" name="' . $name . '" value="test-nonce" />';
        if ($echo) echo $field;
        return $field;
    }
}
```

---

## FAILURE PATTERNS — Symptoms → Diagnostic → Fixes

### PATTERN 1 — MySQL Won't Start / Connection Refused

**Symptoms:**
- `SQLSTATE[HY000] [2002] Connection refused`
- `ERROR 2003 (HY000): Can't connect to MySQL server`
- WordPress container restarts repeatedly
- `mysql` service shows "Exited (1)"

**Diagnostic:**
```bash
docker compose -f docker-compose.test.yml logs mysql --tail 100
docker compose -f docker-compose.test.yml exec mysql mysqladmin ping -h localhost -u root -ptestpass
```

**Fixes:**

*Cause A: Corrupted data volume*
```bash
docker compose -f docker-compose.test.yml down -v
docker volume prune -f
docker compose -f docker-compose.test.yml up -d mysql
sleep 30  # MySQL init takes 30-60 seconds on first run
docker compose -f docker-compose.test.yml logs mysql --tail 20
```

*Cause B: WordPress starts before MySQL is ready*
Ensure `depends_on` with `condition: service_healthy` in compose file.

*Cause C: "InnoDB: Table flags are 0" — stale volume*
```bash
docker volume rm xiigen-dynamic-forms_mysql-data
docker compose -f docker-compose.test.yml up -d
```

### PATTERN 2 — WordPress Health Check Fails

**Symptoms:**
- `wordpress` shows "unhealthy"
- curl to `http://localhost:18080` returns 500 or connection refused
- E2E tests can't load any page

**Diagnostic:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:18080/wp-login.php
docker compose -f docker-compose.test.yml exec wordpress cat /var/log/apache2/error.log | tail -50
docker compose -f docker-compose.test.yml exec wordpress cat /var/www/html/wp-content/debug.log 2>/dev/null | tail -50
```

**Fixes:**

*Cause A: wp-config.php not generated*
```bash
docker compose -f docker-compose.test.yml exec wordpress ls -la /var/www/html/wp-config.php
docker compose -f docker-compose.test.yml exec wordpress env | grep -E "WORDPRESS_|WP_"
```

*Cause B: Plugin PHP fatal error*
```bash
docker compose -f docker-compose.test.yml exec wordpress php -l /var/www/html/wp-content/plugins/xiigen-dynamic-forms/xiigen-dynamic-forms.php
```

*Cause C: WP_SITEURL mismatch* — See Known Issue 4 above.

### PATTERN 3 — wp-cli Container Fails

**Symptoms:**
- `wp-cli` service shows "Exited (1)"
- Setup script didn't run (no test posts, no plugin activated)
- "Error: This does not appear to be a WordPress installation"

**Diagnostic:**
```bash
docker compose -f docker-compose.test.yml logs wp-cli --tail 100
docker compose -f docker-compose.test.yml run --rm wp-cli wp db check --allow-root
```

**Fixes:**
- wp-cli must `depends_on` wordpress with `condition: service_healthy`
- wp-cli needs SAME database credentials as wordpress
- Working directory must be `/var/www/html`

### PATTERN 4 — Playwright E2E Tests Fail

**Symptoms:**
- `net::ERR_CONNECTION_REFUSED` in E2E logs
- `Timeout 30000ms exceeded` on `page.goto()`
- Tests pass locally but fail in Docker

**Diagnostic:**
```bash
docker compose -f docker-compose.test.yml exec playwright curl -s http://wordpress:80/
docker compose -f docker-compose.test.yml exec playwright ping -c 3 wordpress
```

**Fixes:**

*Cause A: Using localhost instead of service name*
```typescript
// WRONG — localhost means the Playwright container itself
const BASE_URL = 'http://localhost:18080';
// RIGHT — use Docker service name
const BASE_URL = 'http://wordpress:80';
```

*Cause B: WordPress not ready when tests start*
Add retry/wait logic in test globalSetup.

*Cause C: Containers not on the same network*
All services must share the same Docker network in compose file.

### PATTERN 5 — Plugin Mount Not Working

**Symptoms:**
- Plugin doesn't appear in WordPress admin
- PHP changes not reflected after edit

**Diagnostic:**
```bash
docker compose -f docker-compose.test.yml exec wordpress ls -la /var/www/html/wp-content/plugins/xiigen-dynamic-forms/
docker compose -f docker-compose.test.yml exec wordpress php -l /var/www/html/wp-content/plugins/xiigen-dynamic-forms/xiigen-dynamic-forms.php
```

**Fix:** Volume mount must map project root to plugin directory:
```yaml
volumes:
  - .:/var/www/html/wp-content/plugins/xiigen-dynamic-forms
```

### PATTERN 6 — Container Exits Immediately

**Diagnostic:**
```bash
docker inspect <container> --format='{{.State.ExitCode}}'
# 0 = normal exit, 1 = error, 137 = OOM killed, 143 = SIGTERM
docker compose -f docker-compose.test.yml logs <service> --tail 50
docker compose -f docker-compose.test.yml run --rm --entrypoint /bin/bash <service>
```

### PATTERN 7 — Port Already in Use

```bash
lsof -i :18080  # or :13306, :19090
kill -9 <PID>
```

### PATTERN 8 — Disk Space / Resource Issues

```bash
docker system df
docker system prune -a --volumes  # WARNING: removes ALL unused data
# Less aggressive:
docker image prune -a
docker volume prune
docker builder prune
```

### PATTERN 9 — Volume Permission Issues

```bash
docker compose -f docker-compose.test.yml exec wordpress ls -la /var/www/html/wp-content/plugins/
docker compose -f docker-compose.test.yml exec wordpress chown -R www-data:www-data /var/www/html/wp-content/plugins/xiigen-dynamic-forms/
```

### PATTERN 10 — Docker Compose File Syntax Errors

```bash
docker compose -f docker-compose.test.yml config --quiet && echo "VALID" || echo "INVALID"
docker compose -f docker-compose.test.yml config  # show resolved config
```

---

## FULL RESET (nuclear option)

When nothing else works:
```bash
docker compose -f docker-compose.test.yml down --volumes --remove-orphans
docker system prune -f
docker compose -f docker-compose.test.yml up -d --build --force-recreate
sleep 30  # Wait for health checks
docker compose -f docker-compose.test.yml ps
```

---

## QUICK REFERENCE: Test Commands

```bash
# Start stack
docker compose -f docker-compose.test.yml up -d

# Wait for healthy
docker compose -f docker-compose.test.yml ps --format "table {{.Name}}\t{{.Health}}"

# Run all 5 test levels
composer test                              # PHPUnit unit (mocked, no Docker needed)
composer test:integration                  # PHPUnit integration (SHORTINIT + Docker MySQL)
npm test                                   # Jest React tests (no Docker needed)
cd e2e && npx playwright test              # Playwright E2E (needs full Docker stack)
docker compose -f docker-compose.test.yml exec wordpress \
  wp plugin check xiigen-dynamic-forms     # PCP compliance

# Shell into containers for debugging
docker compose -f docker-compose.test.yml exec wordpress bash
docker compose -f docker-compose.test.yml exec mysql mysql -uroot -ptestpass wordpress
docker compose -f docker-compose.test.yml exec wordpress php -r "phpinfo();" | grep -i mysqli

# Stop stack
docker compose -f docker-compose.test.yml down
```

---

## RULES FOR Codex

1. **Always check container state FIRST.** Before guessing at fixes, run `docker compose ps -a`.
2. **Read logs before changing code.** The error message tells you what's wrong 90% of the time.
3. **Health checks are your friend.** If a service is "unhealthy", the health check command tells you exactly what failed.
4. **Service names, not localhost.** Inside Docker, containers talk via service names (`mysql`, `wordpress`), never `localhost`. Port 13306 is HOST mapping; 3306 is container port.
5. **Volume mounts are immediate.** If you edit a PHP file and it's not reflected, the mount is wrong — not a caching issue.
6. **MySQL needs time.** First-run initialization takes 30-60 seconds. Don't declare failure before then.
7. **One problem at a time.** If MySQL is down AND WordPress is unhealthy, fix MySQL FIRST. WordPress depends on it.
8. **Nuclear option is okay.** If you've spent more than 10 minutes debugging, do a full `down -v` + `up --build`. It's faster than finding a subtle state issue.
9. **Never use PDO.** WordPress uses mysqli. See Known Issue 2.
10. **wp-cli is a separate container.** Never run `wp` inside the wordpress container. See Known Issue 1.

---

END OF SKILL
