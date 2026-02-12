import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';
import * as api from './api';

export async function register(email: string, inviteToken?: string): Promise<boolean> {
  try {
    // Get registration options from server
    const { options, challengeId, userId } = await api.getRegisterOptions(email, inviteToken);

    // Start WebAuthn registration
    const credential = await startRegistration(options as PublicKeyCredentialCreationOptionsJSON);

    // Verify with server
    const result = await api.verifyRegistration({
      challengeId,
      userId,
      email,
      response: credential,
      inviteToken,
    });

    return result.success;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

export async function login(email?: string): Promise<boolean> {
  try {
    // Get authentication options from server
    const { options, challengeId } = await api.getLoginOptions(email);

    // Start WebAuthn authentication
    const credential = await startAuthentication(options as PublicKeyCredentialRequestOptionsJSON);

    // Verify with server
    const result = await api.verifyLogin({
      challengeId,
      response: credential,
    });

    return result.success;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
