import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from sqlalchemy import text, inspect

def run_fix():
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print("Starting comprehensive database schema sync...")
        
        for table_name, table in db.metadata.tables.items():
            if table_name not in existing_tables:
                print(f"[{table_name}] Missing entirely. Let db.create_all() handle this.")
                continue
                
            existing_columns = {col['name'] for col in inspector.get_columns(table_name)}
            
            for column in table.columns:
                if column.name not in existing_columns:
                    col_type = column.type.compile(db.engine.dialect)
                    nullable = "NULL" if column.nullable else "NOT NULL"
                    default = ""
                    if column.server_default:
                        default = f"DEFAULT {column.server_default.arg}"
                        
                    alter_stmt = f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type} {nullable} {default};"
                    print(f"[{table_name}] Missing column: {column.name} -> Executing: {alter_stmt}")
                    
                    try:
                        db.session.execute(text(alter_stmt))
                        db.session.commit()
                        print(f"  -> SUCCESS")
                    except Exception as e:
                        db.session.rollback()
                        print(f"  -> ERROR: {e}")
                        
        print("Done syncing columns.")

if __name__ == "__main__":
    run_fix()
