# Hướng Dẫn Rollback EduPortal (Rollback Procedure)

Tài liệu hướng dẫn quy trình rollback EduPortal về phiên bản trước đó khi phát hiện sự cố sau triển khai.

---

## 1. Khi Nào Cần Rollback

### 1.1. Trigger Conditions (Điều kiện kích hoạt rollback)

| Mức độ | Tình trạng | Hành động |
|---------|-----------|-----------|
| **CRITICAL** | 100% users bị ảnh hưởng, hệ thống không hoạt động | **Immediate Rollback** |
| **HIGH** | >50% users bị ảnh hưởng, chức năng chính không hoạt động | **Rollback trong 30 phút** |
| **MEDIUM** | 10-50% users bị ảnh hưởng, có workarounds | **Đánh giá case-by-case** |
| **LOW** | <10% users bị ảnh hưởng, có workarounds | **Không cần rollback** |

### 1.2. Ví dụ scenarios cần rollback

- [ ] Login không hoạt động (authentication failure)
- [ ] Database query failures gây ra lỗi 500 trên toàn hệ thống
- [ ] Migration lỗi làm mất dữ liệu
- [ ] Security vulnerability nghiêm trọng được phát hiện
- [ ] Performance degradation nghiêm trọng (response time >10s)

### 1.3. Ví dụ scenarios KHÔNG cần rollback

- [ ] Lỗi UI nhỏ không ảnh hưởng chức năng
- [ ] 1 endpoint không hoạt động (có thể hotfix)
- [ ] Warning logs tăng nhưng không có lỗi
- [ ] Non-critical feature không hoạt động

---

## 2. Pre-Rollback Actions

### 2.1. Incident Assessment

**Trước khi rollback, cần xác định:**

1. **Root Cause** — Sự cố do đâu? (code mới, migration, infrastructure?)
2. **Scope** — Bao nhiêu users bị ảnh hưởng?
3. **Duration** — Sự cố bắt đầu khi nào?
4. **Rollback Viability** — Rollback có giải quyết được vấn đề không?

### 2.2. Communication

```bash
# 1. Thông báo cho stakeholders
# 2. Tạo incident ticket
# 3. Notify on-call team
# 4. Update status page
```

### 2.3. Quick Assessment Checklist

```markdown
- [ ] Đã xác định được root cause?
- [ ] Đã thông báo stakeholders?
- [ ] Đã có ai đang login không? (cảnh báo session invalidation)
- [ ] Database có data corruption không?
- [ ] Rollback sẽ giải quyết được vấn đề?
- [ ] Đã có backup gần nhất?
```

---

## 3. Rollback Procedures

### 3.1. Rollback Backend (Code Only)

**Khi nào:** Chỉ code backend có vấn đề, database schema không thay đổi.

#### Bước 1: Identify Previous Version

```bash
# Xem git history để tìm commit trước đó
git log --oneline -10

# Ví dụ output:
# a1b2c3d (HEAD -> main) G51: Add deployment docs
# e4f5g6h Previous working commit
# i7j8k9l Another commit
```

#### Bước 2: Checkout Previous Version

```bash
# Tạo tag cho version hiện tại (để có thể quay lại)
git tag -a deploy-failed-$(date +%Y%m%d-%H%M%S) -m "Deployment failed, reverting"

# Checkout về version trước
git checkout e4f5g6h

# Hoặc sử dụng git revert cho an toàn
git revert HEAD
```

#### Bước 3: Restart Backend

```bash
# PM2
pm2 restart eduportal-backend

# Systemd
sudo systemctl restart eduportal-backend

# Docker
docker-compose restart backend
```

#### Bước 4: Verify

```bash
# Health check
curl https://api.portal.yourdomain.edu.vn/api/health

# Kiểm tra logs
pm2 logs eduportal-backend --lines 50
```

---

### 3.2. Rollback Database Migration

