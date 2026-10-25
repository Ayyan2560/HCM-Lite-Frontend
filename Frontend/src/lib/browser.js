export async function getAttendanceLocation(organization) {
  if (!organization?.geofenceEnabled) return {};

  if (!navigator.geolocation) {
    throw new Error('This browser does not support location sharing, which this workspace requires for attendance.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access to record attendance while geofencing is enabled.'
          : 'Could not determine your location. Move to an open area and try again.';
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

export async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement('textarea');
  field.value = value;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  document.execCommand('copy');
  field.remove();
}
