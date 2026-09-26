-- =============================================================================
-- Migration: G27 — Safe Parent/Teacher Messaging
-- Enhances parent_teacher_messages with conversation threads, archiving,
-- proper sender/receiver relationships, and safety metadata.
-- =============================================================================

-- 1. Conversation threads — group messages into threads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_conversations') THEN
    CREATE TABLE message_conversations (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      subject VARCHAR(255),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      last_message_at TIMESTAMPTZ,
      parent_unread_count INTEGER DEFAULT 0,
      teacher_unread_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      archived_at TIMESTAMPTZ,
      archived_by TEXT
    );

    -- Indexes
    CREATE INDEX idx_conv_parent ON message_conversations(parent_id, status);
    CREATE INDEX idx_conv_teacher ON message_conversations(teacher_id, status);
    CREATE INDEX idx_conv_student ON message_conversations(student_id);
    CREATE INDEX idx_conv_school ON message_conversations(school_id, status);
  END IF;
END
$$;

-- 2. Messages — enhanced from baseline
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parent_teacher_messages') THEN
    CREATE TABLE parent_teacher_messages (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('parent', 'teacher', 'admin')),
      receiver_role VARCHAR(20) NOT NULL CHECK (receiver_role IN ('parent', 'teacher', 'admin')),
      student_id TEXT,
      subject VARCHAR(255),
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      read_at TIMESTAMPTZ,
      is_archived_by_sender BOOLEAN DEFAULT FALSE,
      is_archived_by_receiver BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX idx_msg_conversation ON parent_teacher_messages(conversation_id, created_at);
    CREATE INDEX idx_msg_sender ON parent_teacher_messages(sender_id, created_at);
    CREATE INDEX idx_msg_receiver ON parent_teacher_messages(receiver_id, is_read);
    CREATE INDEX idx_msg_school ON parent_teacher_messages(school_id);
  END IF;
END
$$;

-- 3. Add missing columns to existing table (if table exists but missing columns)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parent_teacher_messages') THEN
    -- Add conversation_id if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'parent_teacher_messages' AND column_name = 'conversation_id'
    ) THEN
      ALTER TABLE parent_teacher_messages ADD COLUMN conversation_id TEXT;
      ALTER TABLE parent_teacher_messages ADD COLUMN sender_role VARCHAR(20);
      ALTER TABLE parent_teacher_messages ADD COLUMN receiver_role VARCHAR(20);
      ALTER TABLE parent_teacher_messages ADD COLUMN is_archived_by_sender BOOLEAN DEFAULT FALSE;
      ALTER TABLE parent_teacher_messages ADD COLUMN is_archived_by_receiver BOOLEAN DEFAULT FALSE;
      ALTER TABLE parent_teacher_messages ADD COLUMN updated_at TIMESTAMPTZ;
    END IF;
  END IF;
END
$$;