**⚠️ CẢNH BÁO: Nguy hiểm cao — Có thể mất dữ liệu!**

**Chỉ rollback database khi:**
1. Migration gây ra data corruption
2. Migration không tương thích ngược (breaking change)
3. Không có cách khắc phục

#### Bước 1: Backup Current State

```bash
# Backup ngay lập tức trước khi làm gì khác
pg_dump "$DATABASE_URL" \
  --format=custom \
  --file="emergency_backup_before_rollback_$(date +%Y%m%d_%H%M%S).dump"
```

#### Bước 2: Check Migration Status

```bash
npm run db:status

# Output ví dụ:
# Version    Name                           Applied
# 0033       0033_audit_trail_expansion.sql  YES
# 0034       0034_department_head_seed.sql   YES  <- problematic
```

#### Bước 3: Identify Rollback Strategy

**Option A: Sử dụng PITR (Point-in-Time Recovery)**

```bash
# Khôi phục về thời điểm trước migration
# Xem BACKUP_RESTORE.md để chi tiết

# Tạo branch mới từ thời điểm trước migration
neon branches create \
  --name rollback-restore \
  --timestamp "2026-09-23T10:00:00Z"  # Trước khi migration chạy
```

**Option B: Manual Rollback (Dangerous)**

⚠️ **Chỉ thực hiện khi hiểu rõ migration đã làm gì!**

```sql
-- Ví dụ: Rollback migration 0034 nếu nó chỉ thêm columns
ALTER TABLE department_heads DROP COLUMN IF EXISTS new_column;

-- Xóa migration record
DELETE FROM schema_migrations WHERE version = '0034';
```

#### Bước 4: Restore Application

```bash
# Restart backend
pm2 restart eduportal-backend

# Verify
curl https://api.portal.yourdomain.edu.vn/api/health/detailed | jq '.database'
```

---

### 3.3. Full Rollback (Code + Database)

**Khi nào:** Cả code và database migration đều có vấn đề.

#### Bước 1: Stop Application

```bash
# Prevent new connections
pm2 stop eduportal-backend

# Hoặc
sudo systemctl stop eduportal-backend
```

#### Bước 2: Restore Database

```bash
# Sử dụng backup gần nhất
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "$DATABASE_URL" \
  "eduportal_backup_20260923_100000.dump"
```

#### Bước 3: Restore Code

```bash
# Checkout về version trước
git checkout e4f5g6h
```

#### Bước 4: Restart Application

```bash
pm2 restart eduportal-backend
```

#### Bước 5: Verify

```bash
# Health check
curl https://api.portal.yourdomain.edu.vn/api/health

# Database integrity
npm test

# Manual smoke test
# - Login flow
# - Main dashboard
# - Critical features
```

---

## 4. Post-Rollback Actions

### 4.1. Verification Checklist

```markdown
- [ ] Health endpoint returns 200 OK
- [ ] Database connection successful
- [ ] All migrations applied correctly
- [ ] Login flow works
- [ ] Core features operational
- [ ] No errors in logs (grep for ERROR)
- [ ] Smoke tests pass
```

### 4.2. Communication

```bash
# Update stakeholders
# - Incident resolved
# - System restored to previous version
# - Next steps: hotfix required before redeployment
```

### 4.3. Post-Incident Analysis

```markdown
# Post-mortem report cần bao gồm:
1. Incident summary
2. Timeline
3. Root cause analysis
4. Impact assessment
5. Lessons learned
6. Action items to prevent recurrence
```

---

## 5. Rollback Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    INCIDENT DETECTED                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Is system completely down (100% users affected)?                 │
└─────────────────────────────────────────────────────────────────┘
          │ YES                                    │ NO
          ▼                                        ▼
