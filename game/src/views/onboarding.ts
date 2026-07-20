/* Onboarding View - Cadet Registration */

import { navigate } from '../router';
import { storage } from '../services/storage';
import type { AgeBand } from '../types/profile';
import { bindDiegeticBrand, diegeticHeaderMarkup } from '../components/diegeticHeader';

export function renderOnboarding(container: HTMLElement): void {
  const root = document.createElement('div');
  root.className = 'screen screen-onboarding';

  root.innerHTML = `
    ${diegeticHeaderMarkup()}
    <main>
      <div class="onboarding-panel">
        <h2 class="text-primary" style="margin-bottom: var(--space-md);">Cadet Registration</h2>
        <p class="text-secondary" style="margin-bottom: var(--space-xl);">
          Welcome, future astronaut! Let's get you registered for your cosmic journey.
        </p>
        
        <form id="onboardingForm" class="onboarding-form">
          <div class="form-field">
            <label for="callsign">
              <strong>Callsign</strong>
              <span class="field-hint">(Your space explorer name)</span>
            </label>
            <input 
              type="text" 
              id="callsign" 
              name="callsign" 
              required 
              minlength="2" 
              maxlength="20"
              placeholder="Enter your callsign"
              aria-label="Enter your callsign"
            />
            <span class="error-message" id="callsignError"></span>
          </div>

          <div class="form-field">
            <label for="email">
              <strong>Interstellar Comms Link</strong>
              <span class="field-hint">(Guardian's email for mission reports)</span>
            </label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required
              placeholder="guardian@example.com"
              aria-label="Enter guardian email address"
            />
            <span class="error-message" id="emailError"></span>
          </div>

          <div class="form-field">
            <label for="ageBand">
              <strong>Age Band</strong>
              <span class="field-hint">(This adjusts difficulty and hints)</span>
            </label>
            <div class="age-band-options">
              <label class="age-band-option">
                <input type="radio" name="ageBand" value="5-7" required />
                <div class="option-card">
                  <strong>Little Sparks</strong>
                  <span class="text-secondary">Ages 5-7</span>
                </div>
              </label>
              <label class="age-band-option">
                <input type="radio" name="ageBand" value="8-11" required />
                <div class="option-card">
                  <strong>Star Gazers</strong>
                  <span class="text-secondary">Ages 8-11</span>
                </div>
              </label>
              <label class="age-band-option">
                <input type="radio" name="ageBand" value="12-15" required />
                <div class="option-card">
                  <strong>Galaxy Explorers</strong>
                  <span class="text-secondary">Ages 12-15</span>
                </div>
              </label>
            </div>
            <span class="error-message" id="ageBandError"></span>
          </div>

          <!-- Guardian consent for users under 13 -->
          <div class="consent-notice">
            <label class="consent-checkbox">
              <input type="checkbox" id="consent" name="consent" required />
              <span>
                For users under 13, parent/guardian consent is required.
                By registering, you agree to receive progress reports and certificates via email.
              </span>
            </label>
            <span class="error-message" id="consentError"></span>
          </div>

          <button type="submit" class="submit-btn">
            Launch Mission 🚀
          </button>
        </form>
      </div>
    </main>
  `;

  // Form submission handler
  const form = root.querySelector('#onboardingForm') as HTMLFormElement;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(root);
  });

  // Clear errors on input
  root.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      const errorId = input.id + 'Error';
      const errorEl = root.querySelector('#' + errorId);
      if (errorEl) errorEl.textContent = '';
    });
  });

  bindDiegeticBrand(root);
  container.appendChild(root);
}

function handleSubmit(root: HTMLElement): void {
  const form = root.querySelector('#onboardingForm') as HTMLFormElement;
  const formData = new FormData(form);
  
  const callsign = (formData.get('callsign') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const ageBand = formData.get('ageBand') as AgeBand;
  const consent = formData.get('consent') === 'on';

  // Validation
  let isValid = true;

  if (!callsign || callsign.length < 2) {
    showError(root, 'callsignError', 'Callsign must be at least 2 characters');
    isValid = false;
  }

  if (!email || !isValidEmail(email)) {
    showError(root, 'emailError', 'Please enter a valid email address');
    isValid = false;
  }

  if (!ageBand) {
    showError(root, 'ageBandError', 'Please select an age band');
    isValid = false;
  }

  // Guardian consent required for kid-safe registration
  if (!consent) {
    showError(root, 'consentError', 'Please confirm parent/guardian consent');
    isValid = false;
  }

  if (!isValid) return;

  // Create profile
  try {
    storage.createProfile({
      callsign,
      email,
      ageBand,
      badges: [],
    });

    // Navigate to home
    navigate({ name: 'home' });
  } catch (error) {
    console.error('Error creating profile:', error);
    alert('Failed to save profile. Please try again.');
  }
}

function showError(root: HTMLElement, errorId: string, message: string): void {
  const errorEl = root.querySelector('#' + errorId) as HTMLElement | null;
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

