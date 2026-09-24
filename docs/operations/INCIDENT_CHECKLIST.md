# Checklist Kiểm Tra Sự Cố EduPortal (Incident Response Checklist)

Tài liệu hướng dẫn quy trình phản ứng nhanh khi phát hiện sự cố trên hệ thống EduPortal.

---

## 1. Phân Loại Sự Cố (Incident Classification)

| Mức độ | Tên gọi | Mô tả | SLA Phản hồi |
|---------|---------|-------|-------------|
| **SEV-1** | Critical | Toàn bộ hệ thống không hoạt động, tất cả users bị ảnh hưởng | **15 phút** |
| **SEV-2** | High | Chức năng chính không hoạt động, >50% users bị ảnh hưởng | **30 phút** |
| **SEV-3** | Medium | Tính năng phụ không hoạt động, <50% users bị ảnh hưởng | **2 giờ** |
| **SEV-4** | Low | Lỗi nhỏ, có workaround, <10% users bị ảnh hưởng | **24 giờ** |

---

## 2. Checklist Phản Ứng Nhanh (First Response Checklist)

### 2.1. Immediate Actions (0-5 phút)

```markdown
- [ ] Đã xác nhận sự cố? (Không phải user error)
- [ ] Đã ghi nhận thời gian bắt đầu sự cố?
- [ ] Đã thông báo cho on-call engineer?
- [ ] Đã tạo incident ticket?
```

### 2.2. Initial Assessment (5-15 phút)

```markdown
- [ ] Xác định mức độ nghiêm trọng (SEV-1/2/3/4)
- [ ] Xác định phạm vi ảnh hưởng (bao nhiêu users?)
- [ ] Kiểm tra health endpoint
- [ ] Kiểm tra application logs
- [ ] Kiểm tra database connectivity
```

---

## 3. Diagnostic Commands

### 3.1. Health Check Commands

```bash
# ═══════════════════════════════════════════════════════════════════
# HEALTH CHECK COMMANDS
# ═══════════════════════════════════════════════════════════════════

# 1. Basic health check
curl -f https://api.portal.yourdomain.edu.vn/api/health

# 2. Detailed health (includes database status)
curl https://api.portal.yourdomain.edu.vn/api/health/detailed | jq

# 3. Check database connectivity
curl https://api.portal.yourdomain.edu.vn/api/health/detailed | jq '.database'

# 4. Local health check (if SSH'd into server)
curl -f http://localhost:5000/api/health
```

### 3.2. Application Logs Commands

```bash
# ═══════════════════════════════════════════════════════════════════
# LOG ANALYSIS COMMANDS
# ═══════════════════════════════════════════════════════════════════

# 1. PM2 logs (last 100 lines)
pm2 logs eduportal-backend --lines 100

# 2. PM2 logs with error filter
pm2 logs eduportal-backend --err --lines 100 | grep -i error

# 3. Follow logs in real-time
pm2 logs eduportal-backend --nostream --lines 50

# 4. Journalctl (if systemd)
sudo journalctl -u eduportal-backend -n 100 --no-pager

# 5. Docker logs
docker-compose logs backend --tail 100

# 6. Nginx logs
sudo tail -100 /var/log/nginx/error.log
sudo tail -100 /var/log/nginx/access.log

# 7. Search for errors in logs
grep -i "error\|exception\|fatal" /var/log/eduportal/backend.log | tail -50
```

### 3.3. Database Commands

```bash
# ═══════════════════════════════════════════════════════════════════
# DATABASE DIAGNOSTIC COMMANDS
# ═══════════════════════════════════════════════════════════════════

# 1. Check database connection
psql "$DATABASE_URL" -c "SELECT 1;"

# 2. Check active connections
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Check long-running queries
psql "$DATABASE_URL" -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"

# 4. Check database size
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# 5. Check recent migrations
psql "$DATABASE_URL" -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;"

# 6. Check replication status (Neon)
psql "$DATABASE_URL" -c "SELECT * FROM neon_database_status();"
```

### 3.4. System Resource Commands

