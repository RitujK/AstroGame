/* Mission Report Feedback Modal */

import { storage } from '../services/storage';
import { getMission, padMissionId } from '../data/missions';
import type { MissionFeedback } from '../types/profile';

export interface FeedbackModalOptions {
  missionId: number;
  onComplete: () => void;
}

export function showFeedbackModal(options: FeedbackModalOptions): void {
  const { missionId, onComplete } = options;
  const mission = getMission(missionId);

  const overlay = document.createElement('div');
  overlay.className = 'feedback-modal-overlay';
  overlay.innerHTML = `
    <div class="feedback-modal">
      <header class="feedback-header">
        <h2>📋 Mission Report</h2>
        <p class="text-secondary">How did your mission go?</p>
      </header>
      
      <form id="feedbackForm" class="feedback-form">
        <div class="feedback-question">
          <label for="enjoyment">
            <strong>How much did you enjoy this mission?</strong>
            <span class="field-hint">Rate from 1 (Boring!) to 10 (Blast off!)</span>
          </label>
          <div class="rating-slider-container">
            <span class="rating-label">1</span>
            <input 
              type="range" 
              id="enjoyment" 
              name="enjoyment" 
              min="1" 
              max="10" 
              value="5"
              required
              aria-label="Enjoyment rating from 1 to 10"
            />
            <span class="rating-label">10</span>
          </div>
          <div class="rating-display">
            <span id="enjoymentValue">5</span>
          </div>
        </div>

        <div class="feedback-question">
          <label for="understanding">
            <strong>How well do you understand the concept now?</strong>
            <span class="field-hint">Rate from 1 (Huh?) to 10 (I'm a genius!)</span>
          </label>
          <div class="rating-slider-container">
            <span class="rating-label">1</span>
            <input 
              type="range" 
              id="understanding" 
              name="understanding" 
              min="1" 
              max="10" 
              value="5"
              required
              aria-label="Understanding rating from 1 to 10"
            />
            <span class="rating-label">10</span>
          </div>
          <div class="rating-display">
            <span id="understandingValue">5</span>
          </div>
        </div>

        <div class="feedback-question">
          <label>
            <strong>Would you recommend this mission to a friend?</strong>
          </label>
          <div class="recommend-options">
            <label class="recommend-option">
              <input type="radio" name="recommend" value="yes" required />
              <span class="recommend-btn yes">👍 Yes</span>
            </label>
            <label class="recommend-option">
              <input type="radio" name="recommend" value="no" required />
              <span class="recommend-btn no">👎 No</span>
            </label>
          </div>
        </div>

        <div class="feedback-actions">
          <button type="submit" class="submit-feedback-btn">Submit Report</button>
        </div>
      </form>
    </div>
  `;

  const modal = overlay.querySelector('.feedback-modal') as HTMLElement;
  const enjoymentSlider = overlay.querySelector('#enjoyment') as HTMLInputElement;
  const understandingSlider = overlay.querySelector('#understanding') as HTMLInputElement;
  const enjoymentValue = overlay.querySelector('#enjoymentValue') as HTMLElement;
  const understandingValue = overlay.querySelector('#understandingValue') as HTMLElement;

  enjoymentSlider.addEventListener('input', () => {
    enjoymentValue.textContent = enjoymentSlider.value;
  });

  understandingSlider.addEventListener('input', () => {
    understandingValue.textContent = understandingSlider.value;
  });

  const form = overlay.querySelector('#feedbackForm') as HTMLFormElement;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const feedback: MissionFeedback = {
      enjoyment: parseInt(formData.get('enjoyment') as string, 10),
      understanding: parseInt(formData.get('understanding') as string, 10),
      wouldRecommend: formData.get('recommend') === 'yes',
      timestamp: Date.now(),
    };

    storage.saveMissionFeedback(missionId, feedback);
    showRecapAndBadge(modal, missionId, mission, onComplete);
  });

  document.body.appendChild(overlay);
  setTimeout(() => enjoymentSlider.focus(), 100);
}

function showRecapAndBadge(
  modal: HTMLElement,
  missionId: number,
  mission: ReturnType<typeof getMission>,
  onComplete: () => void,
): void {
  const title = mission?.title ?? `Mission ${missionId}`;
  const concept = mission?.concept ?? 'Astronomy';
  const recap = mission?.recap ?? 'You explored a new corner of the cosmos today.';
  const badgeLabel = padMissionId(missionId);

  modal.innerHTML = `
    <div class="feedback-recap">
      <header class="feedback-header">
        <h2>Mission Complete!</h2>
        <p class="text-secondary">${title} · ${concept}</p>
      </header>

      <div class="feedback-badge-award" role="img" aria-label="Mission ${missionId} badge earned">
        <div class="feedback-badge-icon">✦</div>
        <p class="feedback-badge-label">Mission ${badgeLabel} Badge</p>
      </div>

      <div class="feedback-recap-copy">
        <p class="feedback-recap-eyebrow">What you discovered</p>
        <p class="feedback-recap-text">${recap}</p>
      </div>

      <div class="feedback-actions">
        <button type="button" class="submit-feedback-btn" id="feedbackDoneBtn">← Back to Mission Map</button>
      </div>
    </div>
  `;

  modal.querySelector('#feedbackDoneBtn')?.addEventListener('click', () => {
    modal.closest('.feedback-modal-overlay')?.remove();
    onComplete();
  });
}
