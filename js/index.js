if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// ================= Spotify Web Playback SDK =================

// --- CONFIGURACIÓN ---
const clientId = '38ee0a10def44f93aaf9a945965098dc'; // Reemplaza con tu Client ID
const redirectUri = 'https://rubxs7.github.io/RubxsSongs';//window.location.origin + window.location.pathname; // Redirige a la misma página
const scopes = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'streaming'
];

// --- FUNCIONES ---
function getTokenFromUrl() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('access_token');
}

function redirectToSpotifyAuth() {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}` +
                    `&response_type=token` +
                    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                    `&scope=${encodeURIComponent(scopes.join(' '))}`;
    window.location = authUrl;
}

// --- EJECUCIÓN ---
let token = getTokenFromUrl();
if (token) {
    window.sessionStorage.setItem('spotifyToken', token);
    // Limpiar la URL para no mostrar el token
    window.history.replaceState({}, document.title, redirectUri);
} else {
    redirectToSpotifyAuth();
}


window.onSpotifyWebPlaybackSDKReady = () => {
  const player = new Spotify.Player({
    name: 'Adivina la Canción Player',
    getOAuthToken: cb => { cb(token); },
    volume: 0.5
  });

  // Estado listo
  player.addListener('ready', ({ device_id }) => {
    console.log('Spotify listo con Device ID', device_id);
    // Guardar device_id para usarlo al reproducir
    window.spotifyDeviceId = device_id;
  });

  player.addListener('not_ready', ({ device_id }) => {
    console.log('Dispositivo offline', device_id);
  });

  player.addListener('player_state_changed', state => {
    if (!state) return;
    const currentTrack = state.track_window.current_track;
    document.querySelector('.song-title').textContent = currentTrack.name;
    document.querySelector('.artist-name').textContent = currentTrack.artists.map(a => a.name).join(', ');
  });

  player.connect();

  // Función para reproducir una canción
  async function playSong(trackUri) {
    if (!window.spotifyDeviceId) return console.error('Device ID no listo');
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${window.spotifyDeviceId}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [trackUri] }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
  }

  // Botón de play
  document.querySelector('.btn-play').addEventListener('click', () => {
    // Reemplaza el URI con la canción que quieras reproducir
    playSong('spotify:track:6usohdchdzW9oML7VC4Uhk?si=b98a80e893d94e45');
  });

  // Botones de siguiente y anterior (opcional)
  document.querySelector('.bi-skip-forward-fill').addEventListener('click', () => {
    player.nextTrack();
  });

  document.querySelector('.bi-skip-backward-fill').addEventListener('click', () => {
    player.previousTrack();
  });
};