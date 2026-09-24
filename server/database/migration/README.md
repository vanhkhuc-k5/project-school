# Data Migration Tool

Công cụ di chuyển dữ liệu từ SQLite (dev/demo) sang PostgreSQL (production) một cách an toàn.

## Tổng Quan

```
┌─────────────────┐         ┌──────────────────────────────────────┐
│  SQLite (Dev)   │         │       PostgreSQL (Staging/Prod)       │
│  database.sqlite │ ──────► │         Neon Cloud PostgreSQL          │
│  (Source)        │ migrate │           (Target)                    │
└─────────────────┘         └──────────────────────────────────────┘
```

## Các File

- `migrate-data.js` - Công cụ migration chính
- `export-source.js` - Export dữ liệu SQLite ra JSON để inspect

## Cách Sử Dụng

### 1. Export Dữ Liệu Nguồn (Để Inspect)

```bash
# Export tất cả dữ liệu SQLite ra JSON
node server/database/migration/export-source.js

# Export ra file khác
node server/database/migration/export-source.js --output=./migration-data-export.json

# Xem kết quả
cat migration-data-export.json | jq '.summary'
cat migration-data-export.json | jq '.tables.users.data'
```

### 2. Validate Dữ Liệu (Kiểm Tra Chất Lượng)

```bash
# Kiểm tra dữ liệu nguồn
node server/database/migration/migrate-data.js --mode=validate

# Output ví dụ:
# 📋 SOURCE DATA VALIDATION
# ==================================================
# 🔍 Validating users...
#    Valid: 15/17
#    Invalid: 2
# 🔍 Validating students...
#    Valid: 11/13
# 🔍 Validating grades...
#    Valid: 12/12
```

### 3. Preview Migration (Dry-Run)

```bash
# Xem trước những gì sẽ được migrate (không thay đổi gì)
STAGING_DATABASE_URL="postgresql://..." node server/database/migration/migrate-data.js \
  --mode=preview \
  --source=sqlite \
  --target=staging

# Output ví dụ:
# 🚀 DATA MIGRATION PREVIEW
# ==================================================
# 🏫 Migrating schools...
#    Would migrate: 2, Skipped: 0
# 👥 Migrating users...
#    Would migrate: 15, Skipped: 2 (demo users)
```

### 4. Execute Migration (Thực Hiện)

```bash
# ⚠️ CẢNH BÁO: Sẽ thay đổi database!
# Đảm bảo đã backup trước khi chạy

# Chạy migration
STAGING_DATABASE_URL="postgresql://..." node server/database/migration/migrate-data.js \
  --mode=execute \
  --source=sqlite \
  --target=staging

# Output ví dụ:
# 🚀 DATA MIGRATION EXECUTION
# ==================================================
# 🏫 Migrating schools...
#    Migrated: 2, Skipped: 0
# 👥 Migrating users...
#    Migrated: 15, Skipped: 2
# ...
# ✅ MIGRATION COMPLETED SUCCESSFULLY
```

## Các Chế Độ (Modes)

| Mode | Mô tả |
|------|--------|
| `validate` | Kiểm tra chất lượng dữ liệu nguồn |
| `preview` | Xem trước những gì sẽ migrate (dry-run) |
| `execute` | Thực hiện migration thực sự |
| `report` | Generate migration report |

## Cấu Hình

### Environment Variables

```bash
# SQLite path (mặc định: ./database.sqlite)
SQLITE_PATH=./database.sqlite

# PostgreSQL connection string
DATABASE_URL=postgresql://user:pass@host:5432/dbname
# hoặc
STAGING_DATABASE_URL=postgresql://user:pass@host:5432/staging_db
```

### Skip Patterns (Tự động bỏ qua demo data)

Tool tự động skip các bản ghi demo:

```javascript
// Users: usr_demo_*, usr_test_*, usr_sample_*, *@example.com
// Students: std_demo_*, std_test_*, std_sample_*
// Classes: cls_demo_*, cls_test_*
```

## ID Mapping

Tool tự động ánh xạ legacy IDs sang UUIDs mới:

```
Legacy ID              →  New UUID
──────────────────────────────────────
usr_student_1    →  550e8400-e29b-41d4-a716-446655440001
std_khang        →  7c9e6679-7425-40de-944b-e07fc1f90ae7
cls_10A1        →  3f2504e0-4f89-11ed-9e57-0800200c9a66
```

Mappings được lưu tại: `migration-reports/<migration-id>-mappings.json`

