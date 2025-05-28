import os
import re
from datetime import datetime, timedelta
import json

class AvailabilityMonitor:
   
    
    def __init__(self, log_file_path=None):
        if log_file_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.log_file_path = os.path.join(base_dir, 'app.log')
        else:
            self.log_file_path = log_file_path
            
        self.maintenance_file = os.path.join(os.path.dirname(self.log_file_path), 'maintenance_windows.json')
        
        if not os.path.exists(self.maintenance_file):
            with open(self.maintenance_file, 'w') as f:
                json.dump({"windows": []}, f)
    
    def get_server_start_stops(self, days=30):
        start_pattern = re.compile(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - INFO - Starting the application\.\.\.')
        stop_pattern = re.compile(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - INFO - .* server .* stopped')
        
        cutoff_date = datetime.now() - timedelta(days=days)
        starts = []
        stops = []
        
        try:
            with open(self.log_file_path, 'r') as f:
                for line in f:
                    start_match = start_pattern.search(line)
                    if start_match:
                        timestamp = datetime.strptime(start_match.group(1), '%Y-%m-%d %H:%M:%S,%f')
                        if timestamp >= cutoff_date:
                            starts.append(timestamp)
                            
                    stop_match = stop_pattern.search(line)
                    if stop_match:
                        timestamp = datetime.strptime(stop_match.group(1), '%Y-%m-%d %H:%M:%S,%f')
                        if timestamp >= cutoff_date:
                            stops.append(timestamp)
            
            return starts, stops
        except FileNotFoundError:
            return [], []
                    
    def get_error_periods(self, days=30):
        error_pattern = re.compile(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - .* - \[.*\] "\[35m\[1m(POST|GET) .* (500) ')
        recovery_pattern = re.compile(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - .* - \[.*\] ".* (200|201|302) ')
        
        cutoff_date = datetime.now() - timedelta(days=days)
        error_periods = []
        error_start = None
        
        try:
            with open(self.log_file_path, 'r') as f:
                for line in f:
                    if error_start is None:
                        error_match = error_pattern.search(line)
                        if error_match:
                            timestamp = datetime.strptime(error_match.group(1), '%Y-%m-%d %H:%M:%S,%f')
                            if timestamp >= cutoff_date:
                                error_start = timestamp
                    else:
                        recovery_match = recovery_pattern.search(line)
                        if recovery_match:
                            timestamp = datetime.strptime(recovery_match.group(1), '%Y-%m-%d %H:%M:%S,%f')
                            if timestamp >= cutoff_date:
                                error_periods.append((error_start, timestamp))
                                error_start = None
            
            if error_start is not None:
                error_periods.append((error_start, datetime.now()))
                
            return error_periods
        except FileNotFoundError:
            return []

    def get_maintenance_windows(self, days=30):
        cutoff_date = datetime.now() - timedelta(days=days)
        
        try:
            with open(self.maintenance_file, 'r') as f:
                data = json.load(f)
                
            windows = []
            for window in data.get('windows', []):
                start = datetime.fromisoformat(window['start'])
                end = datetime.fromisoformat(window['end'])
                
                if end >= cutoff_date:
                    windows.append((start, end))
                    
            return windows
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def schedule_maintenance(self, start_time, end_time, reason="Scheduled maintenance"):
        try:
            with open(self.maintenance_file, 'r') as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = {"windows": []}
            
        if isinstance(start_time, datetime):
            start_time = start_time.isoformat()
        if isinstance(end_time, datetime):
            end_time = end_time.isoformat()
            
        data['windows'].append({
            'start': start_time,
            'end': end_time,
            'reason': reason
        })
        
        with open(self.maintenance_file, 'w') as f:
            json.dump(data, f)
    
    def calculate_availability(self, days=30):
        total_minutes = days * 24 * 60  
        
        starts, stops = self.get_server_start_stops(days)
        
        error_periods = self.get_error_periods(days)
        
        maintenance_windows = self.get_maintenance_windows(days)
        
        downtime_minutes = 0
        for i, stop_time in enumerate(stops):
            if i < len(starts):
                next_start = None
                for start in starts:
                    if start > stop_time:
                        next_start = start
                        break
                
                if next_start:
                    downtime_minutes += (next_start - stop_time).total_seconds() / 60
        
        for start, end in error_periods:
            downtime_minutes += (end - start).total_seconds() / 60
        
        maintenance_minutes = 0
        for start, end in maintenance_windows:
            maintenance_minutes += (end - start).total_seconds() / 60
        
        adjusted_total = total_minutes - maintenance_minutes
        
        if adjusted_total > 0:
            availability = ((adjusted_total - downtime_minutes) / adjusted_total) * 100
        else:
            availability = 100.0
        
        return {
            'availability_percentage': round(availability, 2),
            'total_minutes': total_minutes,
            'downtime_minutes': round(downtime_minutes, 2),
            'maintenance_minutes': round(maintenance_minutes, 2),
            'adjusted_total': round(adjusted_total, 2)
        }
    
    def get_current_status(self):
        now = datetime.now()
        maintenance_windows = self.get_maintenance_windows()
        
        for start, end in maintenance_windows:
            if start <= now <= end:
                return {
                    'status': 'maintenance',
                    'status_text': 'Scheduled Maintenance',
                    'since': start.isoformat()
                }
        
        error_periods = self.get_error_periods(days=1)
        if error_periods:
            latest_error = error_periods[-1]
            if (now - latest_error[0]).total_seconds() < 300:  
                return {
                    'status': 'degraded',
                    'status_text': 'Service Degradation',
                    'since': latest_error[0].isoformat()
                }
        
        return {
            'status': 'operational',
            'status_text': 'All Systems Operational',
            'since': None
        }