```bash
# ═══════════════════════════════════════════════════════════════════
# SYSTEM RESOURCE COMMANDS
# ═══════════════════════════════════════════════════════════════════

# 1. Check CPU and memory
top -bn1 | head -20
free -h

# 2. Check disk space
df -h

# 3. Check network connections
ss -tuln | grep :5000

# 4. Check process status
pm2 status

# 5. Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# 6. Check port binding
lsof -i :5000
```

---

## 4. Common Issues và Solutions

### Issue 1: Backend không khởi động được

```
Symptoms: 
  - pm2 status shows "errored"
  - Health check fails
  - Connection refused on port 5000

Diagnosis:
  1. Kiểm tra logs: pm2 logs eduportal-backend
  2. Kiểm tra config: cat .env.production
  3. Kiểm tra port: lsof -i :5000

Common Causes:
  - Missing JWT_SECRET
  - DATABASE_URL not set
  - Port already in use
  - Syntax error in code

Solutions:
  [ ] Set missing environment variables
  [ ] Kill conflicting process
  [ ] Fix syntax errors
  [ ] Restart: pm2 restart eduportal-backend
```

### Issue 2: Database connection failure

```
Symptoms:
  - Health check shows database.usingPostgres: false
  - Logs show "ECONNREFUSED" or "connection timeout"
  - API returns 500 for all requests

Diagnosis:
  1. Verify DATABASE_URL is set correctly
  2. Test connection: psql "$DATABASE_URL"
  3. Check Neon console for outages
  4. Verify SSL settings

Solutions:
  [ ] Check DATABASE_URL format
  [ ] Verify Neon project is active
  [ ] Check password hasn't expired
  [ ] Verify SSL mode is require
```

### Issue 3: High memory usage / Out of memory

```
Symptoms:
  - Application slow or crashing
  - OOM killer in dmesg
  - PM2 shows "restarting" loop

Diagnosis:
  1. Check memory: free -h
  2. Check PM2 memory usage: pm2 monit
  3. Check for memory leaks in logs

Solutions:
  [ ] Restart application: pm2 restart eduportal-backend
  [ ] Increase PM2 memory limit
  [ ] Check for memory leaks
  [ ] Scale horizontally if needed
```

### Issue 4: CORS errors

```
Symptoms:
  - Browser shows CORS policy errors
  - API requests fail from frontend
  - Response headers missing

Diagnosis:
  1. Check browser console for CORS errors
  2. Verify CORS_ORIGINS in .env
  3. Check Nginx proxy headers

Solutions:
  [ ] Update CORS_ORIGINS to include frontend domain
  [ ] Restart backend
  [ ] Check Nginx proxy_set_header settings
```

### Issue 5: JWT/Authentication issues

```
Symptoms:
  - Users cannot login
  - "Invalid token" errors
  - Sessions not persisting

Diagnosis:
  1. Check JWT_SECRET is consistent
  2. Verify token expiration settings
  3. Check for server time drift

Solutions:
  [ ] Verify JWT_SECRET matches environment
  [ ] Check server timezone
  [ ] Clear user sessions if needed
```

### Issue 6: Migration failed

```
Symptoms:
  - Database queries fail
  - "relation does not exist" errors
  - App logs show migration errors

Diagnosis:
  1. Check migration status: npm run db:status
  2. Review migration logs
  3. Check for duplicate column/table errors

Solutions:
  [ ] Review migration error message
  [ ] Manual fix or revert migration
  [ ] See ROLLBACK.md for full procedure
```

---

## 5. Escalation Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                     ESCALATION MATRIX                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SEV-1 (Critical)                                                │
│  ├── 0 min:  On-call engineer responds                         │
│  ├── 5 min:  DevOps Lead notified                              │
│  ├── 15 min: CTO notified                                       │
│  └── 30 min: Begin rollback if unresolved                      │
│                                                                  │
│  SEV-2 (High)                                                    │
│  ├── 0 min:  On-call engineer responds                         │
│  ├── 15 min: DevOps Lead notified                              │
│  ├── 30 min: Begin mitigation/rollback                          │
│  └── 60 min: CTO notified if unresolved                        │
│                                                                  │
│  SEV-3 (Medium)                                                 │
│  ├── 0 min:  On-call engineer responds                         │
│  ├── 30 min: Team Lead notified                                 │
│  └── 2 hrs:   Escalate if no progress                          │
│                                                                  │
│  SEV-4 (Low)                                                    │
│  └── Business hours: Ticket assigned, resolved within 24h      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Communication Templates

