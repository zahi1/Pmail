from flask import Blueprint, jsonify, request
from backend.models.database import db
from backend.models.message import Message

bulk_updates_bp = Blueprint('bulk_updates', __name__)

@bulk_updates_bp.route('/messages/bulk-status-update', methods=['PUT'])
def bulk_status_update():
    """
    Update the status of multiple messages at once
    Expects JSON payload with:
    - message_ids: array of message IDs
    - status: new status to set
    """
    data = request.json
    
    if not data or 'message_ids' not in data or 'status' not in data:
        return jsonify({
            'error': 'Invalid request: message_ids and status are required'
        }), 400
    
    message_ids = data['message_ids']
    new_status = data['status']
    updated_count = 0
    
    for message_id in message_ids:
        message = Message.query.get(message_id)
        if message:
            message.status = new_status
            updated_count += 1
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'updated_count': updated_count,
        'message': f'Successfully updated {updated_count} messages'
    }), 200