┌─────────────────────┐              ┌─────────────────────────────────┐
│ Immediate Rollback  │              │ What is the scope?              │
│                     │              └─────────────────────────────────┘
│ 1. Stop app        │                 │                    │
│ 2. Restore DB     │                 ▼                    ▼
│ 3. Restore code   │         ┌──────────────┐      ┌─────────────────┐
│ 4. Restart        │         │ < 50% users │      │ > 50% users     │
│ 5. Verify         │         │ affected    │      │ affected       │
└─────────────────────┘         └──────────────┘      └─────────────────┘
                                    │                        │
                                    ▼                        ▼
                            ┌──────────────┐      ┌─────────────────────┐
                            │ Can we hotfix│      │ Consider rollback    │
                            │ quickly?     │      │ within 30 minutes   │
                            └──────────────┘      └─────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │ YES                           │ NO
                    ▼                               ▼
            ┌──────────────┐               ┌─────────────────┐
            │ Hotfix and   │               │ Rollback        │
            │ redeploy    │               │ recommended     │
            └──────────────┘               └─────────────────┘
```

---

## 6. Rollback Scenarios Reference

### Scenario 1: Migration Failed Mid-Way

```
Problem: Migration 0034 chạy nhưng thất bại ở giữa, database ở trạng thái inconsistent
Symptoms: Queries fail với "relation does not exist" hoặc "column does not exist"
Action: 
  1. STOP ngay (prevent more writes)
  2. PITR restore to pre-migration state
  3. Verify data integrity
  4. Fix migration
  5. Redeploy
```

### Scenario 2: Breaking API Change

```
Problem: API endpoint signature thay đổi, frontend không tương thích
Symptoms: 500 errors on specific endpoints
Action:
  1. Rollback code (git checkout previous)
  2. Restart backend
  3. Frontend có thể giữ nguyên (sẽ hotfix sau)
```

### Scenario 3: Security Vulnerability

```
Problem: Security vulnerability được phát hiện sau deploy
Symptoms: Potential data breach hoặc unauthorized access
Action:
  1. IMMEDIATE rollback (không cần deliberation)
  2. Notify security team
  3. Assess exposure
  4. Apply security patch
  5. Redeploy
```

### Scenario 4: Performance Degradation

```
Problem: Response time tăng từ 200ms lên 5s sau deploy
Symptoms: Users complain về slow performance
Action:
  1. Check if it's due to new queries/indexes
  2. If migration related: rollback migration only
  3. If code related: rollback code
  4. Profile performance
  5. Fix and optimize
```

---

## 7. Quick Rollback Commands Reference

```bash
# ═══════════════════════════════════════════════════════════════════
# QUICK REFERENCE — EDUPORTAL ROLLBACK COMMANDS
# ═══════════════════════════════════════════════════════════════════

# 1. STOP APPLICATION
pm2 stop eduportal-backend

# 2. BACKUP CURRENT STATE
pg_dump "$DATABASE_URL" --format=custom --file="pre_rollback_backup_$(date +%Y%m%d_%H%M%S).dump"

# 3. RESTORE CODE (thay đổi COMMIT_HASH)
git checkout <COMMIT_HASH>

# 4. RESTART
pm2 restart eduportal-backend

# 5. VERIFY
curl https://api.portal.yourdomain.edu.vn/api/health
curl https://api.portal.yourdomain.edu.vn/api/health/detailed | jq '.database'

# 6. CHECK LOGS
pm2 logs eduportal-backend --lines 100 --nostream

# ═══════════════════════════════════════════════════════════════════

# DATABASE PITR ROLLBACK (if needed)
# Create branch from point-in-time
neon branches create --name rollback-$(date +%Y%m%d) --timestamp "YYYY-MM-DDTHH:MM:SSZ"

# Restore from backup
pg_restore --clean --if-exists -d "$DATABASE_URL" "backup_file.dump"
```

---

## 8. Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| On-call Engineer | [CONTACT] | First response |
| DevOps Lead | [CONTACT] | Infrastructure rollback |
| Database Admin | [CONTACT] | Database operations |
| Security Team | [CONTACT] | Security incidents |
