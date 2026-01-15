/**
 * Correct usage of signIn from MetropolisJS userActions
 * This replaces the incorrect manual GraphQL construction
 */
import {FluxFramework} from '@nlabs/arkhamjs';
import {createUserActions} from './src/actions/userActions/userActions';

// Create flux instance and user actions
const flux = new FluxFramework();
const userActions = createUserActions(flux);

/**
 * Correct signIn usage - pass user object with authentication fields
 */
const signInUser = async (username: string, password: string, expires: number = 15) => {
  try {
    // Correct way: pass user object with username/password
    const session = await userActions.signIn({
      username,
      password
    }, expires);

    console.log('Sign in successful:', session);
    return {success: true, session};
  } catch (error: any) {
    console.error('Sign in failed:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Alternative: sign in with email
 */
const signInWithEmail = async (email: string, password: string, expires: number = 15) => {
  try {
    const session = await userActions.signIn({
      email,
      password
    }, expires);

    console.log('Sign in successful:', session);
    return {success: true, session};
  } catch (error: any) {
    console.error('Sign in failed:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Alternative: sign in with phone
 */
const signInWithPhone = async (phone: string, password: string, expires: number = 15) => {
  try {
    const session = await userActions.signIn({
      phone,
      password
    }, expires);

    console.log('Sign in successful:', session);
    return {success: true, session};
  } catch (error: any) {
    console.error('Sign in failed:', error.message);
    return {success: false, error: error.message};
  }
};

// Export the correct functions
export {
  signInUser,
  signInWithEmail,
  signInWithPhone
};

