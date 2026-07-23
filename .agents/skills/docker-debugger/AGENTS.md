# Docker Debugger — Agent Instructions

## When to Invoke
Any Docker error, container failure, test timeout, or infrastructure issue in the
xiigen-dynamic-forms WordPress + MySQL + Playwright test stack.

## STEP 0 — Always Gather State First
```bash
docker compose -f docker-compose.test.yml ps -a
docker compose -f docker-compose.test.yml ps --format "table {{.Name}}\t{{.Health}}"
docker compose -f docker-compose.test.yml logs --tail 50
docker system df
```

## Quick Dispatch — Symptom → Pattern

| Symptom | Pattern | First Fix |
|---------|---------|-----------|
| `Connection refused` to MySQL | Pattern 1 | `down -v`, wait 30s after up |
| WordPress shows `unhealthy` | Pattern 2 | Check apache error log |
| wp-cli exits with code 1 | Pattern 3 | Verify depends_on + credentials |
| `ERR_CONNECTION_REFUSED` in E2E | Pattern 4 | Use service name, not localhost |
| Plugin not visible in WP admin | Pattern 5 | Check volume mount path |
| Container exits immediately | Pattern 6 | Check exit code + logs |
| Port already in use | Pattern 7 | `lsof -i :PORT`, kill PID |
| Disk full / slow builds | Pattern 8 | `docker system prune` |
| Permission denied on plugin dir | Pattern 9 | `chown www-data:www-data` |
| Compose file syntax error | Pattern 10 | `docker compose config --quiet` |

## 7 Known Issues — NEVER FORGET

1. **No wp-cli in wordpress container** — use wp-cli service
2. **mysqli only, no pdo_mysql** — all DB via `$wpdb`
3. **SHORTINIT** = only `$wpdb`, no options/plugin API
4. **WP_SITEURL** must be set to `http://localhost:18080`
5. **E2E posts must be pre-seeded** in setup-wordpress.sh
6. **No REST basic auth** — use cookie-based auth
7. **PHPUnit 10** — use manual stubs, not WP_Mock

## Rules
1. Check container state FIRST, before guessing
2. Read logs before changing code
3. Service names inside Docker, not localhost
4. MySQL needs 30-60s on first run
5. Nuclear option (`down -v && up --build`) after 10 min
