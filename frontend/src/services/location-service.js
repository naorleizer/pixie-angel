import { updateUserPreferences } from "../api.js";

// Check if location permission is currently granted by the browser
export async function checkLocationPermission() {
  if (!('permissions' in navigator) || !('geolocation' in navigator)) {
    return false;
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state === 'granted';
  } catch (err) {
    // Fallback: try to get current position to check permission
    try {
      await requestLocationPermission();
      return true;
    } catch {
      return false;
    }
  }
}

// Request browser geolocation permission and resolve with coordinates
export async function requestLocationPermission() {
  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported on this device');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  });
}

// Persist preference to backend
export async function saveLocationPreference(enabled) {
  try {
    await updateUserPreferences({ location_enabled: !!enabled });
    try { localStorage.setItem('pref_location', enabled ? '1' : '0'); } catch (e) {}
  } catch (error) {
    console.error('Failed to save location preference', error);
  }
}

// Sync browser permission state with backend settings
export async function syncLocationPermission() {
  try {
    const hasPermission = await checkLocationPermission();
    const savedPref = localStorage.getItem('pref_location') === '1';
    
    // If browser permission doesn't match saved preference, update backend
    if (hasPermission !== savedPref) {
      await saveLocationPreference(hasPermission);
      
      // Update UI toggle if present
      const toggle = document.querySelector('[data-pref="location"]');
      if (toggle) {
        const knob = toggle.querySelector('.toggle-knob');
        if (hasPermission) {
          toggle.classList.add('bg-indigo-600');
          if (knob) knob.classList.add('translate-x-5');
          toggle.setAttribute('aria-pressed', 'true');
        } else {
          toggle.classList.remove('bg-indigo-600');
          if (knob) knob.classList.remove('translate-x-5');
          toggle.setAttribute('aria-pressed', 'false');
        }
      }
    }
  } catch (error) {
    console.error('Failed to sync location permission', error);
  }
}