### 6.1. Initial Incident Notification

```markdown
**INCIDENT ALERT**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Severity: [SEV-1/2/3/4]
Status: [INVESTIGATING]
Time: [HH:MM UTC]

Description:
[Brief description of the issue]

Impact:
- [How many users affected]
- [What features are down]

Next Update: [HH:MM UTC]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6.2. Status Update

```markdown
**STATUS UPDATE**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Incident: [Brief title]
Time: [HH:MM UTC]
Status: [INVESTIGATING/IDENTIFIED/FIXING/MONITORING/RESOLVED]

Current Situation:
[What we know so far]

Action Taken:
- [What has been done]

Next Steps:
- [What will be done next]

ETA for Resolution: [Time or "Unknown"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6.3. Incident Resolved

```markdown
**INCIDENT RESOLVED**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Incident: [Brief title]
Resolved At: [HH:MM UTC]
Duration: [X hours Y minutes]

Summary:
[Brief summary of what happened and what was done]

Root Cause:
[If known]

Action Items:
- [ ] [Action to prevent recurrence]
- [ ] [Action to improve monitoring]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 7. Post-Incident Checklist

### 7.1. Resolution Actions

```markdown
- [ ] Incident has been resolved
- [ ] All systems operational
- [ ] Stakeholders notified
- [ ] Post-mortem scheduled
```

### 7.2. Documentation

```markdown
- [ ] Incident timeline documented
- [ ] Root cause identified (if possible)
- [ ] Impact assessment completed
- [ ] Action items created
```

### 7.3. Prevention

```markdown
- [ ] Monitoring/alerting improved?
- [ ] Runbook updated?
- [ ] Tests added to prevent recurrence?
- [ ] Lessons learned shared?
```

---

## 8. Useful URLs và Contacts

| Resource | URL/Contact |
|----------|-------------|
| Neon Console | https://console.neon.tech |
| API Health | https://api.portal.yourdomain.edu.vn/api/health |
| Status Page | https://status.yourdomain.edu.vn |
| On-call | [PHONE_NUMBER] |
| DevOps Lead | [EMAIL] |
| CTO | [EMAIL] |
| Security | security@yourdomain.edu.vn |

---

## 9. Quick Reference Card

```
╔══════════════════════════════════════════════════════════════════════╗
║                    EDUPORTAL INCIDENT QUICK REFERENCE               ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  DIAGNOSTIC                                                        ║
║  ┌──────────────────────────────────────────────────────────────┐  ║
║  │ curl -f https://api.portal.yourdomain.edu.vn/api/health      │  ║
║  │ curl https://api.portal.yourdomain.edu.vn/api/health/detailed│  ║
║  │ pm2 logs eduportal-backend --lines 100                       │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  QUICK FIXES                                                        ║
║  ┌──────────────────────────────────────────────────────────────┐  ║
║  │ pm2 restart eduportal-backend     # Restart app             │  ║
║  │ pm2 monit                          # Check resources          │  ║
║  │ npm run db:status                 # Check migrations        │  ║
║  │ sudo systemctl reload nginx       # Reload nginx             │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  ROLLBACK (if needed)                                               ║
║  ┌──────────────────────────────────────────────────────────────┐  ║
║  │ 1. git checkout <previous-commit>                             │  ║
║  │ 2. pm2 restart eduportal-backend                              │  ║
║  │ 3. Verify health check                                        │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  SEE: ROLLBACK.md for full rollback procedure                      ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 10. Monitoring Setup (Post-Incident)

### 10.1. Recommended Alerts

```yaml
# Uptime monitoring
- name: Backend Health
  endpoint: /api/health
  interval: 60s
  alert_on:
    - http_error
    - timeout_10s
    - dns_failure

- name: Response Time
  endpoint: /api/health
  alert_if: response_time > 2000ms

- name: Database Connection
  endpoint: /api/health/detailed
  alert_if: database.usingPostgres == false
```

### 10.2. Log Monitoring

```bash
# Set up log rotation
sudo tee /etc/logrotate.d/eduportal <<EOF
/var/log/eduportal/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```
