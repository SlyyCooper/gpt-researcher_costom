"""
@purpose: Provides core Firestore database operations for user management and reporting
@prereq: Requires configured Firebase Admin SDK and Stripe integration
@reference: Used by firestore_routes.py for API endpoints
@maintenance: Monitor Firebase SDK and Stripe API version compatibility
"""

from .firebase import db, SERVER_TIMESTAMP, ArrayUnion
from google.cloud import firestore
from google.cloud.exceptions import Conflict
import logging
import stripe
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_user_profile(user_id: str, email: str, name: str = None):
    """
    @purpose: Creates new user profile with Stripe customer integration
    @prereq: Valid user_id and email required
    @invariant: User profiles must be unique per user_id
    @performance: Requires 1 Firestore read, 1 write, and 1 Stripe API call
    @example:
        profile = await create_user_profile(
            user_id="123",
            email="user@example.com",
            name="John Doe"
        )
    """
    if not user_id or not email:
        raise ValueError("user_id and email are required")
    
    try:
        # @purpose: Check for existing profile to maintain uniqueness
        existing_user = await get_user_data(user_id)
        if existing_user:
            return existing_user
            
        # @purpose: Create linked Stripe customer for payments
        customer = stripe.Customer.create(
            email=email,
            metadata={'user_id': user_id}
        )
        
        # @purpose: Prepare user data structure
        # @limitation: Uses local timestamp for return value consistency
        current_time = datetime.now().isoformat()
        user_data = {
            'email': email,
            'name': name,
            'stripe_customer_id': customer.id,
            'has_access': False,
            'one_time_purchase': False,
            'tokens': 0,
            'token_history': []
        }
        if name:
            user_data['name'] = name
            
        # @purpose: Create Firestore document with server timestamp
        user_ref = db.collection('users').document(user_id)
        firestore_data = {
            **user_data,
            'created_at': SERVER_TIMESTAMP,
            'last_login': SERVER_TIMESTAMP
        }
        user_ref.set(firestore_data)
        
        return user_data
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating customer: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error creating user profile: {str(e)}")
        raise

async def update_user_data(user_id: str, data: dict):
    """
    @purpose: Updates existing user profile fields
    @prereq: User profile must exist
    @limitation: Cannot update certain protected fields
    @performance: Single Firestore write operation
    """
    try:
        user_ref = db.collection('users').document(user_id)
        user_ref.update(data)
    except Exception as e:
        print(f"Error updating user data: {str(e)}")
        raise

async def get_user_data(user_id: str):
    """
    @purpose: Retrieves complete user profile data
    @prereq: Valid user_id required
    @performance: Single Firestore read operation
    @example: user_data = await get_user_data("user123")
    """
    logger.info(f"Fetching data for user: {user_id}")
    user_ref = db.collection('users').document(user_id)
    doc = user_ref.get()
    if not doc.exists:
        logger.warning(f"No data found for user: {user_id}")
    return doc.to_dict() if doc.exists else None

async def update_payment_history(user_id: str, payment_data: dict):
    """
    @purpose: Appends new payment record to user's payment history
    @prereq: User profile must exist
    @invariant: Payment records are append-only
    @performance: Single Firestore array update operation
    """
    try:
        user_ref = db.collection('users').document(user_id)
        
        # @purpose: Create timestamped payment record
        payment_record = {
            **payment_data,
            'created_at': datetime.now().isoformat()
        }
        
        # @purpose: Atomic array update using ArrayUnion
        user_ref.update({
            'payment_history': ArrayUnion([payment_record])
        })
        
        logger.info(f"Successfully updated payment history for user {user_id}")
    except Exception as e:
        logger.error(f"Error updating payment history: {str(e)}")
        raise

async def create_report_document(user_id: str, report_data: dict):
    """
    @purpose: Creates new report document in user's reports collection
    @prereq: User profile must exist
    @performance: Single Firestore write operation
    @example: report_id = await create_report_document(user_id, {'title': 'Report'})
    """
    try:
        report_ref = db.collection('users').document(user_id)\
                      .collection('reports').document()
        
        report_ref.set({
            'title': report_data['title'],
            'created_at': SERVER_TIMESTAMP,
            'file_urls': report_data['file_urls'],
            'query': report_data['query'],
            'report_type': report_data['report_type']
        })
        
        return report_ref.id
    except Exception as e:
        logger.error(f"Error creating report document: {str(e)}")
        raise

async def update_user_tokens(user_id: str, amount: int, reason: str):
    """
    @purpose: Atomically updates user token balance
    @prereq: User profile must exist
    @performance: Single atomic Firestore write
    """
    try:
        user_ref = db.collection('users').document(user_id)
        
        # Now using properly imported firestore
        user_ref.update({
            'tokens': firestore.Increment(amount),
            'token_history': firestore.ArrayUnion([{
                'amount': amount,
                'type': reason,
                'timestamp': firestore.SERVER_TIMESTAMP
            }])
        })
        
        logger.info(f"Updated tokens for user {user_id}: {amount} ({reason})")
    except Exception as e:
        logger.error(f"Error updating tokens: {str(e)}")
        raise

async def check_processed_event(event_id: str) -> bool:
    """
    @purpose: Check if Stripe webhook event was already processed
    @performance: Single Firestore read
    """
    try:
        event_ref = db.collection('processed_events').document(event_id)
        doc = event_ref.get()
        return doc.exists
    except Exception as e:
        logger.error(f"Error checking processed event: {str(e)}")
        raise

async def mark_event_processed(event_id: str, event_type: str):
    """
    @purpose: Mark Stripe webhook event as processed
    @performance: Single Firestore write with TTL
    """
    try:
        event_ref = db.collection('processed_events').document(event_id)
        event_ref.create({  # Use create instead of set for proper idempotency
            'event_id': event_id,
            'event_type': event_type,
            'processed_at': SERVER_TIMESTAMP,
            # TTL field for auto-cleanup after 30 days
            'expires_at': datetime.now() + timedelta(days=30)
        })
    except Conflict:
        # Event was already processed, which is fine for idempotency
        logger.info(f"Event {event_id} already processed")
        return
    except Exception as e:
        logger.error(f"Error marking event as processed: {str(e)}")
        raise