import { loadStripe } from '@stripe/stripe-js';
import { getAuth } from 'firebase/auth';
import {
  CheckoutSessionRequest,
  SubscriptionStatusResponse,
  Product,
  ProductsResponse,
  CancelSubscriptionResponse
} from './types/models';

const BASE_URL = 'https://dolphin-app-49eto.ondigitalocean.app/backend';

// Helper function to get Firebase token
const getFirebaseToken = async (): Promise<string> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('No user logged in');
  }
  return await currentUser.getIdToken();
};

// API Functions
export const createCheckoutSession = async (
  price_id: string,
  mode: 'subscription' | 'payment'
): Promise<void> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const checkoutData: CheckoutSessionRequest = { price_id, mode };
    
    const response = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create checkout session');
    }
    
    const { sessionId } = await response.json();
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
    
    if (!stripe) throw new Error('Stripe failed to load');
    
    const { error } = await stripe.redirectToCheckout({ sessionId });
    if (error) throw error;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const createPortalSession = async (): Promise<string> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/stripe/create-portal-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create portal session');
    }
    
    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
};

export const cancelSubscription = async (): Promise<CancelSubscriptionResponse> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/stripe/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to cancel subscription');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

export const getSubscriptionStatus = async (): Promise<SubscriptionStatusResponse> => {
  try {
    const firebaseToken = await getFirebaseToken();
    const response = await fetch(`${BASE_URL}/api/stripe/subscription-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${firebaseToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch subscription status');
    }
    
    const data = await response.json();
    return {
      ...data,
      tokens: data.tokens || 0
    };
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    throw error;
  }
};

export const getProducts = async (): Promise<ProductsResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/api/stripe/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch products');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};