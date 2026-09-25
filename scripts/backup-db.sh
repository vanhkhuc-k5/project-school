#!/bin/bash
# =============================================================================
# EduPortal Database Backup Script (G53)
# =============================================================================
# Usage:
#   ./scripts/backup-db.sh              # Backup all databases
#   ./scripts/backup-db.sh --postgres  # Backup PostgreSQL only
#   ./scripts/backup-db.sh --sqlite    # Backup SQLite only
#   ./scripts/backup-db.sh --restore   # List available backups
#
# Cron setup (run daily at midnight):
#   0 0 * * * /path/to/scripts/backup-db.sh >> /var/log/backup.log 2>&1
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/eduportal}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
HOSTNAME=$(hostname)
LOG_FILE="${LOG_FILE:-/var/log/backup-db.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE" >&2
}

# =============================================================================
# Create Backup Directory
# =============================================================================
init_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi
}

# =============================================================================
# PostgreSQL Backup
# =============================================================================
backup_postgres() {
    local db_url="${DATABASE_URL:-}"
    local db_name="${POSTGRES_DB:-eduportal}"
    local db_user="${POSTGRES_USER:-eduportal}"
    local db_host="${POSTGRES_HOST:-localhost}"
    local db_port="${POSTGRES_PORT:-5432}"
    
    if [[ -z "$db_url" && -z "${PGPASSWORD:-}" ]]; then
        log_warn "PostgreSQL credentials not configured, skipping..."
        return 0
    fi
    
    local backup_file="${BACKUP_DIR}/postgres_${db_name}_${TIMESTAMP}.sql.gz"
    
    log_info "Starting PostgreSQL backup for: $db_name"
    
    # Set password from URL if provided
    if [[ -n "$db_url" ]]; then
        export PGPASSWORD=$(echo "$db_url" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    fi
    
    # Create backup using pg_dump
    if pg_dump -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" \
        --no-owner --no-acl --format=custom -Z 6 -f "$backup_file" 2>/dev/null; then
        
        local file_size=$(du -h "$backup_file" | cut -f1)
        log_info "PostgreSQL backup created: $backup_file ($file_size)"
        
        # Create latest symlink
        ln -sf "$(basename "$backup_file")" "${BACKUP_DIR}/postgres_${db_name}_latest.dump"
        
        return 0
    else
        log_error "Failed to create PostgreSQL backup"
        return 1
    fi
}

# =============================================================================
# SQLite Backup
# =============================================================================
backup_sqlite() {
    local db_path="${DB_PATH:-./database.sqlite}"
    local db_name=$(basename "$db_path" .sqlite)
    
    if [[ ! -f "$db_path" ]]; then
        log_warn "SQLite database not found at: $db_path, skipping..."
        return 0
    fi
    
    local backup_file="${BACKUP_DIR}/sqlite_${db_name}_${TIMESTAMP}.sql.gz"
    
    log_info "Starting SQLite backup for: $db_path"
    
    # SQLite Online Backup API via .backup command
    # Use .dump for portability (includes schema + data)
    if sqlite3 "$db_path" ".backup '${backup_file}.tmp'" 2>/dev/null && \
       gzip -6 "${backup_file}.tmp" -c > "$backup_file"; then
        
        local file_size=$(du -h "$backup_file" | cut -f1)
        rm -f "${backup_file}.tmp"
        
        log_info "SQLite backup created: $backup_file ($file_size)"
        
        # Create latest symlink
        ln -sf "$(basename "$backup_file")" "${BACKUP_DIR}/sqlite_${db_name}_latest.sql.gz"
        
        return 0
    else
        log_error "Failed to create SQLite backup"
        return 1
    fi
}

# =============================================================================
# Clean Old Backups
# =============================================================================
cleanup_old_backups() {
    log_info "Cleaning backups older than $RETENTION_DAYS days..."
    
    local count_before=$(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.dump" 2>/dev/null | wc -l)
    
    # Find and delete old backups
    find "$BACKUP_DIR" \( -name "*.sql.gz" -o -name "*.dump" \) \
        -type f -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true
    
    local count_after=$(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.dump" 2>/dev/null | wc -l)
    local deleted=$((count_before - count_after))
    
    if [[ $deleted -gt 0 ]]; then
        log_info "Cleaned up $deleted old backup(s)"
    fi
    
    # Clean up broken symlinks
    find "$BACKUP_DIR" -type l ! -e . -delete 2>/dev/null || true
}

# =============================================================================
# List Available Backups
# =============================================================================
list_backups() {
    echo ""
    echo "=== Available Backups in $BACKUP_DIR ==="
    echo ""
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        echo "No backups found (directory does not exist)"
        return 0
    fi
    
    echo "PostgreSQL backups:"
    find "$BACKUP_DIR" -name "postgres_*.dump" -type f -printf "%T+ %s %p\n" 2>/dev/null | \
        sort -r | while read -r date size path; do
            local size_mb=$((size / 1024 / 1024))
            echo "  $(basename "$path") - $(date -d "$date" '+%Y-%m-%d %H:%M' 2>/dev/null || echo "$date") - ${size_mb}MB"
        done
    
    echo ""
    echo "SQLite backups:"
    find "$BACKUP_DIR" -name "sqlite_*.sql.gz" -type f -printf "%T+ %s %p\n" 2>/dev/null | \
        sort -r | while read -r date size path; do
            local size_mb=$((size / 1024 / 1024))
            echo "  $(basename "$path") - $(date -d "$date" '+%Y-%m-%d %H:%M' 2>/dev/null || echo "$date") - ${size_mb}MB"
        done
    
    echo ""
    echo "Latest symlinks:"
    find "$BACKUP_DIR" -name "*_latest*" -type l -printf "  %l -> %p\n" 2>/dev/null
    
    echo ""
    echo "Total backups: $(find "$BACKUP_DIR" \( -name "*.sql.gz" -o -name "*.dump" \) -type f 2>/dev/null | wc -l)"
    echo ""
}

# =============================================================================
# Restore from Backup (Interactive)
# =============================================================================
restore_backup() {
    echo ""
    echo "=== Restore from Backup ==="
    echo "WARNING: This will overwrite the current database!"
    echo ""
    
    read -p "Enter backup filename to restore: " backup_file
    
    local backup_path="${BACKUP_DIR}/${backup_file}"
    
    if [[ ! -f "$backup_path" ]]; then
        log_error "Backup file not found: $backup_path"
        exit 1
    fi
    
    read -p "Are you sure? Type 'yes' to confirm: " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
    
    if [[ "$backup_file" == postgres_* ]]; then
        log_info "Restoring PostgreSQL from: $backup_file"
        # Note: Actual restore requires dropping and recreating the database
        log_warn "Manual restore required. Use: pg_restore -c -d \$DB_NAME $backup_path"
    elif [[ "$backup_file" == sqlite_* ]]; then
        log_info "Restoring SQLite from: $backup_file"
        gunzip -c "$backup_path" | sqlite3 "${DB_PATH:-./database.sqlite}"
        log_info "SQLite restored successfully"
    else
        log_error "Unknown backup format"
        exit 1
    fi
}

# =============================================================================
# Main Entry Point
# =============================================================================
main() {
    log_info "=== EduPortal Database Backup Started ==="
    log_info "Host: $HOSTNAME, Timestamp: $TIMESTAMP"
    
    init_backup_dir
    
    case "${1:-all}" in
        --postgres|-p)
            backup_postgres
            ;;
        --sqlite|-s)
            backup_sqlite
            ;;
        --list|-l)
            list_backups
            exit 0
            ;;
        --restore|-r)
            restore_backup
            exit 0
            ;;
        --all|-a|"")
            backup_postgres || true
            backup_sqlite || true
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --postgres, -p    Backup PostgreSQL database only"
            echo "  --sqlite, -s     Backup SQLite database only"
            echo "  --all, -a        Backup all databases (default)"
            echo "  --list, -l       List available backups"
            echo "  --restore, -r    Restore from backup (interactive)"
            echo "  --help, -h       Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  BACKUP_DIR       Backup directory (default: /var/backups/eduportal)"
            echo "  RETENTION_DAYS    Days to keep backups (default: 30)"
            echo "  DATABASE_URL     PostgreSQL connection string"
            echo "  DB_PATH          SQLite database path (default: ./database.sqlite)"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
    
    # Always cleanup old backups
    cleanup_old_backups
    
    log_info "=== Backup Completed Successfully ==="
}

# Run main function
main "$@"
