/**
 * Example of handling signup errors in MetropolisJS
 */
import {FluxFramework} from '@nlabs/arkhamjs';
import type {userActions} from '../src/actions/userActions/userActions';
import {USER_CONSTANTS} from '../src/stores/userStore';
import {createAction} from '../src/utils/actionFactory';

// Create a flux instance and user actions
const flux = new FluxFramework();
const userActions = createAction('user', flux) as unknown as userActions;

/**
 * Example 1: Basic error handling with try/catch
 */
const handleAddWithTryCatch = async (userData: any) => {
  try {
    const user = await userActions.addUser(userData);
    console.log('Add successful:', user);
    return {success: true, user};
  } catch (error) {
    console.error('Add failed:', error.message);
    return {success: false, error: error.message};
  }
};

/**
 * Example 2: Using Flux store to handle errors
 */
const handleSignUpWithFlux = async (userData: any) => {
  // Set up a listener for signup success
  const onSignUpSuccess = (payload: any) => {
    console.log('Signup successful:', payload.user);
    flux.removeListener(USER_CONSTANTS.SIGN_UP_SUCCESS, onSignUpSuccess);
    flux.removeListener(USER_CONSTANTS.SIGN_UP_ERROR, onSignUpError);
  };

  // Set up a listener for signup error
  const onSignUpError = (payload: any) => {
    console.error('Signup failed:', payload.error.message);
    flux.removeListener(USER_CONSTANTS.SIGN_UP_SUCCESS, onSignUpSuccess);
    flux.removeListener(USER_CONSTANTS.SIGN_UP_ERROR, onSignUpError);
  };

  // Add listeners
  flux.addListener(USER_CONSTANTS.SIGN_UP_SUCCESS, onSignUpSuccess);
  flux.addListener(USER_CONSTANTS.SIGN_UP_ERROR, onSignUpError);

  // Attempt signup
  try {
    await userActions.signUp(userData);
  } catch (error) {
    // Error is already handled by the flux listener
    // This catch is just to prevent the error from propagating
  }
};

/**
 * Example 3: Custom validation before signup
 */
const handleSignUpWithValidation = async (userData: any) => {
  // Perform custom validation
  const errors: string[] = [];

  if (!userData.email || !userData.email.includes('@')) {
    errors.push('Invalid email format');
  }

  if (!userData.password || userData.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!userData.username || userData.username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }

  // If validation fails, return errors
  if (errors.length > 0) {
    return {success: false, errors};
  }

  // If validation passes, attempt signup
  try {
    const user = await userActions.signUp(userData);
    return {success: true, user};
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('already exists')) {
      return {success: false, errors: ['Username or email already in use']};
    }

    return {success: false, errors: [error.message]};
  }
};

// Export examples
export {
  handleSignUpWithFlux, handleSignUpWithTryCatch, handleSignUpWithValidation
};