## Migration Report

Sau khi chạy migration, report được lưu tại:
- `migration-reports/<migration-id>.json` - Chi tiết
- `migration-reports/<migration-id>-mappings.json` - ID mappings

### Sample Report

```json
{
  "migrationId": "mig_20260923_143000",
  "mode": "execute",
  "startTime": "2026-09-23T14:30:00.000Z",
  "durationSeconds": "12.45",
  "summary": {
    "totalProcessed": 150,
    "totalMigrated": 145,
    "totalSkipped": 5,
    "totalErrors": 0,
    "successRate": "96.67%"
  },
  "entityStats": {
    "schools": { "processed": 2, "migrated": 2 },
    "users": { "processed": 17, "migrated": 15, "skipped": 2 },
    "students": { "processed": 13, "migrated": 11, "skipped": 2 }
  }
}
```

## Workflow Đầy Đủ

```bash
# ═══════════════════════════════════════════════════════════════════════
# FULL MIGRATION WORKFLOW
# ═══════════════════════════════════════════════════════════════════════

# 1. Backup target database
pg_dump "$STAGING_DATABASE_URL" \
  --format=custom \
  --file="backup_before_migration_$(date +%Y%m%d_%H%M%S).dump"

# 2. Export and inspect source data
node server/database/migration/export-source.js

# 3. Validate source data quality
node server/database/migration/migrate-data.js --mode=validate

# 4. Preview migration (dry-run)
STAGING_DATABASE_URL="postgresql://..." \
  node server/database/migration/migrate-data.js --mode=preview

# 5. Review preview output and ID mappings
# Check which records will be skipped

# 6. Execute migration (if preview looks good)
STAGING_DATABASE_URL="postgresql://..." \
  node server/database/migration/migrate-data.js --mode=execute

# 7. Review migration report
cat migration-reports/mig_*/mig_*.json | jq '.summary'

# 8. Verify in database
psql "$STAGING_DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
psql "$STAGING_DATABASE_URL" -c "SELECT COUNT(*) FROM students;"

# 9. Run tests
npm test

# 10. Health check
curl http://localhost:5000/api/health

# ═══════════════════════════════════════════════════════════════════════
```

## Rollback

Nếu migration có vấn đề:

```bash
# 1. Stop application
pm2 stop eduportal-backend

# 2. Restore from backup
pg_restore --clean --if-exists \
  -d "$STAGING_DATABASE_URL" \
  "backup_before_migration_20260923_143000.dump"

# 3. Restart
pm2 restart eduportal-backend

# 4. Verify
npm test
curl http://localhost:5000/api/health
```

## Troubleshooting

### Lỗi: "Database not found"

```bash
# Tạo database bằng cách chạy seed
npm run seed

# Hoặc migrate trước
npm run db:migrate
```

### Lỗi: "PostgreSQL connection failed"

```bash
# Kiểm tra connection string
echo $DATABASE_URL

# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Verify SSL
psql "$DATABASE_URL?sslmode=require" -c "SELECT 1;"
```

### Lỗi: "Validation errors found"

Xem chi tiết lỗi validation:
```bash
node server/database/migration/migrate-data.js --mode=validate

# Sửa dữ liệu trong SQLite nếu cần
# Sau đó chạy lại validation
```

### Nhiều records bị skip

Kiểm tra xem có phải demo data không:
```bash
# Xem report
cat migration-reports/mig_*/mig_*.json | jq '.skipped'

# Nếu muốn migrate demo data, chỉnh skipPatterns trong migrate-data.js
```

## Best Practices

1. **Luôn backup trước** - Trước khi chạy migration bất kỳ nào
2. **Luôn dry-run trước** - Chạy `--mode=preview` trước `--mode=execute`
3. **Inspect dữ liệu** - Dùng `export-source.js` để xem dữ liệu
4. **Review skip list** - Đảm bảo không skip nhầm dữ liệu thật
5. **Verify sau migration** - Chạy tests và manual verification
6. **Giữ backup** - Không xóa backup cho đến khi hoàn toàn chắc chắn

## Quick Reference

```bash
# Export
node server/database/migration/export-source.js

# Validate
node server/database/migration/migrate-data.js --mode=validate

# Preview
STAGING_DATABASE_URL="..." node server/database/migration/migrate-data.js --mode=preview

# Execute
STAGING_DATABASE_URL="..." node server/database/migration/migrate-data.js --mode=execute
```
