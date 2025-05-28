from flask import Blueprint, jsonify, request, render_template
from backend.routes.availability_monitor import AvailabilityMonitor
from datetime import datetime, timedelta

status_bp = Blueprint('status', __name__)
monitor = AvailabilityMonitor()

@status_bp.route('/status', methods=['GET'])
def get_status():
    current_status = monitor.get_current_status()
    
    availability_30d = monitor.calculate_availability(days=30)
    availability_7d = monitor.calculate_availability(days=7)
    availability_24h = monitor.calculate_availability(days=1)
    
    return jsonify({
        'status': current_status['status'],
        'status_text': current_status['status_text'],
        'last_updated': datetime.now().isoformat(),
        'availability': {
            'last_24h': availability_24h['availability_percentage'],
            'last_7d': availability_7d['availability_percentage'],
            'last_30d': availability_30d['availability_percentage']
        }
    })

@status_bp.route('/status/maintenance', methods=['POST'])
def schedule_maintenance():
    data = request.get_json()
    
    if not data or 'start' not in data or 'end' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        start_time = datetime.fromisoformat(data['start'])
        end_time = datetime.fromisoformat(data['end'])
        reason = data.get('reason', 'Scheduled maintenance')
        
        if start_time >= end_time:
            return jsonify({'error': 'End time must be after start time'}), 400
            
        monitor.schedule_maintenance(start_time, end_time, reason)
        
        return jsonify({'success': True, 'message': 'Maintenance window scheduled'})
    except ValueError:
        return jsonify({'error': 'Invalid datetime format'}), 400

@status_bp.route('/status/page', methods=['GET'])
def status_page():
    return render_template('status.html')
