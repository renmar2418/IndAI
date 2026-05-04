from app.extensions import db
from datetime import date

class DailyPlatformStat(db.Model):
    """
    MySQL Aggregation Table: Stores daily totals of platform activity.
    This prevents Recharts from crashing the system under heavy load by querying
    this lightweight table instead of summing millions of individual scan rows.
    """
    __tablename__ = "daily_platform_stats"

    id = db.Column(db.Integer, primary_key=True)
    stat_date = db.Column(db.Date, unique=True, nullable=False, index=True)
    
    # Aggregated metrics
    new_users = db.Column(db.Integer, default=0)
    total_active_users = db.Column(db.Integer, default=0) # Users who logged in/scanned
    total_scans = db.Column(db.Integer, default=0)
    total_critical_vulns = db.Column(db.Integer, default=0)
    total_high_vulns = db.Column(db.Integer, default=0)
    
    # Optional metadata
    notes = db.Column(db.Text, nullable=True) # E.g., "API abuse detected and blocked"

    @classmethod
    def get_or_create_today(cls):
        today = date.today()
        stat = cls.query.filter_by(stat_date=today).first()
        if not stat:
            stat = cls(stat_date=today)
            db.session.add(stat)
            db.session.commit()
        return stat

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.stat_date.isoformat(),
            "new_users": self.new_users,
            "total_active_users": self.total_active_users,
            "total_scans": self.total_scans,
            "total_critical_vulns": self.total_critical_vulns,
            "total_high_vulns": self.total_high_vulns,
            "notes": self.notes
        }
