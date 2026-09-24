# Hướng Dẫn Vận Hành: Sao Lưu & Phục Hồi Dữ Liệu (Backup & Disaster Recovery Runbook)

Tài liệu hướng dẫn quy trình sao lưu định kỳ, khôi phục thảm họa và bảo đảm an toàn dữ liệu cho cơ sở dữ liệu PostgreSQL của EduPortal trên nền tảng Neon Cloud.

---

## 1. Mục Tiêu Vận Hành (Operational SLAs)

- **RPO (Recovery Point Objective):** $\le$ 5 phút (Tối đa dữ liệu có thể bị mất trong kịch bản sự cố).
- **RTO (Recovery Time Objective):** $\le$ 30 phút (Thời gian tối đa để khôi phục toàn bộ hệ thống trở lại trạng thái hoạt động).

---

## 2. Cơ Chế Sao Lưu Tự Động Trên Neon Cloud (Automated PITR)

Neon Cloud tích hợp sẵn tính năng **Point-in-Time Recovery (PITR)**:
- Toàn bộ các thay đổi ghi (Write-Ahead Logs) được sao lưu liên tục theo thời gian thực.
- Cho phép khôi phục cơ sở dữ liệu về bất kỳ thời điểm nào trong vòng **7 ngày** (mặc định) hoặc **30 ngày** (trên gói Production).

### Cách khôi phục nhanh qua Neon Console / CLI:
```bash
# Tạo nhánh mới từ thời điểm mong muốn trong quá khứ
neon branches create --name restore-point-2026-09-20 --timestamp "2026-09-20T14:00:00Z"
```

---

## 3. Quy Trình Sao Lưu Ngoại Tuyến Định Kỳ (Scheduled Logical Backups)

Ngoài PITR tự động trên đám mây, hệ thống thực hiện sao lưu logic định kỳ hàng ngày thông qua công cụ chuẩn `pg_dump`:

### A. Lệnh xuất bản sao lưu:
```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="eduportal_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### B. Lưu trữ an toàn:
- Các file dump được mã hóa bằng AES-256 (GPG) trước khi đẩy lên bộ lưu trữ lạnh ngoài (Offsite S3/GCS bucket).
- Chính sách lưu trữ (Retention Policy):
  - Bản sao lưu hàng ngày: Lưu giữ 30 ngày.
  - Bản sao lưu cuối tháng: Lưu giữ 12 tháng.
  - Bản sao lưu kết thúc năm học: Lưu trữ vĩnh viễn (Archival).

---

## 4. Quy Trình Khôi Phục Cơ Sở Dữ Liệu (Restore Procedure)

### Bước 1: Chuẩn bị cơ sở dữ liệu đích
Không bao giờ khôi phục đè trực tiếp lên instance đang hoạt động mà chưa kiểm tra. Hãy tạo một database mới hoặc nhánh mới:
```sql
CREATE DATABASE eduportal_restore_test;
```

### Bước 2: Thực thi nạp dữ liệu từ bản sao lưu
```bash
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "$RESTORE_DATABASE_URL" \
  "eduportal_backup_YYYYMMDD_HHMMSS.dump"
```

### Bước 3: Kiểm tra tính toàn vẹn (Integrity Verification Drill)
Chạy bộ kiểm thử tự động của dự án để đảm bảo toàn bộ 19 bảng và tính toàn vẹn khóa ngoại đều nguyên vẹn:
```bash
DATABASE_URL="$RESTORE_DATABASE_URL" npm test
```

### Bước 4: Chuyển hướng lưu lượng (Traffic Switchover)
Cập nhật biến môi trường `DATABASE_URL` của ứng dụng tới connection string mới và khởi động lại dịch vụ backend:
```bash
npm run db:status
```
