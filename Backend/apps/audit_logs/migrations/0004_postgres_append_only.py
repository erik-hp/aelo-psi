from django.db import migrations


def install_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute("""
        CREATE FUNCTION audit_logs_guard_entry() RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'Audit entries cannot be deleted';
            END IF;
            IF OLD.entry_hash = '' AND NEW.entry_hash <> ''
               AND to_jsonb(NEW) - 'entry_hash' = to_jsonb(OLD) - 'entry_hash' THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Audit entries cannot be modified';
        END;
        $$ LANGUAGE plpgsql;
    """)
    schema_editor.execute("""
        CREATE TRIGGER audit_logs_entry_append_only
        BEFORE UPDATE OR DELETE ON audit_logs_auditlog
        FOR EACH ROW EXECUTE FUNCTION audit_logs_guard_entry();
    """)
    schema_editor.execute("""
        CREATE FUNCTION audit_logs_guard_state() RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'Audit chain state cannot be deleted';
            END IF;
            IF NEW.id <> OLD.id OR NEW.sequence <> OLD.sequence + 1
               OR NOT EXISTS (
                   SELECT 1 FROM audit_logs_auditlog entry
                   WHERE entry.sequence = NEW.sequence
                     AND entry.previous_hash = OLD.head_hash
                     AND entry.entry_hash = NEW.head_hash
               ) THEN
                RAISE EXCEPTION 'Audit chain state must advance by one sealed entry';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    schema_editor.execute("""
        CREATE TRIGGER audit_logs_state_monotonic
        BEFORE UPDATE OR DELETE ON audit_logs_auditchainstate
        FOR EACH ROW EXECUTE FUNCTION audit_logs_guard_state();
    """)


def remove_guards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute("DROP TRIGGER audit_logs_state_monotonic ON audit_logs_auditchainstate;")
    schema_editor.execute("DROP FUNCTION audit_logs_guard_state();")
    schema_editor.execute("DROP TRIGGER audit_logs_entry_append_only ON audit_logs_auditlog;")
    schema_editor.execute("DROP FUNCTION audit_logs_guard_entry();")


class Migration(migrations.Migration):
    dependencies = [("audit_logs", "0003_auditchainstate_auditlog_actor_id_and_more")]
    operations = [migrations.RunPython(install_guards, remove_guards)]
